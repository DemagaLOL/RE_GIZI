import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@/components/shared/container"
import { Skeleton } from "@/components/ui/skeleton"
import { requireSppgSession } from "@/features/session"
import { ClockPanel } from "@/features/sim-clock"
import { getClockState, hasFutureData } from "@/lib/data"

export const metadata: Metadata = {
  title: "Simulasi Waktu",
}

/** Panel jam setelah sesi SPPG dipastikan. */
async function ClockContent() {
  const [, clock, futureData] = await Promise.all([
    requireSppgSession(),
    getClockState(),
    hasFutureData(),
  ])

  if (!clock.enabled) {
    return (
      <p className="rounded-xl border bg-card p-4 text-muted-foreground md:p-6">
        Simulasi waktu dinonaktifkan di server ini. Jalankan server dengan variabel lingkungan{" "}
        <code className="font-mono">SIM_CLOCK=1</code> untuk mengaktifkannya.
      </p>
    )
  }
  return <ClockPanel clock={clock} futureData={futureData} />
}

/** Rute `/waktu`: simulasi waktu untuk demo degradasi kategori (khusus SPPG). */
export default function Page() {
  return (
    <Container className="flex max-w-3xl flex-col gap-8 py-8 md:py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Simulasi Waktu</h1>
        <p className="text-muted-foreground">
          Percepat atau lompati waktu untuk melihat sisa makanan turun kategori dari A sampai D.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ClockContent />
      </Suspense>
    </Container>
  )
}
