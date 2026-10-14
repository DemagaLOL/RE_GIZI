import type { QuantityUnit } from "@/lib/data/types"

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 })
const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
})

/** Format angka locale Indonesia, mis. `1.250` atau `12,5`. */
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** Format kuantitas dengan satuan, mis. `45 porsi` atau `12,5 kg`. */
export function formatQuantity(value: number, unit: QuantityUnit): string {
  return `${numberFormat.format(value)} ${unit}`
}

/** Format tanggal & jam WIB, mis. `14 Okt 13.30`. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/**
 * Sisa waktu menuju batas, mis. `2 jam 15 menit lagi`, atau `lewat batas` bila sudah lewat.
 * @param now Epoch ms saat ini (dihitung pemanggil agar konsisten dalam satu render).
 */
export function formatTimeLeft(iso: string, now: number): string {
  const diffMin = Math.floor((Date.parse(iso) - now) / 60_000)
  if (diffMin <= 0) return "lewat batas"
  const hours = Math.floor(diffMin / 60)
  const minutes = diffMin % 60
  if (hours >= 24) return `${Math.floor(hours / 24)} hari lagi`
  if (hours === 0) return `${minutes} menit lagi`
  return minutes === 0 ? `${hours} jam lagi` : `${hours} jam ${minutes} menit lagi`
}

/** Batas aman tinggal kurang dari 1 jam — tampilkan sebagai peringatan. */
export function isNearDeadline(iso: string, now: number): boolean {
  const diff = Date.parse(iso) - now
  return diff > 0 && diff < 60 * 60 * 1000
}
