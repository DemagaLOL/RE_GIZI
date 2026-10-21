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

/** Rute `/klaim-saya`: riwayat klaim penerima beserta kode ambil. */
export default function Page() {
  return (
    <Container className="flex flex-col gap-6 py-8 md:py-12">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Klaim Saya</h1>
        <p className="max-w-2xl text-muted-foreground">
          Tunjukkan kode ambil ke petugas SPPG saat mengambil sisa makanan.
        </p>
      </section>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <Claims />
      </Suspense>
    </Container>
  )
}
