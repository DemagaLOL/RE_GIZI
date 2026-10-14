import Link from "next/link"
import { Inbox, MapPin } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CLAIM_STATUS_LABEL, getClaimsByRecipient, type ClaimStatus } from "@/lib/data"
import { formatDateTime, formatQuantity } from "@/lib/format"

const STATUS_VARIANT: Record<ClaimStatus, "warning" | "secondary" | "outline"> = {
  pending: "warning",
  picked_up: "secondary",
  cancelled: "outline",
}

/** Daftar klaim milik satu penerima beserta kode ambil. Render dalam `<Suspense>`. */
export async function MyClaims({ recipientId }: { recipientId: string }) {
  const claims = await getClaimsByRecipient(recipientId)

  if (claims.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Belum ada klaim"
        description="Sisa makanan yang Anda klaim akan muncul di sini beserta kode ambilnya."
        action={
          <Button asChild>
            <Link href="/sisa-makanan">Cari Sisa Makanan</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {claims.map((claim) => (
        <Card key={claim.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <FoodStatusBadge category={claim.batch.category} />
              <Badge variant={STATUS_VARIANT[claim.status]}>{CLAIM_STATUS_LABEL[claim.status]}</Badge>
            </div>
            <CardTitle className="leading-snug">
              <Link href={`/sisa-makanan/${claim.batchId}`} className="hover:underline">
                {claim.batch.menu}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-start gap-1">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {claim.batch.sppg.name} — {claim.batch.sppg.address}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xl font-bold">
                {formatQuantity(claim.quantity, claim.batch.unit)}
              </p>
              <p className="text-sm text-muted-foreground">Diklaim {formatDateTime(claim.claimedAt)}</p>
            </div>
            {claim.status === "pending" && (
              <div className="rounded-lg bg-secondary px-3 py-2 text-center">
                <p className="text-xs text-secondary-foreground">Kode ambil</p>
                <p className="font-mono text-xl font-bold tracking-widest">{claim.pickupCode}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
