"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { ChefHat, Loader2, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DemoAccount } from "@/lib/data/types"
import { signInAction } from "../actions"
import type { AuthFormState } from "../types"

const INITIAL_STATE: AuthFormState = { status: "idle" }

/** Kelas input teks/select form autentikasi (tinggi 44px untuk sentuhan). */
export const FIELD_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none aria-invalid:border-destructive"

/** Daftar akun contoh; menekan satu baris mengisi form masuk. */
function DemoAccountList({
  title,
  icon: Icon,
  accounts,
  onPick,
}: {
  title: string
  icon: typeof ChefHat
  accounts: readonly DemoAccount[]
  onPick: (email: string) => void
}) {
  return (
    <details className="group rounded-lg border bg-card">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-medium">
        <Icon className="size-4 text-primary" aria-hidden />
        {title}
        <span className="ml-auto text-muted-foreground">{accounts.length}</span>
      </summary>
      <ul className="flex flex-col gap-1 p-2 pt-0">
        {accounts.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => onPick(account.email)}
              className="flex min-h-11 w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="text-sm font-medium">{account.name}</span>
              <span className="text-xs text-muted-foreground">
                {account.detail} · <span className="font-mono">{account.email}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

/**
 * Form masuk dengan email & kata sandi, ditambah daftar akun contoh yang bisa
 * dipilih untuk mengisi form otomatis.
 * @param demoAccounts Akun seed; kosongkan untuk menyembunyikan bagian demo.
 * @param demoPassword Kata sandi akun seed.
 */
export function LoginForm({
  demoAccounts,
  demoPassword,
}: {
  demoAccounts: readonly DemoAccount[]
  demoPassword: string
}) {
  const [state, formAction, pending] = useActionState(signInAction, INITIAL_STATE)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const error = state.status === "error" ? state.message : undefined

  function pickDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  const sppgAccounts = demoAccounts.filter((a) => a.role === "sppg")
  const recipientAccounts = demoAccounts.filter((a) => a.role === "recipient")
  const tpsAccounts = demoAccounts.filter((a) => a.role === "tps")

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Masuk ke akun Anda</CardTitle>
          <CardDescription>Gunakan email dan kata sandi yang terdaftar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className={FIELD_CLASS}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Kata sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "login-error" : undefined}
                className={FIELD_CLASS}
              />
            </div>
            {error && (
              <p id="login-error" role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Masuk
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Penerima baru?{" "}
              <Link href="/daftar" className="font-medium text-primary hover:underline">
                Daftar di sini
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>

      {demoAccounts.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl bg-secondary p-4 md:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold text-secondary-foreground">Akun contoh untuk keperluan demonstrasi</h2>
            <p className="text-sm text-muted-foreground">
              Pilih akun untuk mengisi form. Semua akun contoh memakai kata sandi{" "}
              <span className="font-mono font-medium text-foreground">{demoPassword}</span>.
            </p>
          </div>
          <DemoAccountList title="SPPG" icon={ChefHat} accounts={sppgAccounts} onPick={pickDemo} />
          <DemoAccountList title="Penerima" icon={Users} accounts={recipientAccounts} onPick={pickDemo} />
          <DemoAccountList title="TPS" icon={Trash2} accounts={tpsAccounts} onPick={pickDemo} />
        </section>
      )}
    </div>
  )
}
