import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getRecipientById, getSppgById } from "@/lib/data"
import type { Session } from "./types"

/** Nama cookie sesi demo. Isinya `sppg:<id>` atau `recipient:<id>`. */
export const SESSION_COOKIE = "regizi_session"

/**
 * Baca sesi demo dari cookie dan validasi ke data layer. Membaca cookie berarti
 * pemanggil harus dirender di dalam `<Suspense>`.
 * @returns Sesi aktif, atau `null` bila belum masuk / cookie tidak valid.
 */
export async function getSession(): Promise<Session> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value
  if (!value) return null

  const [role, id] = value.split(":")
  if (role === "sppg" && id) {
    const sppg = await getSppgById(id)
    return sppg ? { role: "sppg", sppg } : null
  }
  if (role === "recipient" && id) {
    const recipient = await getRecipientById(id)
    return recipient ? { role: "recipient", recipient } : null
  }
  return null
}

/** Sesi SPPG wajib; selain itu diarahkan ke halaman masuk. */
export async function requireSppgSession(): Promise<Extract<Session, { role: "sppg" }>> {
  const session = await getSession()
  if (session?.role !== "sppg") redirect("/masuk?perlu=sppg")
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
