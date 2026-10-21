"use client"

import { useActionState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { QuantityUnit } from "@/lib/data/types"
import { formatPickupCode } from "@/lib/format"
import { claimBatchAction } from "../actions"
import type { ClaimFormState } from "../types"

const INITIAL_STATE: ClaimFormState = { status: "idle" }

/**
 * Form klaim jumlah tertentu dari satu batch. Setelah berhasil menampilkan kode ambil
 * yang ditunjukkan ke petugas SPPG.
 */
export function ClaimForm({
  batchId,
  unit,
  remaining,
}: {
  batchId: string
  unit: QuantityUnit
  remaining: number
}) {
  const [state, formAction, pending] = useActionState(claimBatchAction, INITIAL_STATE)

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-secondary p-6 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <p className="text-secondary-foreground">
          Klaim {state.quantity} {unit} berhasil. Tunjukkan kode ini ke petugas SPPG:
        </p>
        <p className="font-mono text-4xl font-bold tracking-widest">
          {formatPickupCode(state.pickupCode)}
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/klaim-saya">Lihat Klaim Saya</Link>
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="batchId" value={batchId} />
      <label htmlFor="quantity" className="text-sm font-medium">
        Jumlah yang diambil ({unit})
      </label>
      <div className="flex gap-2">
        <input
          id="quantity"
          name="quantity"
          type="number"
          inputMode={unit === "porsi" ? "numeric" : "decimal"}
          min={unit === "porsi" ? 1 : 0.1}
          step={unit === "porsi" ? 1 : 0.1}
          max={remaining}
          defaultValue={Math.min(remaining, unit === "porsi" ? 10 : 5)}
          required
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={state.status === "error" ? "claim-error" : undefined}
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-invalid:border-destructive"
        />
        <Button type="submit" size="lg" disabled={pending} className="shrink-0">
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Klaim
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Maksimal {remaining} {unit}.
      </p>
      {state.status === "error" && (
        <p id="claim-error" role="alert" className="text-sm font-medium text-destructive">
          {state.message}
        </p>
      )}
    </form>
  )
}
