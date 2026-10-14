"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getRecipientById, getSppgById } from "@/lib/data"
import { SESSION_COOKIE } from "./session"

const ONE_WEEK = 60 * 60 * 24 * 7

/**
 * Masuk sebagai akun demo. `formData.account` berformat `sppg:<id>` atau `recipient:<id>`.
 * SPPG diarahkan ke dasbor, penerima ke daftar sisa makanan.
 */
export async function signInAs(formData: FormData): Promise<void> {
  const account = formData.get("account")
  if (typeof account !== "string") return

  const [role, id] = account.split(":")
  const valid =
    (role === "sppg" && id && (await getSppgById(id))) ||
    (role === "recipient" && id && (await getRecipientById(id)))
  if (!valid) return

  ;(await cookies()).set(SESSION_COOKIE, account, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK,
  })
  redirect(role === "sppg" ? "/dasbor" : "/sisa-makanan")
}

/** Keluar dari sesi demo dan kembali ke halaman masuk. */
export async function signOut(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect("/masuk")
}
