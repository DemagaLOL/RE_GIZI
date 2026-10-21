/**
 * Tipe domain RE:GIZI. Bentuknya sengaja datar & serializable (ID string, waktu ISO 8601)
 * agar bisa dipetakan 1:1 ke tabel SQLite (`db/schema.ts`) dan dikirim ke Client Component.
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
 * Hanya A, B, dan C yang bisa diklaim penerima; D diangkut oleh TPS.
 */
export type SurplusCategory = "A" | "B" | "C" | "D"

/** Satuan kuantitas: `porsi` untuk kategori A, `kg` untuk B/C/D. */
export type QuantityUnit = "porsi" | "kg"

/**
 * Status batch:
 * - `available` — masih bisa diklaim (sisa > 0, belum lewat batas aman)
 * - `reserved` — sudah habis diklaim, menunggu diambil
 * - `completed` — semua klaim sudah diambil
 * - `expired` — lewat batas aman sebelum habis diklaim (data lama; kini batch turun
 *   kategori alih-alih kedaluwarsa)
 * - `discarded` — kategori D, menunggu diangkut TPS (tidak bisa diklaim penerima)
 * - `collected` — kategori D yang sudah diangkut TPS (lihat `Disposal`)
 */
export type BatchStatus =
  | "available"
  | "reserved"
  | "completed"
  | "expired"
  | "discarded"
  | "collected"

/**
 * Jenis makanan: `cooked` = makanan matang (batas aman dihitung sejak dimasak);
 * `dry` = makanan kering seperti roti/biskuit (batas aman dari `bestBefore`, hanya kategori A).
 */
export type FoodType = "cooked" | "dry"

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
  foodType: FoodType
  /** Waktu selesai dimasak (ISO 8601); untuk makanan kering = waktu dicatat. */
  cookedAt: string
  /** Batas aman konsumsi/pemanfaatan (ISO 8601). */
  safeUntil: string
  /**
   * Batas layak konsumsi makanan kering (ISO 8601), hanya untuk `foodType: "dry"`.
   * Jendela B/C dihitung dari sini alih-alih dari `cookedAt` (lihat `degradation.ts`).
   */
  bestBefore?: string
  status: BatchStatus
  notes?: string
  createdAt: string
}

/** Batch beserta data SPPG asalnya (hasil join). */
export type SurplusBatchWithSppg = SurplusBatch & {
  sppg: Sppg
  /** Jarak garis lurus ke SPPG (km); hanya ada bila `getBatches` dipanggil dengan `near`. */
  distanceKm?: number
}

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

/**
 * Penyebab klaim dibatalkan: `degraded` = batch turun kategori sebelum diambil,
 * `recipient` = dibatalkan sendiri oleh penerima.
 */
export type ClaimCancelReason = "degraded" | "recipient"

/** Klaim penerima atas sebagian/seluruh batch. */
export type Claim = {
  id: string
  batchId: string
  recipientId: string
  /**
   * Kategori & satuan batch saat diklaim (snapshot). Batch bisa turun kategori
   * setelahnya, tetapi klaim tetap tercatat menurut kondisi saat diklaim.
   */
  category: SurplusCategory
  unit: QuantityUnit
  /** Jumlah yang diklaim, dalam `unit`. */
  quantity: number
  status: ClaimStatus
  /** Kode yang ditunjukkan ke petugas SPPG saat pengambilan. */
  pickupCode: string
  claimedAt: string
  pickedUpAt?: string
  /** Hanya untuk klaim `cancelled`; kosong pada data lama. */
  cancelReason?: ClaimCancelReason
}

/** Klaim beserta batch & SPPG asalnya (hasil join). */
export type ClaimWithBatch = Claim & { batch: SurplusBatchWithSppg }

/** Klaim beserta nama penerimanya (hasil join), untuk dasbor SPPG. */
export type ClaimWithRecipient = Claim & { recipientName: string }

/** Input `confirmPickup` dan `getPickupPreview`. */
export type ConfirmPickupInput = {
  sppgId: string
  pickupCode: string
}

/** Detail klaim yang ditampilkan ke petugas SPPG sebelum mengonfirmasi pengambilan. */
export type PickupPreview = {
  claim: Claim
  batch: SurplusBatch
  recipient: Recipient
}

/** Ringkasan dampak untuk dasbor & beranda. */
export type ImpactStats = {
  /** Jumlah tersalurkan (klaim `picked_up`) per kategori, dalam satuan kategori. */
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
  /** Titik acuan; bila diisi, setiap batch mendapat `distanceKm` ke SPPG-nya. */
  near?: GeoPoint
  /** `deadline` (default) = batas aman terdekat dulu; `distance` = SPPG terdekat dulu (butuh `near`). */
  sort?: BatchSort
}

/** Urutan daftar batch. Status (tersedia dulu) selalu menjadi kunci pertama. */
export type BatchSort = "deadline" | "distance"

/** Input `createBatch`. `safeUntil` dihitung dari kategori bila dikosongkan. */
export type CreateBatchInput = {
  sppgId: string
  menu: string
  category: SurplusCategory
  quantity: number
  cookedAt: string
  safeUntil?: string
  /** Default `cooked`. `dry` hanya untuk kategori A dan wajib disertai `bestBefore`. */
  foodType?: FoodType
  /** Batas layak makanan kering (ISO 8601); paling lama `DRY_MAX_DAYS` hari lagi. */
  bestBefore?: string
  notes?: string
}

/** Input `claimBatch`. */
export type ClaimBatchInput = {
  batchId: string
  recipientId: string
  quantity: number
}

/** Input `cancelClaim`: penerima membatalkan klaim `pending` miliknya sendiri. */
export type CancelClaimInput = {
  claimId: string
  recipientId: string
}

/** Pemicu turunnya kategori: `auto` = lewat batas aman, `manual` = diturunkan SPPG. */
export type DegradationReason = "auto" | "manual"

/** Satu langkah turun kategori batch (A→B, B→C, C→D, atau lompatan manual). */
export type CategoryEvent = {
  id: string
  batchId: string
  fromCategory: SurplusCategory
  toCategory: SurplusCategory
  /** Sisa sebelum turun (termasuk klaim `pending` yang dibatalkan), dalam `unitBefore`. */
  quantityBefore: number
  unitBefore: QuantityUnit
  /** Sisa sesudah turun (hasil konversi satuan), dalam `unitAfter`. */
  quantityAfter: number
  unitAfter: QuantityUnit
  reason: DegradationReason
  note?: string
  /** Waktu terjadinya (ISO 8601); untuk `auto` = waktu ambang batas aman, bukan waktu baca. */
  occurredAt: string
}

/** Input `degradeBatch` (SPPG menurunkan kategori lebih awal, mis. makanan basi). */
export type DegradeBatchInput = {
  sppgId: string
  batchId: string
  /** Kategori tujuan; harus lebih rendah dari kategori sekarang. */
  toCategory: SurplusCategory
  note?: string
}

/** Keadaan jam aplikasi (bisa disimulasikan untuk demo). */
export type ClockState = {
  /** Waktu aplikasi saat ini (ISO 8601). */
  now: string
  /** Kelipatan laju waktu; 1 = sama dengan waktu nyata. */
  speed: number
  paused: boolean
  /** `true` bila jam tidak sama dengan waktu nyata (dipercepat, dijeda, atau dipindah). */
  simulated: boolean
  /** `false` bila simulasi waktu dimatikan (produksi tanpa `SIM_CLOCK=1`). */
  enabled: boolean
}

/** Input `setClock`. Semua opsional; yang tidak diisi tidak berubah. */
export type SetClockInput = {
  speed?: number
  /** Pindahkan jam ke titik waktu ini (ISO 8601). */
  at?: string
  paused?: boolean
}

/** Peran akun: pengelola SPPG, penerima, atau petugas TPS (pengangkut sisa kategori D). */
export type AccountRole = "sppg" | "recipient" | "tps"

/** Pengguna yang sudah terautentikasi beserta profil SPPG/penerima/TPS-nya. */
export type AuthIdentity =
  | { role: "sppg"; accountId: string; email: string; sppg: Sppg }
  | { role: "recipient"; accountId: string; email: string; recipient: Recipient }
  | { role: "tps"; accountId: string; email: string; tps: Tps }

/** Sesi baru hasil masuk/daftar. `token` mentah hanya untuk disimpan di cookie. */
export type SessionGrant = {
  token: string
  /** Waktu kedaluwarsa sesi (ISO 8601). */
  expiresAt: string
  identity: AuthIdentity
}

/** Input `signIn`. */
export type SignInInput = {
  email: string
  password: string
}

/** Input `registerRecipient` (pendaftaran mandiri penerima). */
export type RegisterRecipientInput = {
  name: string
  type: RecipientType
  district: string
  regency: Regency
  email: string
  password: string
  /** Lokasi dari perangkat (opsional); kosong/tidak valid = titik tengah kabupaten. */
  location?: GeoPoint
}

/** Input `updateRecipientLocation`. */
export type UpdateRecipientLocationInput = {
  recipientId: string
  location: GeoPoint
}

/** Akun contoh yang ditampilkan di halaman masuk untuk keperluan demo. */
export type DemoAccount = {
  email: string
  role: AccountRole
  name: string
  /** Keterangan singkat, mis. kecamatan atau jenis penerima. */
  detail: string
}

/**
 * Tempat Pembuangan Sampah — mengangkut sisa kategori D (tidak layak) dari SPPG.
 * Akun TPS dibuat oleh pengelola (seed), tidak bisa didaftarkan sendiri.
 */
export type Tps = {
  id: string
  name: string
  /** Instansi pengelola, mis. Dinas Lingkungan Hidup. */
  operator: string
  address: string
  district: string
  regency: Regency
  location: GeoPoint
}

/** Catatan pengangkutan satu batch D oleh TPS (selalu seluruh sisa batch). */
export type Disposal = {
  id: string
  batchId: string
  tpsId: string
  /** Berat yang diangkut (kg). */
  quantity: number
  collectedAt: string
  note?: string
}

/** Pengangkutan beserta batch & SPPG asalnya (hasil join). */
export type DisposalWithBatch = Disposal & { batch: SurplusBatchWithSppg }

/** Input `collectDisposal`: TPS menandai batch D sudah diangkut. */
export type CollectDisposalInput = {
  tpsId: string
  batchId: string
  note?: string
}

/**
 * Ringkasan pembuangan untuk semua peran — hanya angka, tanpa detail batch, karena
 * isi sisa tidak layak hanya boleh dilihat TPS (dan SPPG pemiliknya).
 */
export type DisposalSummary = {
  /** Total kg kategori D yang menunggu diangkut. */
  awaitingKg: number
  awaitingBatches: number
  /** Total kg yang sudah diangkut TPS. */
  collectedKg: number
  collectedBatches: number
}

/** Hasil operasi tulis: sukses dengan data, atau gagal dengan pesan berbahasa Indonesia. */
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string }
