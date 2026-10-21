import type { CategoryEvent, Claim, Disposal, Recipient, Sppg, SurplusBatch, Tps } from "../types"
import type {
  BatchRow,
  CategoryEventRow,
  ClaimRow,
  DisposalRow,
  RecipientRow,
  SppgRow,
  TpsRow,
} from "./schema"

/**
 * Konversi baris tabel ↔ tipe domain: `lat`/`lng` ↔ `location`, dan kolom
 * nullable ↔ properti opsional (`undefined`).
 */

/** Baris `sppg` → `Sppg`. */
export function toSppg(row: SppgRow): Sppg {
  const { lat, lng, ...rest } = row
  return { ...rest, location: { lat, lng } }
}

/** `Sppg` → baris `sppg`. */
export function fromSppg(sppg: Sppg): SppgRow {
  const { location, ...rest } = sppg
  return { ...rest, lat: location.lat, lng: location.lng }
}

/** Baris `recipients` → `Recipient`. */
export function toRecipient(row: RecipientRow): Recipient {
  const { lat, lng, ...rest } = row
  return { ...rest, location: { lat, lng } }
}

/** `Recipient` → baris `recipients`. */
export function fromRecipient(recipient: Recipient): RecipientRow {
  const { location, ...rest } = recipient
  return { ...rest, lat: location.lat, lng: location.lng }
}

/** Baris `batches` → `SurplusBatch`. */
export function toBatch(row: BatchRow): SurplusBatch {
  const { notes, bestBefore, ...rest } = row
  return {
    ...rest,
    ...(notes !== null && { notes }),
    ...(bestBefore !== null && { bestBefore }),
  }
}

/** `SurplusBatch` → baris `batches`. */
export function fromBatch(batch: SurplusBatch): BatchRow {
  return { ...batch, notes: batch.notes ?? null, bestBefore: batch.bestBefore ?? null }
}

/** Baris `claims` → `Claim`. */
export function toClaim(row: ClaimRow): Claim {
  const { pickedUpAt, cancelReason, ...rest } = row
  return {
    ...rest,
    ...(pickedUpAt !== null && { pickedUpAt }),
    ...(cancelReason !== null && { cancelReason }),
  }
}

/** `Claim` → baris `claims`. */
export function fromClaim(claim: Claim): ClaimRow {
  return {
    ...claim,
    pickedUpAt: claim.pickedUpAt ?? null,
    cancelReason: claim.cancelReason ?? null,
  }
}

/** Baris `batch_category_events` → `CategoryEvent`. */
export function toCategoryEvent(row: CategoryEventRow): CategoryEvent {
  const { note, ...rest } = row
  return note === null ? rest : { ...rest, note }
}

/** `CategoryEvent` → baris `batch_category_events`. */
export function fromCategoryEvent(event: CategoryEvent): CategoryEventRow {
  return { ...event, note: event.note ?? null }
}

/** Baris `tps` → `Tps`. */
export function toTps(row: TpsRow): Tps {
  const { lat, lng, ...rest } = row
  return { ...rest, location: { lat, lng } }
}

/** `Tps` → baris `tps`. */
export function fromTps(tps: Tps): TpsRow {
  const { location, ...rest } = tps
  return { ...rest, lat: location.lat, lng: location.lng }
}

/** Baris `disposals` → `Disposal`. */
export function toDisposal(row: DisposalRow): Disposal {
  const { note, ...rest } = row
  return note === null ? rest : { ...rest, note }
}

/** `Disposal` → baris `disposals`. */
export function fromDisposal(disposal: Disposal): DisposalRow {
  return { ...disposal, note: disposal.note ?? null }
}
