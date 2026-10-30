"use client"

import { useActionState, useState } from "react"
import { Loader2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cancelClaimBySppgAction } from "../actions"
import type { DashboardFormState } from "../types"

const INITIAL_STATE: DashboardFormState = { status: "idle" }

/**
 * Tombol SPPG membatalkan klaim yang menunggu diambil (mis. penerima tidak datang), dengan
 * konfirmasi dua langkah karena kode ambil penerima langsung tidak berlaku.
 */
export function CancelRecipientClaimButton({
  claimId,
  recipientName,
}: {
  claimId: string
  recipientName: string
}) {
  const [state, formAction, pending] = useActionState(cancelClaimBySppgAction, INITIAL_STATE)
  const [confirming, setConfirming] = useState(false)

  const error = state.status === "error" && (
    <p role="alert" className="text-sm font-medium text-destructive">
      {state.message}
    </p>
  )

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-fit text-muted-foreground"
          onClick={() => setConfirming(true)}
        >
          <XCircle data-icon="inline-start" aria-hidden />
          Batalkan Klaim
        </Button>
        {error}
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border p-3">
      <input type="hidden" name="claimId" value={claimId} />
      <p className="text-sm">
        Batalkan klaim {recipientName}? Kode ambilnya tidak berlaku lagi dan jumlahnya kembali ke sisa.
      </p>
      {error}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Ya, Batalkan
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Tidak
        </Button>
      </div>
    </form>
  )
}
