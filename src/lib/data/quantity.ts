import type { QuantityUnit } from "./types"

/**
 * Aturan angka jumlah sisa makanan: porsi selalu bilangan bulat, kg paling banyak
 * 1 desimal. Setiap hasil penjumlahan/pengurangan jumlah dibulatkan lewat
 * `roundQuantity` agar ekor floating point (mis. `5 - 4.9 = 0.0999…`) tidak tersimpan.
 *
 * Modul murni (tanpa DB/Next.js) agar mudah dites.
 */

/** Toleransi pembanding desimal floating point. */
const EPSILON = 1e-9

/** Bulatkan jumlah sesuai satuannya: porsi ke bilangan bulat, kg ke 1 desimal. */
export function roundQuantity(value: number, unit: QuantityUnit): number {
  if (unit === "porsi") return Math.round(value)
  return Math.round(value * 10) / 10
}

/**
 * Validasi jumlah: harus positif; bilangan bulat bila porsi; paling banyak 1 desimal bila kg.
 * @returns Pesan galat, atau `null` bila valid.
 */
export function validateQuantity(quantity: number, unit: QuantityUnit): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return "Jumlah harus lebih dari 0."
  if (unit === "porsi" && !Number.isInteger(quantity)) return "Jumlah porsi harus bilangan bulat."
  if (unit === "kg" && Math.abs(roundQuantity(quantity, "kg") - quantity) > EPSILON) {
    return "Jumlah kg paling banyak 1 angka desimal (mis. 2,5)."
  }
  return null
}
