import {
  ArrowDownCircle,
  CalendarClock,
  ChefHat,
  Cookie,
  MapPin,
  Navigation,
  StickyNote,
  Users,
} from "lucide-react"
import { CategoryHistory } from "@/components/shared/category-history"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Badge } from "@/components/ui/badge"
import {
  BATCH_STATUS_LABEL,
  CATEGORY_LABEL,
  directionsUrl,
  ELIGIBLE_RECIPIENTS,
  NEXT_CATEGORY,
  RECIPIENT_TYPE_LABEL,
  type CategoryEvent,
  type SurplusBatchWithSppg,
} from "@/lib/data"
import { formatDateTime, formatDistance, formatQuantity, formatTimeLeft } from "@/lib/format"

/** Satu baris info dengan ikon. */
function InfoRow({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-medium">{children}</span>
      </div>
    </div>
  )
}

/**
 * Informasi lengkap satu batch: menu, kuantitas, batas aman, kategori berikutnya,
 * SPPG asal, penerima yang berhak, dan riwayat turun kategori.
 * @param now Epoch ms saat render.
 * @param events Riwayat turun kategori (`getCategoryEvents`).
 */
export function BatchDetail({
  batch,
  now,
  events = [],
}: {
  batch: SurplusBatchWithSppg
  now: number
  events?: readonly CategoryEvent[]
}) {
  const eligible = ELIGIBLE_RECIPIENTS[batch.category]
  const next = NEXT_CATEGORY[batch.category]
  const degrading = next !== null && (batch.status === "available" || batch.status === "reserved")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FoodStatusBadge category={batch.category} />
          <Badge variant="outline">{BATCH_STATUS_LABEL[batch.status]}</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{batch.menu}</h1>
        <p className="font-mono text-3xl font-bold text-primary">
          {formatQuantity(batch.remainingQuantity, batch.unit)}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            tersisa dari {formatQuantity(batch.quantity, batch.unit)}
          </span>
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-4 md:p-6 sm:grid-cols-2">
        <InfoRow icon={ChefHat} label="SPPG">
          {batch.sppg.name}
        </InfoRow>
        <InfoRow icon={MapPin} label="Alamat pengambilan">
          {batch.sppg.address}, {batch.sppg.district}, {batch.sppg.regency}
          {batch.distanceKm !== undefined && (
            <span className="block text-sm font-normal text-muted-foreground">
              ± {formatDistance(batch.distanceKm)} dari lokasi Anda (garis lurus)
            </span>
          )}
          <a
            href={directionsUrl(batch.sppg.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <Navigation className="size-4" aria-hidden />
            Petunjuk Arah
          </a>
        </InfoRow>
        {batch.foodType === "dry" ? (
          <>
            <InfoRow icon={Cookie} label="Jenis makanan">
              Kering (roti, biskuit, dsb.)
            </InfoRow>
            <InfoRow icon={CalendarClock} label="Dicatat">
              {formatDateTime(batch.cookedAt)}
            </InfoRow>
          </>
        ) : (
          <InfoRow icon={CalendarClock} label="Selesai dimasak">
            {formatDateTime(batch.cookedAt)}
          </InfoRow>
        )}
        {batch.category !== "D" && (
          <InfoRow icon={CalendarClock} label="Batas aman">
            {formatDateTime(batch.safeUntil)} ({formatTimeLeft(batch.safeUntil, now)})
          </InfoRow>
        )}
        {degrading && (
          <InfoRow icon={ArrowDownCircle} label="Setelah batas aman">
            Turun ke {next} · {CATEGORY_LABEL[next]}
          </InfoRow>
        )}
        <InfoRow icon={Users} label="Dapat diklaim oleh">
          {eligible.length > 0
            ? eligible.map((t) => RECIPIENT_TYPE_LABEL[t]).join(", ")
            : "Tidak ada — dibuang"}
        </InfoRow>
        {batch.notes && (
          <InfoRow icon={StickyNote} label="Catatan SPPG">
            {batch.notes}
          </InfoRow>
        )}
      </div>

      <CategoryHistory events={events} />
    </div>
  )
}
