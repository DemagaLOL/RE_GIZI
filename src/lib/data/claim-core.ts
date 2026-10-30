import { randomInt } from "node:crypto"
import { eq } from "drizzle-orm"
import { refreshBatchStatus } from "./batch-status"
import { pickupDeadline, recipientClaimCap } from "./claim-rules"
import {
  CATEGORY_LABEL,
  ELIGIBLE_RECIPIENTS,
  MAX_ACTIVE_CLAIMS,
  PICKUP_CODE_LENGTH,
} from "./constants"
import type { Db, Tx } from "./db/client"
import { fromClaim, toBatch } from "./db/mappers"
import * as schema from "./db/schema"
import { formatQuantity } from "../format"
import { roundQuantity, validateQuantity } from "./quantity"
import type { Claim, ClaimBatchInput, DataResult, SurplusBatch } from "./types"

/** Kode ambil acak berupa angka saja (`PICKUP_CODE_LENGTH` digit, nol di depan dipertahankan). */
function generatePickupCode(): string {
  return String(randomInt(0, 10 ** PICKUP_CODE_LENGTH)).padStart(PICKUP_CODE_LENGTH, "0")
}

/** Kode ambil yang belum dipakai klaim lain (kode bersifat unik di tabel). */
function uniquePickupCode(tx: Tx): string {
  for (;;) {
    const code = generatePickupCode()
    const taken = tx
      .select({ id: schema.claims.id })
      .from(schema.claims)
      .where(eq(schema.claims.pickupCode, code))
      .get()
    if (!taken) return code
  }
}

/**
 * Jatah klaim penerima untuk `batch`. Satu penerima hanya punya satu klaim `pending` per
 * batch dan paling banyak `MAX_ACTIVE_CLAIMS` klaim `pending` sekaligus; yang sudah diambil
 * dari batch ini (pada kategori sekarang) mengurangi jatahnya.
 * @returns Jumlah terbanyak yang masih boleh diklaim (belum dibatasi sisa batch), atau alasan penolakan.
 */
export function recipientAllowance(
  db: Db | Tx,
  batch: SurplusBatch,
  recipientId: string
): DataResult<number> {
  const claims = db
    .select({
      batchId: schema.claims.batchId,
      category: schema.claims.category,
      quantity: schema.claims.quantity,
      status: schema.claims.status,
    })
    .from(schema.claims)
    .where(eq(schema.claims.recipientId, recipientId))
    .all()

  const pending = claims.filter((c) => c.status === "pending")
  if (pending.some((c) => c.batchId === batch.id)) {
    return {
      ok: false,
      error: "Anda masih punya klaim aktif untuk sisa ini. Ambil atau batalkan dulu sebelum mengklaim lagi.",
    }
  }
  if (pending.length >= MAX_ACTIVE_CLAIMS) {
    return {
      ok: false,
      error: `Anda sudah punya ${MAX_ACTIVE_CLAIMS} klaim aktif. Ambil atau batalkan dulu sebelum mengklaim lagi.`,
    }
  }

  const taken = claims
    .filter(
      (c) => c.batchId === batch.id && c.status === "picked_up" && c.category === batch.category
    )
    .reduce((sum, c) => sum + c.quantity, 0)
  const allowance = roundQuantity(
    recipientClaimCap(batch.category, batch.quantity) - taken,
    batch.unit
  )
  if (allowance <= 0) return { ok: false, error: "Anda sudah mencapai batas klaim untuk sisa ini." }
  return { ok: true, data: allowance }
}

/**
 * Inti klaim batch oleh penerima, di dalam transaksi `tx` yang sudah berjalan (perubahan
 * yang jatuh tempo harus sudah diterapkan pemanggil). Menolak bila jenis penerima tidak
 * sesuai kategori, batch tidak tersedia, atau jumlah melebihi sisa maupun jatah penerima.
 * @param now Epoch ms waktu aplikasi.
 */
export function applyClaim(tx: Tx, input: ClaimBatchInput, now: number): DataResult<Claim> {
  const batchRow = tx
    .select()
    .from(schema.batches)
    .where(eq(schema.batches.id, input.batchId))
    .get()
  if (!batchRow) return { ok: false, error: "Batch tidak ditemukan." }
  const recipient = tx
    .select({ id: schema.recipients.id, type: schema.recipients.type })
    .from(schema.recipients)
    .where(eq(schema.recipients.id, input.recipientId))
    .get()
  if (!recipient) return { ok: false, error: "Penerima tidak ditemukan." }

  const batch = toBatch(batchRow)
  if (batch.status === "discarded") {
    return { ok: false, error: "Sisa kategori D tidak layak dan tidak dapat diklaim." }
  }
  if (batch.status === "withdrawn") return { ok: false, error: "Sisa ini sudah ditarik SPPG." }
  if (!ELIGIBLE_RECIPIENTS[batch.category].includes(recipient.type)) {
    return {
      ok: false,
      error: `Sisa ini berkategori ${batch.category} (${CATEGORY_LABEL[batch.category]}) dan tidak dapat diklaim jenis penerima Anda.`,
    }
  }
  if (batch.status === "expired") {
    return { ok: false, error: "Batch sudah melewati batas aman." }
  }
  if (batch.status !== "available") {
    return { ok: false, error: "Batch sudah habis diklaim." }
  }

  const quantityError = validateQuantity(input.quantity, batch.unit)
  if (quantityError) return { ok: false, error: quantityError }
  // Sisa dibulatkan dulu: data lama bisa tersimpan dengan ekor floating point (0,0999… kg).
  const available = roundQuantity(batch.remainingQuantity, batch.unit)
  if (input.quantity > available) {
    return {
      ok: false,
      error: `Jumlah melebihi sisa (${formatQuantity(available, batch.unit)}).`,
    }
  }
  const allowance = recipientAllowance(tx, batch, recipient.id)
  if (!allowance.ok) return allowance
  if (input.quantity > allowance.data) {
    return {
      ok: false,
      error: `Jatah Anda untuk sisa ini ${formatQuantity(allowance.data, batch.unit)} agar terbagi ke penerima lain.`,
    }
  }

  const claim: Claim = {
    id: crypto.randomUUID(),
    batchId: batch.id,
    recipientId: recipient.id,
    category: batch.category,
    unit: batch.unit,
    quantity: input.quantity,
    status: "pending",
    pickupCode: uniquePickupCode(tx),
    claimedAt: new Date(now).toISOString(),
    pickupDeadline: new Date(pickupDeadline(batch, now)).toISOString(),
  }
  tx.insert(schema.claims).values(fromClaim(claim)).run()

  // `Math.max`: hindari -0 / sisa negatif dari ekor floating point data lama.
  const remainingQuantity = Math.max(0, roundQuantity(available - input.quantity, batch.unit))
  tx.update(schema.batches)
    .set({ remainingQuantity })
    .where(eq(schema.batches.id, batch.id))
    .run()
  refreshBatchStatus(tx, { ...batch, remainingQuantity }, now)

  return { ok: true, data: claim }
}
