import type { PickupPreview } from "@/lib/data/types"

/**
 * State form konfirmasi pengambilan: `preview` = kode valid, detail klaim
 * ditampilkan dan menunggu petugas menekan "Konfirmasi Diambil".
 */
export type PickupFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "preview"; preview: PickupPreview }
  | { status: "success"; message: string }

/** State form turunkan kategori untuk `useActionState`. */
export type DashboardFormState = { status: "idle" } | { status: "error"; message: string }

/** Field form pendaftaran sisa yang nilainya dikembalikan saat galat. */
export type CreateBatchField =
  | "menu"
  | "quantity"
  | "notes"
  | "cookedMinutesAgo"
  | "bestBeforeMinutes"

/**
 * State form pendaftaran sisa. Saat galat, isian dikembalikan lewat `values` karena
 * React mengosongkan form setelah action selesai. Sukses selalu diarahkan (redirect).
 */
export type CreateBatchFormState =
  | { status: "idle" }
  | { status: "error"; message: string; values?: Partial<Record<CreateBatchField, string>> }
