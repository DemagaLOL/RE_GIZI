"use client"

import { useActionState, useState } from "react"
import { Loader2 } from "lucide-react"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORY_UNIT, ELIGIBLE_RECIPIENTS, RECIPIENT_TYPE_LABEL } from "@/lib/data/constants"
import type { SurplusCategory } from "@/lib/data/types"
import { createBatchAction } from "../actions"
import type { DashboardFormState } from "../types"

const INITIAL_STATE: DashboardFormState = { status: "idle" }
const CATEGORIES: readonly SurplusCategory[] = ["A", "B", "C", "D"]
const COOKED_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 0, label: "Baru saja" },
  { value: 30, label: "30 menit lalu" },
  { value: 60, label: "1 jam lalu" },
  { value: 120, label: "2 jam lalu" },
  { value: 180, label: "3 jam lalu" },
  { value: 240, label: "4 jam lalu" },
]

const FIELD_CLASS =
  "w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

/** Keterangan penerima untuk kategori terpilih. */
function categoryHint(category: SurplusCategory): string {
  const eligible = ELIGIBLE_RECIPIENTS[category]
  if (eligible.length === 0) return "Hanya dicatat sebagai sisa yang dibuang; tidak bisa diklaim."
  return `Akan ditawarkan ke ${eligible.map((t) => RECIPIENT_TYPE_LABEL[t]).join(", ")}.`
}

/** Form SPPG untuk mendaftarkan sisa makanan baru beserta kategorinya (A–D). */
export function CreateBatchForm() {
  const [state, formAction, pending] = useActionState(createBatchAction, INITIAL_STATE)
  const [category, setCategory] = useState<SurplusCategory>("A")
  const unit = CATEGORY_UNIT[category]

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Kategori (sesuai kondisi makanan)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label
              key={c}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                category === c ? "border-primary bg-secondary" : "bg-card hover:bg-muted"
              )}
            >
              <input
                type="radio"
                name="category"
                value={c}
                checked={category === c}
                onChange={() => setCategory(c)}
                className="sr-only"
              />
              <FoodStatusBadge category={c} />
            </label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{categoryHint(category)}</p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="menu" className="text-sm font-medium">
          Menu / isi
        </label>
        <input
          id="menu"
          name="menu"
          required
          placeholder="mis. Nasi, ayam suwir kecap, tumis buncis"
          className={cn(FIELD_CLASS, "h-11")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="quantity" className="text-sm font-medium">
            Jumlah ({unit})
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            required
            inputMode={unit === "porsi" ? "numeric" : "decimal"}
            min={unit === "porsi" ? 1 : 0.1}
            step={unit === "porsi" ? 1 : 0.1}
            className={cn(FIELD_CLASS, "h-11")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="cookedMinutesAgo" className="text-sm font-medium">
            Selesai dimasak
          </label>
          <select id="cookedMinutesAgo" name="cookedMinutesAgo" defaultValue={60} className={cn(FIELD_CLASS, "h-11")}>
            {COOKED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="notes" className="text-sm font-medium">
          Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="mis. Sudah dikemas per porsi, bawa wadah sendiri"
          className={cn(FIELD_CLASS, "py-2")}
        />
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="sm:w-fit">
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {category === "D" ? "Catat Sisa Dibuang" : "Daftarkan Sisa"}
      </Button>
    </form>
  )
}
