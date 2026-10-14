import Link from "next/link"
import { Leaf } from "lucide-react"

/** Logo teks RE:GIZI yang menaut ke beranda. */
function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Leaf className="size-4" aria-hidden />
      </span>
      <span>
        RE<span className="text-accent">:</span>GIZI
      </span>
    </Link>
  )
}

export { Logo }
