import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@/components/shared/container"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AccountPicker, getSession, signOut } from "@/features/session"

export const metadata: Metadata = {
  title: "Masuk",
  description: "Pilih akun demo SPPG atau penerima untuk mencoba RE:GIZI.",
}

const REQUIRED_MESSAGE: Record<string, string> = {
  sppg: "Halaman itu khusus SPPG. Silakan masuk sebagai SPPG.",
  penerima: "Halaman itu khusus penerima. Silakan masuk sebagai penerima.",
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
              {session.role === "sppg" ? session.sppg.name : session.recipient.name}
            </span>
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Keluar
            </Button>
          </form>
        </div>
      )}
    </>
  )
}

/** Rute `/masuk`: pemilihan akun demo. */
export default function Page({ searchParams }: PageProps<"/masuk">) {
  return (
    <Container className="flex flex-col gap-6 py-8 md:py-12">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Masuk</h1>
        <p className="max-w-2xl text-muted-foreground">
          Mode demo: pilih akun SPPG atau penerima untuk mencoba alur RE:GIZI tanpa kata sandi.
        </p>
      </section>
      <Suspense fallback={null}>
        <CurrentSession searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <AccountPicker />
      </Suspense>
    </Container>
  )
}
