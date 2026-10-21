import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { convertQuantity, planDegradation, planManualDegradation } from "./degradation"
import type { SurplusCategory } from "./types"

const HOUR = 60 * 60 * 1000
const COOKED = Date.parse("2026-10-16T05:00:00.000Z")
const iso = (ms: number) => new Date(ms).toISOString()

/** Batch yang dibuat dengan batas aman default kategorinya. */
function batch(category: SurplusCategory, windowHours: number) {
  return { category, cookedAt: iso(COOKED), safeUntil: iso(COOKED + windowHours * HOUR) }
}

describe("planDegradation", () => {
  it("A sebelum jam ke-4 tetap A", () => {
    assert.deepEqual(planDegradation(batch("A", 4), COOKED + 3 * HOUR), [])
  })

  it("A tepat di jam ke-4 turun ke B dengan batas jam ke-24", () => {
    const steps = planDegradation(batch("A", 4), COOKED + 4 * HOUR)
    assert.deepEqual(
      steps.map((s) => [s.from, s.to, s.at, s.safeUntil, s.reason]),
      [["A", "B", COOKED + 4 * HOUR, COOKED + 24 * HOUR, "auto"]]
    )
  })

  it("lompat 30 jam: A→B→C, tiap langkah di waktu ambangnya", () => {
    const steps = planDegradation(batch("A", 4), COOKED + 30 * HOUR)
    assert.deepEqual(
      steps.map((s) => [s.from, s.to, s.at, s.safeUntil]),
      [
        ["A", "B", COOKED + 4 * HOUR, COOKED + 24 * HOUR],
        ["B", "C", COOKED + 24 * HOUR, COOKED + 72 * HOUR],
      ]
    )
  })

  it("lewat jam ke-72 berakhir di D dengan batas = waktu ambang", () => {
    const steps = planDegradation(batch("A", 4), COOKED + 80 * HOUR)
    assert.deepEqual(steps.map((s) => s.to), ["B", "C", "D"])
    const last = steps[steps.length - 1]
    assert.equal(last.at, COOKED + 72 * HOUR)
    assert.equal(last.safeUntil, last.at)
  })

  it("batch B yang dibuat langsung berakhir di jam ke-24 sejak dimasak", () => {
    assert.deepEqual(planDegradation(batch("B", 24), COOKED + 23 * HOUR), [])
    assert.deepEqual(planDegradation(batch("B", 24), COOKED + 25 * HOUR).map((s) => s.to), ["C"])
  })

  it("batas aman khusus yang melewati jendela kategori berikutnya langsung berlanjut", () => {
    // A dengan batas aman khusus jam ke-30 (melewati batas B jam ke-24).
    const steps = planDegradation(batch("A", 30), COOKED + 30 * HOUR)
    assert.deepEqual(
      steps.map((s) => [s.to, s.at, s.safeUntil]),
      [
        ["B", COOKED + 30 * HOUR, COOKED + 30 * HOUR],
        ["C", COOKED + 30 * HOUR, COOKED + 72 * HOUR],
      ]
    )
  })

  it("kategori D tidak berubah", () => {
    assert.deepEqual(planDegradation(batch("D", 0), COOKED + 1_000 * HOUR), [])
  })
})

describe("planManualDegradation", () => {
  it("boleh melompat A→D dan langsung berakhir", () => {
    const now = COOKED + HOUR
    assert.deepEqual(planManualDegradation(batch("A", 4), "D", now), [
      { from: "A", to: "D", at: now, safeUntil: now, reason: "manual" },
    ])
  })

  it("A→C memakai jendela C sejak dimasak", () => {
    const [step] = planManualDegradation(batch("A", 4), "C", COOKED + HOUR)
    assert.equal(step.safeUntil, COOKED + 72 * HOUR)
  })

  it("tidak bisa tetap atau naik kategori", () => {
    assert.deepEqual(planManualDegradation(batch("B", 24), "B", COOKED), [])
    assert.deepEqual(planManualDegradation(batch("B", 24), "A", COOKED), [])
  })
})

describe("convertQuantity", () => {
  it("porsi → kg memakai 0,4 kg/porsi, dibulatkan 1 desimal", () => {
    assert.equal(convertQuantity(50, "porsi", "kg"), 20)
    assert.equal(convertQuantity(3, "porsi", "kg"), 1.2)
  })

  it("sisa kecil tetap minimal 0,1 kg", () => {
    assert.equal(convertQuantity(0.1, "porsi", "kg"), 0.1)
    assert.equal(convertQuantity(0, "porsi", "kg"), 0)
  })

  it("satuan sama tidak berubah", () => {
    assert.equal(convertQuantity(12.5, "kg", "kg"), 12.5)
  })
})
