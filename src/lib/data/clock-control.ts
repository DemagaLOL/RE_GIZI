import { io } from "next/cache"
import {
  applyClockInput,
  isSimClockEnabled,
  readClockAnchor,
  toClockState,
  writeClockAnchor,
} from "./clock"
import { getDb } from "./db/client"
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
 * Kembalikan jam ke waktu nyata. Data yang dibuat saat simulasi tetap memakai
 * waktu simulasinya (mis. batch "dimasak" di masa depan akan menunggu waktu nyata menyusul).
 */
export async function resetClock(): Promise<ClockState> {
  await io()
  const realNow = Date.now()
  writeClockAnchor(getDb(), null, realNow)
  return toClockState(null, realNow)
}
