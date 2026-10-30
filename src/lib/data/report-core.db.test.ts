import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, before, beforeEach, describe, it } from "node:test"
import { openDatabase, type Db } from "./db/client"
import { fromBatch, fromClaim, fromDisposal } from "./db/mappers"
import * as schema from "./db/schema"
import {
  buildDailyTrend,
  buildReportTotals,
  filterReportEvents,
  parseEventDay,
  parseReportPeriod,
  recentPeriod,
  selectReportEvents,
  wibDate,
  wibDateTime,
} from "./report-core"
import type { Claim, ReportPeriod, SurplusBatch } from "./types"

/** 10.00 WIB, 16 Okt 2026. */
const NOW = Date.parse("2026-10-16T03:00:00.000Z")
const HOUR = 60 * 60 * 1000
const iso = (ms: number) => new Date(ms).toISOString()
const OCTOBER: ReportPeriod = { from: "2026-10-01", to: "2026-10-31" }

let dir: string
let db: Db

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), "regizi-test-"))
  db = openDatabase(path.join(dir, "test.db"))
})

beforeEach(() => {
  for (const table of [schema.disposals, schema.batchCategoryEvents, schema.claims, schema.batches]) {
    db.delete(table).run()
  }
})

after(() => {
  db.$client.close()
  rmSync(dir, { recursive: true, force: true })
})

/** Sisipkan batch A 40 porsi (bisa ditimpa `overrides`). */
function seedBatch(id: string, overrides: Partial<SurplusBatch> = {}): SurplusBatch {
  const batch: SurplusBatch = {
    id,
    sppgId: "sppg-01",
    menu: `Menu ${id}`,
    category: "A",
    unit: "porsi",
    quantity: 40,
    remainingQuantity: 40,
    foodType: "cooked",
    cookedAt: iso(NOW),
    safeUntil: iso(NOW + 4 * HOUR),
    status: "available",
    createdAt: iso(NOW),
    ...overrides,
  }
  db.insert(schema.batches).values(fromBatch(batch)).run()
  return batch
}

/** Sisipkan klaim sudah diambil pada `pickedUpAt` (bisa ditimpa `overrides`). */
function seedClaim(id: string, batchId: string, pickedUpAt: number, overrides: Partial<Claim> = {}): void {
  const claim: Claim = {
    id,
    batchId,
    recipientId: "rcp-umkm",
    category: "A",
    unit: "porsi",
    quantity: 10,
    status: "picked_up",
    pickupCode: `${id}-code`,
    claimedAt: iso(pickedUpAt - HOUR),
    pickedUpAt: iso(pickedUpAt),
    ...overrides,
  }
  db.insert(schema.claims).values(fromClaim(claim)).run()
}

const events = (period = OCTOBER) => selectReportEvents(db, "sppg-01", period)
const ofKind = (kind: string) => events().filter((e) => e.kind === kind)

describe("waktu WIB", () => {
  it("hari berganti pada tengah malam WIB, bukan UTC", () => {
    assert.equal(wibDate(Date.parse("2026-10-15T16:59:00.000Z")), "2026-10-15")
    assert.equal(wibDate(Date.parse("2026-10-15T17:00:00.000Z")), "2026-10-16")
    assert.equal(wibDateTime("2026-10-15T17:30:00.000Z"), "2026-10-16 00:30")
  })

  it("kejadian 23.30 dan 00.30 WIB masuk hari yang berbeda", () => {
    seedBatch("w1")
    seedClaim("w1-a", "w1", Date.parse("2026-10-15T16:30:00.000Z"))
    seedClaim("w1-b", "w1", Date.parse("2026-10-15T17:30:00.000Z"))
    const period = { from: "2026-10-15", to: "2026-10-16" }
    const [first, second] = buildDailyTrend(events(period), period)
    assert.equal(first.portionsA, 10)
    assert.equal(second.portionsA, 10)
  })

  it("batas periode mengikuti WIB", () => {
    seedBatch("w2", { createdAt: "2026-10-09T17:00:00.000Z" })
    seedClaim("w2-out", "w2", Date.parse("2026-10-15T17:00:00.000Z"))
    seedClaim("w2-in", "w2", Date.parse("2026-10-15T16:59:00.000Z"))
    const distributed = events({ from: "2026-10-15", to: "2026-10-15" }).filter(
      (e) => e.kind === "distributed"
    )
    assert.equal(distributed.length, 1)
  })
})

describe("parseReportPeriod", () => {
  it("kosong memakai 30 hari terakhir sampai hari ini", () => {
    assert.deepEqual(parseReportPeriod(undefined, undefined, NOW), {
      ok: true,
      data: { from: "2026-09-17", to: "2026-10-16" },
    })
  })

  it("menerima periode tepat 31 hari", () => {
    assert.equal(parseReportPeriod("2026-10-01", "2026-10-31", NOW).ok, true)
  })

  it("menolak periode lebih dari 31 hari", () => {
    const result = parseReportPeriod("2026-10-01", "2026-11-01", NOW)
    assert.match(result.ok ? "" : result.error, /paling panjang 31 hari/)
  })

  it("menolak format salah, tanggal mustahil, urutan terbalik, dan isian sebagian", () => {
    assert.equal(parseReportPeriod("kemarin", "2026-10-01", NOW).ok, false)
    assert.equal(parseReportPeriod("2026-02-31", "2026-03-01", NOW).ok, false)
    assert.equal(parseReportPeriod("2026-10-10", "2026-10-01", NOW).ok, false)
    assert.equal(parseReportPeriod("2026-10-10", undefined, NOW).ok, false)
  })

  it("recentPeriod menghitung hari ini", () => {
    assert.deepEqual(recentPeriod(NOW, 1), { from: "2026-10-16", to: "2026-10-16" })
    assert.deepEqual(recentPeriod(NOW, 14), { from: "2026-10-03", to: "2026-10-16" })
  })
})

describe("selectReportEvents", () => {
  it("mengurutkan empat jenis kejadian dari yang terlama", () => {
    seedBatch("e1")
    seedClaim("e1-c", "e1", NOW + HOUR)
    seedBatch("e2", {
      category: "D",
      unit: "kg",
      quantity: 12,
      remainingQuantity: 0,
      status: "collected",
      createdAt: iso(NOW + 2 * HOUR),
    })
    db.insert(schema.disposals)
      .values(
        fromDisposal({
          id: "e2-d",
          batchId: "e2",
          tpsId: "tps-01",
          quantity: 12,
          collectedAt: iso(NOW + 3 * HOUR),
          note: "Truk 1",
        })
      )
      .run()
    db.insert(schema.batchCategoryEvents)
      .values({
        id: "e1-ev",
        batchId: "e1",
        fromCategory: "A",
        toCategory: "B",
        quantityBefore: 30,
        unitBefore: "porsi",
        quantityAfter: 12,
        unitAfter: "kg",
        reason: "manual",
        note: "Mulai basi",
        occurredAt: iso(NOW + 4 * HOUR),
      })
      .run()

    const list = events()
    assert.deepEqual(
      list.map((e) => e.kind),
      ["registered", "distributed", "registered", "collected", "degraded"]
    )
    const distributed = list[1]
    assert.equal(distributed.party, "Warung Makan Bu Sri")
    assert.equal(distributed.kg, 4)
    assert.equal(list[3].party, "TPST Purbalingga")
    assert.equal(list[3].note, "Truk 1")
    assert.equal(list[4].note, "Dari kategori A: Mulai basi")
  })

  it("batch yang turun kategori tetap tercatat dengan kategori dan jumlah aslinya", () => {
    // Batch A 40 porsi: 10 diambil, sisa 30 turun ke B menjadi 12 kg.
    seedBatch("d1", { category: "B", unit: "kg", quantity: 12, remainingQuantity: 12 })
    seedClaim("d1-c", "d1", NOW)
    db.insert(schema.batchCategoryEvents)
      .values({
        id: "d1-ev",
        batchId: "d1",
        fromCategory: "A",
        toCategory: "B",
        quantityBefore: 30,
        unitBefore: "porsi",
        quantityAfter: 12,
        unitAfter: "kg",
        reason: "auto",
        note: null,
        occurredAt: iso(NOW + HOUR),
      })
      .run()
    const [registered] = ofKind("registered")
    assert.equal(registered.category, "A")
    assert.equal(registered.quantity, 40)
    assert.equal(registered.unit, "porsi")
    assert.equal(registered.kg, 16)
  })

  it("klaim tersalurkan memakai kategori saat diklaim", () => {
    seedBatch("s1", { category: "B", unit: "kg", quantity: 12, remainingQuantity: 12 })
    seedClaim("s1-c", "s1", NOW)
    assert.equal(ofKind("distributed")[0].category, "A")
  })

  it("batch yang ditarik tidak muncul sama sekali", () => {
    seedBatch("x1", { status: "withdrawn", remainingQuantity: 0 })
    db.insert(schema.batchCategoryEvents)
      .values({
        id: "x1-ev",
        batchId: "x1",
        fromCategory: "A",
        toCategory: "B",
        quantityBefore: 40,
        unitBefore: "porsi",
        quantityAfter: 16,
        unitAfter: "kg",
        reason: "auto",
        note: null,
        occurredAt: iso(NOW),
      })
      .run()
    assert.deepEqual(events(), [])
  })

  it("klaim menunggu atau dibatalkan tidak terhitung tersalurkan", () => {
    seedBatch("c1")
    seedClaim("c1-p", "c1", NOW, { status: "pending", pickedUpAt: undefined })
    seedClaim("c1-x", "c1", NOW, { status: "cancelled", pickedUpAt: undefined })
    assert.deepEqual(ofKind("distributed"), [])
  })

  it("data SPPG lain tidak ikut", () => {
    seedBatch("o1")
    assert.deepEqual(selectReportEvents(db, "sppg-99", OCTOBER), [])
  })
})

describe("filter rincian", () => {
  /** Tiga kejadian: dua hari WIB berbeda, kategori A dan B. */
  function seedFilterData() {
    seedBatch("f1")
    seedClaim("f1-a", "f1", Date.parse("2026-10-15T16:30:00.000Z"))
    seedClaim("f1-b", "f1", Date.parse("2026-10-15T17:30:00.000Z"), {
      category: "B",
      unit: "kg",
      quantity: 2,
    })
    return events().filter((e) => e.kind === "distributed")
  }

  it("tanggal filter harus valid dan berada di dalam periode", () => {
    assert.equal(parseEventDay("2026-10-16", OCTOBER), "2026-10-16")
    assert.equal(parseEventDay("2026-10-01", OCTOBER), "2026-10-01")
    assert.equal(parseEventDay("2026-10-31", OCTOBER), "2026-10-31")
    assert.equal(parseEventDay("2026-11-01", OCTOBER), undefined)
    assert.equal(parseEventDay("2026-02-31", OCTOBER), undefined)
    assert.equal(parseEventDay("kemarin", OCTOBER), undefined)
    assert.equal(parseEventDay(undefined, OCTOBER), undefined)
  })

  it("hari yang dipilih mengikuti WIB", () => {
    const list = filterReportEvents(seedFilterData(), { day: "2026-10-16" })
    assert.deepEqual(list.map((e) => e.category), ["B"])
  })

  it("menyaring menurut hari", () => {
    const list = filterReportEvents(seedFilterData(), { day: "2026-10-15" })
    assert.deepEqual(list.map((e) => e.category), ["A"])
  })

  it("menyaring menurut kategori", () => {
    const list = filterReportEvents(seedFilterData(), { category: "B" })
    assert.deepEqual(list.map((e) => e.quantity), [2])
  })

  it("hari dan kategori digabung", () => {
    assert.deepEqual(filterReportEvents(seedFilterData(), { day: "2026-10-15", category: "B" }), [])
  })

  it("tanpa filter mengembalikan semua", () => {
    assert.equal(filterReportEvents(seedFilterData(), {}).length, 2)
  })
})

describe("buildDailyTrend dan buildReportTotals", () => {
  it("hari tanpa kejadian tetap ada dan bernilai nol", () => {
    const period = { from: "2026-10-14", to: "2026-10-16" }
    seedBatch("t1")
    seedClaim("t1-c", "t1", NOW)
    const trend = buildDailyTrend(events(period), period)
    assert.deepEqual(trend.map((p) => p.date), ["2026-10-14", "2026-10-15", "2026-10-16"])
    assert.equal(trend[0].totalKg, 0)
    assert.equal(trend[2].portionsA, 10)
    assert.equal(trend[2].kgA, 4)
  })

  it("menjumlahkan tanpa ekor desimal dan memisahkan kategori", () => {
    const period = { from: "2026-10-16", to: "2026-10-16" }
    seedBatch("t2", { category: "B", unit: "kg", quantity: 9, remainingQuantity: 0 })
    seedClaim("t2-a", "t2", NOW, { category: "B", unit: "kg", quantity: 1.1 })
    seedClaim("t2-b", "t2", NOW, { category: "B", unit: "kg", quantity: 2.2, recipientId: "rcp-peternak" })
    seedClaim("t2-c", "t2", NOW, { category: "C", unit: "kg", quantity: 0.7, recipientId: "rcp-petani" })
    const list = events(period)
    const [point] = buildDailyTrend(list, period)
    assert.equal(point.kgB, 3.3)
    assert.equal(point.kgC, 0.7)
    assert.equal(point.totalKg, 4)
    const totals = buildReportTotals(list)
    assert.equal(totals.kgB, 3.3)
    assert.equal(totals.distributedKg, 4)
    assert.equal(totals.registeredBatches, 1)
  })
})
