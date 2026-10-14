import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { Container } from "@/components/shared/container"
import { Skeleton } from "@/components/ui/skeleton"
import { ClaimPanel } from "@/features/claim"
import { BatchDetail } from "@/features/listing"
import { getBatchById, getNow } from "@/lib/data"

export const metadata: Metadata = {
  title: "Detail Sisa Makanan",
}

/** Ambil batch lalu tampilkan detail dan panel klaim. */
async function BatchContent({ params }: { params: PageProps<"/sisa-makanan/[id]">["params"] }) {
  const { id } = await params
  const batch = await getBatchById(id)
  if (!batch) notFound()
  const now = await getNow()

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <BatchDetail batch={batch} now={now} />
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <ClaimPanel batch={batch} />
      </Suspense>
    </div>
  )
}

/** Rute `/sisa-makanan/[id]`: detail batch dan klaim. */
export default function Page({ params }: PageProps<"/sisa-makanan/[id]">) {
  return (
    <Container className="flex flex-col gap-6 py-8 md:py-12">
      <Link
        href="/sisa-makanan"
        className="flex h-11 w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke daftar
      </Link>
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        }
      >
        <BatchContent params={params} />
      </Suspense>
    </Container>
  )
}
