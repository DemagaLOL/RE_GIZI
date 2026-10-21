import { eq } from "drizzle-orm"
import { MAX_CLOCK_SPEED } from "./constants"
import type { Db, Tx } from "./db/client"
import * as schema from "./db/schema"
import type { SimClockRow } from "./db/schema"
import type { ClockState, DataResult, SetClockInput } from "./types"

/**
 * Jam aplikasi yang bisa disimulasikan (dipercepat, dijeda, dipindah), meniru
 * `api/core/clock.py`. Waktu simulasi = `simAnchor + (waktu nyata - realAnchor) * speed`.
 * Setiap perubahan me-re-anchor dulu sehingga mengganti laju atau melanjutkan jeda
 * tidak membuat waktu melompat. Semua waktu domain sisa makanan (batas aman,
 * degradasi kategori, klaim) memakai jam ini; sesi & login tetap memakai waktu nyata.
 *
 * Modul ini tidak bergantung pada Next.js agar bisa dites langsung (`clock.test.ts`).
 */

const CLOCK_ID = 1
/** Selisih di bawah ini dianggap sama dengan waktu nyata. */
const REAL_TIME_TOLERANCE_MS = 1000

/** Anchor jam simulasi (baris `sim_clock` tanpa `id`). */
export type ClockAnchor = Omit<SimClockRow, "id">

/** Simulasi waktu aktif di dev; di produksi hanya bila env `SIM_CLOCK=1`. */
export function isSimClockEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.SIM_CLOCK === "1"
}

/** Waktu simulasi (epoch ms) dari anchor pada waktu nyata `realNow`. */
export function computeSimNow(anchor: ClockAnchor, realNow: number): number {
  if (anchor.paused) return anchor.simAnchor
  return Math.round(anchor.simAnchor + (realNow - anchor.realAnchor) * anchor.speed)
}

/**
 * Validasi `input` lalu hitung anchor baru. Semua input divalidasi dulu sehingga
 * tidak ada perubahan parsial. Jam tidak bisa dimundurkan lewat `at`, karena data
 * yang sudah dibuat (klaim, riwayat degradasi) akan berada di masa depan.
 * @param current Anchor sekarang, atau `null` bila jam masih waktu nyata.
 */
export function applyClockInput(
  current: ClockAnchor | null,
  input: SetClockInput,
  realNow: number
): DataResult<ClockAnchor> {
  const { speed, at, paused } = input
  if (
    speed !== undefined &&
    (!Number.isFinite(speed) || speed <= 0 || speed > MAX_CLOCK_SPEED)
  ) {
    return { ok: false, error: `Laju waktu harus lebih dari 0 dan paling banyak ${MAX_CLOCK_SPEED}×.` }
  }

  const base: ClockAnchor = current ?? {
    speed: 1,
    paused: false,
    realAnchor: realNow,
    simAnchor: realNow,
  }
  const frozenNow = computeSimNow(base, realNow)

  let atMs: number | undefined
  if (at !== undefined) {
    atMs = Date.parse(at)
    if (Number.isNaN(atMs)) return { ok: false, error: "Waktu tujuan tidak valid." }
    if (atMs < frozenNow - REAL_TIME_TOLERANCE_MS) {
      return { ok: false, error: "Jam simulasi tidak bisa dimundurkan." }
    }
  }

  // Re-anchor: bekukan posisi sekarang sebelum mengubah apa pun.
  return {
    ok: true,
    data: {
      speed: speed ?? base.speed,
      paused: paused ?? base.paused,
      realAnchor: realNow,
      simAnchor: atMs ?? frozenNow,
    },
  }
}

/** `true` bila anchor setara waktu nyata (laju 1×, tidak dijeda, tanpa selisih). */
export function isRealTime(anchor: ClockAnchor, realNow: number): boolean {
  return (
    anchor.speed === 1 &&
    !anchor.paused &&
    Math.abs(computeSimNow(anchor, realNow) - realNow) < REAL_TIME_TOLERANCE_MS
  )
}

/** Baca anchor tersimpan, atau `null` bila jam masih waktu nyata. */
export function readClockAnchor(db: Db | Tx): ClockAnchor | null {
  const row = db
    .select({
      speed: schema.simClock.speed,
      paused: schema.simClock.paused,
      realAnchor: schema.simClock.realAnchor,
      simAnchor: schema.simClock.simAnchor,
    })
    .from(schema.simClock)
    .where(eq(schema.simClock.id, CLOCK_ID))
    .get()
  return row ?? null
}

/** Simpan anchor; `null` (atau anchor setara waktu nyata) menghapus baris = kembali ke waktu nyata. */
export function writeClockAnchor(db: Db | Tx, anchor: ClockAnchor | null, realNow: number): void {
  if (!anchor || isRealTime(anchor, realNow)) {
    db.delete(schema.simClock).where(eq(schema.simClock.id, CLOCK_ID)).run()
    return
  }
  db.insert(schema.simClock)
    .values({ id: CLOCK_ID, ...anchor })
    .onConflictDoUpdate({ target: schema.simClock.id, set: anchor })
    .run()
}

/**
 * Waktu aplikasi saat ini (epoch ms). Sama dengan `Date.now()` bila tidak ada
 * simulasi atau simulasi dimatikan.
 */
export function simNow(db: Db | Tx, realNow: number = Date.now()): number {
  if (!isSimClockEnabled()) return realNow
  const anchor = readClockAnchor(db)
  return anchor ? computeSimNow(anchor, realNow) : realNow
}

/** Bentuk `ClockState` untuk UI dari anchor tersimpan. */
export function toClockState(anchor: ClockAnchor | null, realNow: number): ClockState {
  const enabled = isSimClockEnabled()
  if (!enabled || !anchor) {
    return { now: new Date(realNow).toISOString(), speed: 1, paused: false, simulated: false, enabled }
  }
  return {
    now: new Date(computeSimNow(anchor, realNow)).toISOString(),
    speed: anchor.speed,
    paused: anchor.paused,
    simulated: !isRealTime(anchor, realNow),
    enabled,
  }
}
