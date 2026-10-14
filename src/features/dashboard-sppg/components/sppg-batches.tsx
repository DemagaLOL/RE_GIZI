import Link from "next/link"
import { PackageOpen } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BATCH_STATUS_LABEL,
  CLAIM_STATUS_LABEL,
  getBatches,
  getNow,
  getClaimsByBatch,
  getRecipients,
} from "@/lib/data"
import { formatDateTime, formatQuantity, formatTimeLeft } from "@/lib/format"

/** Daftar batch milik satu SPPG beserta klaim tiap batch. Render dalam `<Suspense>`. */
export async function SppgBatches({ sppgId }: { sppgId: string }) {
  const [batches, recipients] = await Promise.all([getBatches({ sppgId }), getRecipients()])
  const claimsPerBatch = await Promise.all(batches.map((b) => getClaimsByBatch(b.id)))
  const recipientName = new Map(recipients.map((r) => [r.id, r.name]))
  const now = await getNow()

  if (batches.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="Belum ada sisa yang didaftarkan"
        description="Daftarkan sisa makanan hari ini agar bisa segera diambil penerima."
        action={
          <Button asChild>
            <Link href="/dasbor/baru">Daftarkan Sisa</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {batches.map((batch, i) => {
        const claims = claimsPerBatch[i].filter((c) => c.status !== "cancelled")
        return (
          <Card key={batch.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <FoodStatusBadge category={batch.category} />
                <Badge variant="outline">{BATCH_STATUS_LABEL[batch.status]}</Badge>
              </div>
              <CardTitle className="leading-snug">
                <Link href={`/sisa-makanan/${batch.id}`} className="hover:underline">
                  {batch.menu}
                </Link>
              </CardTitle>
              <CardDescription>
                {formatQuantity(batch.remainingQuantity, batch.unit)} tersisa dari{" "}
                {formatQuantity(batch.quantity, batch.unit)}
                {batch.status === "available" && ` · aman ${formatTimeLeft(batch.safeUntil, now)}`}
              </CardDescription>
            </CardHeader>
            {claims.length > 0 && (
              <CardContent>
                <ul className="flex flex-col divide-y rounded-lg border">
                  {claims.map((claim) => (
                    <li key={claim.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {recipientName.get(claim.recipientId) ?? "Penerima"}
                        </span>
                        <span className="text-muted-foreground">
                          {formatQuantity(claim.quantity, batch.unit)} · {formatDateTime(claim.claimedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold tracking-wider">{claim.pickupCode}</span>
                        <Badge variant={claim.status === "pending" ? "warning" : "secondary"}>
                          {CLAIM_STATUS_LABEL[claim.status]}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
