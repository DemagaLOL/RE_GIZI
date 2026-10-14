"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { confirmPickup, createBatch, type SurplusCategory } from "@/lib/data"
import { getSession } from "@/features/session"
import type { DashboardFormState } from "./types"

const CATEGORIES: readonly SurplusCategory[] = ["A", "B", "C", "D"]
/** Pilihan "selesai dimasak" di form (menit lalu). */
const COOKED_OPTIONS_MIN = [0, 30, 60, 120, 180, 240] as const

/** Ambil ID SPPG dari sesi, atau `null` bila bukan SPPG. */
async function currentSppgId(): Promise<string | null> {
  const session = await getSession()
  return session?.role === "sppg" ? session.sppg.id : null
}

/** Revalidasi halaman yang menampilkan batch/klaim setelah mutasi. */
function revalidateListings(): void {
  revalidatePath("/dasbor")
  revalidatePath("/sisa-makanan")
  revalidatePath("/klaim-saya")
  revalidatePath("/")
}

/** Server Action konfirmasi pengambilan berdasarkan kode ambil. */
export async function confirmPickupAction(
  _prev: DashboardFormState,
  formData: FormData
): Promise<DashboardFormState> {
  const sppgId = await currentSppgId()
  if (!sppgId) return { status: "error", message: "Masuk sebagai SPPG terlebih dahulu." }

  const pickupCode = formData.get("pickupCode")
  if (typeof pickupCode !== "string" || !pickupCode.trim()) {
    return { status: "error", message: "Masukkan kode ambil." }
  }

  const result = await confirmPickup({ sppgId, pickupCode })
  if (!result.ok) return { status: "error", message: result.error }

  revalidateListings()
  return { status: "success", message: `Kode ${result.data.pickupCode} dikonfirmasi sudah diambil.` }
}

/** Server Action pendaftaran sisa makanan baru; berhasil → kembali ke dasbor. */
export async function createBatchAction(
  _prev: DashboardFormState,
  formData: FormData
): Promise<DashboardFormState> {
  const sppgId = await currentSppgId()
  if (!sppgId) return { status: "error", message: "Masuk sebagai SPPG terlebih dahulu." }

  const category = CATEGORIES.find((c) => c === formData.get("category"))
  if (!category) return { status: "error", message: "Pilih kategori sisa makanan." }

  const cookedMin = Number(formData.get("cookedMinutesAgo"))
  const minutesAgo = COOKED_OPTIONS_MIN.find((m) => m === cookedMin) ?? 0
  const menu = formData.get("menu")
  const notes = formData.get("notes")

  const result = await createBatch({
    sppgId,
    category,
    menu: typeof menu === "string" ? menu : "",
    quantity: Number(formData.get("quantity")),
    cookedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    notes: typeof notes === "string" ? notes : undefined,
  })
  if (!result.ok) return { status: "error", message: result.error }

  revalidateListings()
  redirect("/dasbor?baru=1")
}
