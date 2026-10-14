import { io } from "next/cache"
import { clone, getStore } from "./store"
import type { Recipient, Regency, Sppg } from "./types"

/** Daftar SPPG, opsional difilter per kabupaten, urut nama. */
export async function getSppgList(filter: { regency?: Regency } = {}): Promise<Sppg[]> {
  await io()
  const list = getStore().sppg.filter(
    (s) => !filter.regency || s.regency === filter.regency
  )
  return clone(list).sort((a, b) => a.name.localeCompare(b.name, "id"))
}

/** Satu SPPG berdasarkan ID, atau `null` bila tidak ada. */
export async function getSppgById(id: string): Promise<Sppg | null> {
  await io()
  const sppg = getStore().sppg.find((s) => s.id === id)
  return sppg ? clone(sppg) : null
}

/** Daftar semua penerima, urut jenis lalu nama. */
export async function getRecipients(): Promise<Recipient[]> {
  await io()
  return clone(getStore().recipients).sort(
    (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "id")
  )
}

/** Satu penerima berdasarkan ID, atau `null` bila tidak ada. */
export async function getRecipientById(id: string): Promise<Recipient | null> {
  await io()
  const recipient = getStore().recipients.find((r) => r.id === id)
  return recipient ? clone(recipient) : null
}