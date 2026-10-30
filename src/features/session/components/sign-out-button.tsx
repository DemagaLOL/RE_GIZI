"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "../actions"

/** Tombol konfirmasi keluar; dipisah agar bisa membaca status form induknya. */
function ConfirmButtons({ onBack }: { onBack: () => void }) {
  const { pending } = useFormStatus()
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Iya, Keluar
      </Button>
      <Button type="button" variant="ghost" className="h-11" disabled={pending} onClick={onBack}>
        Kembali
      </Button>
    </div>
  )
}

/** Tombol keluar dari akun dengan konfirmasi dua langkah (Iya atau Kembali). */
export function SignOutButton() {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-11 w-fit"
        onClick={() => setConfirming(true)}
      >
        <LogOut data-icon="inline-start" aria-hidden />
        Keluar
      </Button>
    )
  }

  return (
    <form action={signOut} className="flex flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm">Yakin ingin keluar dari akun ini?</p>
      <ConfirmButtons onBack={() => setConfirming(false)} />
    </form>
  )
}
