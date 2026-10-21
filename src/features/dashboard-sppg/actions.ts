"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  CATEGORY_LABEL,
  confirmPickup,
  createBatch,
  degradeBatch,
  getNow,
  getPickupPreview,
  type SurplusCategory,
} from "@/lib/data"
import { getSession } from "@/features/session"
import { formatPickupCode } from "@/lib/format"
import { COOKED_FIELD, DRY_FIELD } from "./cooked-options"
import type { DashboardFormState, PickupFormState } from "./types"

const CATEGORIES: readonly SurplusCategory[] = ["A", "B", "C", "D"]

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

/**
 * Server Action konfirmasi pengambilan dua langkah, dipilih lewat field `intent`:
 * `check` menampilkan detail klaim untuk kode ambil, `confirm` menandai klaim
 * sudah diambil (kode divalidasi ulang), `reset` kembali ke input kode.
 */
export async function pickupAction(
  _prev: PickupFormState,
  formData: FormData
): Promise<PickupFormState> {
  const intent = formData.get("intent")
  if (intent === "reset") return { status: "idle" }

  const sppgId = await currentSppgId()
  if (!sppgId) return { status: "error", message: "Masuk sebagai SPPG terlebih dahulu." }

  const pickupCode = formData.get("pickupCode")
  if (typeof pickupCode !== "string" || !pickupCode.trim()) {
    return { status: "error", message: "Masukkan kode ambil." }
  }

  if (intent === "confirm") {
    const result = await confirmPickup({ sppgId, pickupCode })
    if (!result.ok) return { status: "error", message: result.error }
    revalidateListings()
    return {
      status: "success",
      message: `Kode ${formatPickupCode(result.data.pickupCode)} dikonfirmasi sudah diambil.`,
    }
  }

  const preview = await getPickupPreview({ sppgId, pickupCode })
  if (!preview.ok) return { status: "error", message: preview.error }
  return { status: "preview", preview: preview.data }
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

  // Jam aplikasi (bisa disimulasikan), bukan jam server, agar konsisten dengan batas aman.
  const now = await getNow()
  // Makanan kering hanya untuk kategori A; kategori lain selalu dianggap makanan matang.
  const dry = category === "A" && formData.get("foodType") === "dry"
  let timing: { cookedAt: string; bestBefore?: string }
  if (dry) {
    const minutesAhead = Number(formData.get("bestBeforeMinutes"))
    if (!DRY_FIELD.options.some((o) => o.value === minutesAhead)) {
      return { status: "error", message: "Pilih batas layak makanan kering." }
    }
    timing = {
      cookedAt: new Date(now).toISOString(),
      bestBefore: new Date(now + minutesAhead * 60_000).toISOString(),
    }
  } else {
    const minutesAgo = Number(formData.get("cookedMinutesAgo"))
    if (!COOKED_FIELD[category].options.some((o) => o.value === minutesAgo)) {
      return { status: "error", message: "Pilih umur makanan sejak dimasak." }
    }
    timing = { cookedAt: new Date(now - minutesAgo * 60_000).toISOString() }
  }
  const menu = formData.get("menu")
  const notes = formData.get("notes")

  const result = await createBatch({
    sppgId,
    category,
    menu: typeof menu === "string" ? menu : "",
    quantity: Number(formData.get("quantity")),
    foodType: dry ? "dry" : "cooked",
    ...timing,
    notes: typeof notes === "string" ? notes : undefined,
  })
  if (!result.ok) return { status: "error", message: result.error }

  revalidateListings()
  redirect("/dasbor?baru=1")
}

/**
 * Server Action SPPG menurunkan kategori batch lebih awal (mis. makanan mulai basi).
 * Klaim yang menunggu diambil dibatalkan oleh data layer.
 */
export async function degradeBatchAction(
  _prev: DashboardFormState,
  formData: FormData
): Promise<DashboardFormState> {
  const sppgId = await currentSppgId()
  if (!sppgId) return { status: "error", message: "Masuk sebagai SPPG terlebih dahulu." }

  const batchId = formData.get("batchId")
  const toCategory = CATEGORIES.find((c) => c === formData.get("toCategory"))
  if (typeof batchId !== "string" || !batchId) return { status: "error", message: "Batch tidak valid." }
  if (!toCategory) return { status: "error", message: "Pilih kategori tujuan." }
  const note = formData.get("note")

  const result = await degradeBatch({
    sppgId,
    batchId,
    toCategory,
    note: typeof note === "string" ? note : undefined,
  })
  if (!result.ok) return { status: "error", message: result.error }

  revalidateListings()
  return {
    status: "success",
    message: `Kategori diturunkan ke ${toCategory} (${CATEGORY_LABEL[toCategory]}).`,
  }
}
