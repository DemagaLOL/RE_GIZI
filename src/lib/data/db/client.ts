import { mkdirSync } from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { buildSeed, insertSeed } from "../seed"
import * as schema from "./schema"

/**
 * Koneksi SQLite lokal (file). Hanya diakses oleh modul di `src/lib/data`.
 * Saat pertama dibuka, migrasi di folder `drizzle/` dijalankan dan database kosong
 * diisi data seed — demo langsung jalan tanpa langkah setup.
 */

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

/** Transaksi Drizzle (parameter callback `db.transaction`). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]

/** Lokasi file database; bisa diganti lewat env `DATABASE_PATH`. */
// `turbopackIgnore`: path runtime, jangan dilacak sebagai aset build.
export const DATABASE_PATH = path.resolve(
  /*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "data/regizi.db"
)

const MIGRATIONS_FOLDER = path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle")

/**
 * Buka database di `filePath`, jalankan migrasi, dan isi seed bila masih kosong.
 * @returns Klien Drizzle untuk database tersebut.
 */
export function openDatabase(filePath: string = DATABASE_PATH): Db {
  mkdirSync(path.dirname(filePath), { recursive: true })
  const sqlite = new Database(filePath)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  sqlite.pragma("busy_timeout = 5000")

  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  if (!db.select({ id: schema.sppg.id }).from(schema.sppg).limit(1).get()) {
    insertSeed(db, buildSeed(Date.now()))
  }
  return db
}

// Disimpan di `globalThis` agar HMR saat dev tidak membuka koneksi baru tiap perubahan.
const globalForDb = globalThis as typeof globalThis & { __reGiziDb?: Db }

/** Klien database bersama. Panggil hanya setelah `await io()` di fungsi data layer. */
export function getDb(): Db {
  globalForDb.__reGiziDb ??= openDatabase()
  return globalForDb.__reGiziDb
}
