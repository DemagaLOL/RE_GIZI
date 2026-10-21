import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { roundQuantity, validateQuantity } from "./quantity"

describe("roundQuantity", () => {
  it("menghapus ekor floating point pada kg", () => {
    assert.equal(roundQuantity(5 - 4.9, "kg"), 0.1)
    assert.equal(roundQuantity(0.1 + 0.2, "kg"), 0.3)
  })

  it("porsi dibulatkan ke bilangan bulat", () => {
    assert.equal(roundQuantity(20 - 7, "porsi"), 13)
    assert.equal(roundQuantity(2.9999999, "porsi"), 3)
  })
})

describe("validateQuantity", () => {
  it("menerima porsi bulat dan kg satu desimal", () => {
    assert.equal(validateQuantity(3, "porsi"), null)
    assert.equal(validateQuantity(0.1, "kg"), null)
    assert.equal(validateQuantity(12.5, "kg"), null)
  })

  it("menolak nol, negatif, dan bukan angka hingga", () => {
    assert.notEqual(validateQuantity(0, "kg"), null)
    assert.notEqual(validateQuantity(-1, "porsi"), null)
    assert.notEqual(validateQuantity(Number.NaN, "kg"), null)
  })

  it("menolak porsi pecahan dan kg lebih dari satu desimal", () => {
    assert.match(validateQuantity(1.5, "porsi") ?? "", /bilangan bulat/)
    assert.match(validateQuantity(0.05, "kg") ?? "", /1 angka desimal/)
  })
})
