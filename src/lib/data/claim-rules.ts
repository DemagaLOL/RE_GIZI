import {
  CLAIM_MIN_PORTIONS,
  CLAIM_SHARE_LIMIT,
  DRY_PICKUP_WINDOW_HOURS,
  PICKUP_WINDOW_HOURS,
} from "./constants"
import type { SurplusBatch, SurplusCategory } from "./types"

/** Aturan klaim yang murni (tanpa DB) agar mudah dites. */

const HOUR = 60 * 60 * 1000

/**
 * Tenggat ambil klaim baru (epoch ms): jendela ambil kategori sejak `now`, tetapi tidak
 * melewati batas aman batch karena klaim batal saat batch turun kategori.
 */
export function pickupDeadline(
  batch: Pick<SurplusBatch, "category" | "foodType" | "safeUntil">,
  now: number
): number {
  const dry = batch.category === "A" && batch.foodType === "dry"
  const hours = dry ? DRY_PICKUP_WINDOW_HOURS : PICKUP_WINDOW_HOURS[batch.category]
  return Math.min(now + hours * HOUR, Date.parse(batch.safeUntil))
}

/**
 * Jumlah terbanyak yang boleh diambil satu penerima dari satu batch. Hanya kategori A
 * yang dibatasi (lihat `CLAIM_SHARE_LIMIT`).
 * @param quantity Jumlah awal batch.
 */
export function recipientClaimCap(category: SurplusCategory, quantity: number): number {
  if (category !== "A") return quantity
  return Math.min(quantity, Math.max(CLAIM_MIN_PORTIONS, Math.ceil(quantity * CLAIM_SHARE_LIMIT)))
}
