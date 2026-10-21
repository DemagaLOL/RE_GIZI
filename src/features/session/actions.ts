"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  RECIPIENT_TYPES,
  REGENCIES,
  registerRecipient,
  revokeSession,
  signIn,
  updateRecipientLocation,
  type GeoPoint,
  type SessionGrant,
} from "@/lib/data"
import { ROLE_HOME } from "./identity"
import { getSession, SESSION_COOKIE } from "./session"
import type { AuthFormState, RegisterField } from "./types"

/** Simpan token sesi di cookie httpOnly, lalu arahkan sesuai peran. */
async function startSession(grant: SessionGrant): Promise<never> {
  ;(await cookies()).set(SESSION_COOKIE, grant.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(grant.expiresAt),
  })
  // Penerima langsung ke katalog; SPPG & TPS ke halaman utama perannya.
  const { role } = grant.identity
  redirect(role === "recipient" ? "/sisa-makanan" : ROLE_HOME[role].href)
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value : ""
}

/** Server Action masuk dengan email & kata sandi. */
export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = text(formData, "email")
  const password = text(formData, "password")
  if (!email.trim() || !password) {
    return { status: "error", message: "Isi email dan kata sandi." }
  }

  const result = await signIn({ email, password })
  if (!result.ok) return { status: "error", message: result.error }
  return startSession(result.data)
}

/** Server Action pendaftaran penerima baru; berhasil → langsung masuk. */
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const values: Record<RegisterField, string> = {
    name: text(formData, "name"),
    type: text(formData, "type"),
    regency: text(formData, "regency"),
    district: text(formData, "district"),
    email: text(formData, "email"),
  }
  const type = RECIPIENT_TYPES.find((t) => t === values.type)
  if (!type) return { status: "error", message: "Pilih jenis penerima.", values }
  const regency = REGENCIES.find((r) => r === values.regency)
  if (!regency) return { status: "error", message: "Pilih kabupaten.", values }

  // Lokasi opsional dari tombol "Gunakan Lokasi Saya"; divalidasi di data layer.
  const lat = text(formData, "lat")
  const lng = text(formData, "lng")
  const location = lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined

  const result = await registerRecipient({
    ...values,
    type,
    regency,
    location,
    password: text(formData, "password"),
  })
  if (!result.ok) return { status: "error", message: result.error, values }
  return startSession(result.data)
}

/**
 * Server Action penerima memperbarui lokasinya (dari GPS perangkat) agar jarak ke
 * SPPG di katalog akurat.
 * @returns Pesan galat, atau `null` bila berhasil.
 */
export async function updateLocationAction(location: GeoPoint): Promise<string | null> {
  const session = await getSession()
  if (session?.role !== "recipient") return "Masuk sebagai penerima terlebih dahulu."
  // Argumen Server Action datang dari klien: jangan percaya bentuknya.
  if (typeof location !== "object" || location === null) return "Lokasi tidak valid."

  const result = await updateRecipientLocation({
    recipientId: session.recipient.id,
    location: { lat: Number(location.lat), lng: Number(location.lng) },
  })
  if (!result.ok) return result.error
  revalidatePath("/sisa-makanan", "layout")
  return null
}

/** Keluar: cabut sesi di server, hapus cookie, kembali ke halaman masuk. */
export async function signOut(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) await revokeSession(token)
  cookieStore.delete(SESSION_COOKIE)
  redirect("/masuk")
}
