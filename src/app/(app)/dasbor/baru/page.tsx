import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { Container } from "@/components/shared/container"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateBatchForm } from "@/features/dashboard-sppg"
import { requireSppgSession } from "@/features/session"

export const metadata: Metadata = {
  title: "Daftarkan Sisa Makanan",
}

/** Form hanya untuk sesi SPPG. */
async function GuardedForm() {
  const { sppg } = await requireSppgSession()
  return (
    <>
      <p className="text-muted-foreground">Atas nama {sppg.name}</p>
      <Card>
        <CardContent>
          <CreateBatchForm />
        </CardContent>
      </Card>
    </>
  )
}

/** Rute `/dasbor/baru`: pendaftaran sisa makanan. */
export default function Page() {
  return (
    <Container className="flex max-w-2xl flex-col gap-4 py-8 md:py-12">
      <Link
        href="/dasbor"
        className="flex h-11 w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke dasbor
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Daftarkan Sisa Makanan</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <GuardedForm />
      </Suspense>
    </Container>
  )
}
