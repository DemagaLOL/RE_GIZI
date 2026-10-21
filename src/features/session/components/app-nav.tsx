import Link from "next/link"
import { LogOut } from "lucide-react"
import { AppHeader } from "@/components/shared/app-header"
import { AppNavLinks, AppTabBar, type AppNavLink } from "@/components/shared/app-nav-links"
import { Button } from "@/components/ui/button"
import { isSimClockEnabled, type AccountRole } from "@/lib/data"
import { identityName } from "../identity"
import { signOut } from "../actions"
import { getSession } from "../session"

const CATALOG: AppNavLink = { href: "/sisa-makanan", label: "Katalog", icon: "catalog" }
/** Panel simulasi waktu (demo); hanya untuk SPPG dan bila simulasi aktif. */
const CLOCK: AppNavLink = { href: "/waktu", label: "Waktu", icon: "clock" }

/**
 * Menu app shell per peran. Tamu melihat menu yang sama dengan navbar pengenalan
 * (`NAV_LINKS`) agar navigasinya tidak berubah saat membuka katalog.
 */
const APP_LINKS: Record<AccountRole | "guest", readonly AppNavLink[]> = {
  sppg: [
    { href: "/dasbor", label: "Dasbor", icon: "dashboard" },
    { href: "/dasbor/baru", label: "Daftarkan Sisa", icon: "create" },
    CATALOG,
  ],
  recipient: [CATALOG, { href: "/klaim-saya", label: "Klaim Saya", icon: "claims" }],
  tps: [{ href: "/pembuangan", label: "Pembuangan", icon: "disposal" }],
  guest: [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/tentang", label: "Tentang", icon: "about" },
    { href: "/kontak", label: "Kontak", icon: "contact" },
  ],
}

/**
 * Header + tab bar mobile untuk halaman fungsi utama, dengan menu sesuai peran dan
 * tombol Keluar/Masuk. Membaca cookie — render di dalam `<Suspense>`.
 */
export async function AppNav() {
  const session = await getSession()
  const roleLinks = APP_LINKS[session?.role ?? "guest"]
  const links =
    session?.role === "sppg" && isSimClockEnabled() ? [...roleLinks, CLOCK] : roleLinks
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
            <>
              <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:block">
                {identityName(session)}
              </span>
              <form action={signOut}>
                <Button type="submit" variant="ghost" className="h-11 md:h-10">
                  <LogOut data-icon="inline-start" aria-hidden />
                  Keluar
                </Button>
              </form>
            </>
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
