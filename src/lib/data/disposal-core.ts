import { eq } from "drizzle-orm"
import type { Tx } from "./db/client"
import { fromDisposal } from "./db/mappers"
import * as schema from "./db/schema"
import type { CollectDisposalInput, DataResult, Disposal } from "./types"

/** Panjang maksimal catatan pengangkutan. */
const NOTE_MAX_LENGTH = 200

/**
 * Inti pengangkutan sisa kategori D oleh TPS, di dalam transaksi `tx` yang sudah
 * berjalan (degradasi yang jatuh tempo harus sudah diterapkan pemanggil). Seluruh
 * sisa batch dicatat sebagai satu `Disposal` dan batch menjadi `collected`.
 * @param now Epoch ms waktu aplikasi, dicatat sebagai waktu pengangkutan.
 */
export function applyCollection(
  tx: Tx,
  input: CollectDisposalInput,
  now: number
): DataResult<Disposal> {
  const tps = tx.select({ id: schema.tps.id }).from(schema.tps).where(eq(schema.tps.id, input.tpsId)).get()
  if (!tps) return { ok: false, error: "TPS tidak ditemukan." }

  const batch = tx.select().from(schema.batches).where(eq(schema.batches.id, input.batchId)).get()
  if (!batch) return { ok: false, error: "Batch tidak ditemukan." }
  if (batch.category !== "D") return { ok: false, error: "Batch ini bukan sisa tidak layak." }
  if (batch.status === "collected") return { ok: false, error: "Batch ini sudah diangkut." }
  if (batch.status !== "discarded") return { ok: false, error: "Batch ini belum siap diangkut." }

  const note = input.note?.trim().slice(0, NOTE_MAX_LENGTH)
  const disposal: Disposal = {
    id: crypto.randomUUID(),
    batchId: batch.id,
    tpsId: tps.id,
    quantity: batch.remainingQuantity,
    collectedAt: new Date(now).toISOString(),
    ...(note && { note }),
  }
  tx.insert(schema.disposals).values(fromDisposal(disposal)).run()
  tx.update(schema.batches)
    .set({ status: "collected", remainingQuantity: 0 })
    .where(eq(schema.batches.id, batch.id))
    .run()
  return { ok: true, data: disposal }
}
