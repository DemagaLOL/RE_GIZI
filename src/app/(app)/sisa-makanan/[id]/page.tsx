import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { Container } from "@/components/shared/container"
import { Skeleton } from "@/components/ui/skeleton"
import { ClaimPanel } from "@/features/claim"
import { DisposalLockedNotice } from "@/features/disposal"
import { BatchDetail, CategoryLockedNotice } from "@/features/listing"
import { getSession } from "@/features/session"
import {
  distanceKm,
  ELIGIBLE_RECIPIENTS,
  getBatchById,
  getCategoryEvents,
  getNow,
} from "@/lib/data"

export const metadata: Metadata = {
  title: "Detail Sisa Makanan",
}

/** Ambil batch lalu tampilkan detail dan panel klaim. */
async function BatchContent({ params }: { params: PageProps<"/sisa-makanan/[id]">["params"] }) {
  const { id } = await params
  const [found, session] = await Promise.all([getBatchById(id), getSession()])
  if (!found) notFound()
  // Isi sisa kategori D hanya untuk TPS dan SPPG pemiliknya; peran lain hanya melihat jumlah agregat.
  const canViewDiscard =
    session?.role === "tps" || (session?.role === "sppg" && session.sppg.id === found.sppgId)
  if (found.category === "D" && !canViewDiscard) return <DisposalLockedNotice />
  // Penerima hanya boleh melihat kategori yang sesuai jenisnya (mis. warga tidak melihat sisa pakan).
  if (
    session?.role === "recipient" &&
    !ELIGIBLE_RECIPIENTS[found.category].includes(session.recipient.type)
  ) {
    return <CategoryLockedNotice recipientType={session.recipient.type} />
  }

  const [now, events] = await Promise.all([getNow(), getCategoryEvents(found.id)])
  const batch =
    session?.role === "recipient"
      ? { ...found, distanceKm: distanceKm(session.recipient.location, found.sppg.location) }
      : found

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <BatchDetail batch={batch} now={now} events={events} />
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
