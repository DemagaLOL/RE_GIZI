import { Card, CardContent } from "@/components/ui/card"
import { getImpactStats } from "@/lib/data"
import { formatNumber } from "@/lib/format"

/** Satu ubin angka. */
function StatTile({ value, unit, label }: { value: number; unit?: string; label: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <p className="font-mono text-2xl font-bold">
          {formatNumber(value)}
          {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Ringkasan dampak satu SPPG (atau seluruh platform bila `sppgId` kosong).
 * Render dalam `<Suspense>`.
 */
export async function ImpactSummary({ sppgId }: { sppgId?: string }) {
  const stats = await getImpactStats({ sppgId })

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <StatTile value={stats.distributed.A} unit="porsi" label="A · Layak tersalurkan" />
      <StatTile value={stats.distributed.B} unit="kg" label="B · Pakan tersalurkan" />
      <StatTile value={stats.distributed.C} unit="kg" label="C · Kompos tersalurkan" />
      <StatTile value={stats.discardedKg} unit="kg" label="D · Dibuang" />
      <StatTile value={stats.availableBatches} label="Batch tersedia" />
      <StatTile value={stats.pendingClaims} label="Klaim menunggu diambil" />
    </div>
  )
}
