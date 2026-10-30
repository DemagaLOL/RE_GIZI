import Link from "next/link"
import { ChartColumn } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DASHBOARD_TREND_DAYS, getDailyTrend } from "@/lib/data"
import { TrendChart } from "./trend-chart"

/** Tren penyaluran beberapa hari terakhir di dasbor SPPG. Render dalam `<Suspense>`. */
export async function DashboardTrend({ sppgId }: { sppgId: string }) {
  const points = await getDailyTrend(sppgId, DASHBOARD_TREND_DAYS)

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Tren Penyaluran {DASHBOARD_TREND_DAYS} Hari Terakhir</CardTitle>
        <Button asChild variant="outline" className="h-11">
          <Link href="/dasbor/laporan">Lihat Laporan</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {points.some((p) => p.totalKg > 0) ? (
          <TrendChart points={points} />
        ) : (
          <EmptyState
            icon={ChartColumn}
            title="Belum ada penyaluran"
            description="Grafik terisi setelah pengambilan pertama dikonfirmasi."
          />
        )}
      </CardContent>
    </Card>
  )
}
