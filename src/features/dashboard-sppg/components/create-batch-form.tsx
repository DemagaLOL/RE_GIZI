"use client"

import { useActionState, useState } from "react"
import { Loader2 } from "lucide-react"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CATEGORY_UNIT,
  ELIGIBLE_RECIPIENTS,
  FOOD_TYPE_LABEL,
  RECIPIENT_TYPE_LABEL,
} from "@/lib/data/constants"
import type { FoodType, SurplusCategory } from "@/lib/data/types"
import { createBatchAction } from "../actions"
import { COOKED_FIELD, DRY_FIELD } from "../cooked-options"
import type { DashboardFormState } from "../types"

const INITIAL_STATE: DashboardFormState = { status: "idle" }
const CATEGORIES: readonly SurplusCategory[] = ["A", "B", "C", "D"]

/** Pilihan jenis makanan untuk kategori A. */
const FOOD_TYPES: readonly { value: FoodType; description: string }[] = [
  { value: "cooked", description: "Nasi, lauk, sayur — aman 4 jam sejak dimasak" },
  { value: "dry", description: "Roti, biskuit, dsb. — tahan beberapa hari" },
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
  const [foodType, setFoodType] = useState<FoodType>("cooked")
  const unit = CATEGORY_UNIT[category]
  // Makanan kering hanya untuk kategori A; kategori lain selalu makanan matang.
  const dry = category === "A" && foodType === "dry"
  const time = dry ? DRY_FIELD : COOKED_FIELD[category]
  const timeName = dry ? "bestBeforeMinutes" : "cookedMinutesAgo"

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

      {category === "A" && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">Jenis makanan</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FOOD_TYPES.map((t) => (
              <label
                key={t.value}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col justify-center rounded-lg border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  foodType === t.value ? "border-primary bg-secondary" : "bg-card hover:bg-muted"
                )}
              >
                <input
                  type="radio"
                  name="foodType"
                  value={t.value}
                  checked={foodType === t.value}
                  onChange={() => setFoodType(t.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{FOOD_TYPE_LABEL[t.value]}</span>
                <span className="text-sm text-muted-foreground">{t.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="menu" className="text-sm font-medium">
          Menu / isi
        </label>
        <input
          id="menu"
          name="menu"
          required
          placeholder={dry ? "mis. Roti isi cokelat, biskuit kemasan" : "mis. Nasi, ayam suwir kecap, tumis buncis"}
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
          <label htmlFor={timeName} className="text-sm font-medium">
            {time.label}
          </label>
          {/* `key` mengembalikan pilihan ke default setiap kali kategori/jenis makanan diganti. */}
          <select
            key={`${category}-${dry ? "dry" : "cooked"}`}
            id={timeName}
            name={timeName}
            defaultValue={time.defaultValue}
            aria-describedby="time-hint"
            className={cn(FIELD_CLASS, "h-11")}
          >
            {time.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p id="time-hint" className="text-sm text-muted-foreground">
            {time.hint}
          </p>
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
