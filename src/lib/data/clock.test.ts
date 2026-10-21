import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { applyClockInput, computeSimNow, isRealTime, type ClockAnchor } from "./clock"

const START = Date.parse("2026-01-01T07:00:00.000Z")
const REAL = 1_000_000

/** Anchor dari waktu nyata `REAL` ke `START` dengan laju `speed`. */
function anchor(speed = 1, paused = false): ClockAnchor {
  return { speed, paused, realAnchor: REAL, simAnchor: START }
}

/** Terapkan input yang pasti valid. */
function apply(current: ClockAnchor | null, input: Parameters<typeof applyClockInput>[1], realNow: number) {
  const result = applyClockInput(current, input, realNow)
  assert.ok(result.ok, result.ok ? "" : result.error)
  return result.data
}

describe("computeSimNow", () => {
  it("laju 1× mengikuti waktu nyata", () => {
    assert.equal(computeSimNow(anchor(), REAL + 5_000), START + 5_000)
  })

  it("laju 60×: 1 detik nyata = 60 detik simulasi", () => {
    assert.equal(computeSimNow(anchor(60), REAL + 1_000), START + 60_000)
  })

  it("dijeda membekukan waktu", () => {
    assert.equal(computeSimNow(anchor(60, true), REAL + 100_000), START)
  })
})

describe("applyClockInput", () => {
  it("mengganti laju di tengah jalan tidak membuat waktu melompat", () => {
    const before = computeSimNow(anchor(1), REAL + 10_000)
    const next = apply(anchor(1), { speed: 60 }, REAL + 10_000)
    assert.equal(computeSimNow(next, REAL + 10_000), before)
    assert.equal(computeSimNow(next, REAL + 12_000), before + 120_000)
  })

  it("melanjutkan jeda meneruskan dari titik beku", () => {
    const paused = apply(anchor(60), { paused: true }, REAL + 1_000)
    const frozen = computeSimNow(paused, REAL + 1_000)
    assert.equal(computeSimNow(paused, REAL + 100_000), frozen)
    const resumed = apply(paused, { paused: false }, REAL + 100_000)
    assert.equal(computeSimNow(resumed, REAL + 101_000), frozen + 60_000)
  })

  it("memindah jam ke titik waktu tertentu", () => {
    const at = START + 4 * 60 * 60 * 1000
    const next = apply(anchor(), { at: new Date(at).toISOString() }, REAL)
    assert.equal(computeSimNow(next, REAL), at)
  })

  it("tanpa anchor (waktu nyata) dimulai dari waktu nyata", () => {
    const next = apply(null, { speed: 60 }, REAL)
    assert.equal(computeSimNow(next, REAL + 1_000), REAL + 60_000)
  })

  it("menolak laju tidak valid tanpa perubahan parsial", () => {
    for (const speed of [0, -1, 601, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(applyClockInput(anchor(), { speed, paused: true }, REAL).ok, false)
    }
  })

  it("menolak memundurkan jam dan waktu tidak valid", () => {
    assert.equal(applyClockInput(anchor(), { at: new Date(START - 60_000).toISOString() }, REAL).ok, false)
    assert.equal(applyClockInput(anchor(), { at: "bukan-waktu" }, REAL).ok, false)
  })
})

describe("isRealTime", () => {
  it("laju 1× tanpa selisih dianggap waktu nyata", () => {
    assert.equal(isRealTime({ speed: 1, paused: false, realAnchor: REAL, simAnchor: REAL }, REAL + 5_000), true)
  })

  it("dipercepat, dijeda, atau bergeser bukan waktu nyata", () => {
    assert.equal(isRealTime({ speed: 60, paused: false, realAnchor: REAL, simAnchor: REAL }, REAL), false)
    assert.equal(isRealTime({ speed: 1, paused: true, realAnchor: REAL, simAnchor: REAL }, REAL + 5_000), false)
    assert.equal(isRealTime(anchor(), REAL), false)
  })
})
