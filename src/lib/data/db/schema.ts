import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import type {
  AccountRole,
  BatchStatus,
  ClaimCancelReason,
  ClaimStatus,
  DegradationReason,
  QuantityUnit,
  RecipientType,
  Regency,
  SurplusCategory,
} from "../types"

/**
 * Skema SQLite RE:GIZI. Waktu disimpan sebagai teks ISO 8601 (`toISOString()`) agar
 * cocok dengan tipe domain dan bisa dibandingkan secara leksikografis di SQL.
 * Ubah file ini lalu jalankan `npm run db:generate` untuk membuat migrasi baru.
 */

export const sppg = sqliteTable("sppg", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  operator: text("operator").notNull(),
  address: text("address").notNull(),
  district: text("district").notNull(),
  regency: text("regency").$type<Regency>().notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  dailyCapacity: integer("daily_capacity").notNull(),
})

/** Tempat Pembuangan Sampah yang mengangkut sisa kategori D. */
export const tps = sqliteTable("tps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  operator: text("operator").notNull(),
  address: text("address").notNull(),
  district: text("district").notNull(),
  regency: text("regency").$type<Regency>().notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
})

export const recipients = sqliteTable("recipients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<RecipientType>().notNull(),
  district: text("district").notNull(),
  regency: text("regency").$type<Regency>().notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
})

export const batches = sqliteTable(
  "batches",
  {
    id: text("id").primaryKey(),
    sppgId: text("sppg_id")
      .notNull()
      .references(() => sppg.id),
    menu: text("menu").notNull(),
    category: text("category").$type<SurplusCategory>().notNull(),
    unit: text("unit").$type<QuantityUnit>().notNull(),
    quantity: real("quantity").notNull(),
    remainingQuantity: real("remaining_quantity").notNull(),
    cookedAt: text("cooked_at").notNull(),
    safeUntil: text("safe_until").notNull(),
    status: text("status").$type<BatchStatus>().notNull(),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("batches_status_safe_until_idx").on(t.status, t.safeUntil),
    index("batches_sppg_id_idx").on(t.sppgId),
  ]
)

export const claims = sqliteTable(
  "claims",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => batches.id),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => recipients.id),
    /** Snapshot kategori & satuan batch saat diklaim. */
    category: text("category").$type<SurplusCategory>().notNull(),
    unit: text("unit").$type<QuantityUnit>().notNull(),
    quantity: real("quantity").notNull(),
    status: text("status").$type<ClaimStatus>().notNull(),
    pickupCode: text("pickup_code").notNull().unique(),
    claimedAt: text("claimed_at").notNull(),
    pickedUpAt: text("picked_up_at"),
    /** Diisi saat `status = cancelled`; null pada data lama sebelum kolom ini ada. */
    cancelReason: text("cancel_reason").$type<ClaimCancelReason>(),
  },
  (t) => [
    index("claims_batch_id_idx").on(t.batchId),
    index("claims_recipient_id_idx").on(t.recipientId),
  ]
)

/** Riwayat turunnya kategori batch (otomatis karena waktu atau manual oleh SPPG). */
export const batchCategoryEvents = sqliteTable(
  "batch_category_events",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => batches.id),
    fromCategory: text("from_category").$type<SurplusCategory>().notNull(),
    toCategory: text("to_category").$type<SurplusCategory>().notNull(),
    quantityBefore: real("quantity_before").notNull(),
    unitBefore: text("unit_before").$type<QuantityUnit>().notNull(),
    quantityAfter: real("quantity_after").notNull(),
    unitAfter: text("unit_after").$type<QuantityUnit>().notNull(),
    reason: text("reason").$type<DegradationReason>().notNull(),
    note: text("note"),
    occurredAt: text("occurred_at").notNull(),
  },
  (t) => [index("batch_category_events_batch_id_idx").on(t.batchId)]
)

/** Pengangkutan batch kategori D oleh TPS; satu batch paling banyak satu kali diangkut. */
export const disposals = sqliteTable(
  "disposals",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .unique()
      .references(() => batches.id),
    tpsId: text("tps_id")
      .notNull()
      .references(() => tps.id),
    /** Berat yang diangkut (kg). */
    quantity: real("quantity").notNull(),
    collectedAt: text("collected_at").notNull(),
    note: text("note"),
  },
  (t) => [index("disposals_tps_id_idx").on(t.tpsId)]
)

/**
 * Jam simulasi (satu baris, `id = 1`). Waktu aplikasi =
 * `simAnchor + (waktu nyata - realAnchor) * speed`, atau `simAnchor` saat dijeda.
 * Tidak ada baris = waktu nyata. Disimpan di DB agar konsisten antar-proses/HMR.
 */
export const simClock = sqliteTable("sim_clock", {
  id: integer("id").primaryKey(),
  speed: real("speed").notNull(),
  paused: integer("paused", { mode: "boolean" }).notNull(),
  /** Epoch ms waktu nyata saat terakhir di-anchor. */
  realAnchor: integer("real_anchor").notNull(),
  /** Epoch ms waktu simulasi saat terakhir di-anchor. */
  simAnchor: integer("sim_anchor").notNull(),
})

/** Akun login. `passwordHash` tidak pernah keluar dari data layer. */
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  /** Email dalam huruf kecil, unik. */
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<AccountRole>().notNull(),
  /** ID SPPG (role `sppg`) atau penerima (role `recipient`). */
  profileId: text("profile_id").notNull(),
  createdAt: text("created_at").notNull(),
})

/** Sesi login aktif. Yang disimpan hanya hash SHA-256 token, bukan token mentah. */
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("sessions_expires_at_idx").on(t.expiresAt)]
)

/** Penghitung gagal masuk per email untuk mengunci sementara tebakan kata sandi. */
export const loginThrottle = sqliteTable("login_throttle", {
  email: text("email").primaryKey(),
  failures: integer("failures").notNull(),
  /** Epoch ms; 0 bila tidak terkunci. */
  lockedUntil: integer("locked_until").notNull(),
})

export type SppgRow = typeof sppg.$inferSelect
export type RecipientRow = typeof recipients.$inferSelect
export type BatchRow = typeof batches.$inferSelect
export type ClaimRow = typeof claims.$inferSelect
export type CategoryEventRow = typeof batchCategoryEvents.$inferSelect
export type SimClockRow = typeof simClock.$inferSelect
export type AccountRow = typeof accounts.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type TpsRow = typeof tps.$inferSelect
export type DisposalRow = typeof disposals.$inferSelect
