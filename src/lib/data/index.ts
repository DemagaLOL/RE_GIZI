/**
 * Data layer RE:GIZI — satu-satunya pintu akses data aplikasi.
 *
 * Implementasi saat ini in-memory (`store.ts` + `seed.ts`); semua fungsi async dan
 * mengembalikan salinan data agar bisa diganti ke Supabase tanpa mengubah pemanggil.
 * Fungsi memanggil `await io()`, jadi di Server Component render pemanggilnya di
 * dalam `<Suspense>` (Cache Components aktif).
 *
 * Client Component cukup mengimpor tipe/label dari `@/lib/data/types` dan
 * `@/lib/data/constants` agar store tidak ikut ter-bundle ke browser.
 */

export {
  claimBatch,
  confirmPickup,
  createBatch,
  getBatchById,
  getBatches,
  getClaimsByBatch,
  getClaimsByRecipient,
  getImpactStats,
  getNow,
} from "./batches"
export { getRecipientById, getRecipients, getSppgById, getSppgList } from "./sppg"
export * from "./constants"
export type * from "./types"
