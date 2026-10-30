import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, before, describe, it } from "node:test"
import { and, eq } from "drizzle-orm"
import { applyBatchUpdate, applyBatchWithdrawal } from "./batch-edit"
import { openDatabase, type Db } from "./db/client"
import { fromBatch, fromClaim } from "./db/mappers"
import * as schema from "./db/schema"
import { applyDueChanges } from "./due-changes"
import { applyCollection, selectDisposalsBySppg } from "./disposal-core"
import type { Claim, SurplusBatch, UpdateBatchInput } from "./types"

const HOUR = 60 * 60 * 1000
const COOKED = Date.parse("2026-10-16T05:00:00.000Z")
const NOW = COOKED + HOUR
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
    notes: "Bawa wadah",
    createdAt: iso(COOKED),
    ...overrides,
  }
  db.insert(schema.batches).values(fromBatch(batch)).run()
  return batch
}

/** Sisipkan batch kategori D (langsung dicatat, belum diangkut). */
function seedDiscarded(id: string): SurplusBatch {
  return seedBatch(id, {
    category: "D",
    unit: "kg",
    quantity: 12,
    remainingQuantity: 12,
    safeUntil: iso(COOKED),
    status: "discarded",
  })
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

/** Catat batch pernah turun kategori. */
function seedDegradationEvent(batchId: string): void {
  db.insert(schema.batchCategoryEvents)
    .values({
      id: `${batchId}-ev`,
      batchId,
      fromCategory: "C",
      toCategory: "D",
      quantityBefore: 12,
      unitBefore: "kg",
      quantityAfter: 12,
      unitAfter: "kg",
      reason: "auto",
      note: null,
      occurredAt: iso(NOW),
    })
    .run()
}

const getBatch = (id: string) => db.select().from(schema.batches).where(eq(schema.batches.id, id)).get()
const getClaim = (id: string) => db.select().from(schema.claims).where(eq(schema.claims.id, id)).get()
const update = (batchId: string, changes: Partial<UpdateBatchInput> = {}) =>
  db.transaction((tx) =>
    applyBatchUpdate(
      tx,
      { sppgId: "sppg-01", batchId, menu: "Nasi, ayam, sayur", quantity: 40, ...changes },
      NOW
    )
  )
const withdraw = (batchId: string, reason = "Salah catat", sppgId = "sppg-01") =>
  db.transaction((tx) => applyBatchWithdrawal(tx, { sppgId, batchId, reason }, NOW))

describe("applyBatchUpdate", () => {
  it("mengubah menu dan catatan, merapikan spasi, dan catatan bisa dikosongkan", () => {
    seedBatch("u1")
    const result = update("u1", { menu: "  Nasi goreng  ", notes: "   " })
    assert.equal(result.ok, true)
    const row = getBatch("u1")
    assert.equal(row?.menu, "Nasi goreng")
    assert.equal(row?.notes, null)
    assert.equal(result.ok && result.data.notes, undefined)
  })

  it("menambah jumlah menambah sisa dan batch reserved tersedia lagi", () => {
    seedBatch("u2", { remainingQuantity: 0, status: "reserved" })
    seedClaim("u2-c", "u2", { quantity: 40 })
    assert.equal(update("u2", { quantity: 50 }).ok, true)
    const row = getBatch("u2")
    assert.equal(row?.quantity, 50)
    assert.equal(row?.remainingQuantity, 10)
    assert.equal(row?.status, "available")
    assert.equal(getClaim("u2-c")?.status, "pending")
  })

  it("mengurangi jumlah sampai sama dengan yang diklaim membuat batch reserved", () => {
    seedBatch("u3", { remainingQuantity: 30 })
    seedClaim("u3-c", "u3")
    assert.equal(update("u3", { quantity: 10 }).ok, true)
    const row = getBatch("u3")
    assert.equal(row?.remainingQuantity, 0)
    assert.equal(row?.status, "reserved")
  })

  it("batch menjadi completed bila semua jumlah barunya sudah diambil", () => {
    seedBatch("u4", { remainingQuantity: 30 })
    seedClaim("u4-c", "u4", { status: "picked_up" })
    assert.equal(update("u4", { quantity: 10 }).ok, true)
    assert.equal(getBatch("u4")?.status, "completed")
  })

  it("menolak jumlah di bawah yang sudah diklaim tanpa mengubah apa pun", () => {
    seedBatch("u5", { remainingQuantity: 30 })
    seedClaim("u5-c", "u5")
    const result = update("u5", { quantity: 9, menu: "Berubah" })
    assert.match(result.ok ? "" : result.error, /kurang dari yang sudah diklaim \(10 porsi\)/)
    const row = getBatch("u5")
    assert.equal(row?.quantity, 40)
    assert.equal(row?.menu, "Nasi, ayam, sayur")
  })

  it("menolak jumlah tidak valid sesuai satuan", () => {
    seedBatch("u6")
    assert.equal(update("u6", { quantity: 0 }).ok, false)
    assert.equal(update("u6", { quantity: 1.5 }).ok, false)
    assert.equal(update("u6", { quantity: Number.NaN }).ok, false)
    assert.equal(getBatch("u6")?.quantity, 40)
  })

  it("menolak menu kosong", () => {
    seedBatch("u7")
    assert.deepEqual(update("u7", { menu: "  " }), { ok: false, error: "Menu/isi tidak boleh kosong." })
  })

  it("jumlah batch yang pernah turun kategori terkunci, tetapi menu masih bisa diubah", () => {
    seedDiscarded("u8")
    seedDegradationEvent("u8")
    const locked = update("u8", { quantity: 1 })
    assert.match(locked.ok ? "" : locked.error, /sudah turun kategori/)
    assert.equal(getBatch("u8")?.quantity, 12)
    assert.equal(update("u8", { quantity: 12, menu: "Sisa basi" }).ok, true)
    assert.equal(getBatch("u8")?.menu, "Sisa basi")
  })

  it("batch D yang dicatat langsung bisa dikoreksi dan tetap menunggu diangkut", () => {
    seedDiscarded("u9")
    assert.equal(update("u9", { quantity: 8 }).ok, true)
    const row = getBatch("u9")
    assert.equal(row?.quantity, 8)
    assert.equal(row?.remainingQuantity, 8)
    assert.equal(row?.status, "discarded")
  })

  it("menolak batch milik SPPG lain dan batch yang sudah selesai", () => {
    seedBatch("u10")
    const other = db.transaction((tx) =>
      applyBatchUpdate(tx, { sppgId: "sppg-99", batchId: "u10", menu: "x", quantity: 40 }, NOW)
    )
    assert.deepEqual(other, { ok: false, error: "Batch tidak ditemukan di SPPG ini." })
    seedBatch("u11", { remainingQuantity: 0, status: "completed" })
    assert.deepEqual(update("u11"), { ok: false, error: "Semua sisa batch ini sudah diambil." })
  })
})

describe("applyBatchWithdrawal", () => {
  it("membatalkan klaim pending, mengosongkan sisa, dan menyimpan alasan", () => {
    seedBatch("w1", { remainingQuantity: 30 })
    seedClaim("w1-c", "w1")
    const result = withdraw("w1", "  Salah menu  ")
    assert.equal(result.ok, true)
    const row = getBatch("w1")
    assert.equal(row?.status, "withdrawn")
    assert.equal(row?.remainingQuantity, 0)
    assert.equal(row?.withdrawReason, "Salah menu")
    assert.equal(row?.withdrawnAt, iso(NOW))
    const claim = getClaim("w1-c")
    assert.equal(claim?.status, "cancelled")
    assert.equal(claim?.cancelReason, "withdrawn")
  })

  it("menolak batch yang sebagian sudah diambil tanpa mengubah apa pun", () => {
    seedBatch("w2", { remainingQuantity: 20 })
    seedClaim("w2-p", "w2", { status: "picked_up" })
    seedClaim("w2-c", "w2", { recipientId: "rcp-warga" })
    const result = withdraw("w2")
    assert.match(result.ok ? "" : result.error, /sudah diambil penerima/)
    assert.equal(getBatch("w2")?.status, "available")
    assert.equal(getClaim("w2-c")?.status, "pending")
  })

  it("klaim yang sudah dibatalkan tidak menghalangi penarikan", () => {
    seedBatch("w10")
    seedClaim("w10-c", "w10", { status: "cancelled", cancelReason: "recipient" })
    assert.equal(withdraw("w10").ok, true)
    assert.equal(getClaim("w10-c")?.cancelReason, "recipient")
  })

  it("batch yang ditarik tidak turun kategori saat batas amannya lewat", () => {
    seedBatch("w3")
    assert.equal(withdraw("w3").ok, true)
    db.transaction((tx) => applyDueChanges(tx, COOKED + 100 * HOUR))
    const row = getBatch("w3")
    assert.equal(row?.category, "A")
    assert.equal(row?.status, "withdrawn")
  })

  it("menolak alasan kosong atau terlalu panjang tanpa mengubah apa pun", () => {
    seedBatch("w4")
    assert.deepEqual(withdraw("w4", "   "), { ok: false, error: "Isi alasan penarikan." })
    assert.equal(withdraw("w4", "x".repeat(201)).ok, false)
    assert.equal(getBatch("w4")?.status, "available")
  })

  it("batch D yang dicatat langsung bisa ditarik dan keluar dari pengangkutan TPS", () => {
    seedDiscarded("w5")
    assert.equal(withdraw("w5").ok, true)
    const collected = db.transaction((tx) =>
      applyCollection(tx, { tpsId: "tps-01", batchId: "w5" }, NOW)
    )
    assert.deepEqual(collected, { ok: false, error: "Batch ini belum siap diangkut." })
  })

  it("batch D hasil penurunan tidak bisa ditarik", () => {
    seedDiscarded("w6")
    seedDegradationEvent("w6")
    const result = withdraw("w6")
    assert.match(result.ok ? "" : result.error, /tetap harus diangkut TPS/)
    assert.equal(getBatch("w6")?.status, "discarded")
  })

  it("menolak batch selesai, sudah ditarik, atau milik SPPG lain", () => {
    seedBatch("w7", { remainingQuantity: 0, status: "completed" })
    assert.deepEqual(withdraw("w7"), { ok: false, error: "Semua sisa batch ini sudah diambil." })
    seedBatch("w8")
    assert.equal(withdraw("w8").ok, true)
    assert.deepEqual(withdraw("w8"), { ok: false, error: "Batch ini sudah ditarik." })
    seedBatch("w9")
    assert.deepEqual(withdraw("w9", "Salah", "sppg-99"), {
      ok: false,
      error: "Batch tidak ditemukan di SPPG ini.",
    })
  })
})

describe("selectDisposalsBySppg", () => {
  it("mengembalikan pengangkutan beserta nama TPS, terbaru dulu", () => {
    seedDiscarded("d1")
    seedDiscarded("d2")
    db.transaction((tx) => applyCollection(tx, { tpsId: "tps-01", batchId: "d1", note: "Truk 1" }, NOW))
    db.transaction((tx) => applyCollection(tx, { tpsId: "tps-01", batchId: "d2" }, NOW + HOUR))

    const [first, second] = selectDisposalsBySppg(db, "sppg-01")
    assert.equal(first.batchId, "d2")
    assert.equal(first.tpsName, "TPST Purbalingga")
    assert.equal(first.menu, "Nasi, ayam, sayur")
    assert.equal(second.note, "Truk 1")
    assert.equal(second.quantity, 12)
  })

  it("tidak mengembalikan pengangkutan SPPG lain", () => {
    assert.deepEqual(selectDisposalsBySppg(db, "sppg-99"), [])
    const count = db
      .select()
      .from(schema.disposals)
      .where(and(eq(schema.disposals.tpsId, "tps-01")))
      .all().length
    assert.ok(count > 0)
  })
})
