import { eq } from "drizzle-orm"
import type { Tx } from "./db/client"
import { toBatch, toClaim } from "./db/mappers"
import * as schema from "./db/schema"
import { roundQuantity } from "./quantity"
import { deriveBatchStatus } from "./seed"
import type { CancelClaimInput, Claim, DataResult } from "./types"

/**
 * Inti pembatalan klaim oleh penerima, di dalam transaksi `tx` yang sudah berjalan
 * (degradasi yang jatuh tempo harus sudah diterapkan pemanggil). Jumlah klaim kembali
 * ke sisa batch dan status batch dihitung ulang.
 * @param now Epoch ms waktu aplikasi, untuk menentukan status batch.
 * @returns Klaim setelah dibatalkan.
 */
export function applyClaimCancellation(
  tx: Tx,
  input: CancelClaimInput,
  now: number
): DataResult<Claim> {
  const row = tx
    .select({ claim: schema.claims, batch: schema.batches })
    .from(schema.claims)
    .innerJoin(schema.batches, eq(schema.claims.batchId, schema.batches.id))
    .where(eq(schema.claims.id, input.claimId))
    .get()
  if (!row || row.claim.recipientId !== input.recipientId) {
    return { ok: false, error: "Klaim tidak ditemukan." }
  }
  if (row.claim.status === "picked_up") return { ok: false, error: "Klaim ini sudah diambil." }
  if (row.claim.status === "cancelled") return { ok: false, error: "Klaim ini sudah dibatalkan." }

  tx.update(schema.claims)
    .set({ status: "cancelled", cancelReason: "recipient" })
    .where(eq(schema.claims.id, row.claim.id))
    .run()

  // Klaim pending selalu bersatuan sama dengan batch: setiap degradasi membatalkannya.
  const batch = toBatch(row.batch)
  const remainingQuantity = roundQuantity(batch.remainingQuantity + row.claim.quantity, batch.unit)
  const claims = tx
    .select({ status: schema.claims.status })
    .from(schema.claims)
    .where(eq(schema.claims.batchId, batch.id))
    .all()
  const status =
    batch.status === "discarded"
      ? batch.status
      : deriveBatchStatus(remainingQuantity, claims, batch.safeUntil, now)
  tx.update(schema.batches)
    .set({ remainingQuantity, status })
    .where(eq(schema.batches.id, batch.id))
    .run()

  return {
    ok: true,
    data: toClaim({ ...row.claim, status: "cancelled", cancelReason: "recipient" }),
  }
}
