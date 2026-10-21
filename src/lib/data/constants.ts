import type {
  BatchStatus,
  ClaimStatus,
  DegradationReason,
  FoodType,
  GeoPoint,
  QuantityUnit,
  RecipientType,
  Regency,
  SurplusCategory,
} from "./types"

/** Kabupaten yang dilayani saat ini. */
export const REGENCIES: readonly Regency[] = ["Purbalingga", "Banyumas"]

/** Titik tengah kabupaten, dipakai sebagai lokasi awal penerima yang mendaftar sendiri. */
export const REGENCY_CENTER: Record<Regency, GeoPoint> = {
  Purbalingga: { lat: -7.3886, lng: 109.3634 },
  Banyumas: { lat: -7.4245, lng: 109.2302 },
}

/** Jenis penerima yang bisa dipilih saat mendaftar. */
export const RECIPIENT_TYPES: readonly RecipientType[] = [
  "umkm",
  "warga",
  "peternak",
  "petani",
  "komposter",
]

/**
 * Jumlah digit kode ambil (angka saja). 6 digit = pola OTP yang akrab, mudah diketik
 * lewat keypad angka, dan 1 juta kombinasi sehingga sulit ditebak.
 */
export const PICKUP_CODE_LENGTH = 6

/** Panjang minimal kata sandi akun. */
export const PASSWORD_MIN_LENGTH = 8

/**
 * Jenis penerima yang boleh mengklaim tiap kategori. Hanya penerima yang sesuai
 * yang boleh mengambil (mis. sisa B tidak pernah ke warga). Kategori D tidak bisa diklaim.
 */
export const ELIGIBLE_RECIPIENTS: Record<SurplusCategory, readonly RecipientType[]> = {
  A: ["umkm", "warga"],
  B: ["peternak"],
  C: ["petani", "komposter"],
  D: [],
}

/** Satuan kuantitas per kategori. */
export const CATEGORY_UNIT: Record<SurplusCategory, QuantityUnit> = {
  A: "porsi",
  B: "kg",
  C: "kg",
  D: "kg",
}

/**
 * Jendela aman default sejak dimasak (jam). Kategori A mengikuti batas 4 jam
 * makanan matang di suhu ruang; B & C lebih longgar. D tidak punya jendela (0).
 * Sekaligus ambang degradasi kumulatif: lewat jam ke-4 A→B, jam ke-24 B→C, jam ke-72 C→D.
 */
export const SAFE_WINDOW_HOURS: Record<SurplusCategory, number> = {
  A: 4,
  B: 24,
  C: 72,
  D: 0,
}

/**
 * Batas layak terpanjang (hari) untuk makanan kering kategori A (roti, biskuit, dsb.).
 * Dibatasi agar sisa tetap cepat disalurkan meski kemasannya tahan lebih lama.
 */
export const DRY_MAX_DAYS = 7

/** Label jenis makanan untuk UI. */
export const FOOD_TYPE_LABEL: Record<FoodType, string> = {
  cooked: "Makanan matang",
  dry: "Makanan kering",
}

/** Urutan kondisi dari terbaik ke terburuk; kategori hanya bisa turun mengikuti urutan ini. */
export const CATEGORY_ORDER: readonly SurplusCategory[] = ["A", "B", "C", "D"]

/** Kategori berikutnya saat batas aman terlewati; D adalah akhir. */
export const NEXT_CATEGORY: Record<SurplusCategory, SurplusCategory | null> = {
  A: "B",
  B: "C",
  C: "D",
  D: null,
}

/**
 * Estimasi berat satu porsi MBG (nasi, lauk, sayur, buah) dalam kg, untuk
 * mengonversi sisa kategori A (porsi) ke B/C/D (kg) saat turun kategori.
 */
export const KG_PER_PORTION = 0.4

/** Laju jam simulasi maksimum (600× = 1 detik nyata menjadi 10 menit). Sama dengan `api/core/clock.py`. */
export const MAX_CLOCK_SPEED = 600

/** Pilihan laju di panel simulasi waktu. */
export const CLOCK_SPEED_PRESETS: readonly number[] = [1, 60, 360, 600]

export const DEGRADATION_REASON_LABEL: Record<DegradationReason, string> = {
  auto: "Otomatis",
  manual: "Oleh SPPG",
}

/** Nama kategori untuk ditampilkan di UI. */
export const CATEGORY_LABEL: Record<SurplusCategory, string> = {
  A: "Layak Konsumsi",
  B: "Pakan Ternak",
  C: "Kompos",
  D: "Tidak Layak (Dibuang)",
}

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  available: "Tersedia",
  reserved: "Dipesan",
  completed: "Selesai",
  expired: "Kedaluwarsa",
  discarded: "Menunggu Diangkut",
  collected: "Sudah Diangkut",
}

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  pending: "Menunggu Diambil",
  picked_up: "Sudah Diambil",
  cancelled: "Dibatalkan",
}

export const RECIPIENT_TYPE_LABEL: Record<RecipientType, string> = {
  umkm: "UMKM",
  peternak: "Peternak",
  petani: "Petani",
  warga: "Warga",
  komposter: "Komposter",
}
