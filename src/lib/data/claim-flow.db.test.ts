import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, before, beforeEach, describe, it } from "node:test"
import { eq } from "drizzle-orm"
import { applySppgClaimCancellation, hasOverdueClaims } from "./claim-cancel"
import { applyClaim, recipientAllowance } from "./claim-core"
import { MAX_ACTIVE_CLAIMS } from "./constants"
import { openDatabase, type Db } from "./db/client"
import { fromBatch, fromClaim, fromSppg, toBatch } from "./db/mappers"
import * as schema from "./db/schema"
import { applyDueChanges, syncDueChanges } from "./due-changes"
import type { Claim, SurplusBatch } from "./types"

const HOUR = 60 * 60 * 1000
const COOKED = Date.parse("2026-10-16T05:00:00.000Z")
const NOW = COOKED + HOUR
const iso = (ms: number) => new Date(ms).toISOString()

let dir: string
let db: Db

before(() => {
  dir = mkdtempSync(path.join(tmpdir(), "regizi-test-"))
  db = openDatabase(path.join(dir, "test.db"))
  db.insert(schema.sppg)
    .values(
      fromSppg({
        id: "sppg-02",
        name: "SPPG Lain",
        operator: "Yayasan Lain",
        address: "Desa Lain",
        district: "Kalimanah",
        regency: "Purbalingga",
        location: { lat: -7.43, lng: 109.33 },
        dailyCapacity: 1000,
      })
    )
    .run()
})

beforeEach(() => {
  db.delete(schema.claims).run()
})

after(() => {
  db.$client.close()
  rmSync(dir, { recursive: true, force: true })
})

/** Sisipkan batch A 40 porsi yang tersedia (bisa ditimpa `overrides`). */
function seedBatch(id: string, overrides: Partial<SurplusBatch> = {}): SurplusBatch {
  const batch: SurplusBatch = {
    id,
    sppgId: "sppg-01",
    menu: "Nasi, ayam, sayur",
    category: "A",
    unit: "porsi",
    quantity: 40,
    remainingQuantity: 40,
    foodType: "cooked",
    cookedAt: iso(COOKED),
    safeUntil: iso(COOKED + 4 * HOUR),
    status: "available",
    createdAt: iso(COOKED),
    ...overrides,
  }
  db.insert(schema.batches).values(fromBatch(batch)).run()
  return batch
}

/** Sisipkan klaim pada batch (status `pending` kecuali ditimpa). */
function seedClaim(id: string, batchId: string, overrides: Partial<Claim> = {}): Claim {
  const claim: Claim = {
    id,
    batchId,
    recipientId: "rcp-umkm",
    category: "A",
    unit: "porsi",
    quantity: 10,
    status: "pending",
    pickupCode: `${id}-code`,
    claimedAt: iso(NOW),
    ...overrides,
  }
  db.insert(schema.claims).values(fromClaim(claim)).run()
  return claim
}

const getBatch = (id: string) => db.select().from(schema.batches).where(eq(schema.batches.id, id)).get()
const getClaim = (id: string) => db.select().from(schema.claims).where(eq(schema.claims.id, id)).get()
const claim = (batchId: string, quantity: number, recipientId = "rcp-umkm") =>
  db.transaction((tx) => applyClaim(tx, { batchId, recipientId, quantity }, NOW))
const applyDue = (now: number) => db.transaction((tx) => applyDueChanges(tx, now))

describe("applyClaim", () => {
  it("menyimpan tenggat ambil dan mengurangi sisa", () => {
    seedBatch("a1")
    const result = claim("a1", 5)
    assert.equal(result.ok, true)
    assert.equal(result.ok && result.data.pickupDeadline, iso(NOW + HOUR))
    assert.equal(getBatch("a1")?.remainingQuantity, 35)
  })

  it("menolak kategori A melebihi jatah penerima tanpa mengubah sisa", () => {
    seedBatch("a2")
    const result = claim("a2", 21)
    assert.equal(result.ok, false)
    assert.match(result.ok ? "" : result.error, /Jatah Anda untuk sisa ini 20 porsi/)
    assert.equal(getBatch("a2")?.remainingQuantity, 40)
    assert.equal(claim("a2", 20).ok, true)
  })

  it("jumlah melebihi sisa tetap dilaporkan sebagai melebihi sisa", () => {
    seedBatch("a3", { remainingQuantity: 5 })
    const result = claim("a3", 6)
    assert.match(result.ok ? "" : result.error, /melebihi sisa \(5 porsi\)/)
  })

  it("kategori B boleh diklaim seluruhnya", () => {
    seedBatch("a4", {
      category: "B",
      unit: "kg",
      quantity: 12.5,
      remainingQuantity: 12.5,
      safeUntil: iso(COOKED + 24 * HOUR),
    })
    assert.equal(claim("a4", 12.5, "rcp-peternak").ok, true)
    assert.equal(getBatch("a4")?.status, "reserved")
  })

  it("menolak klaim kedua selagi klaim pertama masih aktif", () => {
    seedBatch("a5")
    assert.equal(claim("a5", 5).ok, true)
    const second = claim("a5", 5)
    assert.match(second.ok ? "" : second.error, /masih punya klaim aktif/)
  })

  it("penerima lain tetap bisa mengklaim batch yang sama", () => {
    seedBatch("a6")
    assert.equal(claim("a6", 20).ok, true)
    assert.equal(claim("a6", 20, "rcp-warga").ok, true)
    assert.equal(getBatch("a6")?.status, "reserved")
  })

  it("yang sudah diambil mengurangi jatah, klaim dibatalkan tidak", () => {
    seedBatch("a7", { remainingQuantity: 28 })
    seedClaim("a7-picked", "a7", { status: "picked_up", quantity: 12 })
    seedClaim("a7-cancel", "a7", { status: "cancelled", quantity: 15 })
    const allowance = recipientAllowance(db, toBatch(getBatch("a7")!), "rcp-umkm")
    assert.deepEqual(allowance, { ok: true, data: 8 })
    const result = claim("a7", 9)
    assert.match(result.ok ? "" : result.error, /Jatah Anda untuk sisa ini 8 porsi/)
    assert.equal(claim("a7", 8).ok, true)
  })

  it("menolak saat jatah batch sudah habis", () => {
    seedBatch("a8", { remainingQuantity: 20 })
    seedClaim("a8-picked", "a8", { status: "picked_up", quantity: 20 })
    const result = claim("a8", 1)
    assert.match(result.ok ? "" : result.error, /mencapai batas klaim/)
  })

  it("yang diambil saat kategori A tidak mengurangi jatah setelah turun ke B", () => {
    seedBatch("a9", {
      category: "B",
      unit: "kg",
      quantity: 10,
      remainingQuantity: 10,
      safeUntil: iso(COOKED + 24 * HOUR),
    })
    seedClaim("a9-picked", "a9", { status: "picked_up", quantity: 20, recipientId: "rcp-peternak" })
    assert.equal(claim("a9", 10, "rcp-peternak").ok, true)
  })

  it(`menolak bila penerima sudah punya ${MAX_ACTIVE_CLAIMS} klaim aktif`, () => {
    for (let i = 0; i < MAX_ACTIVE_CLAIMS; i += 1) {
      seedBatch(`b${i}`)
      assert.equal(claim(`b${i}`, 1, "rcp-warga").ok, true)
    }
    seedBatch("b-extra")
    const result = claim("b-extra", 1, "rcp-warga")
    assert.match(result.ok ? "" : result.error, /sudah punya 5 klaim aktif/)
  })

  it("menolak batch yang ditarik", () => {
    seedBatch("a10", { status: "withdrawn", remainingQuantity: 0 })
    assert.deepEqual(claim("a10", 1), { ok: false, error: "Sisa ini sudah ditarik SPPG." })
  })
})

describe("tenggat ambil", () => {
  it("klaim lewat tenggat batal dan jumlahnya kembali ke sisa", () => {
    seedBatch("e1", { remainingQuantity: 0, status: "reserved" })
    seedClaim("e1-c", "e1", { quantity: 40, pickupDeadline: iso(NOW + HOUR) })
    applyDue(NOW + HOUR)
    const row = getClaim("e1-c")
    assert.equal(row?.status, "cancelled")
    assert.equal(row?.cancelReason, "expired")
    const batch = getBatch("e1")
    assert.equal(batch?.remainingQuantity, 40)
    assert.equal(batch?.status, "available")
    assert.equal(batch?.category, "A")
  })

  it("klaim belum lewat tenggat tidak berubah", () => {
    seedBatch("e2", { remainingQuantity: 30 })
    seedClaim("e2-c", "e2", { pickupDeadline: iso(NOW + 2 * HOUR) })
    applyDue(NOW + HOUR)
    assert.equal(getClaim("e2-c")?.status, "pending")
    assert.equal(getBatch("e2")?.remainingQuantity, 30)
  })

  it("beberapa klaim lewat tenggat pada batch yang sama dijumlahkan semua", () => {
    seedBatch("e3", { remainingQuantity: 10 })
    seedClaim("e3-c1", "e3", { pickupDeadline: iso(NOW + HOUR) })
    seedClaim("e3-c2", "e3", { recipientId: "rcp-warga", quantity: 20, pickupDeadline: iso(NOW + HOUR) })
    applyDue(NOW + HOUR)
    assert.equal(getBatch("e3")?.remainingQuantity, 40)
  })

  it("klaim lama tanpa tenggat tidak batal sebelum batch turun kategori", () => {
    seedBatch("e4", { remainingQuantity: 30 })
    seedClaim("e4-c", "e4")
    applyDue(NOW + 2 * HOUR)
    assert.equal(getClaim("e4-c")?.status, "pending")
  })

  it("bila keduanya jatuh tempo, klaim batal karena turun kategori", () => {
    seedBatch("e5", { remainingQuantity: 30 })
    seedClaim("e5-c", "e5", { pickupDeadline: iso(COOKED + 4 * HOUR) })
    applyDue(COOKED + 5 * HOUR)
    assert.equal(getClaim("e5-c")?.cancelReason, "degraded")
    assert.equal(getBatch("e5")?.category, "B")
  })

  it("syncDueChanges memproses klaim lewat tenggat walau tidak ada batch jatuh tempo", () => {
    seedBatch("e6", { remainingQuantity: 30 })
    seedClaim("e6-c", "e6", { pickupDeadline: iso(NOW + HOUR) })
    assert.equal(hasOverdueClaims(db, NOW + HOUR), true)
    syncDueChanges(db, NOW + HOUR)
    assert.equal(getClaim("e6-c")?.status, "cancelled")
    assert.equal(hasOverdueClaims(db, NOW + HOUR), false)
  })
})

describe("applySppgClaimCancellation", () => {
  const cancel = (claimId: string, sppgId = "sppg-01") =>
    db.transaction((tx) => applySppgClaimCancellation(tx, { claimId, sppgId }, NOW))

  it("membatalkan klaim pending dan mengembalikan sisa", () => {
    seedBatch("s1", { remainingQuantity: 0, status: "reserved" })
    seedClaim("s1-c", "s1", { quantity: 40 })
    const result = cancel("s1-c")
    assert.equal(result.ok && result.data.cancelReason, "sppg")
    assert.equal(getClaim("s1-c")?.cancelReason, "sppg")
    assert.equal(getBatch("s1")?.remainingQuantity, 40)
    assert.equal(getBatch("s1")?.status, "available")
  })

  it("menolak klaim pada batch SPPG lain tanpa mengubah apa pun", () => {
    seedBatch("s2", { remainingQuantity: 30 })
    seedClaim("s2-c", "s2")
    assert.deepEqual(cancel("s2-c", "sppg-02"), { ok: false, error: "Klaim tidak ditemukan." })
    assert.equal(getClaim("s2-c")?.status, "pending")
    assert.equal(getBatch("s2")?.remainingQuantity, 30)
  })

  it("menolak klaim yang sudah diambil atau dibatalkan", () => {
    seedBatch("s3", { remainingQuantity: 20 })
    seedClaim("s3-p", "s3", { status: "picked_up" })
    seedClaim("s3-x", "s3", { status: "cancelled", recipientId: "rcp-warga" })
    assert.deepEqual(cancel("s3-p"), { ok: false, error: "Klaim ini sudah diambil." })
    assert.deepEqual(cancel("s3-x"), { ok: false, error: "Klaim ini sudah dibatalkan." })
    assert.equal(getBatch("s3")?.remainingQuantity, 20)
  })

  it("batch tetap reserved bila masih ada klaim lain yang menunggu", () => {
    seedBatch("s4", { remainingQuantity: 0, status: "reserved" })
    seedClaim("s4-a", "s4", { quantity: 20 })
    seedClaim("s4-b", "s4", { quantity: 20, recipientId: "rcp-warga" })
    assert.equal(cancel("s4-a").ok, true)
    assert.equal(getBatch("s4")?.remainingQuantity, 20)
    assert.equal(getBatch("s4")?.status, "available")
  })
})
