import type { SurplusCategory } from "@/lib/data/types"

/**
 * Satu pilihan waktu, dalam menit: sejak selesai dimasak (`COOKED_FIELD`) atau
 * sampai batas layak (`DRY_FIELD`).
 */
type CookedOption = { value: number; label: string }

/** Isian waktu masak di form pendaftaran sisa, disesuaikan per kategori. */
type CookedField = {
  label: string
  hint: string
  options: readonly CookedOption[]
  /** Nilai awal (menit), harus ada di `options`. */
  defaultValue: number
}

const HOUR = 60
const DAY = 24 * HOUR

/** Petunjuk untuk B/C: batas aman dihitung dari jam masak, bukan jam ompreng kembali. */
const FROM_KITCHEN = "Hitung dari jam masak di dapur, bukan jam ompreng kembali."

/**
 * Isian "waktu masak" per kategori. Batas aman selalu dihitung sejak dimasak
 * (A 4 jam, B 24 jam, C 72 jam), jadi setiap pilihan A–C masih menyisakan batas aman;
 * D tidak punya batas aman sehingga waktunya hanya untuk catatan. Dipakai bersama oleh
 * form (`create-batch-form.tsx`) dan validasi di `createBatchAction`.
 */
export const COOKED_FIELD: Record<SurplusCategory, CookedField> = {
  A: {
    label: "Selesai dimasak",
    hint: "Batas aman 4 jam dihitung dari jam ini.",
    options: [
      { value: 0, label: "Baru saja" },
      { value: 30, label: "30 menit lalu" },
      { value: HOUR, label: "1 jam lalu" },
      { value: 2 * HOUR, label: "2 jam lalu" },
      { value: 3 * HOUR, label: "3 jam lalu" },
    ],
    defaultValue: HOUR,
  },
  B: {
    label: "Umur makanan sejak dimasak",
    hint: `${FROM_KITCHEN} Layak pakan sampai 24 jam sejak dimasak.`,
    options: [
      { value: HOUR, label: "1 jam lalu" },
      { value: 2 * HOUR, label: "2 jam lalu" },
      { value: 4 * HOUR, label: "4 jam lalu" },
      { value: 6 * HOUR, label: "6 jam lalu" },
      { value: 8 * HOUR, label: "8 jam lalu" },
      { value: 12 * HOUR, label: "12 jam lalu" },
      { value: 18 * HOUR, label: "18 jam lalu" },
    ],
    defaultValue: 6 * HOUR,
  },
  C: {
    label: "Umur makanan sejak dimasak",
    hint: `${FROM_KITCHEN} Layak kompos sampai 72 jam (3 hari) sejak dimasak.`,
    options: [
      { value: 6 * HOUR, label: "6 jam lalu" },
      { value: 12 * HOUR, label: "12 jam lalu" },
      { value: DAY, label: "1 hari lalu" },
      { value: 36 * HOUR, label: "1,5 hari lalu" },
      { value: 2 * DAY, label: "2 hari lalu" },
      { value: 60 * HOUR, label: "2,5 hari lalu" },
    ],
    defaultValue: DAY,
  },
  D: {
    label: "Kira-kira dimasak",
    hint: "Hanya untuk catatan; sisa tidak layak langsung masuk antrean TPS.",
    options: [
      { value: 4 * HOUR, label: "Hari ini (4 jam lalu)" },
      { value: 8 * HOUR, label: "8 jam lalu" },
      { value: DAY, label: "1 hari lalu" },
      { value: 2 * DAY, label: "2 hari lalu" },
      { value: 3 * DAY, label: "3 hari lalu" },
    ],
    defaultValue: 8 * HOUR,
  },
}

/**
 * Isian batas layak makanan kering kategori A (roti, biskuit, dsb.); `value` = menit
 * ke depan. Pilihan terpanjang sama dengan `DRY_MAX_DAYS`.
 */
export const DRY_FIELD: CookedField = {
  label: "Layak dikonsumsi sampai",
  hint: "Lihat tanggal di kemasan dan pilih yang lebih awal. Setelah lewat, turun ke B (pakan).",
  options: [
    { value: DAY, label: "1 hari lagi" },
    { value: 2 * DAY, label: "2 hari lagi" },
    { value: 3 * DAY, label: "3 hari lagi" },
    { value: 5 * DAY, label: "5 hari lagi" },
    { value: 7 * DAY, label: "7 hari lagi" },
  ],
  defaultValue: 2 * DAY,
}
