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

/** State form dasbor untuk `useActionState`. */
export type DashboardFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string }
