import Link from "next/link"
import { Suspense } from "react"
import { ArrowRight, ClipboardList, HandHeart, QrCode } from "lucide-react"
import { Container } from "@/components/shared/container"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ImpactSummary } from "@/features/dashboard-sppg"
import type { SurplusCategory } from "@/lib/data/types"

const CATEGORY_DESCRIPTIONS: readonly { category: SurplusCategory; description: string }[] = [
  { category: "A", description: "Masih layak dimakan — disalurkan ke warga dan UMKM dalam batas aman 4 jam." },
  { category: "B", description: "Tidak layak dimakan manusia, tapi aman untuk pakan ternak dan ikan." },
  { category: "C", description: "Sisa organik untuk diolah petani dan komposter menjadi pupuk." },
  { category: "D", description: "Tidak bisa dimanfaatkan — dicatat agar jumlah sisa terbuang bisa ditekan." },
]

const STEPS: readonly { icon: typeof ClipboardList; title: string; description: string }[] = [
  {
    icon: ClipboardList,
    title: "SPPG mendaftarkan sisa",
    description: "Petugas dapur mencatat menu, jumlah, dan kategori A–D sesuai kondisi makanan.",
  },
  {
    icon: HandHeart,
    title: "Penerima mengklaim",
    description: "Warga, UMKM, peternak, dan petani hanya melihat kategori yang sesuai untuk mereka.",
  },
  {
    icon: QrCode,
    title: "Ambil dengan kode",
    description: "Tunjukkan kode ambil ke petugas SPPG; penyaluran tercatat sebagai dampak.",
  },
]

/** Landing page beranda: pengenalan, kategori sisa, cara kerja, dan angka dampak. */
export function LandingPage() {
  return (
    <div className="flex flex-col gap-16 pb-16 md:gap-24">
      <section className="bg-secondary">
        <Container className="flex flex-col gap-6 py-12 md:py-20">
          <p className="w-fit rounded-full bg-background px-3 py-1 text-sm font-medium text-primary">
            Rescue & Recycle sisa makanan MBG
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Sisa makanan SPPG tetap bermanfaat, bukan terbuang.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            RE:GIZI menghubungkan dapur SPPG program Makan Bergizi Gratis dengan warga, UMKM,
            peternak, dan petani di sekitarnya.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/sisa-makanan">
                Telusuri Makanan
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="accent">
              <Link href="/dasbor">Saya Petugas SPPG</Link>
            </Button>
          </div>
        </Container>
      </section>

      <Container className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Empat kategori sisa</h2>
          <p className="max-w-2xl text-muted-foreground">
            SPPG menentukan kategori sesuai kondisi makanan, sehingga setiap sisa sampai ke penerima yang tepat.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_DESCRIPTIONS.map(({ category, description }) => (
            <Card key={category}>
              <CardHeader className="gap-3">
                <FoodStatusBadge category={category} />
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Container>

      <Container className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Cara kerja</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <step.icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
                  </div>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </Container>

      <Container className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Dampak sejauh ini</h2>
        <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
          <ImpactSummary />
        </Suspense>
      </Container>
    </div>
  )
}
