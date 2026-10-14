/**
 * Tipe domain RE:GIZI. Bentuknya sengaja datar & serializable (ID string, waktu ISO 8601)
 * agar bisa dipetakan 1:1 ke tabel Supabase dan dikirim ke Client Component.
 */

/** Kabupaten cakupan saat ini. */
export type Regency = "Purbalingga" | "Banyumas"

/** Koordinat WGS84. */
export type GeoPoint = { lat: number; lng: number }

/** Satuan Pelayanan Pemenuhan Gizi — dapur program MBG yang menyediakan sisa makanan. */
export type Sppg = {
  id: string
  name: string
  /** Yayasan/mitra pengelola dapur. */
  operator: string
  address: string
  district: string
  regency: Regency
  location: GeoPoint
  /** Kapasitas produksi harian (porsi). */
  dailyCapacity: number
}

/**
 * Kategori sisa makanan, ditentukan SPPG menurut kondisinya:
 * `A` = layak konsumsi; `B` = pakan ternak; `C` = kompos; `D` = tidak layak, dibuang.
 * Hanya A, B, dan C yang bisa diklaim penerima.
 */
export type SurplusCategory = "A" | "B" | "C" | "D"

/** Satuan kuantitas: `porsi` untuk kategori A, `kg` untuk B/C/D. */
export type QuantityUnit = "porsi" | "kg"

/**
 * Status batch:
 * - `available` — masih bisa diklaim (sisa > 0, belum lewat batas aman)
 * - `reserved` — sudah habis diklaim, menunggu diambil
 * - `completed` — semua klaim sudah diambil
 * - `expired` — lewat batas aman sebelum habis diklaim
 * - `discarded` — kategori D, dicatat untuk dibuang (tidak bisa diklaim)
 */
export type BatchStatus = "available" | "reserved" | "completed" | "expired" | "discarded"

/** Satu kiriman sisa makanan dari SPPG. */
export type SurplusBatch = {
  id: string
  sppgId: string
  /** Deskripsi menu/isi, mis. "Nasi, ayam suwir kecap, tumis buncis". */
  menu: string
  category: SurplusCategory
  unit: QuantityUnit
  /** Jumlah awal (porsi atau kg sesuai `unit`). */
  quantity: number
  /** Jumlah yang belum diklaim. */
  remainingQuantity: number
  /** Waktu selesai dimasak (ISO 8601). */
  cookedAt: string
  /** Batas aman konsumsi/pemanfaatan (ISO 8601). */
  safeUntil: string
  status: BatchStatus
  notes?: string
  createdAt: string
}

/** Batch beserta data SPPG asalnya (hasil join). */
export type SurplusBatchWithSppg = SurplusBatch & { sppg: Sppg }

/** Jenis penerima sisa makanan. */
export type RecipientType = "umkm" | "peternak" | "petani" | "warga" | "komposter"

/** Pihak yang mengklaim sisa makanan. */
export type Recipient = {
  id: string
  name: string
  type: RecipientType
  district: string
  regency: Regency
  location: GeoPoint
}

/** Status klaim: `pending` menunggu diambil, `picked_up` sudah diambil, `cancelled` dibatalkan. */
export type ClaimStatus = "pending" | "picked_up" | "cancelled"

/** Klaim penerima atas sebagian/seluruh batch. */
export type Claim = {
  id: string
  batchId: string
  recipientId: string
  /** Jumlah yang diklaim, dalam satuan batch. */
  quantity: number
  status: ClaimStatus
  /** Kode yang ditunjukkan ke petugas SPPG saat pengambilan. */
  pickupCode: string
  claimedAt: string
  pickedUpAt?: string
}

/** Klaim beserta batch & SPPG asalnya (hasil join). */
export type ClaimWithBatch = Claim & { batch: SurplusBatchWithSppg }

/** Input `confirmPickup`. */
export type ConfirmPickupInput = {
  sppgId: string
  pickupCode: string
}

/** Ringkasan dampak untuk dasbor & beranda. */
export type ImpactStats = {
  /** Jumlah tersalurkan (klaim tidak batal) per kategori, dalam satuan kategori. */
  distributed: Record<SurplusCategory, number>
  /** Total kg kategori D yang dicatat dibuang. */
  discardedKg: number
  availableBatches: number
  pendingClaims: number
  sppgCount: number
}

/** Filter untuk `getBatches`. Semua opsional dan digabung dengan AND. */
export type BatchFilter = {
  category?: SurplusCategory
  status?: BatchStatus
  sppgId?: string
  regency?: Regency
  /** Hanya batch yang kategorinya boleh diklaim jenis penerima ini. */
  recipientType?: RecipientType
}

/** Input `createBatch`. `safeUntil` dihitung dari kategori bila dikosongkan. */
export type CreateBatchInput = {
  sppgId: string
  menu: string
  category: SurplusCategory
  quantity: number
  cookedAt: string
  safeUntil?: string
  notes?: string
}

/** Input `claimBatch`. */
export type ClaimBatchInput = {
  batchId: string
  recipientId: string
  quantity: number
}

/** Hasil operasi tulis: sukses dengan data, atau gagal dengan pesan berbahasa Indonesia. */
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string }
