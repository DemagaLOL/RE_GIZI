"use client"

import { useActionState, useState, type ReactNode } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { LocateButton } from "@/components/shared/locate-button"
import { Button } from "@/components/ui/button"
import {
  DISTRICT_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RECIPIENT_TYPE_LABEL,
  RECIPIENT_TYPES,
  REGENCIES,
} from "@/lib/data/constants"
import type { GeoPoint } from "@/lib/data/types"
import { registerAction } from "../actions"
import type { AuthFormState } from "../types"
import { FIELD_CLASS } from "./login-form"

const INITIAL_STATE: AuthFormState = { status: "idle" }

/** Satu field berlabel. */
function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

/**
 * Form pendaftaran penerima (UMKM, warga, peternak, petani, komposter). Berhasil →
 * langsung masuk dan diarahkan ke daftar sisa makanan.
 */
export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, INITIAL_STATE)
  const [location, setLocation] = useState<GeoPoint>()
  const values = state.status === "error" ? state.values : undefined
  const error = state.status === "error" ? state.message : undefined

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="name" label="Nama usaha / kelompok / lengkap">
        <input
          id="name"
          name="name"
          required
          minLength={3}
          maxLength={100}
          autoComplete="organization"
          defaultValue={values?.name}
          placeholder="mis. Warung Makan Bu Sri"
          className={FIELD_CLASS}
        />
      </Field>

      <Field id="type" label="Jenis penerima" hint="Menentukan sisa makanan yang bisa Anda klaim.">
        <select id="type" name="type" required defaultValue={values?.type ?? ""} className={FIELD_CLASS}>
          <option value="" disabled>
            Pilih jenis
          </option>
          {RECIPIENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {RECIPIENT_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="regency" label="Kabupaten">
          <select id="regency" name="regency" required defaultValue={values?.regency ?? ""} className={FIELD_CLASS}>
            <option value="" disabled>
              Pilih kabupaten
            </option>
            {REGENCIES.map((regency) => (
              <option key={regency} value={regency}>
                {regency}
              </option>
            ))}
          </select>
        </Field>
        <Field id="district" label="Kecamatan">
          <input
            id="district"
            name="district"
            required
            maxLength={DISTRICT_MAX_LENGTH}
            defaultValue={values?.district}
            placeholder="mis. Kalimanah"
            className={FIELD_CLASS}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          Lokasi <span className="font-normal text-muted-foreground">(opsional)</span>
        </span>
        <p className="text-sm text-muted-foreground">
          Agar sisa makanan dari SPPG terdekat tampil lebih dulu.
        </p>
        <input type="hidden" name="lat" value={location?.lat ?? ""} />
        <input type="hidden" name="lng" value={location?.lng ?? ""} />
        <LocateButton
          doneText="Lokasi didapat dan akan disimpan saat mendaftar."
          fallbackText="Lokasi memakai titik tengah kabupaten."
          onLocate={setLocation}
        />
      </div>

      <Field id="email" label="Email">
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={values?.email}
          className={FIELD_CLASS}
        />
      </Field>

      <Field id="password" label="Kata sandi" hint={`Minimal ${PASSWORD_MIN_LENGTH} karakter.`}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={128}
          className={FIELD_CLASS}
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Daftar
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-medium text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  )
}
