import { CATEGORY_UNIT, SAFE_WINDOW_HOURS } from "./constants"
import type {
  BatchStatus,
  Claim,
  ClaimStatus,
  Recipient,
  Sppg,
  SurplusBatch,
  SurplusCategory,
} from "./types"

/**
 * Data contoh (fiktif) untuk pengembangan: 12 SPPG di Purbalingga & Banyumas,
 * 11 penerima, 32 batch (kategori A–D), dan klaim terkait. Waktu batch relatif terhadap `now`
 * agar demo selalu punya batch yang masih aman.
 */

const HOUR = 60 * 60 * 1000

export const SEED_SPPG: readonly Sppg[] = [
  { id: "sppg-01", name: "SPPG Purbalingga Kota 1", operator: "Yayasan Gizi Perwira", address: "Jl. Jend. Sudirman No. 45, Purbalingga Lor", district: "Purbalingga", regency: "Purbalingga", location: { lat: -7.3886, lng: 109.3634 }, dailyCapacity: 3200 },
  { id: "sppg-02", name: "SPPG Kalimanah", operator: "Yayasan Gizi Perwira", address: "Jl. Raya Kalimanah No. 12, Kalimanah Wetan", district: "Kalimanah", regency: "Purbalingga", location: { lat: -7.4178, lng: 109.3456 }, dailyCapacity: 2800 },
  { id: "sppg-03", name: "SPPG Bobotsari", operator: "Koperasi Slamet Berkah", address: "Jl. Raya Bobotsari No. 88, Bobotsari", district: "Bobotsari", regency: "Purbalingga", location: { lat: -7.2933, lng: 109.3556 }, dailyCapacity: 3000 },
  { id: "sppg-04", name: "SPPG Bukateja", operator: "Yayasan Klawing Sejahtera", address: "Jl. Raya Bukateja–Kejobong Km 1, Bukateja", district: "Bukateja", regency: "Purbalingga", location: { lat: -7.4372, lng: 109.4239 }, dailyCapacity: 2500 },
  { id: "sppg-05", name: "SPPG Kutasari", operator: "Koperasi Slamet Berkah", address: "Jl. Raya Kutasari No. 5, Kutasari", district: "Kutasari", regency: "Purbalingga", location: { lat: -7.3417, lng: 109.3236 }, dailyCapacity: 2200 },
  { id: "sppg-06", name: "SPPG Mrebet", operator: "Yayasan Klawing Sejahtera", address: "Jl. Raya Mrebet No. 21, Mrebet", district: "Mrebet", regency: "Purbalingga", location: { lat: -7.3121, lng: 109.3417 }, dailyCapacity: 2400 },
  { id: "sppg-07", name: "SPPG Purwokerto Utara", operator: "Yayasan Satria Sehat", address: "Jl. Dr. Soeparno No. 30, Grendeng", district: "Purwokerto Utara", regency: "Banyumas", location: { lat: -7.4053, lng: 109.2512 }, dailyCapacity: 3500 },
  { id: "sppg-08", name: "SPPG Purwokerto Selatan", operator: "Yayasan Satria Sehat", address: "Jl. Gerilya Timur No. 17, Tanjung", district: "Purwokerto Selatan", regency: "Banyumas", location: { lat: -7.4462, lng: 109.2421 }, dailyCapacity: 3300 },
  { id: "sppg-09", name: "SPPG Sokaraja", operator: "Koperasi Serayu Mandiri", address: "Jl. Jend. Sudirman No. 102, Sokaraja Tengah", district: "Sokaraja", regency: "Banyumas", location: { lat: -7.4563, lng: 109.2887 }, dailyCapacity: 2900 },
  { id: "sppg-10", name: "SPPG Baturraden", operator: "Yayasan Lereng Slamet", address: "Jl. Raya Baturraden No. 9, Karangmangu", district: "Baturraden", regency: "Banyumas", location: { lat: -7.3368, lng: 109.2318 }, dailyCapacity: 2000 },
  { id: "sppg-11", name: "SPPG Banyumas", operator: "Koperasi Serayu Mandiri", address: "Jl. Pramuka No. 14, Sudagaran", district: "Banyumas", regency: "Banyumas", location: { lat: -7.5142, lng: 109.2943 }, dailyCapacity: 2600 },
  { id: "sppg-12", name: "SPPG Ajibarang", operator: "Yayasan Lereng Slamet", address: "Jl. Raya Ajibarang–Wangon No. 3, Ajibarang Wetan", district: "Ajibarang", regency: "Banyumas", location: { lat: -7.4097, lng: 109.0839 }, dailyCapacity: 2700 },
]

export const SEED_RECIPIENTS: readonly Recipient[] = [
  { id: "rcp-01", name: "Warung Makan Bu Sri", type: "umkm", district: "Kalimanah", regency: "Purbalingga", location: { lat: -7.4152, lng: 109.3481 } },
  { id: "rcp-02", name: "Katering Berkah Rasa", type: "umkm", district: "Sokaraja", regency: "Banyumas", location: { lat: -7.4589, lng: 109.2851 } },
  { id: "rcp-03", name: "Dasawisma Melati RW 02", type: "warga", district: "Bobotsari", regency: "Purbalingga", location: { lat: -7.2958, lng: 109.3591 } },
  { id: "rcp-04", name: "Karang Taruna Tunas Muda", type: "warga", district: "Purwokerto Utara", regency: "Banyumas", location: { lat: -7.4011, lng: 109.2477 } },
  { id: "rcp-05", name: "Kelompok Budidaya Lele Mina Makmur", type: "peternak", district: "Bukateja", regency: "Purbalingga", location: { lat: -7.4405, lng: 109.4198 } },
  { id: "rcp-06", name: "Peternakan Bebek Sumber Rejeki", type: "peternak", district: "Ajibarang", regency: "Banyumas", location: { lat: -7.4152, lng: 109.0902 } },
  { id: "rcp-07", name: "Kandang Ayam Kampung Lestari", type: "peternak", district: "Kutasari", regency: "Purbalingga", location: { lat: -7.3385, lng: 109.3199 } },
  { id: "rcp-08", name: "Kelompok Tani Sido Makmur", type: "petani", district: "Mrebet", regency: "Purbalingga", location: { lat: -7.3087, lng: 109.3372 } },
  { id: "rcp-09", name: "Gapoktan Lereng Hijau", type: "petani", district: "Baturraden", regency: "Banyumas", location: { lat: -7.3301, lng: 109.2265 } },
  { id: "rcp-10", name: "Bank Sampah Serayu Hijau", type: "komposter", district: "Banyumas", regency: "Banyumas", location: { lat: -7.5108, lng: 109.2987 } },
  { id: "rcp-11", name: "Rumah Kompos Perwira", type: "komposter", district: "Purbalingga", regency: "Purbalingga", location: { lat: -7.3912, lng: 109.3702 } },
]

/** [indeks penerima, jumlah, status klaim] */
type ClaimSpec = readonly [recipient: number, quantity: number, status: ClaimStatus]

type BatchSpec = {
  /** Indeks SPPG di `SEED_SPPG`. */
  sppg: number
  category: SurplusCategory
  menu: string
  quantity: number
  /** Berapa jam lalu selesai dimasak. */
  cookedHoursAgo: number
  notes?: string
  claims?: readonly ClaimSpec[]
}

const BATCH_SPECS: readonly BatchSpec[] = [
  // Kategori A (layak konsumsi) — porsi, batas aman 4 jam
  { sppg: 0, category: "A", menu: "Nasi putih, ayam suwir kecap, tumis buncis wortel, tempe goreng, jeruk", quantity: 45, cookedHoursAgo: 1.5, notes: "Kelebihan produksi karena 2 kelas libur." },
  { sppg: 1, category: "A", menu: "Nasi, telur balado, sayur sop, tahu bacem, pisang", quantity: 30, cookedHoursAgo: 2, claims: [[0, 20, "pending"]] },
  { sppg: 2, category: "A", menu: "Nasi, pecel sayur, mendoan, telur rebus, salak pondoh", quantity: 60, cookedHoursAgo: 1 },
  { sppg: 3, category: "A", menu: "Nasi kuning, ayam bumbu kuning, orek tempe, timun, susu UHT", quantity: 25, cookedHoursAgo: 3, claims: [[2, 25, "pending"]] },
  { sppg: 4, category: "A", menu: "Nasi, lele goreng, sayur asem, perkedel kentang, semangka", quantity: 38, cookedHoursAgo: 0.75 },
  { sppg: 5, category: "A", menu: "Nasi, semur daging, capcay, tempe mendoan, pepaya", quantity: 20, cookedHoursAgo: 2.5, claims: [[2, 20, "picked_up"]] },
  { sppg: 6, category: "A", menu: "Nasi, ayam goreng tepung, sayur bayam jagung, tahu goreng, jeruk", quantity: 52, cookedHoursAgo: 1.25, notes: "Sudah dikemas per porsi dalam ompreng." },
  { sppg: 7, category: "A", menu: "Nasi, rendang telur, oseng kangkung, perkedel tahu, melon", quantity: 40, cookedHoursAgo: 3.5 },
  { sppg: 8, category: "A", menu: "Nasi, tongkol balado, sayur lodeh, tempe bacem, pisang", quantity: 35, cookedHoursAgo: 5.5 },
  { sppg: 9, category: "A", menu: "Nasi, sop ayam, tempe goreng, kerupuk, pisang", quantity: 28, cookedHoursAgo: 2, claims: [[1, 15, "pending"], [3, 13, "pending"]] },
  { sppg: 10, category: "A", menu: "Nasi, opor ayam, sambal goreng kentang, timun, jeruk", quantity: 44, cookedHoursAgo: 1.5, claims: [[1, 10, "pending"]] },
  { sppg: 11, category: "A", menu: "Nasi, pindang telur, tumis kacang panjang, tahu isi, semangka", quantity: 33, cookedHoursAgo: 0.5 },
  { sppg: 0, category: "A", menu: "Nasi, ayam bakar kecap, urap sayur, tempe goreng, pisang", quantity: 22, cookedHoursAgo: 6 },
  { sppg: 8, category: "A", menu: "Nasi, bakso ayam kuah, sawi hijau, perkedel jagung, apel", quantity: 50, cookedHoursAgo: 3, claims: [[0, 30, "picked_up"]] },

  // Kategori B (pakan ternak) — kg, batas aman 24 jam
  { sppg: 0, category: "B", menu: "Sisa nasi & lauk dari ompreng sekolah (sudah dipilah dari plastik)", quantity: 18, cookedHoursAgo: 3 },
  { sppg: 1, category: "B", menu: "Nasi sisa produksi & kerak nasi", quantity: 12, cookedHoursAgo: 5, claims: [[4, 12, "pending"]] },
  { sppg: 3, category: "B", menu: "Sisa sayur matang & nasi dari ompreng", quantity: 25, cookedHoursAgo: 2 },
  { sppg: 6, category: "B", menu: "Potongan sayuran mentah (kol, wortel, sawi)", quantity: 15, cookedHoursAgo: 6 },
  { sppg: 7, category: "B", menu: "Sisa nasi & lauk ompreng sekolah", quantity: 22, cookedHoursAgo: 4, claims: [[5, 10, "pending"]] },
  { sppg: 9, category: "B", menu: "Kulit & bonggol sayuran, ampas tahu", quantity: 9, cookedHoursAgo: 8 },
  { sppg: 10, category: "B", menu: "Sisa nasi & lauk ompreng sekolah", quantity: 30, cookedHoursAgo: 20, claims: [[6, 30, "picked_up"]] },
  { sppg: 11, category: "B", menu: "Nasi sisa produksi", quantity: 14, cookedHoursAgo: 1.5 },
  { sppg: 4, category: "B", menu: "Sisa lauk & nasi dari ompreng", quantity: 16, cookedHoursAgo: 26 },

  // Kategori C (kompos) — kg, batas aman 72 jam
  { sppg: 2, category: "C", menu: "Kulit buah (pisang, jeruk, semangka) & sisa sayur", quantity: 20, cookedHoursAgo: 10 },
  { sppg: 5, category: "C", menu: "Potongan bahan sayur & kulit bawang", quantity: 11, cookedHoursAgo: 30, claims: [[7, 11, "pending"]] },
  { sppg: 6, category: "C", menu: "Sisa makanan basi & kulit buah", quantity: 27, cookedHoursAgo: 6, notes: "Tercampur kuah, mohon bawa wadah tertutup." },
  { sppg: 8, category: "C", menu: "Kulit telur, ampas kelapa & sisa sayur", quantity: 13, cookedHoursAgo: 48 },
  { sppg: 9, category: "C", menu: "Kulit buah & daun pisang pembungkus", quantity: 17, cookedHoursAgo: 20, claims: [[8, 8, "pending"]] },
  { sppg: 10, category: "C", menu: "Sisa makanan tidak layak & kulit buah", quantity: 24, cookedHoursAgo: 50, claims: [[9, 24, "picked_up"]] },
  { sppg: 11, category: "C", menu: "Potongan sayur, kulit buah, ampas kelapa", quantity: 19, cookedHoursAgo: 4 },

  // Kategori D (tidak layak, dibuang) — kg, hanya dicatat
  { sppg: 3, category: "D", menu: "Sisa makanan basi bercampur plastik & kemasan", quantity: 6, cookedHoursAgo: 30, notes: "Tidak dapat dimanfaatkan; dibuang ke TPS." },
  { sppg: 7, category: "D", menu: "Makanan berjamur dari penyimpanan semalam", quantity: 4, cookedHoursAgo: 40 },
]

/** Bulatkan ke menit agar waktu tampil rapi. */
function toIso(ms: number): string {
  return new Date(Math.floor(ms / 60_000) * 60_000).toISOString()
}

/** Kode ambil deterministik untuk klaim seed. */
function seedPickupCode(n: number): string {
  return `RG-${((n + 1) * 7919 + 46656).toString(36).toUpperCase().slice(-4)}`
}

/** Status batch dari sisa kuantitas, klaim, dan waktu. Dipakai juga oleh store saat membaca. */
export function deriveBatchStatus(
  remainingQuantity: number,
  claims: readonly Pick<Claim, "status">[],
  safeUntil: string,
  now: number
): BatchStatus {
  if (remainingQuantity <= 0) {
    const active = claims.filter((c) => c.status !== "cancelled")
    return active.length > 0 && active.every((c) => c.status === "picked_up")
      ? "completed"
      : "reserved"
  }
  return Date.parse(safeUntil) <= now ? "expired" : "available"
}

/** Bangun seluruh data seed relatif terhadap waktu `now` (epoch ms). */
export function buildSeed(now: number): {
  sppg: Sppg[]
  recipients: Recipient[]
  batches: SurplusBatch[]
  claims: Claim[]
} {
  const batches: SurplusBatch[] = []
  const claims: Claim[] = []

  BATCH_SPECS.forEach((spec, i) => {
    const id = `batch-${String(i + 1).padStart(2, "0")}`
    const cookedMs = now - spec.cookedHoursAgo * HOUR
    const safeUntil = toIso(cookedMs + SAFE_WINDOW_HOURS[spec.category] * HOUR)

    const batchClaims: Claim[] = (spec.claims ?? []).map(([r, quantity, status], j) => {
      const claimedMs = cookedMs + (0.5 + j * 0.25) * HOUR
      return {
        id: `claim-${String(claims.length + j + 1).padStart(2, "0")}`,
        batchId: id,
        recipientId: SEED_RECIPIENTS[r].id,
        quantity,
        status,
        pickupCode: seedPickupCode(claims.length + j),
        claimedAt: toIso(claimedMs),
        pickedUpAt: status === "picked_up" ? toIso(claimedMs + 0.5 * HOUR) : undefined,
      }
    })
    claims.push(...batchClaims)

    const claimed = batchClaims
      .filter((c) => c.status !== "cancelled")
      .reduce((sum, c) => sum + c.quantity, 0)
    const remainingQuantity = spec.quantity - claimed

    batches.push({
      id,
      sppgId: SEED_SPPG[spec.sppg].id,
      menu: spec.menu,
      category: spec.category,
      unit: CATEGORY_UNIT[spec.category],
      quantity: spec.quantity,
      remainingQuantity,
      cookedAt: toIso(cookedMs),
      safeUntil,
      status:
        spec.category === "D"
          ? "discarded"
          : deriveBatchStatus(remainingQuantity, batchClaims, safeUntil, now),
      notes: spec.notes,
      createdAt: toIso(cookedMs + 0.25 * HOUR),
    })
  })

  return {
    sppg: SEED_SPPG.map((s) => ({ ...s, location: { ...s.location } })),
    recipients: SEED_RECIPIENTS.map((r) => ({ ...r, location: { ...r.location } })),
    batches,
    claims,
  }
}
