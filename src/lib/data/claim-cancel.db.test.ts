import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import { eq } from "drizzle-orm"
import { applyClaimCancellation } from "./claim-cancel"
import { openDatabase, type Db } from "./db/client"
import { fromBatch, fromClaim } from "./db/mappers"
import * as schema from "./db/schema"
import { applyDueDegradations } from "./degradation"
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

/** Sisipkan batch A 20 porsi yang seluruhnya diklaim `rcp-umkm` dengan status klaim `status`. */
function seedClaimedBatch(id: string, status: Claim["status"]): Claim {
  const batch: SurplusBatch = {
    id,
    sppgId: "sppg-01",
    menu: "Nasi, ayam, sayur",
    category: "A",
    unit: "porsi",
    quantity: 20,
    remainingQuantity: status === "cancelled" ? 20 : 0,
    foodType: "cooked",
    cookedAt: iso(COOKED),
    safeUntil: iso(COOKED + 4 * HOUR),
    status: status === "picked_up" ? "completed" : status === "pending" ? "reserved" : "available",
    createdAt: iso(COOKED),
  }
  db.insert(schema.batches).values(fromBatch(batch)).run()
  const claim: Claim = {
    id: `${id}-c`,
    batchId: id,
    recipientId: "rcp-umkm",
    category: "A",
    unit: "porsi",
    quantity: 20,
    status,
    pickupCode: `${id}-code`,
    claimedAt: iso(COOKED + HOUR),
  }
  db.insert(schema.claims).values(fromClaim(claim)).run()
  return claim
}

const getBatch = (id: string) => db.select().from(schema.batches).where(eq(schema.batches.id, id)).get()
const getClaim = (id: string) => db.select().from(schema.claims).where(eq(schema.claims.id, id)).get()
const cancel = (claimId: string, recipientId = "rcp-umkm", now = COOKED + 2 * HOUR) =>
  db.transaction((tx) => applyClaimCancellation(tx, { claimId, recipientId }, now))

describe("applyClaimCancellation", () => {
  it("membatalkan klaim pending, mengembalikan sisa, dan batch tersedia lagi", () => {
    const claim = seedClaimedBatch("k1", "pending")
    const result = cancel(claim.id)
    assert.equal(result.ok, true)
    assert.equal(result.ok && result.data.cancelReason, "recipient")

    const row = getClaim(claim.id)
    assert.equal(row?.status, "cancelled")
    assert.equal(row?.cancelReason, "recipient")
    const batch = getBatch("k1")
    assert.equal(batch?.remainingQuantity, 20)
    assert.equal(batch?.status, "available")
  })

  it("menolak klaim milik penerima lain tanpa mengubah apa pun", () => {
    const claim = seedClaimedBatch("k2", "pending")
    const result = cancel(claim.id, "rcp-warga")
    assert.deepEqual(result, { ok: false, error: "Klaim tidak ditemukan." })
    assert.equal(getClaim(claim.id)?.status, "pending")
    assert.equal(getBatch("k2")?.remainingQuantity, 0)
  })

  it("menolak klaim yang sudah diambil atau sudah dibatalkan", () => {
    const picked = seedClaimedBatch("k3", "picked_up")
    assert.deepEqual(cancel(picked.id), { ok: false, error: "Klaim ini sudah diambil." })
    const cancelled = seedClaimedBatch("k4", "cancelled")
    assert.deepEqual(cancel(cancelled.id), { ok: false, error: "Klaim ini sudah dibatalkan." })
    assert.equal(getBatch("k4")?.remainingQuantity, 20)
  })

  it("lewat batas aman batch berstatus expired, bukan available", () => {
    const claim = seedClaimedBatch("k5", "pending")
    assert.equal(cancel(claim.id, "rcp-umkm", COOKED + 5 * HOUR).ok, true)
    assert.equal(getBatch("k5")?.status, "expired")
  })
})

describe("applyDegradation", () => {
  it("klaim pending yang batal karena turun kategori dicatat cancelReason degraded", () => {
    const claim = seedClaimedBatch("k6", "pending")
    db.transaction((tx) => applyDueDegradations(tx, COOKED + 5 * HOUR))
    const row = getClaim(claim.id)
    assert.equal(row?.status, "cancelled")
    assert.equal(row?.cancelReason, "degraded")
  })
})
