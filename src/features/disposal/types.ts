/**
 * State tombol "Tandai Sudah Diangkut". Tidak ada state sukses: setelah berhasil
 * halaman dirender ulang dan batch pindah dari antrean ke riwayat.
 */
export type CollectFormState = { status: "idle" } | { status: "error"; message: string }
