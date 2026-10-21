import { eq } from "drizzle-orm"
import { io } from "next/cache"
import { getDb } from "./db/client"
import { toRecipient, toSppg } from "./db/mappers"
import * as schema from "./db/schema"
import { isValidGeoPoint } from "./geo"
import type { DataResult, Recipient, Regency, Sppg, UpdateRecipientLocationInput } from "./types"

/** Daftar SPPG, opsional difilter per kabupaten, urut nama. */
export async function getSppgList(filter: { regency?: Regency } = {}): Promise<Sppg[]> {
  await io()
  const rows = getDb()
    .select()
    .from(schema.sppg)
    .where(filter.regency ? eq(schema.sppg.regency, filter.regency) : undefined)
    .all()
  return rows.map(toSppg).sort((a, b) => a.name.localeCompare(b.name, "id"))
}

/** Satu SPPG berdasarkan ID, atau `null` bila tidak ada. */
export async function getSppgById(id: string): Promise<Sppg | null> {
  await io()
  const row = getDb().select().from(schema.sppg).where(eq(schema.sppg.id, id)).get()
  return row ? toSppg(row) : null
}

/** Daftar semua penerima, urut jenis lalu nama. */
export async function getRecipients(): Promise<Recipient[]> {
  await io()
  return getDb()
    .select()
    .from(schema.recipients)
    .all()
    .map(toRecipient)
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "id"))
}

/** Satu penerima berdasarkan ID, atau `null` bila tidak ada. */
export async function getRecipientById(id: string): Promise<Recipient | null> {
  await io()
  const row = getDb()
    .select()
    .from(schema.recipients)
    .where(eq(schema.recipients.id, id))
    .get()
  return row ? toRecipient(row) : null
}

/**
 * Perbarui lokasi penerima (mis. dari GPS ponsel) agar jarak ke SPPG akurat.
 * @returns Penerima setelah diperbarui.
 */
export async function updateRecipientLocation(
  input: UpdateRecipientLocationInput
): Promise<DataResult<Recipient>> {
  await io()
  if (!isValidGeoPoint(input.location)) return { ok: false, error: "Lokasi tidak valid." }
  const row = getDb()
    .update(schema.recipients)
    .set({ lat: input.location.lat, lng: input.location.lng })
    .where(eq(schema.recipients.id, input.recipientId))
    .returning()
    .get()
  return row ? { ok: true, data: toRecipient(row) } : { ok: false, error: "Penerima tidak ditemukan." }
}
