"use client"

import { useActionState, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Button } from "@/components/ui/button"
import { PICKUP_CODE_LENGTH, RECIPIENT_TYPE_LABEL } from "@/lib/data/constants"
import type { PickupPreview } from "@/lib/data/types"
import { formatDateTime, formatPickupCode, formatQuantity } from "@/lib/format"
import { pickupAction } from "../actions"
import type { PickupFormState } from "../types"

const INITIAL_STATE: PickupFormState = { status: "idle" }

/** Ringkasan klaim yang akan diserahkan; dibaca petugas sebelum mengonfirmasi. */
function PickupSummary({ preview }: { preview: PickupPreview }) {
  const { claim, batch, recipient } = preview
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FoodStatusBadge category={claim.category} />
        <span className="font-mono text-sm font-semibold tracking-widest">
          {formatPickupCode(claim.pickupCode)}
        </span>
      </div>
      <p className="font-medium leading-snug">{batch.menu}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Jumlah</dt>
        <dd className="font-mono text-base font-bold">{formatQuantity(claim.quantity, claim.unit)}</dd>
        <dt className="text-muted-foreground">Penerima</dt>
        <dd>
          {recipient.name}{" "}
          <span className="text-muted-foreground">({RECIPIENT_TYPE_LABEL[recipient.type]})</span>
        </dd>
        <dt className="text-muted-foreground">Diklaim</dt>
        <dd>{formatDateTime(claim.claimedAt)}</dd>
      </dl>
    </div>
  )
}

/**
 * Form petugas SPPG untuk konfirmasi pengambilan dua langkah: masukkan kode ambil,
 * periksa detail klaim yang muncul, lalu tekan "Konfirmasi Diambil".
 */
export function PickupConfirmForm() {
  const [state, formAction, pending] = useActionState(pickupAction, INITIAL_STATE)

  if (state.status === "preview") {
    return (
      <form action={formAction} className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Pastikan sisa makanan di bawah ini yang diserahkan ke penerima.
        </p>
        <PickupSummary preview={state.preview} />
        <input type="hidden" name="pickupCode" value={state.preview.claim.pickupCode} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" name="intent" value="confirm" size="lg" disabled={pending}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 data-icon="inline-start" aria-hidden />
            )}
            Konfirmasi Diambil
          </Button>
          <Button
            type="submit"
            name="intent"
            value="reset"
            size="lg"
            variant="outline"
            disabled={pending}
            formNoValidate
          >
            Batal
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <CodeEntry pending={pending} invalid={state.status === "error"} />
      {(state.status === "error" || state.status === "success") && (
        <p
          id="pickup-feedback"
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "text-sm font-medium text-destructive"
              : "text-sm font-medium text-success"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  )
}

/**
 * Input kode ambil: hanya angka (keypad angka di ponsel), maks `PICKUP_CODE_LENGTH`
 * digit, tampil berkelompok `123 456`. Tombol aktif setelah kode lengkap.
 */
function CodeEntry({ pending, invalid }: { pending: boolean; invalid: boolean }) {
  const [digits, setDigits] = useState("")
  const complete = digits.length === PICKUP_CODE_LENGTH

  return (
    <>
      <label htmlFor="pickupCode" className="text-sm font-medium">
        Kode ambil dari penerima
      </label>
      <div className="flex gap-2">
        <input
          id="pickupCode"
          name="pickupCode"
          type="text"
          inputMode="numeric"
          pattern="[0-9 ]*"
          autoComplete="off"
          placeholder="123 456"
          value={formatPickupCode(digits)}
          onChange={(e) =>
            setDigits(e.target.value.replace(/\D/g, "").slice(0, PICKUP_CODE_LENGTH))
          }
          required
          aria-invalid={invalid || undefined}
          aria-describedby="pickup-hint pickup-feedback"
          className="h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-center font-mono text-2xl font-semibold tracking-widest placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-invalid:border-destructive"
        />
        <Button
          type="submit"
          name="intent"
          value="check"
          size="lg"
          disabled={pending || !complete}
          className="h-12 shrink-0"
        >
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Cek Kode
        </Button>
      </div>
      <p id="pickup-hint" className="text-sm text-muted-foreground">
        {PICKUP_CODE_LENGTH} angka dari layar penerima.
      </p>
    </>
  )
}
