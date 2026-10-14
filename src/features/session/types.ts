import type { Recipient, Sppg } from "@/lib/data"

/** Sesi demo aktif: masuk sebagai satu SPPG atau satu penerima, atau belum masuk (`null`). */
export type Session =
  | { role: "sppg"; sppg: Sppg }
  | { role: "recipient"; recipient: Recipient }
  | null
