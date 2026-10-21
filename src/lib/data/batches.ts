import { and, asc, count, eq, inArray, ne, type SQL } from "drizzle-orm"
import { io } from "next/cache"
import { randomInt } from "node:crypto"
import { applyClaimCancellation } from "./claim-cancel"
import { simNow } from "./clock"
import {
  CATEGORY_LABEL,
  CATEGORY_UNIT,
  ELIGIBLE_RECIPIENTS,
  PICKUP_CODE_LENGTH,
  SAFE_WINDOW_HOURS,
} from "./constants"
import { getDb, type Db, type Tx } from "./db/client"
import {
  fromBatch,
  fromClaim,
  toBatch,
  toCategoryEvent,
  toClaim,
  toRecipient,
  toSppg,
} from "./db/mappers"
import * as schema from "./db/schema"
import {
  applyDegradation,
  applyDueDegradations,
  degradeDueBatches,
  planManualDegradation,
} from "./degradation"
import { distanceKm } from "./geo"
import { deriveBatchStatus } from "./seed"
import type {
  BatchFilter,
  BatchStatus,
  CancelClaimInput,
  CategoryEvent,
  Claim,
  ClaimBatchInput,
  ClaimWithBatch,
  ConfirmPickupInput,
  CreateBatchInput,
  DataResult,
  DegradeBatchInput,
  ImpactStats,
  PickupPreview,
  SurplusBatch,
  SurplusBatchWithSppg,
  SurplusCategory,
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
  collected: 5,
}

const CATEGORIES = Object.keys(ELIGIBLE_RECIPIENTS) as SurplusCategory[]

/** Waktu aplikasi saat ini (bisa disimulasikan) lalu turunkan batch yang jatuh tempo. */
function syncBatches(db: Db): number {
  const now = simNow(db)
  degradeDueBatches(db, now)
  return now
}

/** Hitung ulang status batch dari sisa & seluruh klaimnya. Batch D tetap `discarded`. */
function refreshBatchStatus(tx: Tx, batch: SurplusBatch, now: number): void {
  if (batch.status === "discarded") return
  const claims = tx
    .select({ status: schema.claims.status })
    .from(schema.claims)
    .where(eq(schema.claims.batchId, batch.id))
    .all()
  const status = deriveBatchStatus(batch.remainingQuantity, claims, batch.safeUntil, now)
  tx.update(schema.batches).set({ status }).where(eq(schema.batches.id, batch.id)).run()
}

function sortBatches<T extends SurplusBatch>(list: T[]): T[] {
  return list.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      Date.parse(a.safeUntil) - Date.parse(b.safeUntil)
  )
}

/**
 * Waktu aplikasi saat ini (epoch ms) untuk hitung mundur batas aman dalam satu render.
 * Mengikuti jam simulasi bila aktif (lihat `getClockState`).
 */
export async function getNow(): Promise<number> {
  await io()
  return simNow(getDb())
}

/**
 * Daftar batch beserta SPPG-nya. Urutan: status (tersedia dulu), lalu batas aman
 * paling dekat — atau jarak terdekat bila `sort: "distance"` dengan `near`.
 * Batch yang lewat batas aman otomatis turun kategori (A→B→C→D).
 */
export async function getBatches(filter: BatchFilter = {}): Promise<SurplusBatchWithSppg[]> {
  await io()
  const db = getDb()
  syncBatches(db)

  const conditions: SQL[] = []
  if (filter.category) conditions.push(eq(schema.batches.category, filter.category))
  if (filter.status) conditions.push(eq(schema.batches.status, filter.status))
  if (filter.sppgId) conditions.push(eq(schema.batches.sppgId, filter.sppgId))
  if (filter.regency) conditions.push(eq(schema.sppg.regency, filter.regency))
  const { recipientType } = filter
  if (recipientType) {
    const eligible = CATEGORIES.filter((c) => ELIGIBLE_RECIPIENTS[c].includes(recipientType))
    if (eligible.length === 0) return []
    conditions.push(inArray(schema.batches.category, eligible))
  }

  const rows = db
    .select({ batch: schema.batches, sppg: schema.sppg })
    .from(schema.batches)
    .innerJoin(schema.sppg, eq(schema.batches.sppgId, schema.sppg.id))
    .where(and(...conditions))
    .all()

  const { near } = filter
  const list: SurplusBatchWithSppg[] = rows.map((r) => {
    const sppg = toSppg(r.sppg)
    return {
      ...toBatch(r.batch),
      sppg,
      ...(near && { distanceKm: distanceKm(near, sppg.location) }),
    }
  })
  if (filter.sort === "distance" && near) {
    return list.sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.distanceKm ?? 0) - (b.distanceKm ?? 0) ||
        Date.parse(a.safeUntil) - Date.parse(b.safeUntil)
    )
  }
  return sortBatches(list)
}

/** Satu batch beserta SPPG-nya, atau `null` bila tidak ada. */
export async function getBatchById(id: string): Promise<SurplusBatchWithSppg | null> {
  await io()
  const db = getDb()
  syncBatches(db)
  const row = db
    .select({ batch: schema.batches, sppg: schema.sppg })
    .from(schema.batches)
    .innerJoin(schema.sppg, eq(schema.batches.sppgId, schema.sppg.id))
    .where(eq(schema.batches.id, id))
    .get()
  return row ? { ...toBatch(row.batch), sppg: toSppg(row.sppg) } : null
}

/** Klaim untuk satu batch, terbaru dulu. */
export async function getClaimsByBatch(batchId: string): Promise<Claim[]> {
  await io()
  return getDb()
    .select()
    .from(schema.claims)
    .where(eq(schema.claims.batchId, batchId))
    .all()
    .map(toClaim)
    .sort((a, b) => Date.parse(b.claimedAt) - Date.parse(a.claimedAt))
}

/** Klaim milik satu penerima beserta batch & SPPG-nya, terbaru dulu. */
export async function getClaimsByRecipient(recipientId: string): Promise<ClaimWithBatch[]> {
  await io()
  const db = getDb()
  syncBatches(db)
  const rows = db
    .select({ claim: schema.claims, batch: schema.batches, sppg: schema.sppg })
    .from(schema.claims)
    .innerJoin(schema.batches, eq(schema.claims.batchId, schema.batches.id))
    .innerJoin(schema.sppg, eq(schema.batches.sppgId, schema.sppg.id))
    .where(eq(schema.claims.recipientId, recipientId))
    .all()
  return rows
    .map((r) => ({
      ...toClaim(r.claim),
      batch: { ...toBatch(r.batch), sppg: toSppg(r.sppg) },
    }))
    .sort((a, b) => Date.parse(b.claimedAt) - Date.parse(a.claimedAt))
}

/**
 * Cari klaim `pending` berdasarkan kode ambil pada batch milik SPPG tertentu.
 * Selain angka diabaikan, jadi `"048 213"` dan `"048-213"` sama dengan `"048213"`.
 */
function findPendingPickup(
  db: Db | Tx,
  input: ConfirmPickupInput
): DataResult<{ claim: schema.ClaimRow; batch: schema.BatchRow }> {
  const code = input.pickupCode.replace(/\D/g, "")
  if (code.length !== PICKUP_CODE_LENGTH) {
    return { ok: false, error: `Kode ambil terdiri dari ${PICKUP_CODE_LENGTH} angka.` }
  }
  const row = db
    .select({ claim: schema.claims, batch: schema.batches })
    .from(schema.claims)
    .innerJoin(schema.batches, eq(schema.claims.batchId, schema.batches.id))
    .where(eq(schema.claims.pickupCode, code))
    .get()
  if (!row || row.batch.sppgId !== input.sppgId) {
    return { ok: false, error: "Kode ambil tidak ditemukan di SPPG ini." }
  }
  if (row.claim.status === "picked_up") return { ok: false, error: "Klaim ini sudah diambil." }
  if (row.claim.status === "cancelled") {
    // Pembatalan klaim terjadi saat batch turun kategori (lewat batas aman / diturunkan SPPG).
    return row.claim.category !== row.batch.category
      ? {
          ok: false,
          error: `Klaim dibatalkan karena makanan sudah turun ke kategori ${row.batch.category} (${CATEGORY_LABEL[row.batch.category]}).`,
        }
      : { ok: false, error: "Klaim ini sudah dibatalkan." }
  }
  return { ok: true, data: row }
}

/**
 * Detail klaim untuk kode ambil, ditampilkan ke petugas SPPG sebelum konfirmasi.
 * Status klaim tidak berubah (kecuali dibatalkan karena batch-nya jatuh tempo turun kategori).
 */
export async function getPickupPreview(
  input: ConfirmPickupInput
): Promise<DataResult<PickupPreview>> {
  await io()
  const db = getDb()
  syncBatches(db)
  const found = findPendingPickup(db, input)
  if (!found.ok) return found

  const recipient = db
    .select()
    .from(schema.recipients)
    .where(eq(schema.recipients.id, found.data.claim.recipientId))
    .get()
  if (!recipient) return { ok: false, error: "Penerima klaim ini tidak ditemukan." }
  return {
    ok: true,
    data: {
      claim: toClaim(found.data.claim),
      batch: toBatch(found.data.batch),
      recipient: toRecipient(recipient),
    },
  }
}

/**
 * Petugas SPPG mengonfirmasi pengambilan dengan kode ambil. Hanya klaim `pending`
 * pada batch milik SPPG tersebut yang bisa dikonfirmasi; klaim pada batch yang sudah
 * lewat batas aman otomatis batal lebih dulu (makanan tidak lagi sesuai kategorinya).
 */
export async function confirmPickup(input: ConfirmPickupInput): Promise<DataResult<Claim>> {
  await io()

  return getDb().transaction(
    (tx): DataResult<Claim> => {
      const now = simNow(tx)
      applyDueDegradations(tx, now)
      const found = findPendingPickup(tx, input)
      if (!found.ok) return found
      const { claim, batch } = found.data

      const pickedUpAt = new Date(now).toISOString()
      tx.update(schema.claims)
        .set({ status: "picked_up", pickedUpAt })
        .where(eq(schema.claims.id, claim.id))
        .run()
      refreshBatchStatus(tx, toBatch(batch), now)
      return { ok: true, data: toClaim({ ...claim, status: "picked_up", pickedUpAt }) }
    },
    { behavior: "immediate" }
  )
}

/**
 * Ringkasan dampak: jumlah tersalurkan per kategori (klaim sudah diambil), total
 * dibuang (D), batch tersedia, dan klaim menunggu diambil.
 * @param filter `sppgId` untuk membatasi ke satu SPPG; kosong = seluruh platform.
 */
export async function getImpactStats(filter: { sppgId?: string } = {}): Promise<ImpactStats> {
  await io()
  const db = getDb()
  syncBatches(db)
  const bySppg = filter.sppgId ? eq(schema.batches.sppgId, filter.sppgId) : undefined

  const stats: ImpactStats = {
    distributed: { A: 0, B: 0, C: 0, D: 0 },
    discardedKg: 0,
    availableBatches: 0,
    pendingClaims: 0,
    sppgCount: filter.sppgId
      ? 1
      : (db.select({ n: count() }).from(schema.sppg).get()?.n ?? 0),
  }

  const batches = db
    .select({
      category: schema.batches.category,
      quantity: schema.batches.quantity,
      status: schema.batches.status,
    })
    .from(schema.batches)
    .where(bySppg)
    .all()
  for (const batch of batches) {
    if (batch.category === "D") stats.discardedKg += batch.quantity
    if (batch.status === "available") stats.availableBatches += 1
  }

  // Kategori snapshot klaim, bukan kategori batch sekarang (batch bisa sudah turun).
  const claims = db
    .select({
      category: schema.claims.category,
      quantity: schema.claims.quantity,
      status: schema.claims.status,
    })
    .from(schema.claims)
    .innerJoin(schema.batches, eq(schema.claims.batchId, schema.batches.id))
    .where(and(ne(schema.claims.status, "cancelled"), bySppg))
    .all()
  // Tersalurkan = serah terima sudah dikonfirmasi dengan kode ambil; pending belum dihitung.
  for (const claim of claims) {
    if (claim.status === "picked_up") stats.distributed[claim.category] += claim.quantity
    if (claim.status === "pending") stats.pendingClaims += 1
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
  const db = getDb()
  const now = simNow(db)

  const sppg = db
    .select({ id: schema.sppg.id })
    .from(schema.sppg)
    .where(eq(schema.sppg.id, input.sppgId))
    .get()
  if (!sppg) return { ok: false, error: "SPPG tidak ditemukan." }
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
  db.insert(schema.batches).values(fromBatch(batch)).run()
  return { ok: true, data: batch }
}

/** Kode ambil acak berupa angka saja (`PICKUP_CODE_LENGTH` digit, nol di depan dipertahankan). */
function generatePickupCode(): string {
  return String(randomInt(0, 10 ** PICKUP_CODE_LENGTH)).padStart(PICKUP_CODE_LENGTH, "0")
}

/** Kode ambil yang belum dipakai klaim lain (kode bersifat unik di tabel). */
function uniquePickupCode(tx: Tx): string {
  for (;;) {
    const code = generatePickupCode()
    const taken = tx
      .select({ id: schema.claims.id })
      .from(schema.claims)
      .where(eq(schema.claims.pickupCode, code))
      .get()
    if (!taken) return code
  }
}

/**
 * Penerima mengklaim sebagian/seluruh batch. Menolak bila jenis penerima tidak
 * sesuai kategori, batch tidak tersedia/lewat batas aman, atau jumlah melebihi sisa.
 * Berjalan dalam satu transaksi `IMMEDIATE` agar aman dari klaim ganda.
 */
export async function claimBatch(input: ClaimBatchInput): Promise<DataResult<Claim>> {
  await io()

  return getDb().transaction(
    (tx): DataResult<Claim> => {
      const now = simNow(tx)
      applyDueDegradations(tx, now)

      const batchRow = tx
        .select()
        .from(schema.batches)
        .where(eq(schema.batches.id, input.batchId))
        .get()
      if (!batchRow) return { ok: false, error: "Batch tidak ditemukan." }
      const recipient = tx
        .select({ id: schema.recipients.id, type: schema.recipients.type })
        .from(schema.recipients)
        .where(eq(schema.recipients.id, input.recipientId))
        .get()
      if (!recipient) return { ok: false, error: "Penerima tidak ditemukan." }

      const batch = toBatch(batchRow)
      if (batch.status === "discarded") {
        return { ok: false, error: "Sisa kategori D tidak layak dan tidak dapat diklaim." }
      }
      if (!ELIGIBLE_RECIPIENTS[batch.category].includes(recipient.type)) {
        return {
          ok: false,
          error: `Sisa ini berkategori ${batch.category} (${CATEGORY_LABEL[batch.category]}) dan tidak dapat diklaim jenis penerima Anda.`,
        }
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
        category: batch.category,
        unit: batch.unit,
        quantity: input.quantity,
        status: "pending",
        pickupCode: uniquePickupCode(tx),
        claimedAt: new Date(now).toISOString(),
      }
      tx.insert(schema.claims).values(fromClaim(claim)).run()

      const remainingQuantity = batch.remainingQuantity - input.quantity
      tx.update(schema.batches)
        .set({ remainingQuantity })
        .where(eq(schema.batches.id, batch.id))
        .run()
      refreshBatchStatus(tx, { ...batch, remainingQuantity }, now)

      return { ok: true, data: claim }
    },
    { behavior: "immediate" }
  )
}

/**
 * Penerima membatalkan klaim `pending` miliknya; jumlahnya kembali ke sisa batch dan
 * kode ambil tidak berlaku lagi. Degradasi yang jatuh tempo diterapkan lebih dulu,
 * jadi klaim yang sudah batal karena turun kategori tidak bisa "dibatalkan" ulang.
 */
export async function cancelClaim(input: CancelClaimInput): Promise<DataResult<Claim>> {
  await io()

  return getDb().transaction(
    (tx): DataResult<Claim> => {
      const now = simNow(tx)
      applyDueDegradations(tx, now)
      return applyClaimCancellation(tx, input, now)
    },
    { behavior: "immediate" }
  )
}

/** Pesan bila batch berstatus ini tidak bisa diturunkan lagi. */
const NOT_DEGRADABLE_ERROR: Partial<Record<BatchStatus, string>> = {
  completed: "Semua sisa batch ini sudah diambil.",
  discarded: "Batch ini sudah kategori D (dibuang).",
  collected: "Batch ini sudah diangkut TPS.",
  expired: "Batch ini sudah melewati batas aman.",
}

/**
 * SPPG menurunkan kategori batch lebih awal (mis. makanan mulai basi). Hanya bisa ke
 * kategori yang lebih rendah; klaim `pending` dibatalkan dan sisa dikonversi satuannya.
 * Berjalan dalam satu transaksi `IMMEDIATE` bersama degradasi otomatis yang jatuh tempo.
 * @returns Batch setelah diturunkan.
 */
export async function degradeBatch(input: DegradeBatchInput): Promise<DataResult<SurplusBatch>> {
  await io()

  return getDb().transaction(
    (tx): DataResult<SurplusBatch> => {
      const now = simNow(tx)
      applyDueDegradations(tx, now)

      const row = tx.select().from(schema.batches).where(eq(schema.batches.id, input.batchId)).get()
      if (!row || row.sppgId !== input.sppgId) {
        return { ok: false, error: "Batch tidak ditemukan di SPPG ini." }
      }
      const batch = toBatch(row)
      const statusError = NOT_DEGRADABLE_ERROR[batch.status]
      if (statusError) return { ok: false, error: statusError }

      const steps = planManualDegradation(batch, input.toCategory, now)
      if (steps.length === 0) {
        return { ok: false, error: "Kategori hanya bisa diturunkan, tidak bisa tetap atau dinaikkan." }
      }
      const note = input.note?.trim().slice(0, 200) || undefined
      return { ok: true, data: applyDegradation(tx, batch, steps, note) }
    },
    { behavior: "immediate" }
  )
}

/** Riwayat turun kategori satu batch, terlama dulu. */
export async function getCategoryEvents(batchId: string): Promise<CategoryEvent[]> {
  await io()
  return getDb()
    .select()
    .from(schema.batchCategoryEvents)
    .where(eq(schema.batchCategoryEvents.batchId, batchId))
    .orderBy(asc(schema.batchCategoryEvents.occurredAt))
    .all()
    .map(toCategoryEvent)
}
