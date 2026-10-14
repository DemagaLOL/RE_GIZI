"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { confirmPickupAction } from "../actions"
import type { DashboardFormState } from "../types"

const INITIAL_STATE: DashboardFormState = { status: "idle" }

/** Form petugas SPPG untuk mengonfirmasi pengambilan dengan kode ambil penerima. */
export function PickupConfirmForm() {
  const [state, formAction, pending] = useActionState(confirmPickupAction, INITIAL_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="pickupCode" className="text-sm font-medium">
        Kode ambil dari penerima
      </label>
      <div className="flex gap-2">
        <input
          id="pickupCode"
          name="pickupCode"
          placeholder="RG-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          required
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 font-mono text-base uppercase tracking-widest focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
        <Button type="submit" size="lg" disabled={pending} className="shrink-0">
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Konfirmasi
        </Button>
      </div>
      {state.status !== "idle" && (
        <p
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
