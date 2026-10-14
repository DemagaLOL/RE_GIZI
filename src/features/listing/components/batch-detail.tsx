import { CalendarClock, ChefHat, MapPin, StickyNote, Users } from "lucide-react"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Badge } from "@/components/ui/badge"
import {
  BATCH_STATUS_LABEL,
  ELIGIBLE_RECIPIENTS,
  RECIPIENT_TYPE_LABEL,
  type SurplusBatchWithSppg,
} from "@/lib/data"
import { formatDateTime, formatQuantity, formatTimeLeft } from "@/lib/format"

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
 * Informasi lengkap satu batch: menu, kuantitas, batas aman, SPPG asal, dan penerima yang berhak.
 * @param now Epoch ms saat render.
 */
export function BatchDetail({ batch, now }: { batch: SurplusBatchWithSppg; now: number }) {
  const eligible = ELIGIBLE_RECIPIENTS[batch.category]

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
        </InfoRow>
        <InfoRow icon={CalendarClock} label="Selesai dimasak">
          {formatDateTime(batch.cookedAt)}
        </InfoRow>
        {batch.category !== "D" && (
          <InfoRow icon={CalendarClock} label="Batas aman">
            {formatDateTime(batch.safeUntil)} ({formatTimeLeft(batch.safeUntil, now)})
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
    </div>
  )
}
