"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { NAV_LINKS } from "./nav-links"

/** Menu navigasi mobile (di bawah `md`): tombol hamburger yang membuka panel samping. */
function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu aria-hidden />
          <span className="sr-only">Buka menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-4">
        <SheetHeader className="p-0">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigasi utama RE:GIZI</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center rounded-lg px-3 text-base font-medium hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/masuk"
          onClick={() => setOpen(false)}
          className="mt-2 flex h-11 items-center rounded-lg px-3 text-base font-medium text-muted-foreground hover:bg-muted"
        >
          Ganti akun
        </Link>
      </SheetContent>
    </Sheet>
  )
}

export { MobileNav }
