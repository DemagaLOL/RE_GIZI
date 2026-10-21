import type { AccountRole, AuthIdentity } from "@/lib/data"

/** Halaman utama tiap peran: tujuan setelah masuk dan pintasan di navbar. */
export const ROLE_HOME: Record<AccountRole, { href: string; label: string }> = {
  sppg: { href: "/dasbor", label: "Dasbor" },
  recipient: { href: "/klaim-saya", label: "Klaim Saya" },
  tps: { href: "/pembuangan", label: "Pembuangan" },
}

/** Nama profil yang sedang masuk (SPPG, penerima, atau TPS). */
export function identityName(identity: AuthIdentity): string {
  if (identity.role === "sppg") return identity.sppg.name
  if (identity.role === "tps") return identity.tps.name
  return identity.recipient.name
}
