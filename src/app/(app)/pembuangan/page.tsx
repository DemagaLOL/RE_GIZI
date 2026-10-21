import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@/components/shared/container"
import { Skeleton } from "@/components/ui/skeleton"
import { DisposalHistory, DisposalQueue, DisposalSummary } from "@/features/disposal"
import { requireTpsSession } from "@/features/session"

export const metadata: Metadata = {
  title: "Pembuangan",
}

/** Pastikan sesi TPS lalu tampilkan antrean & riwayat pengangkutan. */
async function Disposal() {
  const { tps } = await requireTpsSession()

  return (
    <>
      <section className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{tps.name}</h1>
        <p className="text-muted-foreground">
          {tps.operator} · {tps.district}, {tps.regency}
        </p>
      </section>

      <Suspense fallback={<Skeleton className="h-20 w-full rounded-xl" />}>
        <DisposalSummary />
      </Suspense>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Menunggu Diangkut</h2>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <DisposalQueue tpsId={tps.id} />
        </Suspense>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Riwayat Pengangkutan</h2>
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <DisposalHistory tpsId={tps.id} />
        </Suspense>
      </section>
    </>
  )
}

/** Rute `/pembuangan`: antrean sisa tidak layak (kategori D) untuk TPS. */
export default function Page() {
  return (
    <Container className="flex flex-col gap-8 py-8 md:py-12">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <Disposal />
      </Suspense>
    </Container>
  )
}
