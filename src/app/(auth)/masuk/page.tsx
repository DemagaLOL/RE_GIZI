import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Container } from "@/components/shared/container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getSession, identityName, LoginPanel, ROLE_HOME, signOut } from "@/features/session"

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke RE:GIZI sebagai SPPG atau penerima sisa makanan.",
}

const REQUIRED_MESSAGE: Record<string, string> = {
  sppg: "Halaman itu khusus SPPG. Silakan masuk dengan akun SPPG.",
  penerima: "Halaman itu khusus penerima. Silakan masuk dengan akun penerima.",
  tps: "Halaman itu khusus TPS. Silakan masuk dengan akun TPS.",
}

/** Info sesi saat ini beserta tombol keluar, atau pesan alasan diarahkan ke sini. */
async function CurrentSession({ searchParams }: { searchParams: PageProps<"/masuk">["searchParams"] }) {
  const [session, params] = await Promise.all([getSession(), searchParams])
  const required = typeof params.perlu === "string" ? REQUIRED_MESSAGE[params.perlu] : undefined

  return (
    <>
      {required && (
        <p className="rounded-lg bg-warning px-4 py-3 text-sm text-warning-foreground">{required}</p>
      )}
      {session && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-4">
          <p className="text-sm text-secondary-foreground">
            Masuk sebagai{" "}
            <span className="font-semibold">
              {identityName(session)}
            </span>{" "}
            <span className="text-muted-foreground">({session.email})</span>
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={ROLE_HOME[session.role].href}>{ROLE_HOME[session.role].label}</Link>
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

/** Rute `/masuk`: masuk dengan email & kata sandi. */
export default function Page({ searchParams }: PageProps<"/masuk">) {
  return (
    <Container className="flex flex-col gap-6 py-8 md:py-12">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Masuk</h1>
        <p className="max-w-2xl text-muted-foreground">
          SPPG mengelola sisa makanan dari dasbor; penerima mengklaim sisa yang sesuai kebutuhannya.
          Akun SPPG dibuat oleh pengelola RE:GIZI.
        </p>
      </section>
      <Suspense fallback={null}>
        <CurrentSession searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <LoginPanel />
      </Suspense>
    </Container>
  )
}
