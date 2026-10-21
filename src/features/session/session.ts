import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getIdentityBySessionToken } from "@/lib/data"
import type { Session } from "./types"

/** Nama cookie sesi. Isinya token acak; server hanya menyimpan hash-nya. */
export const SESSION_COOKIE = "regizi_session"

/**
 * Baca sesi dari cookie dan validasi ke data layer. Membaca cookie berarti
 * pemanggil harus dirender di dalam `<Suspense>`.
 * @returns Sesi aktif, atau `null` bila belum masuk / token tidak valid / kedaluwarsa.
 */
export async function getSession(): Promise<Session> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  return getIdentityBySessionToken(token)
}

/** Sesi SPPG wajib; selain itu diarahkan ke halaman masuk. */
export async function requireSppgSession(): Promise<Extract<Session, { role: "sppg" }>> {
  const session = await getSession()
  if (session?.role !== "sppg") redirect("/masuk?perlu=sppg")
  return session
}

/** Sesi TPS wajib; selain itu diarahkan ke halaman masuk. */
export async function requireTpsSession(): Promise<Extract<Session, { role: "tps" }>> {
  const session = await getSession()
  if (session?.role !== "tps") redirect("/masuk?perlu=tps")
  return session
}

/** Sesi penerima wajib; selain itu diarahkan ke halaman masuk. */
export async function requireRecipientSession(): Promise<
  Extract<Session, { role: "recipient" }>
> {
  const session = await getSession()
  if (session?.role !== "recipient") redirect("/masuk?perlu=penerima")
  return session
}
