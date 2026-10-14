import type {
  BatchStatus,
  ClaimStatus,
  QuantityUnit,
  RecipientType,
  SurplusCategory,
} from "./types"

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
 */
export const SAFE_WINDOW_HOURS: Record<SurplusCategory, number> = {
  A: 4,
  B: 24,
  C: 72,
  D: 0,
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
  discarded: "Dibuang",
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
