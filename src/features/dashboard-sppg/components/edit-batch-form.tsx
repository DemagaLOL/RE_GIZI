"use client"

import { useActionState, useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MENU_MAX_LENGTH, NOTES_MAX_LENGTH } from "@/lib/data/constants"
import type { QuantityUnit } from "@/lib/data/types"
import { formatQuantity } from "@/lib/format"
import { cn } from "@/lib/utils"
import { updateBatchAction } from "../actions"
import type { EditBatchFormState } from "../types"

const INITIAL_STATE: EditBatchFormState = { status: "idle" }

const FIELD_CLASS =
  "w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

/** Data batch yang bisa diubah. */
type EditableBatch = {
  id: string
  menu: string
  quantity: number
  unit: QuantityUnit
  notes?: string
  /** Jumlah yang sudah diklaim; jumlah baru tidak boleh lebih kecil. */
  claimed: number
  /** `true` bila batch pernah turun kategori: jumlahnya hasil konversi dan tidak bisa diubah. */
  quantityLocked: boolean
}

/** Isian form; dipisah agar state action hilang saat form ditutup. */
function EditFields({ batch, onClose }: { batch: EditableBatch; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (previous: EditBatchFormState, formData: FormData) => {
      const next = await updateBatchAction(previous, formData)
      if (next.status === "idle") onClose()
      return next
    },
    INITIAL_STATE
  )
  const values = state.status === "error" ? state.values : undefined
  const { unit } = batch

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 rounded-lg border p-3">
      <input type="hidden" name="batchId" value={batch.id} />

      <div className="flex flex-col gap-2">
        <label htmlFor={`menu-${batch.id}`} className="text-sm font-medium">
          Menu/isi
        </label>
        <input
          id={`menu-${batch.id}`}
          name="menu"
          required
          maxLength={MENU_MAX_LENGTH}
          defaultValue={values?.menu ?? batch.menu}
          className={cn(FIELD_CLASS, "h-11")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`quantity-${batch.id}`} className="text-sm font-medium">
          Jumlah total ({unit})
        </label>
        {batch.quantityLocked && <input type="hidden" name="quantity" value={batch.quantity} />}
        <input
          id={`quantity-${batch.id}`}
          name={batch.quantityLocked ? undefined : "quantity"}
          type="number"
          inputMode={unit === "porsi" ? "numeric" : "decimal"}
          min={Math.max(batch.claimed, unit === "porsi" ? 1 : 0.1)}
          step={unit === "porsi" ? 1 : 0.1}
          required
          disabled={batch.quantityLocked}
          defaultValue={values?.quantity ?? batch.quantity}
          className={cn(FIELD_CLASS, "h-11 disabled:bg-muted disabled:text-muted-foreground")}
        />
        <p className="text-sm text-muted-foreground">
          {batch.quantityLocked
            ? "Jumlah terkunci karena batch ini sudah turun kategori."
            : batch.claimed > 0
              ? `Sudah diklaim ${formatQuantity(batch.claimed, unit)}.`
              : "Waktu masak dan kategori tidak bisa diubah."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`notes-${batch.id}`} className="text-sm font-medium">
          Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
        </label>
        <textarea
          id={`notes-${batch.id}`}
          name="notes"
          rows={2}
          maxLength={NOTES_MAX_LENGTH}
          defaultValue={values?.notes ?? batch.notes}
          className={cn(FIELD_CLASS, "py-2")}
        />
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="h-11" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Simpan
        </Button>
        <Button type="button" variant="ghost" className="h-11" disabled={pending} onClick={onClose}>
          Batal
        </Button>
      </div>
    </form>
  )
}

/** Tombol + form SPPG untuk mengubah menu, jumlah, dan catatan batch. */
export function EditBatchForm({ batch }: { batch: EditableBatch }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button type="button" variant="outline" className="h-11 w-fit" onClick={() => setOpen(true)}>
        <Pencil data-icon="inline-start" aria-hidden />
        Ubah Data
      </Button>
    )
  }
  return <EditFields batch={batch} onClose={() => setOpen(false)} />
}
