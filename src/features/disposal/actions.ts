"use server"

import { revalidatePath } from "next/cache"
import { collectDisposal } from "@/lib/data"
import { getSession } from "@/features/session"
import type { CollectFormState } from "./types"

/**
 * Server Action TPS menandai satu batch kategori D sudah diangkut. Validasi kategori
 * & status dilakukan di data layer (`collectDisposal`).
 */
export async function collectDisposalAction(
  _prev: CollectFormState,
  formData: FormData
): Promise<CollectFormState> {
  const session = await getSession()
  if (session?.role !== "tps") return { status: "error", message: "Masuk sebagai TPS terlebih dahulu." }

  const batchId = formData.get("batchId")
  if (typeof batchId !== "string" || !batchId) return { status: "error", message: "Batch tidak valid." }
  const note = formData.get("note")

  const result = await collectDisposal({
    tpsId: session.tps.id,
    batchId,
    note: typeof note === "string" ? note : undefined,
  })
  if (!result.ok) return { status: "error", message: result.error }

  revalidatePath("/pembuangan")
  revalidatePath("/dasbor")
  revalidatePath("/sisa-makanan")
  revalidatePath(`/sisa-makanan/${batchId}`)
  return { status: "idle" }
}
