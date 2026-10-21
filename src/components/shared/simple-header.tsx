import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Container } from "./container"
import { Logo } from "./logo"

/** Header minimal: logo dan tautan kembali ke beranda (halaman masuk/daftar, 404, error). */
function SimpleHeader() {
  return (
    <header className="border-b">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <Link
          href="/"
          className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Kembali ke beranda
        </Link>
      </Container>
    </header>
  )
}

export { SimpleHeader }
