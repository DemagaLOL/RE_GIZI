import Link from "next/link"
import { Timer } from "lucide-react"
import { Container } from "@/components/shared/container"
import { getClockState } from "@/lib/data"
import { getSession } from "@/features/session"
import { formatSpeed } from "@/lib/format"
import { ClockTicker } from "./clock-ticker"

/**
 * Pita penanda di bawah header saat jam aplikasi disimulasikan: menampilkan jam berjalan,
 * laju, dan tautan pengaturan (khusus SPPG). Juga me-refresh halaman berkala saat waktu
 * dipercepat. Tidak merender apa pun di waktu nyata. Membaca cookie — render dalam `<Suspense>`.
 */
export async function SimClockBanner() {
  const [clock, session] = await Promise.all([getClockState(), getSession()])
  if (!clock.simulated) return null

  return (
    <div role="status" className="border-b bg-warning text-warning-foreground">
      <Container className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 py-1.5 text-sm">
        <Timer className="size-4 shrink-0" aria-hidden />
        <span className="font-medium">Waktu simulasi</span>
        <ClockTicker
          now={clock.now}
          speed={clock.speed}
          paused={clock.paused}
          refresh
          className="font-mono font-semibold tabular-nums"
        />
        <span>· {clock.paused ? "Dijeda" : formatSpeed(clock.speed)}</span>
        {session?.role === "sppg" && (
          <Link
            href="/waktu"
            className="ml-auto flex h-8 items-center font-medium underline underline-offset-4"
          >
            Atur waktu
          </Link>
        )}
      </Container>
    </div>
  )
}
