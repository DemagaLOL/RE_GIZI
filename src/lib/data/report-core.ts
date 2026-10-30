import { and, asc, eq, gte, inArray, lt, ne, type SQL } from "drizzle-orm"
import { CATEGORY_UNIT, DEFAULT_REPORT_DAYS, KG_PER_PORTION, MAX_REPORT_DAYS } from "./constants"
import type { Db, Tx } from "./db/client"
import * as schema from "./db/schema"
import { roundQuantity } from "./quantity"
import type {
  DailyTrendPoint,
  DataResult,
  QuantityUnit,
  ReportEvent,
  ReportPeriod,
  ReportTotals,
  SurplusCategory,
} from "./types"

/**
 * Laporan sisa pangan satu SPPG per periode. Hari dihitung menurut WIB (UTC+7, tanpa DST).
 * Semua kueri mengecualikan batch yang ditarik karena batch itu dianggap tidak pernah ada.
 * Modul ini tanpa `next/cache` agar bisa dites langsung pada SQLite.
 */

const DAY = 24 * 60 * 60 * 1000
const WIB_OFFSET = 7 * 60 * 60 * 1000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Awal hari `date` (WIB) dalam epoch ms; `NaN` bila bukan tanggal yang ada di kalender. */
export function startOfWibDay(date: string): number {
  if (!DATE_PATTERN.test(date)) return Number.NaN
  const ms = Date.parse(`${date}T00:00:00+07:00`)
  // Tolak tanggal yang "meluap" ke bulan berikutnya, mis. 2026-02-31.
  return !Number.isNaN(ms) && wibDate(ms) === date ? ms : Number.NaN
}

/** Tanggal `YYYY-MM-DD` di WIB untuk waktu `ms`. */
export function wibDate(ms: number): string {
  return new Date(ms + WIB_OFFSET).toISOString().slice(0, 10)
}

/** Waktu `YYYY-MM-DD HH:mm` di WIB untuk waktu ISO `iso`. */
export function wibDateTime(iso: string): string {
  return new Date(Date.parse(iso) + WIB_OFFSET).toISOString().slice(0, 16).replace("T", " ")
}

/** Periode `days` hari yang berakhir pada hari ini (WIB). */
export function recentPeriod(now: number, days: number): ReportPeriod {
  return { from: wibDate(now - (days - 1) * DAY), to: wibDate(now) }
}

/**
 * Validasi periode dari query URL. Kosong keduanya = `DEFAULT_REPORT_DAYS` hari terakhir.
 * @param now Epoch ms waktu aplikasi.
 */
export function parseReportPeriod(
  from: string | undefined,
  to: string | undefined,
  now: number
): DataResult<ReportPeriod> {
  if (!from && !to) return { ok: true, data: recentPeriod(now, DEFAULT_REPORT_DAYS) }
  if (!from || !to) return { ok: false, error: "Isi tanggal mulai dan tanggal akhir." }
  const fromMs = startOfWibDay(from)
  const toMs = startOfWibDay(to)
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return { ok: false, error: "Tanggal laporan tidak valid." }
  }
  if (fromMs > toMs) return { ok: false, error: "Tanggal mulai harus sebelum tanggal akhir." }
  if ((toMs - fromMs) / DAY + 1 > MAX_REPORT_DAYS) {
    return { ok: false, error: `Periode laporan paling panjang ${MAX_REPORT_DAYS} hari.` }
  }
  return { ok: true, data: { from, to } }
}

/** Berat dalam kg; porsi dikonversi memakai `KG_PER_PORTION`. */
function toKg(quantity: number, unit: QuantityUnit): number {
  return roundQuantity(unit === "porsi" ? quantity * KG_PER_PORTION : quantity, "kg")
}

/** Kondisi SQL `column` berada di dalam `period` (batas hari WIB, akhir eksklusif). */
function inPeriod(column: Parameters<typeof gte>[0], period: ReportPeriod): SQL | undefined {
  const start = new Date(startOfWibDay(period.from)).toISOString()
  const end = new Date(startOfWibDay(period.to) + DAY).toISOString()
  return and(gte(column, start), lt(column, end))
}

/** Batch milik SPPG yang masih dianggap ada (bukan batch yang ditarik). */
function ownedBatch(sppgId: string): SQL | undefined {
  return and(eq(schema.batches.sppgId, sppgId), ne(schema.batches.status, "withdrawn"))
}

/**
 * Baris "Dicatat" pada periode. Kategori dan jumlah batch ditimpa saat turun kategori, jadi
 * nilai asli batch yang pernah turun dibangun ulang dari langkah pertamanya: sisa sebelum
 * turun ditambah yang sudah diambil pada kategori awal.
 */
function selectRegistered(db: Db | Tx, sppgId: string, period: ReportPeriod): ReportEvent[] {
  const batches = db
    .select()
    .from(schema.batches)
    .where(and(ownedBatch(sppgId), inPeriod(schema.batches.createdAt, period)))
    .all()
  if (batches.length === 0) return []

  const ids = batches.map((b) => b.id)
  const firstEvents = new Map<string, schema.CategoryEventRow>()
  const events = db
    .select()
    .from(schema.batchCategoryEvents)
    .where(inArray(schema.batchCategoryEvents.batchId, ids))
    .orderBy(asc(schema.batchCategoryEvents.occurredAt))
    .all()
  for (const event of events) {
    if (!firstEvents.has(event.batchId)) firstEvents.set(event.batchId, event)
  }
  const pickedUp = db
    .select({
      batchId: schema.claims.batchId,
      category: schema.claims.category,
      quantity: schema.claims.quantity,
    })
    .from(schema.claims)
    .where(and(inArray(schema.claims.batchId, ids), eq(schema.claims.status, "picked_up")))
    .all()

  return batches.map((batch) => {
    const first = firstEvents.get(batch.id)
    const category = first?.fromCategory ?? batch.category
    const unit = first?.unitBefore ?? batch.unit
    const quantity = first
      ? roundQuantity(
          first.quantityBefore +
            pickedUp
              .filter((c) => c.batchId === batch.id && c.category === category)
              .reduce((sum, c) => sum + c.quantity, 0),
          unit
        )
      : batch.quantity
    return {
      at: batch.createdAt,
      kind: "registered",
      category,
      menu: batch.menu,
      quantity,
      unit,
      kg: toKg(quantity, unit),
      ...(batch.notes !== null && { note: batch.notes }),
    }
  })
}

/** Baris "Turun Kategori" pada periode; jumlahnya sisa setelah turun. */
function selectDegraded(db: Db | Tx, sppgId: string, period: ReportPeriod): ReportEvent[] {
  return db
    .select({ event: schema.batchCategoryEvents, menu: schema.batches.menu })
    .from(schema.batchCategoryEvents)
    .innerJoin(schema.batches, eq(schema.batchCategoryEvents.batchId, schema.batches.id))
    .where(and(ownedBatch(sppgId), inPeriod(schema.batchCategoryEvents.occurredAt, period)))
    .all()
    .map(({ event, menu }) => {
      const from = `Dari kategori ${event.fromCategory}`
      return {
        at: event.occurredAt,
        kind: "degraded",
        category: event.toCategory,
        menu,
        quantity: event.quantityAfter,
        unit: event.unitAfter,
        kg: toKg(event.quantityAfter, event.unitAfter),
        note: event.note ? `${from}: ${event.note}` : from,
      }
    })
}

/** Baris "Tersalurkan" pada periode, memakai kategori saat diklaim (snapshot). */
function selectDistributed(db: Db | Tx, sppgId: string, period: ReportPeriod): ReportEvent[] {
  return db
    .select({
      claim: schema.claims,
      menu: schema.batches.menu,
      recipient: schema.recipients.name,
    })
    .from(schema.claims)
    .innerJoin(schema.batches, eq(schema.claims.batchId, schema.batches.id))
    .innerJoin(schema.recipients, eq(schema.claims.recipientId, schema.recipients.id))
    .where(
      and(
        ownedBatch(sppgId),
        eq(schema.claims.status, "picked_up"),
        inPeriod(schema.claims.pickedUpAt, period)
      )
    )
    .all()
    .flatMap(({ claim, menu, recipient }) =>
      claim.pickedUpAt === null
        ? []
        : [
            {
              at: claim.pickedUpAt,
              kind: "distributed" as const,
              category: claim.category,
              menu,
              quantity: claim.quantity,
              unit: claim.unit,
              kg: toKg(claim.quantity, claim.unit),
              party: recipient,
            },
          ]
    )
}

/** Baris "Diangkut TPS" pada periode. */
function selectCollected(db: Db | Tx, sppgId: string, period: ReportPeriod): ReportEvent[] {
  return db
    .select({ disposal: schema.disposals, menu: schema.batches.menu, tps: schema.tps.name })
    .from(schema.disposals)
    .innerJoin(schema.batches, eq(schema.disposals.batchId, schema.batches.id))
    .innerJoin(schema.tps, eq(schema.disposals.tpsId, schema.tps.id))
    .where(and(ownedBatch(sppgId), inPeriod(schema.disposals.collectedAt, period)))
    .all()
    .map(({ disposal, menu, tps }) => ({
      at: disposal.collectedAt,
      kind: "collected",
      category: "D",
      menu,
      quantity: disposal.quantity,
      unit: CATEGORY_UNIT.D,
      kg: disposal.quantity,
      party: tps,
      ...(disposal.note !== null && { note: disposal.note }),
    }))
}

/** Seluruh kejadian satu SPPG pada `period`, terlama dulu. */
export function selectReportEvents(db: Db | Tx, sppgId: string, period: ReportPeriod): ReportEvent[] {
  return [
    ...selectRegistered(db, sppgId, period),
    ...selectDegraded(db, sppgId, period),
    ...selectDistributed(db, sppgId, period),
    ...selectCollected(db, sppgId, period),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}

/** Tanggal filter rincian bila valid dan berada di dalam `period`, selain itu `undefined`. */
export function parseEventDay(day: string | undefined, period: ReportPeriod): string | undefined {
  if (!day || Number.isNaN(startOfWibDay(day))) return undefined
  return day >= period.from && day <= period.to ? day : undefined
}

/**
 * Saring kejadian menurut hari (WIB) dan/atau kategori; yang kosong tidak menyaring.
 * @param day Tanggal `YYYY-MM-DD`.
 */
export function filterReportEvents(
  events: readonly ReportEvent[],
  { day, category }: { day?: string; category?: SurplusCategory }
): ReportEvent[] {
  return events.filter(
    (e) =>
      (!day || wibDate(Date.parse(e.at)) === day) && (!category || e.category === category)
  )
}

/** Rekap harian untuk grafik: satu titik per hari, hari tanpa kejadian tetap ada. */
export function buildDailyTrend(
  events: readonly ReportEvent[],
  period: ReportPeriod
): DailyTrendPoint[] {
  const points = new Map<string, DailyTrendPoint>()
  const last = startOfWibDay(period.to)
  for (let day = startOfWibDay(period.from); day <= last; day += DAY) {
    const date = wibDate(day)
    points.set(date, { date, portionsA: 0, kgA: 0, kgB: 0, kgC: 0, totalKg: 0, collectedKg: 0 })
  }

  for (const event of events) {
    const point = points.get(wibDate(Date.parse(event.at)))
    if (!point) continue
    if (event.kind === "collected") point.collectedKg += event.kg
    if (event.kind !== "distributed") continue
    if (event.category === "A") {
      point.portionsA += event.quantity
      point.kgA += event.kg
    } else if (event.category === "B") {
      point.kgB += event.kg
    } else if (event.category === "C") {
      point.kgC += event.kg
    }
  }

  return [...points.values()].map((point) => {
    const kgA = roundQuantity(point.kgA, "kg")
    const kgB = roundQuantity(point.kgB, "kg")
    const kgC = roundQuantity(point.kgC, "kg")
    return {
      ...point,
      kgA,
      kgB,
      kgC,
      totalKg: roundQuantity(kgA + kgB + kgC, "kg"),
      collectedKg: roundQuantity(point.collectedKg, "kg"),
    }
  })
}

/** Jumlah per jenis kejadian untuk ringkasan laporan. */
export function buildReportTotals(events: readonly ReportEvent[]): ReportTotals {
  const totals: ReportTotals = {
    registeredBatches: 0,
    portionsA: 0,
    kgB: 0,
    kgC: 0,
    distributedKg: 0,
    collectedKg: 0,
  }
  for (const event of events) {
    if (event.kind === "registered") totals.registeredBatches += 1
    if (event.kind === "collected") totals.collectedKg += event.kg
    if (event.kind !== "distributed") continue
    totals.distributedKg += event.kg
    if (event.category === "A") totals.portionsA += event.quantity
    if (event.category === "B") totals.kgB += event.quantity
    if (event.category === "C") totals.kgC += event.quantity
  }
  return {
    ...totals,
    kgB: roundQuantity(totals.kgB, "kg"),
    kgC: roundQuantity(totals.kgC, "kg"),
    distributedKg: roundQuantity(totals.distributedKg, "kg"),
    collectedKg: roundQuantity(totals.collectedKg, "kg"),
  }
}
