import Link from "next/link"
import { UserRound } from "lucide-react"
import { AppHeader } from "@/components/shared/app-header"
import { AppNavLinks, AppTabBar, type AppNavLink } from "@/components/shared/app-nav-links"
import { Button } from "@/components/ui/button"
import { isSimClockEnabled, type AccountRole } from "@/lib/data"
import { identityName } from "../identity"
import { getSession } from "../session"

const CATALOG: AppNavLink = { href: "/sisa-makanan", label: "Katalog", icon: "catalog" }
/** Panel demo (data contoh dan simulasi waktu); hanya untuk SPPG dan bila simulasi aktif. */
const DEMO: AppNavLink = { href: "/waktu", label: "Demo", icon: "clock" }

/**
 * Menu app shell per peran. Tamu melihat menu yang sama dengan navbar pengenalan
 * (`NAV_LINKS`) agar navigasinya tidak berubah saat membuka katalog.
 */
const APP_LINKS: Record<AccountRole | "guest", readonly AppNavLink[]> = {
  sppg: [
    { href: "/dasbor", label: "Dasbor", icon: "dashboard" },
    { href: "/dasbor/baru", label: "Daftarkan Sisa", shortLabel: "Catat", icon: "create" },
    CATALOG,
    { href: "/dasbor/laporan", label: "Laporan", icon: "report" },
  ],
  recipient: [CATALOG, { href: "/klaim-saya", label: "Klaim Saya", shortLabel: "Klaim", icon: "claims" }],
  tps: [{ href: "/pembuangan", label: "Pembuangan", icon: "disposal" }],
  guest: [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/tentang", label: "Tentang", icon: "about" },
    { href: "/kontak", label: "Kontak", icon: "contact" },
  ],
}

/**
 * Header + tab bar mobile untuk halaman fungsi utama, dengan menu sesuai peran dan
 * tautan Profil atau tombol Masuk. Membaca cookie — render di dalam `<Suspense>`.
 */
export async function AppNav() {
  const session = await getSession()
  const roleLinks = APP_LINKS[session?.role ?? "guest"]
  const links =
    session?.role === "sppg" && isSimClockEnabled() ? [...roleLinks, DEMO] : roleLinks
  // Tamu di mobile mendapat tab "Masuk" karena header tidak memuat tombol berlabel.
  const tabs: readonly AppNavLink[] = session
    ? links
    : [...links, { href: "/masuk", label: "Masuk", icon: "login" }]

  return (
    <>
      <AppHeader
        nav={<AppNavLinks links={links} />}
        actions={
          session ? (
            <Link
              href="/profil"
              aria-label="Profil"
              className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:h-10"
            >
              <UserRound className="size-5 shrink-0" aria-hidden />
              <span className="hidden max-w-48 truncate md:block">{identityName(session)}</span>
            </Link>
          ) : (
            <Button asChild className="hidden md:inline-flex">
              <Link href="/masuk">Masuk</Link>
            </Button>
          )
        }
      />
      <AppTabBar links={tabs} />
    </>
  )
}
