import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Container } from "./container"
import { Logo } from "./logo"
import { MobileNav } from "./mobile-nav"
import { NAV_LINKS } from "./nav-links"

/**
 * Navigasi global yang menempel di atas; tautan penuh mulai `md`, hamburger di mobile.
 * @param sessionSlot Konten sesi di kanan (mis. tombol Masuk/Dasbor); default tombol "Masuk".
 */
function Navbar({ sessionSlot }: { sessionSlot?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {sessionSlot ?? (
            <Button asChild>
              <Link href="/masuk">Masuk</Link>
            </Button>
          )}
          <MobileNav />
        </div>
      </Container>
    </header>
  )
}

export { Navbar }
