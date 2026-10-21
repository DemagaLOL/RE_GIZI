import Link from "next/link"
import { Clock, Inbox, MapPin, Navigation } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CATEGORY_LABEL,
  CLAIM_STATUS_LABEL,
  directionsUrl,
  getClaimsByRecipient,
  getNow,
  type ClaimStatus,
} from "@/lib/data"
import {
  formatDateTime,
  formatPickupCode,
  formatQuantity,
  formatTimeLeft,
  isNearDeadline,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import { CancelClaimButton } from "./cancel-claim-button"

const STATUS_VARIANT: Record<ClaimStatus, "warning" | "secondary" | "outline"> = {
  pending: "warning",
  picked_up: "secondary",
  cancelled: "outline",
}

/**
 * Daftar klaim milik satu penerima beserta kode ambil, petunjuk arah ke SPPG, dan
 * tombol batalkan untuk klaim yang belum diambil. Render dalam `<Suspense>`.
 */
export async function MyClaims({ recipientId }: { recipientId: string }) {
  const [claims, now] = await Promise.all([getClaimsByRecipient(recipientId), getNow()])

  if (claims.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Belum ada klaim"
        description="Sisa makanan yang Anda klaim akan muncul di sini beserta kode ambilnya."
        action={
          <Button asChild>
            <Link href="/sisa-makanan">Telusuri Makanan</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {claims.map((claim) => {
        // Detail batch kategori D hanya untuk TPS & SPPG pemiliknya: tanpa tautan detail dan alamat.
        const discarded = claim.batch.category === "D"
        return (
          <Card key={claim.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <FoodStatusBadge category={claim.category} />
                <Badge variant={STATUS_VARIANT[claim.status]}>{CLAIM_STATUS_LABEL[claim.status]}</Badge>
              </div>
              <CardTitle className="leading-snug">
                {discarded ? (
                  claim.batch.menu
                ) : (
                  <Link href={`/sisa-makanan/${claim.batchId}`} className="hover:underline">
                    {claim.batch.menu}
                  </Link>
                )}
              </CardTitle>
              <CardDescription className="flex items-start gap-1">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {discarded ? claim.batch.sppg.name : `${claim.batch.sppg.name} — ${claim.batch.sppg.address}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-xl font-bold">
                  {formatQuantity(claim.quantity, claim.unit)}
                </p>
                <p className="text-sm text-muted-foreground">Diklaim {formatDateTime(claim.claimedAt)}</p>
                {claim.status === "pending" && (
                  // Klaim batal otomatis bila batch turun kategori, jadi tenggat ambil = batas aman batch.
                  <p
                    className={cn(
                      "mt-1 flex w-fit items-center gap-1 text-sm font-medium",
                      isNearDeadline(claim.batch.safeUntil, now) &&
                        "rounded-full bg-warning px-2 py-0.5 text-warning-foreground"
                    )}
                  >
                    <Clock className="size-3.5 shrink-0" aria-hidden />
                    Ambil sebelum {formatDateTime(claim.batch.safeUntil)} (
                    {formatTimeLeft(claim.batch.safeUntil, now)})
                  </p>
                )}
                {claim.cancelReason === "degraded" && (
                  <p className="mt-1 text-sm text-destructive">
                    Dibatalkan karena kondisi makanan turun ke kategori {claim.batch.category} (
                    {CATEGORY_LABEL[claim.batch.category]}) sebelum diambil.
                  </p>
                )}
                {claim.cancelReason === "recipient" && (
                  <p className="mt-1 text-sm text-muted-foreground">Dibatalkan oleh Anda.</p>
                )}
              </div>
              {claim.status === "pending" && (
                <div className="rounded-lg bg-secondary px-3 py-2 text-center">
                  <p className="text-xs text-secondary-foreground">Kode ambil</p>
                  <p className="font-mono text-xl font-bold tracking-widest">
                    {formatPickupCode(claim.pickupCode)}
                  </p>
                </div>
              )}
            </CardContent>
            {claim.status === "pending" && (
              <CardFooter className="flex flex-wrap items-start justify-between gap-2">
                <Button asChild variant="outline" className="h-11">
                  <a href={directionsUrl(claim.batch.sppg.location)} target="_blank" rel="noopener noreferrer">
                    <Navigation data-icon="inline-start" aria-hidden />
                    Petunjuk Arah
                  </a>
                </Button>
                <CancelClaimButton claimId={claim.id} />
              </CardFooter>
            )}
          </Card>
        )
      })}
    </div>
  )
}
