import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { Plus } from "lucide-react"
import { Container } from "@/components/shared/container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ImpactSummary, PickupConfirmForm, SppgBatches } from "@/features/dashboard-sppg"
import { requireSppgSession } from "@/features/session"

export const metadata: Metadata = {
  title: "Dasbor SPPG",
}

/** Isi dasbor setelah sesi SPPG dipastikan. */
async function Dashboard({ searchParams }: { searchParams: PageProps<"/dasbor">["searchParams"] }) {
  const [session, params] = await Promise.all([requireSppgSession(), searchParams])
  const { sppg } = session

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{sppg.name}</h1>
          <p className="text-muted-foreground">
            {sppg.operator} · {sppg.district}, {sppg.regency}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dasbor/baru">
            <Plus data-icon="inline-start" aria-hidden />
            Daftarkan Sisa
          </Link>
        </Button>
      </section>

      {params.baru === "1" && (
        <p role="status" className="rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
          Sisa makanan berhasil didaftarkan.
        </p>
      )}

      <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
        <ImpactSummary sppgId={sppg.id} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Konfirmasi Pengambilan</CardTitle>
        </CardHeader>
        <CardContent>
          <PickupConfirmForm />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Sisa Makanan Anda</h2>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <SppgBatches sppgId={sppg.id} />
        </Suspense>
      </section>
    </>
  )
}

/** Rute `/dasbor`: dasbor SPPG. */
export default function Page({ searchParams }: PageProps<"/dasbor">) {
  return (
    <Container className="flex flex-col gap-8 py-8 md:py-12">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        }
      >
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </Container>
  )
}
