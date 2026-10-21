/**
 * State form klaim untuk `useActionState`. Saat galat, jumlah yang diisi dikembalikan
 * (`quantity`) karena React mengosongkan form setelah action selesai.
 */
export type ClaimFormState =
  | { status: "idle" }
  | { status: "error"; message: string; quantity?: string }
  | { status: "success"; pickupCode: string; quantity: number }

/**
 * State tombol batalkan klaim. Tidak ada state sukses: setelah berhasil halaman
 * dirender ulang dan klaim tampil sebagai "Dibatalkan".
 */
export type CancelClaimState = { status: "idle" } | { status: "error"; message: string }
