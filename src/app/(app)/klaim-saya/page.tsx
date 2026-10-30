import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@/components/shared/container"
import { Skeleton } from "@/components/ui/skeleton"
import { MyClaims } from "@/features/claim"
import { requireRecipientSession } from "@/features/session"

export const metadata: Metadata = {
  title: "Klaim Saya",
}

/** Pastikan sesi penerima lalu tampilkan klaimnya. */
async function Claims() {
  const session = await requireRecipientSession()
  return <MyClaims recipientId={session.recipient.id} />
}

/** Konfirmasi setelah klaim baru berhasil (`?baru=1`). Render dalam `<Suspense>`. */
async function ClaimedNotice({
  searchParams,
}: {
  searchParams: PageProps<"/klaim-saya">["searchParams"]
}) {
  const { baru } = await searchParams
  if (baru !== "1") return null
  return (
    <p role="status" className="rounded-lg bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
      Klaim berhasil. Tunjukkan kode ambil ke petugas SPPG sebelum tenggatnya lewat.
    </p>
  )
}

/** Rute `/klaim-saya`: riwayat klaim penerima beserta kode ambil. */
export default function Page({ searchParams }: PageProps<"/klaim-saya">) {
  return (
    <Container className="flex flex-col gap-6 py-8 md:py-12">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Klaim Saya</h1>
        <p className="max-w-2xl text-muted-foreground">
          Tunjukkan kode ambil ke petugas SPPG saat mengambil sisa makanan.
        </p>
      </section>
      <Suspense fallback={null}>
        <ClaimedNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <Claims />
      </Suspense>
    </Container>
  )
}
