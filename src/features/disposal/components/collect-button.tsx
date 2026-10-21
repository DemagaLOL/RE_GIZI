"use client"

import { useActionState, useState } from "react"
import { Loader2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { collectDisposalAction } from "../actions"
import type { CollectFormState } from "../types"

const INITIAL_STATE: CollectFormState = { status: "idle" }

/**
 * Tombol TPS menandai batch D sudah diangkut, dengan konfirmasi dua langkah dan
 * catatan opsional (mis. nomor armada).
 * @param quantityLabel Berat yang akan diangkut, mis. "12,4 kg".
 */
export function CollectButton({ batchId, quantityLabel }: { batchId: string; quantityLabel: string }) {
  const [state, formAction, pending] = useActionState(collectDisposalAction, INITIAL_STATE)
  const [confirming, setConfirming] = useState(false)

  const error = state.status === "error" && (
    <p role="alert" className="text-sm font-medium text-destructive">
      {state.message}
    </p>
  )

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" className="h-11 w-fit" onClick={() => setConfirming(true)}>
          <Truck data-icon="inline-start" aria-hidden />
          Tandai Sudah Diangkut
        </Button>
        {error}
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border p-3">
      <input type="hidden" name="batchId" value={batchId} />
      <p className="text-sm">
        Konfirmasi seluruh {quantityLabel} sudah diangkut dari SPPG? Tindakan ini tidak bisa dibatalkan.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor={`note-${batchId}`} className="text-sm font-medium">
          Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <input
          id={`note-${batchId}`}
          name="note"
          maxLength={200}
          placeholder="mis. Truk R 1234 XY, petugas Budi"
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </div>
      {error}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="h-11" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Ya, Sudah Diangkut
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
