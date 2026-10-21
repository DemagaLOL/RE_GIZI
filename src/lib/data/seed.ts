import type { Db, Tx } from "./db/client"
import { fromRecipient, fromSppg, fromTps } from "./db/mappers"
import * as schema from "./db/schema"
import type { AccountRow } from "./db/schema"
import { hashPasswordSync } from "./password"
import type { BatchStatus, Claim, Recipient, Sppg, Tps } from "./types"

/**
 * Data awal untuk demonstrasi: satu SPPG (lokasi Dapur SPPG Blater, Kalimanah), satu TPS,
 * dan satu akun untuk tiap jenis penerima, tanpa sisa makanan maupun klaim — demo dimulai
 * dari kosong untuk menunjukkan alur memasukkan (SPPG) dan mengambil (penerima).
 */

export const SEED_SPPG: readonly Sppg[] = [
  { id: "sppg-01", name: "SPPG Blater", operator: "Yayasan Gizi Perwira", address: "Desa Blater, Kalimanah", district: "Kalimanah", regency: "Purbalingga", location: { lat: -7.4306935, lng: 109.3356508 }, dailyCapacity: 3200 },
]

/** Satu penerima per jenis, `id` = `rcp-<jenis>`. */
export const SEED_RECIPIENTS: readonly Recipient[] = [
  { id: "rcp-umkm", name: "Warung Makan Bu Sri", type: "umkm", district: "Kalimanah", regency: "Purbalingga", location: { lat: -7.4152, lng: 109.3481 } },
  { id: "rcp-warga", name: "Dasawisma Melati RW 02", type: "warga", district: "Purbalingga", regency: "Purbalingga", location: { lat: -7.3921, lng: 109.3655 } },
  { id: "rcp-peternak", name: "Kelompok Budidaya Lele Mina Makmur", type: "peternak", district: "Bukateja", regency: "Purbalingga", location: { lat: -7.4405, lng: 109.4198 } },
  { id: "rcp-petani", name: "Kelompok Tani Sido Makmur", type: "petani", district: "Mrebet", regency: "Purbalingga", location: { lat: -7.3087, lng: 109.3372 } },
  { id: "rcp-komposter", name: "Rumah Kompos Perwira", type: "komposter", district: "Purbalingga", regency: "Purbalingga", location: { lat: -7.3912, lng: 109.3702 } },
]

/** TPS pengangkut sisa kategori D. Akun TPS hanya dibuat lewat seed (tidak bisa daftar sendiri). */
export const SEED_TPS: readonly Tps[] = [
  { id: "tps-01", name: "TPST Purbalingga", operator: "Dinas Lingkungan Hidup Kab. Purbalingga", address: "Jl. Raya Kalimanah–Purbalingga, Desa Kalimanah Wetan", district: "Kalimanah", regency: "Purbalingga", location: { lat: -7.4093, lng: 109.3417 } },
]

/** Status batch dari sisa kuantitas, klaim, dan waktu. Dipakai juga oleh data layer saat menulis. */
export function deriveBatchStatus(
  remainingQuantity: number,
  claims: readonly Pick<Claim, "status">[],
  safeUntil: string,
  now: number
): BatchStatus {
  if (remainingQuantity <= 0) {
    const active = claims.filter((c) => c.status !== "cancelled")
    return active.length > 0 && active.every((c) => c.status === "picked_up")
      ? "completed"
      : "reserved"
  }
  return Date.parse(safeUntil) <= now ? "expired" : "available"
}

/** Domain email akun contoh; dipakai juga untuk mengenali akun demo. */
export const DEMO_EMAIL_DOMAIN = "demo.regizi.id"

/** Kata sandi semua akun contoh. Hanya untuk demo — jangan dipakai di produksi. */
export const DEMO_PASSWORD = "regizi123"

/**
 * Mode demo: daftar akun contoh tampil di halaman masuk dan akun contoh bisa dipakai.
 * Selalu aktif di dev; di produksi hanya bila env `DEMO_MODE=1` (kata sandinya publik).
 */
export function isDemoMode(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1"
}

/** `true` bila `email` (sudah dinormalisasi) milik akun contoh. */
export function isDemoEmail(email: string): boolean {
  return email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)
}

/**
 * Akun contoh: `sppg@demo.regizi.id` untuk SPPG pertama (`sppg2@…` dst. bila ada
 * lebih dari satu), `tps@demo.regizi.id` untuk TPS, dan `<jenis>@demo.regizi.id` untuk penerima
 * (mis. `umkm@…`, `peternak@…`).
 * Hash dihitung sekali lalu dipakai bersama (semua kata sandinya sama).
 */
function buildSeedAccounts(now: number): AccountRow[] {
  const passwordHash = hashPasswordSync(DEMO_PASSWORD)
  const createdAt = new Date(now).toISOString()
  const profiles: { id: string; role: AccountRow["role"]; login: string }[] = [
    ...SEED_SPPG.map((s, i) => ({
      id: s.id,
      role: "sppg" as const,
      login: i === 0 ? "sppg" : `sppg${i + 1}`,
    })),
    ...SEED_TPS.map((t, i) => ({ id: t.id, role: "tps" as const, login: i === 0 ? "tps" : `tps${i + 1}` })),
    ...SEED_RECIPIENTS.map((r) => ({ id: r.id, role: "recipient" as const, login: r.type })),
  ]
  return profiles.map(({ id, role, login }) => ({
    id: `acc-${id}`,
    email: `${login}@${DEMO_EMAIL_DOMAIN}`,
    passwordHash,
    role,
    profileId: id,
    createdAt,
  }))
}

/** Seluruh baris data seed, siap disisipkan ke database. */
export type SeedData = {
  sppg: Sppg[]
  recipients: Recipient[]
  tps: Tps[]
  accounts: AccountRow[]
}

/** Bangun data seed; `now` (epoch ms) menjadi waktu pembuatan akun. */
export function buildSeed(now: number): SeedData {
  return {
    sppg: SEED_SPPG.map((s) => ({ ...s, location: { ...s.location } })),
    recipients: SEED_RECIPIENTS.map((r) => ({ ...r, location: { ...r.location } })),
    tps: SEED_TPS.map((t) => ({ ...t, location: { ...t.location } })),
    accounts: buildSeedAccounts(now),
  }
}

function insertRows(tx: Tx, data: SeedData): void {
  tx.insert(schema.sppg).values(data.sppg.map(fromSppg)).run()
  tx.insert(schema.recipients).values(data.recipients.map(fromRecipient)).run()
  tx.insert(schema.tps).values(data.tps.map(fromTps)).run()
  tx.insert(schema.accounts).values(data.accounts).run()
}

/** Sisipkan data seed ke database kosong dalam satu transaksi. */
export function insertSeed(db: Db, data: SeedData): void {
  db.transaction((tx) => insertRows(tx, data))
}

/**
 * Kosongkan semua tabel lalu isi ulang seed, dalam satu transaksi. Aman dijalankan
 * saat server menyala (tidak menghapus file), jadi bisa dipakai untuk mengulang demo.
 */
export function resetDatabase(db: Db, now: number): void {
  db.transaction((tx) => {
    // Urutan mengikuti foreign key: anak dulu, induk belakangan.
    for (const table of [
      schema.sessions,
      schema.loginThrottle,
      schema.simClock,
      schema.batchCategoryEvents,
      schema.disposals,
      schema.claims,
      schema.batches,
      schema.accounts,
      schema.recipients,
      schema.tps,
      schema.sppg,
    ]) {
      tx.delete(table).run()
    }
    insertRows(tx, buildSeed(now))
  })
}
