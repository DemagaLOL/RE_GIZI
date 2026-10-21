import Link from "next/link"
import { PackageOpen } from "lucide-react"
import { CategoryHistory } from "@/components/shared/category-history"
import { EmptyState } from "@/components/shared/empty-state"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BATCH_STATUS_LABEL,
  CLAIM_STATUS_LABEL,
  NEXT_CATEGORY,
  getBatches,
  getCategoryEventsBySppg,
  getClaimsBySppg,
  getNow,
  type BatchStatus,
} from "@/lib/data"
import { formatDateTime, formatQuantity, formatTimeLeft } from "@/lib/format"
import { DegradeBatchForm } from "./degrade-batch-form"

/** Status batch yang masih bisa turun kategori (otomatis maupun manual). */
const DEGRADABLE: readonly BatchStatus[] = ["available", "reserved"]

/** Kelompokkan item per `batchId` (urutan dalam kelompok dipertahankan). */
function groupByBatch<T extends { batchId: string }>(items: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const group = groups.get(item.batchId)
    if (group) group.push(item)
    else groups.set(item.batchId, [item])
  }
  return groups
}

/** Daftar batch milik satu SPPG beserta klaim tiap batch. Render dalam `<Suspense>`. */
export async function SppgBatches({ sppgId }: { sppgId: string }) {
  // `getBatches` dulu: degradasi yang jatuh tempo diterapkan sebelum klaim & riwayat dibaca.
  const batches = await getBatches({ sppgId })
  const [claims, events, now] = await Promise.all([
    getClaimsBySppg(sppgId),
    getCategoryEventsBySppg(sppgId),
    getNow(),
  ])
  const claimsByBatch = groupByBatch(claims)
  const eventsByBatch = groupByBatch(events)

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
      {batches.map((batch) => {
        const claims = (claimsByBatch.get(batch.id) ?? []).filter((c) => c.status !== "cancelled")
        const pendingClaims = claims.filter((c) => c.status === "pending").length
        const next = NEXT_CATEGORY[batch.category]
        const degradable = DEGRADABLE.includes(batch.status) && next !== null
        const events = eventsByBatch.get(batch.id) ?? []
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
                {degradable && ` · turun ke ${next} ${formatTimeLeft(batch.safeUntil, now)}`}
              </CardDescription>
            </CardHeader>
            {(claims.length > 0 || events.length > 0 || degradable) && (
            <CardContent className="flex flex-col gap-4">
              {claims.length > 0 && (
                <ul className="flex flex-col divide-y rounded-lg border">
                  {claims.map((claim) => (
                    <li key={claim.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {claim.recipientName}
                        </span>
                        <span className="text-muted-foreground">
                          {formatQuantity(claim.quantity, claim.unit)} · {formatDateTime(claim.claimedAt)}
                        </span>
                      </div>
                      {/* Kode ambil sengaja tidak ditampilkan: petugas harus menerimanya dari penerima. */}
                      <Badge variant={claim.status === "pending" ? "warning" : "secondary"}>
                        {CLAIM_STATUS_LABEL[claim.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <CategoryHistory events={events} />
              {degradable && (
                <DegradeBatchForm
                  key={batch.category}
                  batchId={batch.id}
                  category={batch.category}
                  pendingClaims={pendingClaims}
                />
              )}
            </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
