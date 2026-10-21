"use server"

import { revalidatePath } from "next/cache"
import { cancelClaim, claimBatch } from "@/lib/data"
import { getSession } from "@/features/session"
import type { CancelClaimState, ClaimFormState } from "./types"

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
  const rawQuantity = formData.get("quantity")
  const quantityText = typeof rawQuantity === "string" ? rawQuantity : ""
  if (typeof batchId !== "string") return { status: "error", message: "Batch tidak valid." }

  const result = await claimBatch({
    batchId,
    recipientId: session.recipient.id,
    quantity: Number(quantityText),
  })
  if (!result.ok) return { status: "error", message: result.error, quantity: quantityText }

  revalidateClaimPages(batchId)
  return { status: "success", pickupCode: result.data.pickupCode, quantity: result.data.quantity }
}

/**
 * Server Action penerima membatalkan klaim `pending` miliknya. Kepemilikan & status
 * divalidasi di data layer (`cancelClaim`); jumlahnya kembali ke sisa batch.
 */
export async function cancelClaimAction(
  _prev: CancelClaimState,
  formData: FormData
): Promise<CancelClaimState> {
  const session = await getSession()
  if (session?.role !== "recipient") {
    return { status: "error", message: "Masuk sebagai penerima untuk membatalkan klaim." }
  }

  const claimId = formData.get("claimId")
  if (typeof claimId !== "string" || !claimId) return { status: "error", message: "Klaim tidak valid." }

  const result = await cancelClaim({ claimId, recipientId: session.recipient.id })
  if (!result.ok) return { status: "error", message: result.error }

  revalidateClaimPages(result.data.batchId)
  return { status: "idle" }
}

/** Revalidasi halaman yang menampilkan sisa batch & klaim setelah mutasi. */
function revalidateClaimPages(batchId: string): void {
  revalidatePath(`/sisa-makanan/${batchId}`)
  revalidatePath("/sisa-makanan")
  revalidatePath("/klaim-saya")
  revalidatePath("/dasbor")
}
