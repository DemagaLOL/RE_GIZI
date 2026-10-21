import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import { eq } from "drizzle-orm"
import { openDatabase, type Db } from "./db/client"
import { fromBatch } from "./db/mappers"
import * as schema from "./db/schema"
import { applyDueDegradations } from "./degradation"
import { applyCollection } from "./disposal-core"
import type { SurplusBatch, SurplusCategory } from "./types"

const HOUR = 60 * 60 * 1000
const COOKED = Date.parse("2026-10-16T05:00:00.000Z")
const iso = (ms: number) => new Date(ms).toISOString()

let dir: string
let db: Db

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), "regizi-test-"))
  db = openDatabase(path.join(dir, "test.db"))
})

after(() => {
  db.$client.close()
  rmSync(dir, { recursive: true, force: true })
})

/** Sisipkan batch 12 kg (D: `discarded`, C: `available` dengan batas 72 jam). */
function seedBatch(id: string, category: SurplusCategory): void {
  const batch: SurplusBatch = {
    id,
    sppgId: "sppg-01",
    menu: "Nasi basi, sayur",
    category,
    unit: "kg",
    quantity: 12,
    remainingQuantity: 12,
    foodType: "cooked",
    cookedAt: iso(COOKED),
    safeUntil: iso(category === "D" ? COOKED : COOKED + 72 * HOUR),
    status: category === "D" ? "discarded" : "available",
    createdAt: iso(COOKED),
  }
  db.insert(schema.batches).values(fromBatch(batch)).run()
}

const getBatch = (id: string) => db.select().from(schema.batches).where(eq(schema.batches.id, id)).get()
const getDisposals = (id: string) =>
  db.select().from(schema.disposals).where(eq(schema.disposals.batchId, id)).all()
const collect = (batchId: string, tpsId = "tps-01", now = COOKED + HOUR) =>
  db.transaction((tx) => applyCollection(tx, { tpsId, batchId, note: "  diangkut truk 2  " }, now))

describe("applyCollection", () => {
  it("mencatat pengangkutan seluruh sisa dan batch menjadi collected", () => {
    seedBatch("d1", "D")
    const result = collect("d1")
    assert.equal(result.ok, true)

    const [disposal] = getDisposals("d1")
    assert.equal(disposal.tpsId, "tps-01")
    assert.equal(disposal.quantity, 12)
    assert.equal(disposal.collectedAt, iso(COOKED + HOUR))
    assert.equal(disposal.note, "diangkut truk 2")

    const batch = getBatch("d1")
    assert.equal(batch?.status, "collected")
    assert.equal(batch?.remainingQuantity, 0)
    // Jumlah awal tetap, agar total kg dibuang di ringkasan dampak tidak berubah.
    assert.equal(batch?.quantity, 12)
  })

  it("menolak batch yang sudah diangkut tanpa mencatat ulang", () => {
    seedBatch("d2", "D")
    assert.equal(collect("d2").ok, true)
    assert.deepEqual(collect("d2"), { ok: false, error: "Batch ini sudah diangkut." })
    assert.equal(getDisposals("d2").length, 1)
  })

  it("menolak batch selain kategori D dan TPS yang tidak dikenal", () => {
    seedBatch("c1", "C")
    assert.deepEqual(collect("c1"), { ok: false, error: "Batch ini bukan sisa tidak layak." })
    seedBatch("d3", "D")
    assert.deepEqual(collect("d3", "tps-x"), { ok: false, error: "TPS tidak ditemukan." })
    assert.equal(getBatch("d3")?.status, "discarded")
  })

  it("batch yang turun otomatis ke D bisa diangkut", () => {
    seedBatch("c2", "C")
    const now = COOKED + 80 * HOUR
    db.transaction((tx) => applyDueDegradations(tx, now))
    assert.equal(getBatch("c2")?.status, "discarded")
    assert.equal(collect("c2", "tps-01", now).ok, true)
    assert.equal(getBatch("c2")?.status, "collected")
  })
})
