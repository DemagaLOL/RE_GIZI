"use client"

import { useActionState, useState } from "react"
import { ArrowDownCircle, Loader2 } from "lucide-react"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORY_ORDER } from "@/lib/data/constants"
import type { SurplusCategory } from "@/lib/data/types"
import { degradeBatchAction } from "../actions"
import type { DashboardFormState } from "../types"

const INITIAL_STATE: DashboardFormState = { status: "idle" }

/**
 * Tombol + form SPPG untuk menurunkan kategori batch lebih awal (hanya ke kategori
 * yang lebih rendah). Beri `key={category}` agar form tertutup setelah kategori berubah.
 * @param pendingClaims Jumlah klaim menunggu diambil yang akan dibatalkan.
 */
export function DegradeBatchForm({
  batchId,
  category,
  pendingClaims,
}: {
  batchId: string
  category: SurplusCategory
  pendingClaims: number
}) {
  const [state, formAction, pending] = useActionState(degradeBatchAction, INITIAL_STATE)
  const [open, setOpen] = useState(false)
  const lower = CATEGORY_ORDER.slice(CATEGORY_ORDER.indexOf(category) + 1)
  const [target, setTarget] = useState<SurplusCategory | undefined>(lower[0])

  if (lower.length === 0) return null

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => setOpen(true)}>
          <ArrowDownCircle data-icon="inline-start" aria-hidden />
          Turunkan Kategori
        </Button>
        {state.status === "error" && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.message}
          </p>
        )}
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border p-3">
      <input type="hidden" name="batchId" value={batchId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Turunkan ke kategori</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {lower.map((c) => (
            <label
              key={c}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                target === c ? "border-primary bg-secondary" : "bg-card hover:bg-muted"
              )}
            >
              <input
                type="radio"
                name="toCategory"
                value={c}
                checked={target === c}
                onChange={() => setTarget(c)}
                className="sr-only"
              />
              <FoodStatusBadge category={c} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`note-${batchId}`} className="text-sm font-medium">
          Alasan <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <input
          id={`note-${batchId}`}
          name="note"
          maxLength={200}
          placeholder="mis. Nasi mulai berbau asam"
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Kategori tidak bisa dinaikkan kembali.
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
        <Button type="submit" variant="destructive" className="h-11" disabled={pending || !target}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Turunkan
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
