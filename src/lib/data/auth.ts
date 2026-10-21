import { createHash, randomBytes } from "node:crypto"
import { asc, eq, like, lte } from "drizzle-orm"
import { io } from "next/cache"
import {
  PASSWORD_MIN_LENGTH,
  RECIPIENT_TYPE_LABEL,
  RECIPIENT_TYPES,
  REGENCIES,
  REGENCY_CENTER,
} from "./constants"
import { getDb, type Db } from "./db/client"
import { fromRecipient, toRecipient, toSppg, toTps } from "./db/mappers"
import * as schema from "./db/schema"
import type { AccountRow } from "./db/schema"
import { isValidGeoPoint } from "./geo"
import { hashPassword, verifyPassword } from "./password"
import { DEMO_EMAIL_DOMAIN } from "./seed"
import type {
  AuthIdentity,
  DataResult,
  DemoAccount,
  Recipient,
  RegisterRecipientInput,
  SessionGrant,
  SignInInput,
} from "./types"

const MINUTE = 60 * 1000
const SESSION_TTL_MS = 7 * 24 * 60 * MINUTE
const MAX_FAILURES = 5
const LOCK_MS = 15 * MINUTE
const PASSWORD_MAX_LENGTH = 128
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Hash pembanding untuk email yang tidak terdaftar, agar waktu respons tetap sama. */
let dummyHash: Promise<string> | undefined

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Gabungkan akun dengan profil SPPG/penerima/TPS-nya; `null` bila profil hilang. */
function toIdentity(db: Db, account: AccountRow): AuthIdentity | null {
  const base = { accountId: account.id, email: account.email }
  if (account.role === "sppg") {
    const sppg = db.select().from(schema.sppg).where(eq(schema.sppg.id, account.profileId)).get()
    return sppg ? { ...base, role: "sppg", sppg: toSppg(sppg) } : null
  }
  if (account.role === "tps") {
    const tps = db.select().from(schema.tps).where(eq(schema.tps.id, account.profileId)).get()
    return tps ? { ...base, role: "tps", tps: toTps(tps) } : null
  }
  const recipient = db
    .select()
    .from(schema.recipients)
    .where(eq(schema.recipients.id, account.profileId))
    .get()
  return recipient ? { ...base, role: "recipient", recipient: toRecipient(recipient) } : null
}

/** Buat sesi baru untuk akun dan buang sesi yang sudah kedaluwarsa. */
function issueSession(db: Db, identity: AuthIdentity, now: number): SessionGrant {
  db.delete(schema.sessions)
    .where(lte(schema.sessions.expiresAt, new Date(now).toISOString()))
    .run()
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(now + SESSION_TTL_MS).toISOString()
  db.insert(schema.sessions)
    .values({
      tokenHash: hashToken(token),
      accountId: identity.accountId,
      expiresAt,
      createdAt: new Date(now).toISOString(),
    })
    .run()
  return { token, expiresAt, identity }
}

function lockMessage(lockedUntil: number, now: number): string {
  const minutes = Math.ceil((lockedUntil - now) / MINUTE)
  return `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`
}

/**
 * Masuk dengan email & kata sandi. Setelah 5 kali gagal, email dikunci 15 menit.
 * Pesan galat sengaja tidak membedakan email tak terdaftar dan kata sandi salah.
 */
export async function signIn(input: SignInInput): Promise<DataResult<SessionGrant>> {
  await io()
  const db = getDb()
  const email = normalizeEmail(input.email)

  const throttle = db
    .select()
    .from(schema.loginThrottle)
    .where(eq(schema.loginThrottle.email, email))
    .get()
  if (throttle && throttle.lockedUntil > Date.now()) {
    return { ok: false, error: lockMessage(throttle.lockedUntil, Date.now()) }
  }

  const account = db.select().from(schema.accounts).where(eq(schema.accounts.email, email)).get()
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"))
  const valid = await verifyPassword(input.password, account?.passwordHash ?? (await dummyHash))
  const now = Date.now()

  if (!account || !valid) {
    // Dibaca ulang setelah verifikasi (async) agar percobaan paralel tetap terhitung.
    const current = db
      .select({ failures: schema.loginThrottle.failures })
      .from(schema.loginThrottle)
      .where(eq(schema.loginThrottle.email, email))
      .get()
    const failures = (current?.failures ?? 0) + 1
    const locked = failures >= MAX_FAILURES
    const next = { failures: locked ? 0 : failures, lockedUntil: locked ? now + LOCK_MS : 0 }
    db.insert(schema.loginThrottle)
      .values({ email, ...next })
      .onConflictDoUpdate({ target: schema.loginThrottle.email, set: next })
      .run()
    return {
      ok: false,
      error: locked ? lockMessage(now + LOCK_MS, now) : "Email atau kata sandi salah.",
    }
  }

  db.delete(schema.loginThrottle).where(eq(schema.loginThrottle.email, email)).run()
  const identity = toIdentity(db, account)
  if (!identity) return { ok: false, error: "Profil akun tidak ditemukan." }
  return { ok: true, data: issueSession(db, identity, now) }
}

/** Validasi input pendaftaran; `null` bila valid. */
function validateRegistration(input: RegisterRecipientInput, email: string): string | null {
  const name = input.name.trim()
  if (name.length < 3 || name.length > 100) return "Nama harus 3–100 karakter."
  if (!RECIPIENT_TYPES.includes(input.type)) return "Pilih jenis penerima."
  if (!REGENCIES.includes(input.regency)) return "Pilih kabupaten."
  if (!input.district.trim()) return "Kecamatan tidak boleh kosong."
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return "Format email tidak valid."
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    return `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`
  }
  if (input.password.length > PASSWORD_MAX_LENGTH) {
    return `Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter.`
  }
  return null
}

/**
 * Pendaftaran mandiri penerima (UMKM, warga, peternak, petani, komposter), lalu
 * langsung masuk. Akun SPPG tidak bisa didaftarkan sendiri — dibuat oleh admin.
 * Lokasi = `input.location` bila valid, selain itu titik tengah kabupaten.
 */
export async function registerRecipient(
  input: RegisterRecipientInput
): Promise<DataResult<SessionGrant>> {
  await io()
  const email = normalizeEmail(input.email)
  const invalid = validateRegistration(input, email)
  if (invalid) return { ok: false, error: invalid }

  const passwordHash = await hashPassword(input.password)
  const db = getDb()
  const now = Date.now()
  const recipient: Recipient = {
    id: `rcp-${crypto.randomUUID()}`,
    name: input.name.trim(),
    type: input.type,
    district: input.district.trim(),
    regency: input.regency,
    location:
      input.location && isValidGeoPoint(input.location)
        ? { lat: input.location.lat, lng: input.location.lng }
        : { ...REGENCY_CENTER[input.regency] },
  }
  const account: AccountRow = {
    id: `acc-${crypto.randomUUID()}`,
    email,
    passwordHash,
    role: "recipient",
    profileId: recipient.id,
    createdAt: new Date(now).toISOString(),
  }

  // Cek email dan sisipkan dalam satu transaksi agar dua pendaftaran bersamaan tidak lolos.
  const created = db.transaction(
    (tx) => {
      const taken = tx
        .select({ id: schema.accounts.id })
        .from(schema.accounts)
        .where(eq(schema.accounts.email, email))
        .get()
      if (taken) return false
      tx.insert(schema.recipients).values(fromRecipient(recipient)).run()
      tx.insert(schema.accounts).values(account).run()
      return true
    },
    { behavior: "immediate" }
  )
  if (!created) return { ok: false, error: "Email sudah terdaftar. Silakan masuk." }

  const identity = toIdentity(db, account)
  if (!identity) return { ok: false, error: "Gagal membuat akun." }
  return { ok: true, data: issueSession(db, identity, now) }
}

/** Pengguna untuk token sesi dari cookie, atau `null` bila tidak valid/kedaluwarsa. */
export async function getIdentityBySessionToken(token: string): Promise<AuthIdentity | null> {
  await io()
  const db = getDb()
  const tokenHash = hashToken(token)
  const session = db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.tokenHash, tokenHash))
    .get()
  if (!session) return null
  if (Date.parse(session.expiresAt) <= Date.now()) {
    db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, tokenHash)).run()
    return null
  }
  const account = db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.id, session.accountId))
    .get()
  return account ? toIdentity(db, account) : null
}

/** Cabut sesi (keluar). Token yang tidak dikenal diabaikan. */
export async function revokeSession(token: string): Promise<void> {
  await io()
  getDb().delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token))).run()
}

/** Urutan peran di daftar akun contoh. */
const DEMO_ROLE_ORDER: Record<AccountRow["role"], number> = { sppg: 0, tps: 1, recipient: 2 }

/** Akun contoh (seed) untuk ditampilkan di halaman masuk: SPPG, TPS, lalu penerima. */
export async function getDemoAccounts(): Promise<DemoAccount[]> {
  await io()
  const db = getDb()
  const accounts = db
    .select()
    .from(schema.accounts)
    .where(like(schema.accounts.email, `%@${DEMO_EMAIL_DOMAIN}`))
    .orderBy(asc(schema.accounts.email))
    .all()
    .sort((a, b) => DEMO_ROLE_ORDER[a.role] - DEMO_ROLE_ORDER[b.role])

  const result: DemoAccount[] = []
  for (const account of accounts) {
    const identity = toIdentity(db, account)
    if (identity?.role === "sppg") {
      const { sppg } = identity
      result.push({
        email: account.email,
        role: "sppg",
        name: sppg.name,
        detail: `${sppg.district}, ${sppg.regency}`,
      })
    } else if (identity?.role === "tps") {
      const { tps } = identity
      result.push({
        email: account.email,
        role: "tps",
        name: tps.name,
        detail: `TPS · ${tps.district}, ${tps.regency}`,
      })
    } else if (identity) {
      const { recipient } = identity
      result.push({
        email: account.email,
        role: "recipient",
        name: recipient.name,
        detail: `${RECIPIENT_TYPE_LABEL[recipient.type]} · ${recipient.district}`,
      })
    }
  }
  return result
}
