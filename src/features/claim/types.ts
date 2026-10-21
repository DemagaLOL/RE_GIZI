/** State form klaim untuk `useActionState`. */
export type ClaimFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; pickupCode: string; quantity: number }

/**
 * State tombol batalkan klaim. Tidak ada state sukses: setelah berhasil halaman
 * dirender ulang dan klaim tampil sebagai "Dibatalkan".
 */
export type CancelClaimState = { status: "idle" } | { status: "error"; message: string }
