import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { pickupDeadline, recipientClaimCap } from "./claim-rules"
import type { SurplusBatch } from "./types"

const HOUR = 60 * 60 * 1000
const NOW = Date.parse("2026-10-16T05:00:00.000Z")
const iso = (ms: number) => new Date(ms).toISOString()

/** Batch minimal dengan batas aman jauh ke depan. */
function timing(
  overrides: Partial<Pick<SurplusBatch, "category" | "foodType" | "safeUntil">> = {}
): Pick<SurplusBatch, "category" | "foodType" | "safeUntil"> {
  return { category: "A", foodType: "cooked", safeUntil: iso(NOW + 100 * HOUR), ...overrides }
}

describe("pickupDeadline", () => {
  it("memakai jendela ambil tiap kategori", () => {
    assert.equal(pickupDeadline(timing(), NOW), NOW + HOUR)
    assert.equal(pickupDeadline(timing({ category: "B" }), NOW), NOW + 6 * HOUR)
    assert.equal(pickupDeadline(timing({ category: "C" }), NOW), NOW + 24 * HOUR)
  })

  it("makanan kering kategori A lebih longgar", () => {
    assert.equal(pickupDeadline(timing({ foodType: "dry" }), NOW), NOW + 24 * HOUR)
  })

  it("makanan kering yang sudah turun kategori memakai jendela kategorinya", () => {
    assert.equal(pickupDeadline(timing({ category: "B", foodType: "dry" }), NOW), NOW + 6 * HOUR)
  })

  it("tidak melewati batas aman batch", () => {
    const safeUntil = NOW + 30 * 60 * 1000
    assert.equal(pickupDeadline(timing({ safeUntil: iso(safeUntil) }), NOW), safeUntil)
  })
})

describe("recipientClaimCap", () => {
  it("kategori A dibatasi setengah batch", () => {
    assert.equal(recipientClaimCap("A", 100), 50)
    assert.equal(recipientClaimCap("A", 25), 13)
  })

  it("jatah kategori A minimal 10 porsi", () => {
    assert.equal(recipientClaimCap("A", 15), 10)
  })

  it("batch kecil bisa diambil seluruhnya", () => {
    assert.equal(recipientClaimCap("A", 6), 6)
  })

  it("kategori B dan C tidak dibatasi", () => {
    assert.equal(recipientClaimCap("B", 40), 40)
    assert.equal(recipientClaimCap("C", 12.5), 12.5)
  })
})
