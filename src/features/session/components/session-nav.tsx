import Link from "next/link"
import { Button } from "@/components/ui/button"
import { identityName, ROLE_HOME } from "../identity"
import { getSession } from "../session"

/**
 * Tombol sesi di Navbar: "Masuk" bila belum masuk, atau pintasan ke dasbor
 * (SPPG) / klaim saya (penerima) / pembuangan (TPS). Membaca cookie — render di dalam `<Suspense>`.
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

  const name = identityName(session)
  const { href, label } = ROLE_HOME[session.role]

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/masuk"
        className="hidden max-w-40 truncate text-sm text-muted-foreground hover:text-foreground lg:block"
        title="Akun"
      >
        {name}
      </Link>
      <Button asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  )
}
