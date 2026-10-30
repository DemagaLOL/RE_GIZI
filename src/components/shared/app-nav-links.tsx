"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardList,
  FileText,
  House,
  Info,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  PlusCircle,
  Store,
  Timer,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/** Nama ikon tautan app shell (string agar bisa dikirim dari Server Component). */
type AppNavIcon =
  | "dashboard"
  | "create"
  | "catalog"
  | "claims"
  | "login"
  | "home"
  | "about"
  | "contact"
  | "clock"
  | "disposal"
  | "report"

/**
 * Satu tautan navigasi app shell. `shortLabel` dipakai di tab bar mobile bila `label`
 * terlalu panjang untuk satu baris.
 */
type AppNavLink = { href: string; label: string; shortLabel?: string; icon: AppNavIcon }

const ICONS: Record<AppNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  create: PlusCircle,
  catalog: Store,
  claims: ClipboardList,
  login: LogIn,
  home: House,
  about: Info,
  contact: MessageCircle,
  clock: Timer,
  disposal: Trash2,
  report: FileText,
}

/** Tautan aktif = href terpanjang yang sama dengan, atau menjadi awalan, path saat ini. */
function useActiveHref(links: readonly AppNavLink[]): string | undefined {
  const pathname = usePathname()
  return links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
}

/** Navigasi app shell untuk desktop (mulai `md`), ditampilkan di dalam header. */
function AppNavLinks({ links }: { links: readonly AppNavLink[] }) {
  const active = useActiveHref(links)
  return (
    <nav aria-label="Navigasi aplikasi" className="hidden items-center gap-1 md:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === active ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
            link.href === active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}

/** Tab bar bawah untuk mobile (di bawah `md`): ikon + label, target sentuh 56px. */
function AppTabBar({ links }: { links: readonly AppNavLink[] }) {
  const active = useActiveHref(links)
  return (
    <nav
      aria-label="Navigasi aplikasi"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
    >
      <ul className="flex">
        {links.map((link) => {
          const Icon = ICONS[link.icon]
          const isActive = link.href === active
          return (
            // `min-w-0`: lebar tab selalu sama, kata panjang tidak melebarkan kolomnya sendiri.
            <li key={link.href} className="min-w-0 flex-1">
              <Link
                href={link.href}
                aria-label={link.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="w-full truncate px-0.5 text-center">
                  {link.shortLabel ?? link.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export { AppNavLinks, AppTabBar, type AppNavIcon, type AppNavLink }
