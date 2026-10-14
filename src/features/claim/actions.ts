"use server"

import { revalidatePath } from "next/cache"
import { claimBatch } from "@/lib/data"
import { getSession } from "@/features/session"
import type { ClaimFormState } from "./types"

/**
 * Server Action klaim batch oleh penerima yang sedang masuk. Validasi kelayakan,
 * sisa, dan batas aman dilakukan di data layer (`claimBatch`).
 */
export async function claimBatchAction(
  _prev: ClaimFormState,
  formData: FormData
): Promise<ClaimFormState> {
  const session = await getSession()
  if (session?.role !== "recipient") {
    return { status: "error", message: "Masuk sebagai penerima untuk mengklaim." }
  }

  const batchId = formData.get("batchId")
  const quantity = Number(formData.get("quantity"))
  if (typeof batchId !== "string") return { status: "error", message: "Batch tidak valid." }

  const result = await claimBatch({ batchId, recipientId: session.recipient.id, quantity })
  if (!result.ok) return { status: "error", message: result.error }

  revalidatePath(`/sisa-makanan/${batchId}`)
  revalidatePath("/sisa-makanan")
  revalidatePath("/klaim-saya")
  return { status: "success", pickupCode: result.data.pickupCode, quantity: result.data.quantity }
}
