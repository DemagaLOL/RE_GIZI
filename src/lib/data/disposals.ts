import { and, asc, desc, eq, type SQL } from "drizzle-orm"
import { io } from "next/cache"
import { simNow } from "./clock"
import { getDb, type Db } from "./db/client"
import { toBatch, toDisposal, toSppg, toTps } from "./db/mappers"
import * as schema from "./db/schema"
import { applyDueDegradations, degradeDueBatches } from "./degradation"
import { applyCollection } from "./disposal-core"
import { distanceKm } from "./geo"
import type {
  CollectDisposalInput,
  DataResult,
  Disposal,
  DisposalSummary,
  DisposalWithBatch,
  SurplusBatchWithSppg,
} from "./types"

/** Turunkan batch yang jatuh tempo agar batch yang baru menjadi D ikut terlihat. */
function syncBatches(db: Db): void {
  degradeDueBatches(db, simNow(db))
}

/**
 * Antrean pembuangan untuk TPS: semua batch kategori D yang menunggu diangkut, beserta
 * SPPG asal dan jarak dari TPS. Terlama dulu, agar sisa yang paling lama menumpuk diangkut duluan.
 * Hanya untuk peran TPS — jangan tampilkan ke peran lain.
 */
export async function getDisposalQueue(tpsId: string): Promise<SurplusBatchWithSppg[]> {
  await io()
  const db = getDb()
  syncBatches(db)
  const tps = db.select().from(schema.tps).where(eq(schema.tps.id, tpsId)).get()
  if (!tps) return []
  const origin = toTps(tps).location

  return db
    .select({ batch: schema.batches, sppg: schema.sppg })
    .from(schema.batches)
    .innerJoin(schema.sppg, eq(schema.batches.sppgId, schema.sppg.id))
    .where(and(eq(schema.batches.category, "D"), eq(schema.batches.status, "discarded")))
    .orderBy(asc(schema.batches.safeUntil))
    .all()
    .map((r) => {
      const sppg = toSppg(r.sppg)
      return { ...toBatch(r.batch), sppg, distanceKm: distanceKm(origin, sppg.location) }
    })
}

/**
 * TPS menandai seluruh sisa batch kategori D sudah diangkut. Berjalan dalam satu
 * transaksi `IMMEDIATE` agar dua petugas tidak mencatat batch yang sama.
 */
export async function collectDisposal(input: CollectDisposalInput): Promise<DataResult<Disposal>> {
  await io()

  return getDb().transaction(
    (tx): DataResult<Disposal> => {
      const now = simNow(tx)
      applyDueDegradations(tx, now)
      return applyCollection(tx, input, now)
    },
    { behavior: "immediate" }
  )
}

/** Riwayat pengangkutan satu TPS beserta batch & SPPG asalnya, terbaru dulu. */
export async function getDisposalsByTps(tpsId: string): Promise<DisposalWithBatch[]> {
  await io()
  return getDb()
    .select({ disposal: schema.disposals, batch: schema.batches, sppg: schema.sppg })
    .from(schema.disposals)
    .innerJoin(schema.batches, eq(schema.disposals.batchId, schema.batches.id))
    .innerJoin(schema.sppg, eq(schema.batches.sppgId, schema.sppg.id))
    .where(eq(schema.disposals.tpsId, tpsId))
    .orderBy(desc(schema.disposals.collectedAt))
    .all()
    .map((r) => ({
      ...toDisposal(r.disposal),
      batch: { ...toBatch(r.batch), sppg: toSppg(r.sppg) },
    }))
}

/**
 * Ringkasan pembuangan (angka saja) yang boleh dilihat semua peran: berapa kg sisa
 * tidak layak yang menunggu dan yang sudah diangkut TPS.
 * @param filter `sppgId` untuk membatasi ke satu SPPG; kosong = seluruh platform.
 */
export async function getDisposalSummary(filter: { sppgId?: string } = {}): Promise<DisposalSummary> {
  await io()
  const db = getDb()
  syncBatches(db)

  const conditions: SQL[] = [eq(schema.batches.category, "D")]
  if (filter.sppgId) conditions.push(eq(schema.batches.sppgId, filter.sppgId))
  const rows = db
    .select({ status: schema.batches.status, quantity: schema.batches.quantity })
    .from(schema.batches)
    .where(and(...conditions))
    .all()

  const summary: DisposalSummary = { awaitingKg: 0, awaitingBatches: 0, collectedKg: 0, collectedBatches: 0 }
  for (const row of rows) {
    if (row.status === "discarded") {
      summary.awaitingKg += row.quantity
      summary.awaitingBatches += 1
    } else if (row.status === "collected") {
      summary.collectedKg += row.quantity
      summary.collectedBatches += 1
    }
  }
  // Hindari ekor desimal floating point (mis. 12.400000000000002).
  summary.awaitingKg = Math.round(summary.awaitingKg * 10) / 10
  summary.collectedKg = Math.round(summary.collectedKg * 10) / 10
  return summary
}
