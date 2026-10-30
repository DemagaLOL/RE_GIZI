import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@/components/shared/container"
import { Skeleton } from "@/components/ui/skeleton"
import { SppgReportView } from "@/features/report"
import { requireSppgSession } from "@/features/session"

export const metadata: Metadata = {
  title: "Laporan Sisa Pangan",
}

/** Nilai satu query string; kosong bila tidak ada atau muncul berulang. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined
}

/** Pastikan sesi SPPG lalu tampilkan laporannya. */
async function Report({ searchParams }: { searchParams: PageProps<"/dasbor/laporan">["searchParams"] }) {
  const [{ sppg }, params] = await Promise.all([requireSppgSession(), searchParams])
  return (
    <SppgReportView
      sppg={sppg}
      from={single(params.dari)}
      to={single(params.sampai)}
      day={single(params.hari)}
      category={single(params.kategori)}
    />
  )
}

/** Rute `/dasbor/laporan`: laporan sisa pangan SPPG per periode. */
export default function Page({ searchParams }: PageProps<"/dasbor/laporan">) {
  return (
    <Container className="flex flex-col gap-8 py-8 md:py-12 print:py-0">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <Report searchParams={searchParams} />
      </Suspense>
    </Container>
  )
}
