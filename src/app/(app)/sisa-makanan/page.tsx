import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@/components/shared/container"
import { DisposalSummary } from "@/features/disposal"
import { BatchBrowser, BatchGridSkeleton } from "@/features/listing"
import { getSession, UpdateLocationButton } from "@/features/session"

export const metadata: Metadata = {
  title: "Sisa Makanan",
  description: "Temukan sisa makanan dari SPPG di sekitar Anda yang siap diambil.",
}

/** Baca sesi lalu tampilkan daftar sesuai jenis & lokasi penerima. */
async function Listing({ searchParams }: { searchParams: PageProps<"/sisa-makanan">["searchParams"] }) {
  const session = await getSession()
  if (session?.role !== "recipient") return <BatchBrowser searchParams={searchParams} />

  const { recipient } = session
  return (
    <>
      <UpdateLocationButton />
      <BatchBrowser
        searchParams={searchParams}
        recipientType={recipient.type}
        near={recipient.location}
      />
    </>
  )
}

/** Rute `/sisa-makanan`: daftar sisa makanan tersedia. */
export default function Page({ searchParams }: PageProps<"/sisa-makanan">) {
  return (
    <Container className="flex flex-col gap-6 py-8 md:py-12">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Sisa Makanan</h1>
        <p className="max-w-2xl text-muted-foreground">
          Sisa makanan dari dapur SPPG yang siap diambil. Pilih kategori yang sesuai, klaim, lalu
          tunjukkan kode ambil ke petugas.
        </p>
      </section>
      <Suspense fallback={null}>
        <DisposalSummary />
      </Suspense>
      <Suspense fallback={<BatchGridSkeleton />}>
        <Listing searchParams={searchParams} />
      </Suspense>
    </Container>
  )
}
