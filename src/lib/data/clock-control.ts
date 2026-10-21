import { gt } from "drizzle-orm"
import { io } from "next/cache"
import {
  applyClockInput,
  isSimClockEnabled,
  readClockAnchor,
  toClockState,
  writeClockAnchor,
} from "./clock"
import { getDb } from "./db/client"
import * as schema from "./db/schema"
import { isDemoMode, resetDatabase } from "./seed"
import type { ClockState, DataResult, SetClockInput } from "./types"

const HOUR = 60 * 60 * 1000
/** Lompatan maksimum sekali tekan (7 hari) agar tidak salah ketik ribuan jam. */
const MAX_ADVANCE_HOURS = 7 * 24

const DISABLED_ERROR = "Simulasi waktu tidak aktif di server ini."

/** Keadaan jam aplikasi saat ini (waktu, laju, jeda). */
export async function getClockState(): Promise<ClockState> {
  await io()
  const realNow = Date.now()
  return toClockState(readClockAnchor(getDb()), realNow)
}

/**
 * Ubah laju, posisi waktu, dan/atau status jeda jam simulasi.
 * @returns Keadaan jam setelah diubah, atau pesan error bila input tidak valid.
 */
export async function setClock(input: SetClockInput): Promise<DataResult<ClockState>> {
  await io()
  if (!isSimClockEnabled()) return { ok: false, error: DISABLED_ERROR }
  const db = getDb()
  return db.transaction(
    (tx): DataResult<ClockState> => {
      const realNow = Date.now()
      const next = applyClockInput(readClockAnchor(tx), input, realNow)
      if (!next.ok) return next
      writeClockAnchor(tx, next.data, realNow)
      return { ok: true, data: toClockState(readClockAnchor(tx), realNow) }
    },
    { behavior: "immediate" }
  )
}

/**
 * Majukan jam simulasi sejumlah jam (degradasi yang jatuh tempo diterapkan saat data dibaca).
 * @param hours Lebih dari 0, paling banyak 7 hari.
 */
export async function advanceClock(hours: number): Promise<DataResult<ClockState>> {
  await io()
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_ADVANCE_HOURS) {
    return { ok: false, error: `Lompatan waktu harus antara 0 dan ${MAX_ADVANCE_HOURS} jam.` }
  }
  const { now } = await getClockState()
  return setClock({ at: new Date(Date.parse(now) + hours * HOUR).toISOString() })
}

/**
 * `true` bila ada data (batch, klaim, atau riwayat turun kategori) bertanggal setelah
 * waktu nyata — dibuat saat jam simulasi dimajukan. Data ini tidak konsisten bila jam
 * dikembalikan ke waktu nyata (lihat `resetClock`).
 */
export async function hasFutureData(): Promise<boolean> {
  await io()
  const db = getDb()
  const realNow = new Date(Date.now()).toISOString()
  return Boolean(
    db.select({ id: schema.batches.id }).from(schema.batches).where(gt(schema.batches.createdAt, realNow)).get() ??
      db.select({ id: schema.claims.id }).from(schema.claims).where(gt(schema.claims.claimedAt, realNow)).get() ??
      db
        .select({ id: schema.batchCategoryEvents.id })
        .from(schema.batchCategoryEvents)
        .where(gt(schema.batchCategoryEvents.occurredAt, realNow))
        .get()
  )
}

/**
 * Kembalikan jam ke waktu nyata sekaligus kosongkan data demo (batch, klaim, sesi,
 * akun daftar mandiri) lalu isi ulang akun contoh — setara `npm run db:reset`.
 * Hanya bila simulasi waktu aktif **dan** mode demo (`canResetDemoData`) — tanpa itu
 * tombol ini bisa menghapus akun & data asli. Semua pengguna ikut keluar.
 */
export async function resetDemoData(): Promise<DataResult<null>> {
  await io()
  if (!canResetDemoData()) return { ok: false, error: "Reset data hanya tersedia dalam mode demo." }
  resetDatabase(getDb(), Date.now())
  return { ok: true, data: null }
}

/** `true` bila `resetDemoData` diizinkan: simulasi waktu aktif dan mode demo (`isDemoMode`). */
export function canResetDemoData(): boolean {
  return isSimClockEnabled() && isDemoMode()
}

/**
 * Kembalikan jam ke waktu nyata. Data yang dibuat saat simulasi tetap memakai
 * waktu simulasinya (mis. batch "dimasak" di masa depan akan menunggu waktu nyata menyusul);
 * gunakan `resetDemoData` untuk memulai ulang dari keadaan bersih.
 */
export async function resetClock(): Promise<ClockState> {
  await io()
  const realNow = Date.now()
  writeClockAnchor(getDb(), null, realNow)
  return toClockState(null, realNow)
}
