import { CheckCircle2, Clock, MapPin, Navigation, StickyNote } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { directionsUrl, getDisposalQueue } from "@/lib/data"
import { formatDateTime, formatDistance, formatQuantity } from "@/lib/format"
import { CollectButton } from "./collect-button"

/**
 * Antrean sisa kategori D yang menunggu diangkut, untuk TPS yang sedang masuk:
 * SPPG asal, berat, sejak kapan tidak layak, jarak, dan tombol tandai diangkut.
 * Render dalam `<Suspense>`.
 */
export async function DisposalQueue({ tpsId }: { tpsId: string }) {
  const queue = await getDisposalQueue(tpsId)

  if (queue.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Tidak ada sisa yang menunggu diangkut"
        description="Sisa tidak layak (kategori D) dari SPPG akan muncul di sini."
      />
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {queue.map((batch) => {
        const quantityLabel = formatQuantity(batch.remainingQuantity, batch.unit)
        return (
          <Card key={batch.id}>
            <CardHeader>
              <FoodStatusBadge category="D" />
              <CardTitle className="leading-snug">{batch.menu}</CardTitle>
              <CardDescription className="flex items-start gap-1">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  {batch.sppg.name} — {batch.sppg.address}, {batch.sppg.district}
                  {batch.distanceKm !== undefined && (
                    <span className="font-medium text-foreground"> · ± {formatDistance(batch.distanceKm)}</span>
                  )}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="font-mono text-2xl font-bold">{quantityLabel}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-3.5" aria-hidden />
                Tidak layak sejak {formatDateTime(batch.safeUntil)}
              </p>
              {batch.notes && (
                <p className="flex items-start gap-1 text-sm text-muted-foreground">
                  <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {batch.notes}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap items-start justify-between gap-2">
              <CollectButton batchId={batch.id} quantityLabel={quantityLabel} />
              <Button asChild variant="outline" className="h-11">
                <a href={directionsUrl(batch.sppg.location)} target="_blank" rel="noopener noreferrer">
                  <Navigation data-icon="inline-start" aria-hidden />
                  Petunjuk Arah
                </a>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
