import { Suspense } from "react"
import { AppHeader } from "@/components/shared/app-header"
import { Skeleton } from "@/components/ui/skeleton"
import { AppNav } from "@/features/session"
import { SimClockBanner } from "@/features/sim-clock"

/**
 * Kerangka fungsi utama (app shell): header ringkas dengan menu sesuai peran,
 * tab bar di mobile, pita simulasi waktu (bila aktif), tanpa footer pengenalan.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<AppHeader actions={<Skeleton className="h-10 w-24 rounded-lg" />} />}>
        <AppNav />
      </Suspense>
      <Suspense fallback={null}>
        <SimClockBanner />
      </Suspense>
      {/* Ruang bawah agar konten tidak tertutup tab bar mobile (h-14 + safe area). */}
      <main className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
    </>
  )
}
