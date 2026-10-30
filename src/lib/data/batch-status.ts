import { eq } from "drizzle-orm"
import type { Tx } from "./db/client"
import * as schema from "./db/schema"
import { deriveBatchStatus } from "./seed"
import type { SurplusBatch } from "./types"

/** Hitung ulang status batch dari sisa & seluruh klaimnya. Batch D tetap `discarded`. */
export function refreshBatchStatus(tx: Tx, batch: SurplusBatch, now: number): void {
  if (batch.status === "discarded") return
  const claims = tx
    .select({ status: schema.claims.status })
    .from(schema.claims)
    .where(eq(schema.claims.batchId, batch.id))
    .all()
  const status = deriveBatchStatus(batch.remainingQuantity, claims, batch.safeUntil, now)
  tx.update(schema.batches).set({ status }).where(eq(schema.batches.id, batch.id)).run()
}
