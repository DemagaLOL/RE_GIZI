import type { QuantityUnit } from "@/lib/data/types"

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 })
const dateTimeFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
})

const clockFormat = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
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

/** Format jarak, mis. `850 m` (di bawah 1 km) atau `2,3 km`. */
export function formatDistance(km: number): string {
  if (km < 1) return `${numberFormat.format(Math.max(10, Math.round(km * 100) * 10))} m`
  return `${numberFormat.format(km)} km`
}

/** Format tanggal & jam WIB, mis. `14 Okt 13.30`. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

/** Format jam lengkap dengan detik (WIB), mis. `Jum, 16 Okt 14.32.05`. */
export function formatClock(epochMs: number): string {
  return clockFormat.format(new Date(epochMs))
}

/** Format laju jam simulasi, mis. `60×`. */
export function formatSpeed(speed: number): string {
  return `${numberFormat.format(speed)}×`
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

/**
 * Kode ambil dikelompokkan per 3 digit agar mudah dibaca & dibacakan, mis. `048 213`.
 * Juga dipakai untuk kode yang baru diketik sebagian (`0482` → `048 2`).
 */
export function formatPickupCode(code: string): string {
  return code.replace(/(\d{3})(?=\d)/g, "$1 ")
}

/** Batas aman tinggal kurang dari 1 jam — tampilkan sebagai peringatan. */
export function isNearDeadline(iso: string, now: number): boolean {
  const diff = Date.parse(iso) - now
  return diff > 0 && diff < 60 * 60 * 1000
}
