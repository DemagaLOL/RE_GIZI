import { buildSeed, deriveBatchStatus } from "./seed"
import type { Claim, Recipient, Sppg, SurplusBatch } from "./types"

/**
 * Penyimpanan in-memory sementara (pengganti database). Disimpan di `globalThis`
 * agar tidak ter-reset oleh HMR saat dev; data kembali ke seed bila server restart.
 * Hanya diakses oleh modul di `src/lib/data` — ganti file ini saat pindah ke Supabase.
 */

type Store = {
  sppg: Sppg[]
  recipients: Recipient[]
  batches: SurplusBatch[]
  claims: Claim[]
}

const globalForStore = globalThis as typeof globalThis & { __reGiziStore?: Store }

/** Ambil store, membuat seed saat pertama kali diakses. Panggil hanya setelah `await io()`. */
export function getStore(): Store {
  globalForStore.__reGiziStore ??= buildSeed(Date.now())
  return globalForStore.__reGiziStore
}

/** Tandai batch `available` yang lewat batas aman sebagai `expired` (setara cron di DB). */
export function expireStaleBatches(store: Store, now: number): void {
  for (const batch of store.batches) {
    if (batch.status !== "available") continue
    const claims = store.claims.filter((c) => c.batchId === batch.id)
    batch.status = deriveBatchStatus(batch.remainingQuantity, claims, batch.safeUntil, now)
  }
}

/** Salinan dalam agar pemanggil tidak bisa mengubah store secara langsung. */
export function clone<T>(value: T): T {
  return structuredClone(value)
}
