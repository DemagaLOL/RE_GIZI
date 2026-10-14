import { io } from "next/cache"
import { CATEGORY_UNIT, ELIGIBLE_RECIPIENTS, SAFE_WINDOW_HOURS } from "./constants"
import { deriveBatchStatus } from "./seed"
import { clone, expireStaleBatches, getStore } from "./store"
import type {
  BatchFilter,
  BatchStatus,
  Claim,
  ClaimBatchInput,
  ClaimWithBatch,
  ConfirmPickupInput,
  CreateBatchInput,
  DataResult,
  ImpactStats,
  SurplusBatch,
  SurplusBatchWithSppg,
} from "./types"

const HOUR = 60 * 60 * 1000
/** Toleransi jam perangkat yang sedikit maju saat mengisi `cookedAt`. */
const CLOCK_SKEW_MS = 5 * 60 * 1000

const STATUS_ORDER: Record<BatchStatus, number> = {
  available: 0,
  reserved: 1,
  completed: 2,
  expired: 3,
  discarded: 4,
}

/** Waktu server saat ini (epoch ms) untuk hitung mundur batas aman dalam satu render. */
export async function getNow(): Promise<number> {
  await io()
  return Date.now()
}

/**
 * Daftar batch beserta SPPG-nya. Urutan: status (tersedia dulu), lalu batas aman
 * paling dekat. Batch yang lewat batas aman otomatis menjadi `expired`.
 */
export async function getBatches(filter: BatchFilter = {}): Promise<SurplusBatchWithSppg[]> {
  await io()
  const store = getStore()
  expireStaleBatches(store, Date.now())

  const { recipientType } = filter

  const result: SurplusBatchWithSppg[] = []
  for (const batch of store.batches) {
    if (filter.category && batch.category !== filter.category) continue
    if (filter.status && batch.status !== filter.status) continue
    if (filter.sppgId && batch.sppgId !== filter.sppgId) continue
    if (recipientType && !ELIGIBLE_RECIPIENTS[batch.category].includes(recipientType)) continue
    const sppg = store.sppg.find((s) => s.id === batch.sppgId)
    if (!sppg) continue
    if (filter.regency && sppg.regency !== filter.regency) continue
    result.push({ ...batch, sppg })
  }

  return clone(result).sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      Date.parse(a.safeUntil) - Date.parse(b.safeUntil)
  )
}

/** Satu batch beserta SPPG-nya, atau `null` bila tidak ada. */
export async function getBatchById(id: string): Promise<SurplusBatchWithSppg | null> {
  await io()
  const store = getStore()
  expireStaleBatches(store, Date.now())
  const batch = store.batches.find((b) => b.id === id)
  const sppg = batch && store.sppg.find((s) => s.id === batch.sppgId)
  return batch && sppg ? clone({ ...batch, sppg }) : null
}

/** Klaim untuk satu batch, terbaru dulu. */
export async function getClaimsByBatch(batchId: string): Promise<Claim[]> {
  await io()
  const claims = getStore().claims.filter((c) => c.batchId === batchId)
  return clone(claims).sort((a, b) => Date.parse(b.claimedAt) - Date.parse(a.claimedAt))
}

/** Klaim milik satu penerima beserta batch & SPPG-nya, terbaru dulu. */
export async function getClaimsByRecipient(recipientId: string): Promise<ClaimWithBatch[]> {
  await io()
  const store = getStore()
  expireStaleBatches(store, Date.now())
  const result: ClaimWithBatch[] = []
  for (const claim of store.claims) {
    if (claim.recipientId !== recipientId) continue
    const batch = store.batches.find((b) => b.id === claim.batchId)
    const sppg = batch && store.sppg.find((s) => s.id === batch.sppgId)
    if (batch && sppg) result.push({ ...claim, batch: { ...batch, sppg } })
  }
  return clone(result).sort((a, b) => Date.parse(b.claimedAt) - Date.parse(a.claimedAt))
}

/**
 * Petugas SPPG mengonfirmasi pengambilan dengan kode ambil. Hanya klaim `pending`
 * pada batch milik SPPG tersebut yang bisa dikonfirmasi.
 */
export async function confirmPickup(input: ConfirmPickupInput): Promise<DataResult<Claim>> {
  await io()
  const store = getStore()
  const now = Date.now()
  const code = input.pickupCode.trim().toUpperCase()

  const claim = store.claims.find((c) => c.pickupCode === code)
  const batch = claim && store.batches.find((b) => b.id === claim.batchId)
  if (!claim || !batch || batch.sppgId !== input.sppgId) {
    return { ok: false, error: "Kode ambil tidak ditemukan di SPPG ini." }
  }
  if (claim.status === "picked_up") return { ok: false, error: "Klaim ini sudah diambil." }
  if (claim.status === "cancelled") return { ok: false, error: "Klaim ini sudah dibatalkan." }

  claim.status = "picked_up"
  claim.pickedUpAt = new Date(now).toISOString()
  if (batch.status !== "discarded") {
    batch.status = deriveBatchStatus(
      batch.remainingQuantity,
      store.claims.filter((c) => c.batchId === batch.id),
      batch.safeUntil,
      now
    )
  }
  return { ok: true, data: clone(claim) }
}

/**
 * Ringkasan dampak: jumlah tersalurkan per kategori (klaim tidak batal), total
 * dibuang (D), batch tersedia, dan klaim menunggu diambil.
 * @param filter `sppgId` untuk membatasi ke satu SPPG; kosong = seluruh platform.
 */
export async function getImpactStats(filter: { sppgId?: string } = {}): Promise<ImpactStats> {
  await io()
  const store = getStore()
  expireStaleBatches(store, Date.now())

  const stats: ImpactStats = {
    distributed: { A: 0, B: 0, C: 0, D: 0 },
    discardedKg: 0,
    availableBatches: 0,
    pendingClaims: 0,
    sppgCount: filter.sppgId ? 1 : store.sppg.length,
  }
  const batches = store.batches.filter((b) => !filter.sppgId || b.sppgId === filter.sppgId)
  for (const batch of batches) {
    if (batch.category === "D") stats.discardedKg += batch.quantity
    if (batch.status === "available") stats.availableBatches += 1
    for (const claim of store.claims) {
      if (claim.batchId !== batch.id || claim.status === "cancelled") continue
      stats.distributed[batch.category] += claim.quantity
      if (claim.status === "pending") stats.pendingClaims += 1
    }
  }
  return stats
}

/** Validasi jumlah: harus positif; bilangan bulat bila satuannya porsi. */
function validateQuantity(quantity: number, unit: SurplusBatch["unit"]): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return "Jumlah harus lebih dari 0."
  if (unit === "porsi" && !Number.isInteger(quantity)) return "Jumlah porsi harus bilangan bulat."
  return null
}

/**
 * SPPG mendaftarkan sisa makanan baru. `safeUntil` default = `cookedAt` + jendela
 * aman kategori (A 4 jam, B 24 jam, C 72 jam). Kategori D hanya dicatat dengan
 * status `discarded` dan tidak bisa diklaim.
 */
export async function createBatch(input: CreateBatchInput): Promise<DataResult<SurplusBatch>> {
  await io()
  const store = getStore()
  const now = Date.now()

  if (!store.sppg.some((s) => s.id === input.sppgId)) {
    return { ok: false, error: "SPPG tidak ditemukan." }
  }
  const menu = input.menu.trim()
  if (!menu) return { ok: false, error: "Menu/isi tidak boleh kosong." }

  const unit = CATEGORY_UNIT[input.category]
  const quantityError = validateQuantity(input.quantity, unit)
  if (quantityError) return { ok: false, error: quantityError }

  const cookedMs = Date.parse(input.cookedAt)
  if (Number.isNaN(cookedMs)) return { ok: false, error: "Waktu masak tidak valid." }
  if (cookedMs > now + CLOCK_SKEW_MS) {
    return { ok: false, error: "Waktu masak tidak boleh di masa depan." }
  }

  const discarded = input.category === "D"
  const safeUntilMs = discarded
    ? cookedMs
    : input.safeUntil
      ? Date.parse(input.safeUntil)
      : cookedMs + SAFE_WINDOW_HOURS[input.category] * HOUR
  if (!discarded) {
    if (Number.isNaN(safeUntilMs) || safeUntilMs <= cookedMs) {
      return { ok: false, error: "Batas aman harus setelah waktu masak." }
    }
    if (safeUntilMs <= now) {
      return { ok: false, error: "Batas aman sudah lewat, batch tidak bisa didaftarkan." }
    }
  }

  const batch: SurplusBatch = {
    id: crypto.randomUUID(),
    sppgId: input.sppgId,
    menu,
    category: input.category,
    unit,
    quantity: input.quantity,
    remainingQuantity: input.quantity,
    cookedAt: new Date(cookedMs).toISOString(),
    safeUntil: new Date(safeUntilMs).toISOString(),
    status: discarded ? "discarded" : "available",
    notes: input.notes?.trim() || undefined,
    createdAt: new Date(now).toISOString(),
  }
  store.batches.push(batch)
  return { ok: true, data: clone(batch) }
}

const PICKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Kode ambil acak 4 karakter tanpa huruf/angka yang mirip (0/O, 1/I). */
function generatePickupCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return `RG-${Array.from(bytes, (b) => PICKUP_ALPHABET[b % PICKUP_ALPHABET.length]).join("")}`
}

/**
 * Penerima mengklaim sebagian/seluruh batch. Menolak bila jenis penerima tidak
 * sesuai kategori, batch tidak tersedia/lewat batas aman, atau jumlah melebihi sisa.
 * Catatan Supabase: jalankan sebagai satu transaksi/RPC agar aman dari klaim ganda.
 */
export async function claimBatch(input: ClaimBatchInput): Promise<DataResult<Claim>> {
  await io()
  const store = getStore()
  const now = Date.now()
  expireStaleBatches(store, now)

  const batch = store.batches.find((b) => b.id === input.batchId)
  if (!batch) return { ok: false, error: "Batch tidak ditemukan." }
  const recipient = store.recipients.find((r) => r.id === input.recipientId)
  if (!recipient) return { ok: false, error: "Penerima tidak ditemukan." }

  if (batch.status === "discarded") {
    return { ok: false, error: "Sisa kategori D tidak layak dan tidak dapat diklaim." }
  }
  if (!ELIGIBLE_RECIPIENTS[batch.category].includes(recipient.type)) {
    return { ok: false, error: "Jenis penerima Anda tidak dapat mengklaim kategori ini." }
  }
  if (batch.status === "expired") {
    return { ok: false, error: "Batch sudah melewati batas aman." }
  }
  if (batch.status !== "available") {
    return { ok: false, error: "Batch sudah habis diklaim." }
  }

  const quantityError = validateQuantity(input.quantity, batch.unit)
  if (quantityError) return { ok: false, error: quantityError }
  if (input.quantity > batch.remainingQuantity) {
    return {
      ok: false,
      error: `Jumlah melebihi sisa (${batch.remainingQuantity} ${batch.unit}).`,
    }
  }

  const claim: Claim = {
    id: crypto.randomUUID(),
    batchId: batch.id,
    recipientId: recipient.id,
    quantity: input.quantity,
    status: "pending",
    pickupCode: generatePickupCode(),
    claimedAt: new Date(now).toISOString(),
  }
  store.claims.push(claim)

  batch.remainingQuantity -= input.quantity
  batch.status = deriveBatchStatus(
    batch.remainingQuantity,
    store.claims.filter((c) => c.batchId === batch.id),
    batch.safeUntil,
    now
  )

  return { ok: true, data: clone(claim) }
}
