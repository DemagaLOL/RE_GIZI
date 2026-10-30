import Link from "next/link"
import { ChevronDown, PackageOpen } from "lucide-react"
import { CategoryHistory } from "@/components/shared/category-history"
import { EmptyState } from "@/components/shared/empty-state"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BATCH_STATUS_LABEL,
  CLAIM_STATUS_LABEL,
  NEXT_CATEGORY,
  getBatches,
  getCategoryEventsBySppg,
  getClaimsBySppg,
  getNow,
  type BatchStatus,
  type CategoryEvent,
  type ClaimWithRecipient,
  type SurplusBatch,
} from "@/lib/data"
import { roundQuantity } from "@/lib/data/quantity"
import { formatDateTime, formatQuantity, formatTimeLeft, isNearDeadline } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CancelRecipientClaimButton } from "./cancel-recipient-claim-button"
import { DegradeBatchForm } from "./degrade-batch-form"
import { EditBatchForm } from "./edit-batch-form"
import { WithdrawBatchForm } from "./withdraw-batch-form"

/** Status batch yang masih bisa turun kategori (otomatis maupun manual). */
const DEGRADABLE: readonly BatchStatus[] = ["available", "reserved"]
/** Status batch yang masih aktif dan bisa diubah atau ditarik; aturan lengkapnya di data layer. */
const EDITABLE: readonly BatchStatus[] = ["available", "reserved", "discarded"]
/** Jumlah batch selesai terbanyak di dasbor; selebihnya ada di Laporan. */
const DONE_LIMIT = 10

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

/** Daftar klaim satu batch; klaim yang menunggu bisa dibatalkan petugas. */
function ClaimList({
  batch,
  claims,
}: {
  batch: SurplusBatch
  claims: readonly ClaimWithRecipient[]
}) {
  if (claims.length === 0) return null
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {claims.map((claim) => (
        <li key={claim.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <div className="flex flex-col">
            <span className="font-medium">{claim.recipientName}</span>
            <span className="text-muted-foreground">
              {formatQuantity(claim.quantity, claim.unit)} · {formatDateTime(claim.claimedAt)}
            </span>
            {claim.status === "pending" && (
              <span className="text-muted-foreground">
                Ambil sebelum {formatDateTime(claim.pickupDeadline ?? batch.safeUntil)}
              </span>
            )}
          </div>
          {/* Kode ambil sengaja tidak ditampilkan: petugas harus menerimanya dari penerima. */}
          <Badge variant={claim.status === "pending" ? "warning" : "secondary"}>
            {CLAIM_STATUS_LABEL[claim.status]}
          </Badge>
          {claim.status === "pending" && (
            <div className="w-full">
              <CancelRecipientClaimButton claimId={claim.id} recipientName={claim.recipientName} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * Kartu batch aktif. Tertutup hanya menampilkan yang perlu diketahui sekilas (sisa, tenggat,
 * klaim menunggu); dibuka berisi klaim, riwayat, dan tombol aksi. Memakai `<details>` agar
 * kartu tetap terbuka setelah aksi di dalamnya.
 */
function ActiveBatchCard({
  batch,
  claims,
  events,
  now,
}: {
  batch: SurplusBatch
  claims: readonly ClaimWithRecipient[]
  events: readonly CategoryEvent[]
  now: number
}) {
  const pendingClaims = claims.filter((c) => c.status === "pending").length
  const next = NEXT_CATEGORY[batch.category]
  const degradable = DEGRADABLE.includes(batch.status) && next !== null
  const degraded = events.length > 0
  const withdrawable =
    !(batch.status === "discarded" && degraded) && !claims.some((c) => c.status === "picked_up")
  const urgent = degradable && isNearDeadline(batch.safeUntil, now)

  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl p-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <FoodStatusBadge category={batch.category} />
            <Badge variant="outline">{BATCH_STATUS_LABEL[batch.status]}</Badge>
            {pendingClaims > 0 && <Badge variant="warning">{pendingClaims} klaim menunggu</Badge>}
          </div>
          <p className="truncate font-semibold">{batch.menu}</p>
          <p className="text-sm text-muted-foreground">
            {formatQuantity(batch.remainingQuantity, batch.unit)} tersisa dari{" "}
            {formatQuantity(batch.quantity, batch.unit)}
          </p>
          {degradable && (
            <p
              className={cn(
                "w-fit text-sm",
                urgent
                  ? "rounded-full bg-warning px-2 py-0.5 font-medium text-warning-foreground"
                  : "text-muted-foreground"
              )}
            >
              Turun ke {next} {formatTimeLeft(batch.safeUntil, now)}
            </p>
          )}
        </div>
        <ChevronDown
          className="mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="flex flex-col gap-4 border-t p-4">
        <ClaimList batch={batch} claims={claims} />
        <CategoryHistory events={events} />
        <div className="flex flex-wrap items-start gap-2">
          {degradable && (
            <DegradeBatchForm
              key={batch.category}
              batchId={batch.id}
              category={batch.category}
              pendingClaims={pendingClaims}
            />
          )}
          <EditBatchForm
            batch={{
              id: batch.id,
              menu: batch.menu,
              quantity: batch.quantity,
              unit: batch.unit,
              notes: batch.notes,
              claimed: roundQuantity(batch.quantity - batch.remainingQuantity, batch.unit),
              quantityLocked: degraded,
            }}
          />
          {withdrawable && <WithdrawBatchForm batchId={batch.id} pendingClaims={pendingClaims} />}
        </div>
        <Link
          href={`/sisa-makanan/${batch.id}`}
          className="flex min-h-11 w-fit items-center text-sm font-medium text-primary hover:underline"
        >
          Lihat detail
        </Link>
      </div>
    </details>
  )
}

/** Batch selesai yang dilipat, terbaru dulu; riwayat lengkapnya ada di Laporan. */
function DoneBatchList({ batches }: { batches: readonly SurplusBatch[] }) {
  if (batches.length === 0) return null
  const newestFirst = batches.toSorted(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  )

  return (
    <details className="group">
      <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 text-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
        Lihat {batches.length} batch selesai
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="flex flex-col gap-2">
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {newestFirst.slice(0, DONE_LIMIT).map((batch) => (
            <li key={batch.id}>
              <Link
                href={`/sisa-makanan/${batch.id}`}
                className="flex min-h-11 flex-col gap-1 p-3 hover:bg-muted"
              >
                <span className="truncate text-sm font-medium">{batch.menu}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <FoodStatusBadge category={batch.category} />
                  {BATCH_STATUS_LABEL[batch.status]} · {formatDateTime(batch.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {batches.length > DONE_LIMIT && (
          <Link
            href="/dasbor/laporan"
            className="flex min-h-11 w-fit items-center text-sm font-medium text-primary hover:underline"
          >
            Lihat selengkapnya di Laporan
          </Link>
        )}
      </div>
    </details>
  )
}

/**
 * Daftar batch milik satu SPPG: batch aktif sebagai kartu ringkas yang bisa dibuka, batch
 * selesai dilipat di bawahnya. Render dalam `<Suspense>`.
 */
export async function SppgBatches({ sppgId }: { sppgId: string }) {
  // `getBatches` dulu: degradasi yang jatuh tempo diterapkan sebelum klaim & riwayat dibaca.
  const batches = await getBatches({ sppgId })
  const [claims, events, now] = await Promise.all([
    getClaimsBySppg(sppgId),
    getCategoryEventsBySppg(sppgId),
    getNow(),
  ])
  const claimsByBatch = groupByBatch(claims.filter((c) => c.status !== "cancelled"))
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

  const active = batches.filter((b) => EDITABLE.includes(b.status))
  const done = batches.filter((b) => !EDITABLE.includes(b.status))

  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 ? (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {active.map((batch) => (
            <ActiveBatchCard
              key={batch.id}
              batch={batch}
              claims={claimsByBatch.get(batch.id) ?? []}
              events={eventsByBatch.get(batch.id) ?? []}
              now={now}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={PackageOpen}
          title="Tidak ada sisa aktif"
          action={
            <Button asChild>
              <Link href="/dasbor/baru">Daftarkan Sisa</Link>
            </Button>
          }
        />
      )}
      <DoneBatchList batches={done} />
    </div>
  )
}
