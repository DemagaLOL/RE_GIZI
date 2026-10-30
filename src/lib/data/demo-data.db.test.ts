import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, before, beforeEach, describe, it } from "node:test"
import { recipientClaimCap } from "./claim-rules"
import { DEMO_HISTORY_DAYS } from "./constants"
import { openDatabase, type Db } from "./db/client"
import { fromBatch } from "./db/mappers"
import * as schema from "./db/schema"
import { applyDemoHistory, buildDemoHistory, removeDemoHistory } from "./demo-data"
import { applyDueChanges } from "./due-changes"
import {
  buildDailyTrend,
  buildReportTotals,
  recentPeriod,
  selectReportEvents,
  wibDate,
} from "./report-core"
import type { SurplusBatch } from "./types"

/** 00.30 WIB, 16 Okt 2026 (Jumat): kasus tersulit agar tidak ada data di masa depan. */
const NOW = Date.parse("2026-10-15T17:30:00.000Z")
const DAY = 24 * 60 * 60 * 1000

let dir: string
let db: Db

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), "regizi-test-"))
  db = openDatabase(path.join(dir, "test.db"))
})

beforeEach(() => {
  db.transaction((tx) => removeDemoHistory(tx))
})

after(() => {
  db.$client.close()
  rmSync(dir, { recursive: true, force: true })
})

const seed = (now = NOW) => db.transaction((tx) => applyDemoHistory(tx, "sppg-01", now))
const countRows = () => ({
  batches: db.select().from(schema.batches).all().length,
  claims: db.select().from(schema.claims).all().length,
  events: db.select().from(schema.batchCategoryEvents).all().length,
  disposals: db.select().from(schema.disposals).all().length,
})

describe("buildDemoHistory", () => {
  const history = buildDemoHistory("sppg-01", NOW)

  it("isinya tetap untuk waktu yang sama", () => {
    assert.deepEqual(buildDemoHistory("sppg-01", NOW), history)
  })

  it("tidak ada kejadian pada hari ini atau di masa depan", () => {
    const times = [
      ...history.batches.flatMap((b) => [b.cookedAt, b.createdAt]),
      ...history.claims.map((c) => c.pickedUpAt ?? ""),
      ...history.events.map((e) => e.occurredAt),
      ...history.disposals.map((d) => d.collectedAt),
    ].map(Date.parse)
    assert.ok(Math.max(...times) < NOW)
    const today = wibDate(NOW)
    assert.ok(times.every((t) => wibDate(t) !== today))
  })

  it("hari Minggu dilewati", () => {
    const dates = new Set(history.claims.map((c) => wibDate(Date.parse(c.pickedUpAt ?? ""))))
    assert.ok(!dates.has("2026-10-11"))
    assert.ok(!dates.has("2026-10-04"))
    assert.equal(dates.size, DEMO_HISTORY_DAYS - 2)
  })

  it("jumlah yang diambil sama dengan jumlah batch pada kategori akhirnya", () => {
    for (const batch of history.batches.filter((b) => b.category !== "D")) {
      const taken = history.claims
        .filter((c) => c.batchId === batch.id && c.category === batch.category)
        .reduce((sum, c) => sum + c.quantity, 0)
      assert.equal(Math.round(taken * 10) / 10, batch.quantity, batch.id)
    }
  })

  it("klaim kategori A mematuhi jatah per penerima", () => {
    for (const claim of history.claims.filter((c) => c.category === "A")) {
      const batch = history.batches.find((b) => b.id === claim.batchId)
      const original = batch?.category === "A" ? batch.quantity : Number.POSITIVE_INFINITY
      assert.ok(claim.quantity <= recipientClaimCap("A", original), claim.id)
      assert.ok(claim.quantity > 0, claim.id)
    }
  })

  it("batch D memakai pengangkutan seluruh jumlahnya", () => {
    const discarded = history.batches.filter((b) => b.category === "D")
    assert.ok(discarded.length > 0)
    for (const batch of discarded) {
      assert.equal(history.disposals.find((d) => d.batchId === batch.id)?.quantity, batch.quantity)
    }
  })
})

describe("applyDemoHistory", () => {
  it("mengisi data yang terbaca oleh laporan dan grafik", () => {
    const result = seed()
    assert.equal(result.ok, true)
    const period = recentPeriod(NOW, DEMO_HISTORY_DAYS + 1)
    const events = selectReportEvents(db, "sppg-01", period)
    const kinds = new Set(events.map((e) => e.kind))
    assert.deepEqual(kinds, new Set(["registered", "degraded", "distributed", "collected"]))

    const totals = buildReportTotals(events)
    assert.equal(totals.registeredBatches, result.ok ? result.data : 0)
    assert.ok(totals.portionsA > 0 && totals.kgB > 0 && totals.kgC > 0 && totals.collectedKg > 0)

    const trend = buildDailyTrend(events, period)
    assert.equal(trend.filter((p) => p.totalKg > 0).length, DEMO_HISTORY_DAYS - 2)
    assert.equal(trend[trend.length - 1].totalKg, 0)
  })

  it("batch yang turun kategori tercatat dengan jumlah aslinya di laporan", () => {
    seed()
    const period = recentPeriod(NOW, DEMO_HISTORY_DAYS + 1)
    const events = selectReportEvents(db, "sppg-01", period)
    const degraded = events.find((e) => e.kind === "degraded")
    const registered = events.filter((e) => e.kind === "registered" && e.menu === degraded?.menu)
    assert.ok(registered.some((e) => e.category === "A" && e.unit === "porsi" && e.quantity >= 60))
  })

  it("degradasi otomatis tidak mengubah riwayat, sejauh apa pun jam dimajukan", () => {
    seed()
    const before = db.select().from(schema.batches).all()
    db.transaction((tx) => applyDueChanges(tx, NOW + 30 * DAY))
    assert.deepEqual(db.select().from(schema.batches).all(), before)
  })

  it("diisi ulang tanpa menggandakan data", () => {
    seed()
    const first = countRows()
    assert.equal(seed().ok, true)
    assert.deepEqual(countRows(), first)
  })

  it("mengikuti jam aplikasi saat diisi ulang", () => {
    seed(NOW)
    seed(NOW + 30 * DAY)
    const latest = db
      .select({ at: schema.claims.pickedUpAt })
      .from(schema.claims)
      .all()
      .reduce((max, c) => Math.max(max, Date.parse(c.at ?? "")), 0)
    assert.ok(latest > NOW + 20 * DAY && latest < NOW + 30 * DAY)
  })

  it("penghapusan tidak menyentuh data lain", () => {
    const real: SurplusBatch = {
      id: "batch-asli",
      sppgId: "sppg-01",
      menu: "Data asli",
      category: "D",
      unit: "kg",
      quantity: 3,
      remainingQuantity: 3,
      foodType: "cooked",
      cookedAt: new Date(NOW).toISOString(),
      safeUntil: new Date(NOW).toISOString(),
      status: "discarded",
      createdAt: new Date(NOW).toISOString(),
    }
    db.insert(schema.batches).values(fromBatch(real)).run()
    seed()
    db.transaction((tx) => removeDemoHistory(tx))
    assert.deepEqual(countRows(), { batches: 1, claims: 0, events: 0, disposals: 0 })
    db.delete(schema.batches).run()
  })
})
