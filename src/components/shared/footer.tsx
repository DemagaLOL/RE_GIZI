import Link from "next/link"
import { Container } from "./container"
import { Logo } from "./logo"
import { NAV_LINKS } from "./nav-links"

/** Footer global: misi singkat, tautan, dan hak cipta. Satu kolom di mobile, tiga kolom mulai `md`. */
function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/50">
      <Container className="grid gap-8 py-10 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Menyalurkan sisa makanan SPPG agar tetap bermanfaat — untuk warga,
            UMKM, peternak, dan petani.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Navigasi</h2>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Kategori Sisa</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-rescue">A</span> — layak
            konsumsi untuk warga & UMKM.
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-feed-foreground">B</span> — pakan
            ternak, <span className="font-medium text-compost">C</span> — kompos.
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-discard">D</span> — tidak layak,
            dibuang.
          </p>
        </div>
      </Container>
      <div className="border-t">
        <Container className="py-4 text-xs text-muted-foreground">
          © 2026 RE:GIZI. Hak cipta dilindungi.
        </Container>
      </div>
    </footer>
  )
}

export { Footer }
