/**
 * Data layer RE:GIZI — satu-satunya pintu akses data aplikasi.
 *
 * Data disimpan di SQLite lokal (`data/regizi.db`) lewat Drizzle ORM (`db/`); database
 * kosong otomatis diisi `seed.ts`. Semua fungsi async dan mengembalikan tipe domain,
 * jadi penyimpanan bisa diganti tanpa mengubah pemanggil. Fungsi memanggil
 * `await io()` sebelum query, jadi di Server Component render pemanggilnya di dalam
 * `<Suspense>` (Cache Components aktif).
 *
 * Client Component cukup mengimpor tipe/label dari `@/lib/data/types` dan
 * `@/lib/data/constants` agar driver database tidak ikut ter-bundle ke browser.
 */

export {
  cancelClaim,
  claimBatch,
  confirmPickup,
  createBatch,
  degradeBatch,
  getBatchById,
  getBatches,
  getCategoryEvents,
  getCategoryEventsBySppg,
  getClaimsByBatch,
  getClaimsByRecipient,
  getClaimsBySppg,
  getImpactStats,
  getNow,
  getPickupPreview,
} from "./batches"
export {
  advanceClock,
  canResetDemoData,
  getClockState,
  hasFutureData,
  resetClock,
  resetDemoData,
  setClock,
} from "./clock-control"
export { isSimClockEnabled } from "./clock"
export {
  getDemoAccounts,
  getIdentityBySessionToken,
  registerRecipient,
  revokeSession,
  signIn,
} from "./auth"
export { DEMO_PASSWORD } from "./seed"
export {
  collectDisposal,
  getDisposalQueue,
  getDisposalsByTps,
  getDisposalSummary,
} from "./disposals"
export { directionsUrl, distanceKm, isValidGeoPoint } from "./geo"
export {
  getRecipientById,
  getRecipients,
  getSppgById,
  getSppgList,
  updateRecipientLocation,
} from "./sppg"
export * from "./constants"
export type * from "./types"
