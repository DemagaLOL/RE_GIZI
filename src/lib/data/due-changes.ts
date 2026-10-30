import { applyClaimExpiries, hasOverdueClaims } from "./claim-cancel"
import type { Db, Tx } from "./db/client"
import { applyDueDegradations, hasDueDegradations } from "./degradation"

/**
 * Perubahan yang terjadi karena waktu berjalan (setara cron, dijalankan saat data dibaca
 * atau ditulis): batch turun kategori dan klaim lewat tenggat ambil dibatalkan.
 */

/**
 * Terapkan perubahan yang jatuh tempo pada `now`, di dalam transaksi `tx`. Degradasi
 * lebih dulu: bila keduanya jatuh tempo, klaim batal karena makanannya turun kategori.
 */
export function applyDueChanges(tx: Tx, now: number): void {
  applyDueDegradations(tx, now)
  applyClaimExpiries(tx, now)
}

/** Seperti `applyDueChanges`; transaksi `IMMEDIATE` hanya dibuka bila ada yang jatuh tempo. */
export function syncDueChanges(db: Db, now: number): void {
  if (!hasDueDegradations(db, now) && !hasOverdueClaims(db, now)) return
  db.transaction((tx) => applyDueChanges(tx, now), { behavior: "immediate" })
}
