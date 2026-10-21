import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto"

/**
 * Hash kata sandi dengan scrypt (bawaan Node). Format tersimpan:
 * `scrypt$<salt base64url>$<hash base64url>`. Hanya dipakai di dalam data layer.
 */

const KEY_LENGTH = 64
const SALT_BYTES = 16
const PREFIX = "scrypt"

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, (error, key) =>
      error ? reject(error) : resolve(key)
    )
  })
}

function encode(salt: Buffer, key: Buffer): string {
  return `${PREFIX}$${salt.toString("base64url")}$${key.toString("base64url")}`
}

/** Hash kata sandi dengan salt acak. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  return encode(salt, await deriveKey(password, salt))
}

/** Versi sinkron untuk membangun data seed (dipanggil sekali saat store dibuat). */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(SALT_BYTES)
  return encode(salt, scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH))
}

/** Bandingkan kata sandi dengan hash tersimpan dalam waktu konstan. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [prefix, saltText, keyText] = stored.split("$")
  if (prefix !== PREFIX || !saltText || !keyText) return false
  const expected = Buffer.from(keyText, "base64url")
  const actual = await deriveKey(password, Buffer.from(saltText, "base64url"))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
