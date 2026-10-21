import type { AuthIdentity } from "@/lib/data"

/** Sesi aktif: masuk sebagai satu SPPG, penerima, atau TPS, atau belum masuk (`null`). */
export type Session = AuthIdentity | null

/** Field form daftar yang nilainya dikembalikan saat galat (kata sandi tidak ikut). */
export type RegisterField = "name" | "type" | "regency" | "district" | "email"

/** State form masuk/daftar untuk `useActionState`. Sukses selalu diarahkan (redirect). */
export type AuthFormState =
  | { status: "idle" }
  | { status: "error"; message: string; values?: Partial<Record<RegisterField, string>> }
