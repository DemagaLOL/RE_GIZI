import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import { eq } from "drizzle-orm"
import { openDatabase, type Db } from "./db/client"
import { fromBatch, fromClaim } from "./db/mappers"
import * as schema from "./db/schema"
import { applyDegradation, applyDueDegradations, planManualDegradation } from "./degradation"
import type { Claim, SurplusBatch } from "./types"

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

/** Sisipkan batch A 50 porsi + satu klaim per status yang diberikan. */
function seedBatch(id: string, claims: readonly { status: Claim["status"]; quantity: number }[]): SurplusBatch {
  const claimed = claims.filter((c) => c.status !== "cancelled").reduce((s, c) => s + c.quantity, 0)
  const batch: SurplusBatch = {
    id,
    sppgId: "sppg-01",
    menu: "Nasi, ayam, sayur",
    category: "A",
    unit: "porsi",
    quantity: 50,
    remainingQuantity: 50 - claimed,
    foodType: "cooked",
    cookedAt: iso(COOKED),
    safeUntil: iso(COOKED + 4 * HOUR),
    status: claimed === 50 ? "reserved" : "available",
    createdAt: iso(COOKED),
  }
  db.insert(schema.batches).values(fromBatch(batch)).run()
  claims.forEach((c, i) => {
    const claim: Claim = {
      id: `${id}-c${i}`,
      batchId: id,
      recipientId: "rcp-umkm",
      category: "A",
      unit: "porsi",
      quantity: c.quantity,
      status: c.status,
      pickupCode: `${id}-${i}`,
      claimedAt: iso(COOKED + HOUR),
    }
    db.insert(schema.claims).values(fromClaim(claim)).run()
  })
  return batch
}

const getBatch = (id: string) => db.select().from(schema.batches).where(eq(schema.batches.id, id)).get()
const getClaims = (id: string) => db.select().from(schema.claims).where(eq(schema.claims.batchId, id)).all()
const getEvents = (id: string) =>
  db.select().from(schema.batchCategoryEvents).where(eq(schema.batchCategoryEvents.batchId, id)).all()

describe("applyDueDegradations", () => {
  it("lewat jam ke-4: klaim pending batal, sisa kembali lalu dikonversi ke kg", () => {
    seedBatch("b1", [
      { status: "pending", quantity: 10 },
      { status: "picked_up", quantity: 15 },
    ])
    db.transaction((tx) => applyDueDegradations(tx, COOKED + 5 * HOUR))

    const batch = getBatch("b1")
    assert.equal(batch?.category, "B")
    assert.equal(batch?.unit, "kg")
    // 50 - 15 diambil = 35 porsi (25 sisa + 10 pending batal) × 0,4 = 14 kg.
    assert.equal(batch?.remainingQuantity, 14)
    assert.equal(batch?.quantity, 14)
    assert.equal(batch?.status, "available")
    assert.equal(batch?.safeUntil, iso(COOKED + 24 * HOUR))

    const claims = getClaims("b1")
    assert.deepEqual(claims.map((c) => [c.status, c.category, c.unit]), [
      ["cancelled", "A", "porsi"],
      ["picked_up", "A", "porsi"],
    ])

    const [event] = getEvents("b1")
    assert.equal(event.fromCategory, "A")
    assert.equal(event.toCategory, "B")
    assert.equal(event.quantityBefore, 35)
    assert.equal(event.quantityAfter, 14)
    assert.equal(event.reason, "auto")
    assert.equal(event.occurredAt, iso(COOKED + 4 * HOUR))
  })

  it("batch reserved (habis diklaim) ikut turun dan tersedia lagi", () => {
    seedBatch("b2", [{ status: "pending", quantity: 50 }])
    db.transaction((tx) => applyDueDegradations(tx, COOKED + 5 * HOUR))
    const batch = getBatch("b2")
    assert.equal(batch?.category, "B")
    assert.equal(batch?.remainingQuantity, 20)
    assert.equal(batch?.status, "available")
  })

  it("lewat jam ke-72 berakhir di D berstatus discarded dengan riwayat 3 langkah", () => {
    seedBatch("b3", [])
    db.transaction((tx) => applyDueDegradations(tx, COOKED + 100 * HOUR))
    const batch = getBatch("b3")
    assert.equal(batch?.category, "D")
    assert.equal(batch?.status, "discarded")
    assert.equal(batch?.remainingQuantity, 20)
    assert.deepEqual(getEvents("b3").map((e) => e.toCategory).sort(), ["B", "C", "D"])
  })

  it("tidak menyentuh batch yang belum jatuh tempo dan idempoten", () => {
    seedBatch("b4", [{ status: "pending", quantity: 5 }])
    db.transaction((tx) => applyDueDegradations(tx, COOKED + 3 * HOUR))
    db.transaction((tx) => applyDueDegradations(tx, COOKED + 3 * HOUR))
    assert.equal(getBatch("b4")?.category, "A")
    assert.equal(getClaims("b4")[0].status, "pending")
    assert.equal(getEvents("b4").length, 0)
  })
})

describe("applyDegradation manual", () => {
  it("A → C dengan catatan SPPG", () => {
    const batch = seedBatch("b5", [{ status: "pending", quantity: 5 }])
    const now = COOKED + HOUR
    db.transaction((tx) =>
      applyDegradation(tx, batch, planManualDegradation(batch, "C", now), "Nasi mulai basi")
    )
    const updated = getBatch("b5")
    assert.equal(updated?.category, "C")
    assert.equal(updated?.remainingQuantity, 20)
    assert.equal(updated?.safeUntil, iso(COOKED + 72 * HOUR))
    const [event] = getEvents("b5")
    assert.equal(event.reason, "manual")
    assert.equal(event.note, "Nasi mulai basi")
    assert.equal(getClaims("b5")[0].status, "cancelled")
  })
})
