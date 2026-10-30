import { eq, inArray } from "drizzle-orm"
import { refreshBatchStatus } from "./batch-status"
import { MENU_MAX_LENGTH, NOTES_MAX_LENGTH, WITHDRAW_REASON_MAX_LENGTH } from "./constants"
import type { Tx } from "./db/client"
import { toBatch } from "./db/mappers"
import * as schema from "./db/schema"
import { formatQuantity } from "../format"
import { roundQuantity, validateQuantity } from "./quantity"
import type {
  BatchStatus,
  DataResult,
  SurplusBatch,
  UpdateBatchInput,
  WithdrawBatchInput,
} from "./types"

/**
 * Perubahan batch oleh SPPG setelah didaftarkan. Fungsi `apply*` berjalan di dalam
 * transaksi `tx` yang sudah berjalan; perubahan yang jatuh tempo harus sudah diterapkan
 * pemanggil. Kategori D hasil penurunan dikunci agar sisa yang sudah menjadi sampah tidak
 * bisa diperkecil atau dihilangkan dari antrean TPS.
 */

/** Status batch yang masih bisa diubah atau ditarik SPPG. */
const MUTABLE_STATUSES: readonly BatchStatus[] = ["available", "reserved", "discarded"]

/** Pesan bila batch berstatus ini tidak bisa diubah atau ditarik lagi. */
const LOCKED_ERROR: Partial<Record<BatchStatus, string>> = {
  completed: "Semua sisa batch ini sudah diambil.",
  collected: "Batch ini sudah diangkut TPS.",
  withdrawn: "Batch ini sudah ditarik.",
  expired: "Batch ini sudah melewati batas aman.",
}

/** Validasi menu & catatan batch. @returns Teks yang sudah dirapikan, atau pesan galat. */
export function parseBatchText(input: {
  menu: string
  notes?: string
}): DataResult<{ menu: string; notes?: string }> {
  const menu = input.menu.trim()
  if (!menu) return { ok: false, error: "Menu/isi tidak boleh kosong." }
  if (menu.length > MENU_MAX_LENGTH) {
    return { ok: false, error: `Menu/isi paling banyak ${MENU_MAX_LENGTH} karakter.` }
  }
  const notes = input.notes?.trim() || undefined
  if (notes && notes.length > NOTES_MAX_LENGTH) {
    return { ok: false, error: `Catatan paling banyak ${NOTES_MAX_LENGTH} karakter.` }
  }
  return { ok: true, data: { menu, notes } }
}

/** Batch milik SPPG yang masih bisa diubah atau ditarik, atau alasan penolakannya. */
function findMutableBatch(tx: Tx, batchId: string, sppgId: string): DataResult<SurplusBatch> {
  const row = tx.select().from(schema.batches).where(eq(schema.batches.id, batchId)).get()
  if (!row || row.sppgId !== sppgId) {
    return { ok: false, error: "Batch tidak ditemukan di SPPG ini." }
  }
  const batch = toBatch(row)
  if (!MUTABLE_STATUSES.includes(batch.status)) {
    return { ok: false, error: LOCKED_ERROR[batch.status] ?? "Batch ini tidak bisa diubah." }
  }
  return { ok: true, data: batch }
}

/** `true` bila batch pernah turun kategori. */
function hasDegraded(tx: Tx, batchId: string): boolean {
  return Boolean(
    tx
      .select({ id: schema.batchCategoryEvents.id })
      .from(schema.batchCategoryEvents)
      .where(eq(schema.batchCategoryEvents.batchId, batchId))
      .get()
  )
}

/**
 * Inti perubahan menu, catatan, dan jumlah batch. Jumlah tidak boleh kurang dari yang
 * sudah diklaim, dan terkunci bila batch pernah turun kategori (jumlahnya hasil konversi).
 * @param now Epoch ms waktu aplikasi, untuk menentukan status batch.
 * @returns Batch setelah diubah.
 */
export function applyBatchUpdate(
  tx: Tx,
  input: UpdateBatchInput,
  now: number
): DataResult<SurplusBatch> {
  const found = findMutableBatch(tx, input.batchId, input.sppgId)
  if (!found.ok) return found
  const batch = found.data
  const text = parseBatchText(input)
  if (!text.ok) return text

  let { quantity, remainingQuantity } = batch
  if (input.quantity !== batch.quantity) {
    if (hasDegraded(tx, batch.id)) {
      return { ok: false, error: "Jumlah batch yang sudah turun kategori tidak bisa diubah." }
    }
    const quantityError = validateQuantity(input.quantity, batch.unit)
    if (quantityError) return { ok: false, error: quantityError }
    const claimed = roundQuantity(batch.quantity - batch.remainingQuantity, batch.unit)
    if (input.quantity < claimed) {
      return {
        ok: false,
        error: `Jumlah tidak boleh kurang dari yang sudah diklaim (${formatQuantity(claimed, batch.unit)}).`,
      }
    }
    quantity = input.quantity
    remainingQuantity = roundQuantity(input.quantity - claimed, batch.unit)
  }

  tx.update(schema.batches)
    .set({ menu: text.data.menu, notes: text.data.notes ?? null, quantity, remainingQuantity })
    .where(eq(schema.batches.id, batch.id))
    .run()
  refreshBatchStatus(tx, { ...batch, remainingQuantity }, now)
  const row = tx.select().from(schema.batches).where(eq(schema.batches.id, batch.id)).get()
  if (!row) return { ok: false, error: "Batch tidak ditemukan di SPPG ini." }
  return { ok: true, data: toBatch(row) }
}

/**
 * Inti penarikan batch (mis. salah catat atau makanan batal disalurkan): batch dianggap
 * tidak pernah ada, jadi hilang dari semua daftar dan angka. Barisnya tetap disimpan beserta
 * alasannya sebagai jejak audit; penerima yang klaimnya batal tetap diberi tahu. Batch yang
 * sudah diambil sebagian dan kategori D hasil penurunan tidak bisa ditarik.
 * @param now Epoch ms waktu aplikasi, dicatat sebagai waktu penarikan.
 * @returns Batch setelah ditarik.
 */
export function applyBatchWithdrawal(
  tx: Tx,
  input: WithdrawBatchInput,
  now: number
): DataResult<SurplusBatch> {
  const found = findMutableBatch(tx, input.batchId, input.sppgId)
  if (!found.ok) return found
  const batch = found.data
  if (batch.status === "discarded" && hasDegraded(tx, batch.id)) {
    return {
      ok: false,
      error: "Sisa yang sudah turun ke kategori D tidak bisa ditarik karena tetap harus diangkut TPS.",
    }
  }
  const claims = tx
    .select({ id: schema.claims.id, status: schema.claims.status })
    .from(schema.claims)
    .where(eq(schema.claims.batchId, batch.id))
    .all()
  if (claims.some((c) => c.status === "picked_up")) {
    return {
      ok: false,
      error: "Sebagian sisa ini sudah diambil penerima, jadi batch tidak bisa ditarik. Kurangi jumlahnya lewat Ubah Data.",
    }
  }
  const reason = input.reason.trim()
  if (!reason) return { ok: false, error: "Isi alasan penarikan." }
  if (reason.length > WITHDRAW_REASON_MAX_LENGTH) {
    return { ok: false, error: `Alasan paling banyak ${WITHDRAW_REASON_MAX_LENGTH} karakter.` }
  }

  const pending = claims.filter((c) => c.status === "pending")
  if (pending.length > 0) {
    tx.update(schema.claims)
      .set({ status: "cancelled", cancelReason: "withdrawn" })
      .where(inArray(schema.claims.id, pending.map((c) => c.id)))
      .run()
  }

  const withdrawnAt = new Date(now).toISOString()
  tx.update(schema.batches)
    .set({ status: "withdrawn", remainingQuantity: 0, withdrawnAt, withdrawReason: reason })
    .where(eq(schema.batches.id, batch.id))
    .run()
  return {
    ok: true,
    data: { ...batch, status: "withdrawn", remainingQuantity: 0, withdrawnAt, withdrawReason: reason },
  }
}
