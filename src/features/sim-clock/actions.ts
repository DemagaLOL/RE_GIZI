"use server"

import { revalidatePath } from "next/cache"
import {
  advanceClock,
  CLOCK_SPEED_PRESETS,
  resetClock,
  resetDemoData,
  setClock,
  type ClockState,
  type DataResult,
} from "@/lib/data"
import { getSession, signOut } from "@/features/session"
import { formatSpeed } from "@/lib/format"
import { ADVANCE_OPTIONS_HOURS } from "./options"
import type { ClockFormState } from "./types"

/** Ubah hasil data layer menjadi state form. */
function toFormState(result: DataResult<ClockState>, message: string): ClockFormState {
  return result.ok ? { status: "success", message } : { status: "error", message: result.error }
}

/**
 * Server Action panel simulasi waktu (khusus SPPG). Aksi dipilih lewat field `intent`:
 * `speed:<n>`, `pause`, `resume`, `advance:<jam>`, `jump` (field `at`, waktu WIB dari
 * `datetime-local`), `reset` (kembali ke waktu nyata), atau `reset-data` (kembali ke waktu
 * nyata sekaligus mengosongkan data demo; semua pengguna keluar).
 */
export async function clockAction(
  _prev: ClockFormState,
  formData: FormData
): Promise<ClockFormState> {
  const session = await getSession()
  if (session?.role !== "sppg") return { status: "error", message: "Masuk sebagai SPPG terlebih dahulu." }

  const intent = formData.get("intent")
  if (typeof intent !== "string") return { status: "error", message: "Aksi tidak dikenal." }
  const [kind, arg] = intent.split(":")

  let state: ClockFormState
  if (kind === "speed") {
    const speed = CLOCK_SPEED_PRESETS.find((s) => s === Number(arg))
    if (speed === undefined) return { status: "error", message: "Laju tidak dikenal." }
    state = toFormState(await setClock({ speed }), `Laju waktu diubah ke ${formatSpeed(speed)}.`)
  } else if (kind === "pause" || kind === "resume") {
    const paused = kind === "pause"
    state = toFormState(
      await setClock({ paused }),
      paused ? "Waktu dijeda." : "Waktu berjalan kembali."
    )
  } else if (kind === "advance") {
    const hours = ADVANCE_OPTIONS_HOURS.find((h) => h === Number(arg))
    if (hours === undefined) return { status: "error", message: "Lompatan tidak dikenal." }
    state = toFormState(await advanceClock(hours), `Waktu dimajukan ${hours} jam.`)
  } else if (kind === "jump") {
    const at = formData.get("at")
    if (typeof at !== "string" || !at) return { status: "error", message: "Isi tanggal & jam tujuan." }
    // `datetime-local` tidak membawa zona waktu; tafsirkan sebagai WIB (UTC+7, tanpa DST).
    const parsed = Date.parse(`${at}:00+07:00`)
    if (Number.isNaN(parsed)) return { status: "error", message: "Tanggal & jam tujuan tidak valid." }
    state = toFormState(
      await setClock({ at: new Date(parsed).toISOString() }),
      "Waktu dipindah ke tujuan."
    )
  } else if (kind === "reset") {
    await resetClock()
    state = { status: "success", message: "Jam kembali ke waktu nyata." }
  } else if (kind === "reset-data") {
    const result = await resetDemoData()
    if (!result.ok) return { status: "error", message: result.error }
    // Semua sesi sudah terhapus; bersihkan cookie lalu arahkan ke halaman masuk (redirect).
    await signOut()
    return { status: "idle" }
  } else {
    return { status: "error", message: "Aksi tidak dikenal." }
  }

  if (state.status === "success") revalidatePath("/", "layout")
  return state
}
