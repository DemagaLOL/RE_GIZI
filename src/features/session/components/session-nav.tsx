import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getSession } from "../session"

/**
 * Tombol sesi di Navbar: "Masuk" bila belum masuk, atau pintasan ke dasbor
 * (SPPG) / klaim saya (penerima). Membaca cookie — render di dalam `<Suspense>`.
 */
export async function SessionNav() {
  const session = await getSession()

  if (!session) {
    return (
      <Button asChild>
        <Link href="/masuk">Masuk</Link>
      </Button>
    )
  }

  const name = session.role === "sppg" ? session.sppg.name : session.recipient.name
  const href = session.role === "sppg" ? "/dasbor" : "/klaim-saya"
  const label = session.role === "sppg" ? "Dasbor" : "Klaim Saya"

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/masuk"
        className="hidden max-w-40 truncate text-sm text-muted-foreground hover:text-foreground lg:block"
        title="Ganti akun"
      >
        {name}
      </Link>
      <Button asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  )
}
