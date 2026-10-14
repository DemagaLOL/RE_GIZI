import Link from "next/link"
import { Clock, MapPin } from "lucide-react"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BATCH_STATUS_LABEL, type SurplusBatchWithSppg } from "@/lib/data"
import { formatQuantity, formatTimeLeft, isNearDeadline } from "@/lib/format"

/**
 * Kartu ringkas satu batch sisa makanan; seluruh kartu menaut ke halaman detail.
 * @param now Epoch ms saat render, untuk hitung mundur batas aman.
 */
export function BatchCard({ batch, now }: { batch: SurplusBatchWithSppg; now: number }) {
  const near = batch.status === "available" && isNearDeadline(batch.safeUntil, now)

  return (
    <Card className="relative transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <FoodStatusBadge category={batch.category} />
          {batch.status !== "available" && (
            <Badge variant="outline">{BATCH_STATUS_LABEL[batch.status]}</Badge>
          )}
        </div>
        <CardTitle className="line-clamp-2 leading-snug">
          <Link href={`/sisa-makanan/${batch.id}`} className="after:absolute after:inset-0">
            {batch.menu}
          </Link>
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {batch.sppg.name} · {batch.sppg.district}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl font-bold">
          {formatQuantity(batch.remainingQuantity, batch.unit)}
        </p>
        <p className="text-sm text-muted-foreground">
          tersisa dari {formatQuantity(batch.quantity, batch.unit)}
        </p>
      </CardContent>
      {batch.status === "available" && (
        <CardFooter>
          <span
            className={
              near
                ? "flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-sm font-medium text-warning-foreground"
                : "flex items-center gap-1 text-sm text-muted-foreground"
            }
          >
            <Clock className="size-3.5" aria-hidden />
            Aman {formatTimeLeft(batch.safeUntil, now)}
          </span>
        </CardFooter>
      )}
    </Card>
  )
}
