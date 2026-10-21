import { and, eq, inArray, lte, ne } from "drizzle-orm"
import {
  CATEGORY_ORDER,
  CATEGORY_UNIT,
  KG_PER_PORTION,
  NEXT_CATEGORY,
  SAFE_WINDOW_HOURS,
} from "./constants"
import type { Db, Tx } from "./db/client"
import { fromCategoryEvent, toBatch } from "./db/mappers"
import * as schema from "./db/schema"
import type {
  BatchStatus,
  CategoryEvent,
  DegradationReason,
  QuantityUnit,
  SurplusBatch,
  SurplusCategory,
} from "./types"

/**
 * Degradasi kategori sisa makanan: A (layak konsumsi) → B (pakan) → C (kompos) →
 * D (dibuang). Batas tiap kategori kumulatif sejak `cookedAt` (`SAFE_WINDOW_HOURS`:
 * 4, 24, 72 jam); untuk makanan kering jendela digeser ke `bestBefore` (lihat `windowBase`). Saat turun, klaim `pending` dibatalkan (demi keamanan pangan) dan
 * jumlahnya kembali ke sisa, satuan dikonversi (porsi → kg), dan setiap langkah dicatat
 * di `batch_category_events`.
 *
 * Fungsi `plan*` murni (tanpa DB) agar mudah dites; `apply*`/`degrade*` menulis ke DB.
 */

const HOUR = 60 * 60 * 1000

/** Status batch yang masih bisa turun kategori (`expired` = data lama sebelum fitur ini). */
const DEGRADABLE_STATUSES: readonly BatchStatus[] = ["available", "reserved", "expired"]

/** Satu langkah turun kategori yang direncanakan. */
export type DegradationStep = {
  from: SurplusCategory
  to: SurplusCategory
  /** Waktu terjadinya (epoch ms). */
  at: number
  /** Batas aman baru setelah langkah ini (epoch ms); untuk D = `at`. */
  safeUntil: number
  reason: DegradationReason
}

/** Bagian batch yang dibutuhkan untuk merencanakan degradasi. */
type BatchTiming = Pick<SurplusBatch, "category" | "cookedAt" | "safeUntil"> &
  Pick<Partial<SurplusBatch>, "bestBefore">

/** `true` bila `to` lebih rendah (lebih buruk) dari `from`. */
export function isLowerCategory(from: SurplusCategory, to: SurplusCategory): boolean {
  return CATEGORY_ORDER.indexOf(to) > CATEGORY_ORDER.indexOf(from)
}

/**
 * Titik awal jendela kumulatif (epoch ms). Makanan matang: `cookedAt`. Makanan kering:
 * digeser agar batas A jatuh tepat di `bestBefore`, sehingga B berlaku sampai `bestBefore`
 * + 20 jam dan C sampai `bestBefore` + 68 jam (selisih yang sama dengan 4/24/72 jam).
 */
function windowBase(batch: BatchTiming): number {
  if (batch.bestBefore) return Date.parse(batch.bestBefore) - SAFE_WINDOW_HOURS.A * HOUR
  return Date.parse(batch.cookedAt)
}

/** Batas aman kategori `category` untuk jendela yang dimulai `baseMs`, minimal `notBefore`. */
function safeUntilFor(category: SurplusCategory, baseMs: number, notBefore: number): number {
  if (category === "D") return notBefore
  return Math.max(baseMs + SAFE_WINDOW_HOURS[category] * HOUR, notBefore)
}

/**
 * Langkah otomatis yang jatuh tempo pada `now`, berurutan. Bila beberapa ambang
 * terlewati sekaligus (jam dilompati), tiap langkah memakai waktu ambangnya sendiri.
 * @returns Daftar kosong bila belum lewat batas aman atau sudah kategori D.
 */
export function planDegradation(batch: BatchTiming, now: number): DegradationStep[] {
  const baseMs = windowBase(batch)
  const steps: DegradationStep[] = []
  let category = batch.category
  let safeUntil = Date.parse(batch.safeUntil)

  for (let next = NEXT_CATEGORY[category]; next && safeUntil <= now; next = NEXT_CATEGORY[category]) {
    const at = safeUntil
    safeUntil = safeUntilFor(next, baseMs, at)
    steps.push({ from: category, to: next, at, safeUntil, reason: "auto" })
    category = next
  }
  return steps
}

/**
 * Langkah turun manual ke `to` pada `now` (boleh melompat, mis. A → D). Batas aman
 * kategori tujuan mengikuti jendelanya sejak `cookedAt` (atau dari `bestBefore` untuk
 * makanan kering), tetapi tidak sebelum `now`.
 * @returns Daftar kosong bila `to` tidak lebih rendah dari kategori sekarang.
 */
export function planManualDegradation(
  batch: BatchTiming,
  to: SurplusCategory,
  now: number
): DegradationStep[] {
  if (!isLowerCategory(batch.category, to)) return []
  const safeUntil = safeUntilFor(to, windowBase(batch), now)
  return [{ from: batch.category, to, at: now, safeUntil, reason: "manual" }]
}

/**
 * Konversi jumlah antarsatuan memakai `KG_PER_PORTION`. Hasil kg dibulatkan 1 desimal
 * (minimal 0,1 bila masih ada sisa); hasil porsi dibulatkan ke bawah.
 */
export function convertQuantity(quantity: number, from: QuantityUnit, to: QuantityUnit): number {
  if (from === to) return quantity
  if (to === "kg") {
    const kg = Math.round(quantity * KG_PER_PORTION * 10) / 10
    return quantity > 0 ? Math.max(kg, 0.1) : 0
  }
  return Math.floor(quantity / KG_PER_PORTION)
}

/**
 * Terapkan `steps` ke batch dalam transaksi `tx`: batalkan klaim `pending`,
 * kembalikan jumlahnya ke sisa, konversi satuan, perbarui batch, dan catat riwayat.
 * Batch tanpa sisa (semua sudah diambil) tidak diubah.
 * @param note Catatan SPPG, hanya untuk langkah `manual`.
 * @returns Batch setelah diturunkan.
 */
export function applyDegradation(
  tx: Tx,
  batch: SurplusBatch,
  steps: readonly DegradationStep[],
  note?: string
): SurplusBatch {
  if (steps.length === 0) return batch

  const pending = tx
    .select({ id: schema.claims.id, quantity: schema.claims.quantity })
    .from(schema.claims)
    .where(and(eq(schema.claims.batchId, batch.id), eq(schema.claims.status, "pending")))
    .all()
  if (pending.length > 0) {
    tx.update(schema.claims)
      .set({ status: "cancelled", cancelReason: "degraded" })
      .where(inArray(schema.claims.id, pending.map((c) => c.id)))
      .run()
  }
  // Klaim pending selalu bersatuan sama dengan batch: setiap degradasi membatalkannya.
  const remaining = batch.remainingQuantity + pending.reduce((sum, c) => sum + c.quantity, 0)
  if (remaining <= 0) return batch

  let category = batch.category
  let unit = batch.unit
  let quantity = remaining
  for (const step of steps) {
    const nextUnit = CATEGORY_UNIT[step.to]
    const nextQuantity = convertQuantity(quantity, unit, nextUnit)
    const event: CategoryEvent = {
      id: crypto.randomUUID(),
      batchId: batch.id,
      fromCategory: step.from,
      toCategory: step.to,
      quantityBefore: quantity,
      unitBefore: unit,
      quantityAfter: nextQuantity,
      unitAfter: nextUnit,
      reason: step.reason,
      note: step.reason === "manual" ? note : undefined,
      occurredAt: new Date(step.at).toISOString(),
    }
    tx.insert(schema.batchCategoryEvents).values(fromCategoryEvent(event)).run()
    category = step.to
    unit = nextUnit
    quantity = nextQuantity
  }

  const last = steps[steps.length - 1]
  const updated: SurplusBatch = {
    ...batch,
    category,
    unit,
    // Batch "dimulai ulang" di kategori barunya: jumlah awal = sisa hasil konversi.
    quantity,
    remainingQuantity: quantity,
    safeUntil: new Date(last.safeUntil).toISOString(),
    status: category === "D" ? "discarded" : "available",
  }
  tx.update(schema.batches)
    .set({
      category: updated.category,
      unit: updated.unit,
      quantity: updated.quantity,
      remainingQuantity: updated.remainingQuantity,
      safeUntil: updated.safeUntil,
      status: updated.status,
    })
    .where(eq(schema.batches.id, batch.id))
    .run()
  return updated
}

/** Kondisi SQL batch yang batas amannya lewat dan masih bisa turun kategori. */
function dueCondition(now: number) {
  return and(
    inArray(schema.batches.status, [...DEGRADABLE_STATUSES]),
    ne(schema.batches.category, "D"),
    lte(schema.batches.safeUntil, new Date(now).toISOString())
  )
}

/** Turunkan semua batch yang jatuh tempo pada `now`, di dalam transaksi `tx` yang sudah berjalan. */
export function applyDueDegradations(tx: Tx, now: number): void {
  const due = tx.select().from(schema.batches).where(dueCondition(now)).all()
  for (const row of due) {
    const batch = toBatch(row)
    applyDegradation(tx, batch, planDegradation(batch, now))
  }
}

/**
 * Turunkan semua batch yang jatuh tempo pada `now` (setara cron, dijalankan saat data
 * dibaca). Pengecekan murah dulu; transaksi `IMMEDIATE` hanya dibuka bila ada yang jatuh tempo.
 */
export function degradeDueBatches(db: Db, now: number): void {
  const any = db.select({ id: schema.batches.id }).from(schema.batches).where(dueCondition(now)).get()
  if (!any) return
  db.transaction((tx) => applyDueDegradations(tx, now), { behavior: "immediate" })
}
