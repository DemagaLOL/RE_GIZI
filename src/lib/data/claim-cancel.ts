import { and, eq, lte } from "drizzle-orm"
import { refreshBatchStatus } from "./batch-status"
import type { Db, Tx } from "./db/client"
import { toBatch, toClaim } from "./db/mappers"
import * as schema from "./db/schema"
import { roundQuantity } from "./quantity"
import type {
  CancelClaimBySppgInput,
  CancelClaimInput,
  Claim,
  ClaimCancelReason,
  DataResult,
} from "./types"

/** Batalkan klaim `pending`: jumlahnya kembali ke sisa batch dan status batch dihitung ulang. */
function releaseClaim(
  tx: Tx,
  claim: schema.ClaimRow,
  batchRow: schema.BatchRow,
  reason: ClaimCancelReason,
  now: number
): void {
  tx.update(schema.claims)
    .set({ status: "cancelled", cancelReason: reason })
    .where(eq(schema.claims.id, claim.id))
    .run()

  // Klaim pending selalu bersatuan sama dengan batch: setiap degradasi membatalkannya.
  const batch = toBatch(batchRow)
  const remainingQuantity = roundQuantity(batch.remainingQuantity + claim.quantity, batch.unit)
  tx.update(schema.batches)
    .set({ remainingQuantity })
    .where(eq(schema.batches.id, batch.id))
    .run()
  refreshBatchStatus(tx, { ...batch, remainingQuantity }, now)
}

/** Klaim beserta batch-nya, atau `undefined` bila tidak ada. */
function findClaim(tx: Tx, claimId: string) {
  return tx
    .select({ claim: schema.claims, batch: schema.batches })
    .from(schema.claims)
    .innerJoin(schema.batches, eq(schema.claims.batchId, schema.batches.id))
    .where(eq(schema.claims.id, claimId))
    .get()
}

/** Batalkan klaim yang sudah lolos cek kepemilikan; hanya klaim `pending` yang bisa dibatalkan. */
function cancelPending(
  tx: Tx,
  row: { claim: schema.ClaimRow; batch: schema.BatchRow },
  reason: ClaimCancelReason,
  now: number
): DataResult<Claim> {
  if (row.claim.status === "picked_up") return { ok: false, error: "Klaim ini sudah diambil." }
  if (row.claim.status === "cancelled") return { ok: false, error: "Klaim ini sudah dibatalkan." }
  releaseClaim(tx, row.claim, row.batch, reason, now)
  return { ok: true, data: toClaim({ ...row.claim, status: "cancelled", cancelReason: reason }) }
}

/**
 * Inti pembatalan klaim oleh penerima, di dalam transaksi `tx` yang sudah berjalan
 * (perubahan yang jatuh tempo harus sudah diterapkan pemanggil).
 * @param now Epoch ms waktu aplikasi, untuk menentukan status batch.
 * @returns Klaim setelah dibatalkan.
 */
export function applyClaimCancellation(
  tx: Tx,
  input: CancelClaimInput,
  now: number
): DataResult<Claim> {
  const row = findClaim(tx, input.claimId)
  if (!row || row.claim.recipientId !== input.recipientId) {
    return { ok: false, error: "Klaim tidak ditemukan." }
  }
  return cancelPending(tx, row, "recipient", now)
}

/**
 * Inti pembatalan klaim oleh petugas SPPG (mis. penerima tidak datang), hanya untuk
 * batch milik SPPG tersebut. Sama seperti `applyClaimCancellation`, di dalam transaksi `tx`.
 * @returns Klaim setelah dibatalkan.
 */
export function applySppgClaimCancellation(
  tx: Tx,
  input: CancelClaimBySppgInput,
  now: number
): DataResult<Claim> {
  const row = findClaim(tx, input.claimId)
  if (!row || row.batch.sppgId !== input.sppgId) {
    return { ok: false, error: "Klaim tidak ditemukan." }
  }
  return cancelPending(tx, row, "sppg", now)
}

/** Kondisi SQL klaim `pending` yang tenggat ambilnya lewat. Klaim tanpa tenggat tidak ikut. */
function overdueCondition(now: number) {
  return and(
    eq(schema.claims.status, "pending"),
    lte(schema.claims.pickupDeadline, new Date(now).toISOString())
  )
}

/** `true` bila ada klaim yang lewat tenggat ambil pada `now`. */
export function hasOverdueClaims(db: Db, now: number): boolean {
  return Boolean(db.select({ id: schema.claims.id }).from(schema.claims).where(overdueCondition(now)).get())
}

/** Batalkan semua klaim yang lewat tenggat ambil pada `now`, di dalam transaksi `tx`. */
export function applyClaimExpiries(tx: Tx, now: number): void {
  const overdue = tx.select().from(schema.claims).where(overdueCondition(now)).all()
  for (const claim of overdue) {
    // Dibaca per klaim: beberapa klaim bisa berada di batch yang sama.
    const batch = tx.select().from(schema.batches).where(eq(schema.batches.id, claim.batchId)).get()
    if (batch) releaseClaim(tx, claim, batch, "expired", now)
  }
}
