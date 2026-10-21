import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { distanceKm, isValidGeoPoint } from "./geo"

const PURBALINGGA = { lat: -7.3886, lng: 109.3634 }
const PURWOKERTO = { lat: -7.4245, lng: 109.239 }

describe("distanceKm", () => {
  it("titik yang sama berjarak 0", () => {
    assert.equal(distanceKm(PURBALINGGA, PURBALINGGA), 0)
  })

  it("Purbalingga–Purwokerto sekitar 14 km dan simetris", () => {
    const d = distanceKm(PURBALINGGA, PURWOKERTO)
    assert.ok(d > 13 && d < 15, `dapat ${d}`)
    assert.equal(d, distanceKm(PURWOKERTO, PURBALINGGA))
  })
})

describe("isValidGeoPoint", () => {
  it("menerima koordinat dalam rentang", () => {
    assert.equal(isValidGeoPoint(PURBALINGGA), true)
    assert.equal(isValidGeoPoint({ lat: -90, lng: 180 }), true)
  })

  it("menolak di luar rentang atau bukan angka hingga", () => {
    assert.equal(isValidGeoPoint({ lat: 91, lng: 0 }), false)
    assert.equal(isValidGeoPoint({ lat: 0, lng: -181 }), false)
    assert.equal(isValidGeoPoint({ lat: Number.NaN, lng: 0 }), false)
    assert.equal(isValidGeoPoint({ lat: 0, lng: Number.POSITIVE_INFINITY }), false)
  })
})
