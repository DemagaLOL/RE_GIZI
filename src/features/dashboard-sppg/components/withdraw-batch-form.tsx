"use client"

import { useActionState, useState } from "react"
import { Loader2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WITHDRAW_REASON_MAX_LENGTH } from "@/lib/data/constants"
import { withdrawBatchAction } from "../actions"
import type { DashboardFormState } from "../types"

const INITIAL_STATE: DashboardFormState = { status: "idle" }

/** Isian form; dipisah agar state action hilang saat form ditutup. */
function WithdrawFields({
  batchId,
  pendingClaims,
  onClose,
}: {
  batchId: string
  pendingClaims: number
  onClose: () => void
}) {
  const [state, formAction, pending] = useActionState(withdrawBatchAction, INITIAL_STATE)

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 rounded-lg border p-3">
      <input type="hidden" name="batchId" value={batchId} />
      <div className="flex flex-col gap-2">
        <label htmlFor={`withdraw-${batchId}`} className="text-sm font-medium">
          Alasan penarikan
        </label>
        <input
          id={`withdraw-${batchId}`}
          name="reason"
          required
          maxLength={WITHDRAW_REASON_MAX_LENGTH}
          placeholder="mis. Salah catat, makanan batal disalurkan"
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Batch akan hilang dari semua daftar dan angka, seolah tidak pernah didaftarkan. Penarikan
        tidak bisa dibatalkan.
        {pendingClaims > 0 && (
          <span className="font-medium text-destructive">
            {" "}
            {pendingClaims} klaim yang menunggu diambil akan dibatalkan.
          </span>
        )}
      </p>

      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Tarik Batch
        </Button>
        <Button type="button" variant="ghost" className="h-11" disabled={pending} onClick={onClose}>
          Batal
        </Button>
      </div>
    </form>
  )
}

/**
 * Tombol + form SPPG untuk menarik batch dari daftar (mis. salah catat), dengan alasan wajib.
 * @param pendingClaims Jumlah klaim menunggu diambil yang akan dibatalkan.
 */
export function WithdrawBatchForm({
  batchId,
  pendingClaims,
}: {
  batchId: string
  pendingClaims: number
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-11 w-fit text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Undo2 data-icon="inline-start" aria-hidden />
        Tarik Batch
      </Button>
    )
  }
  return (
    <WithdrawFields batchId={batchId} pendingClaims={pendingClaims} onClose={() => setOpen(false)} />
  )
}
