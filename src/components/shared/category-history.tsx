import { ArrowRight, History } from "lucide-react"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { DEGRADATION_REASON_LABEL } from "@/lib/data/constants"
import type { CategoryEvent } from "@/lib/data/types"
import { formatDateTime, formatQuantity } from "@/lib/format"

/**
 * Riwayat turun kategori satu batch (mis. A → B karena lewat batas aman), terlama dulu.
 * Tidak merender apa pun bila belum pernah turun.
 */
function CategoryHistory({ events }: { events: readonly CategoryEvent[] }) {
  if (events.length === 0) return null

  return (
    <section aria-label="Riwayat kategori" className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <History className="size-4" aria-hidden />
        Riwayat kategori
      </h3>
      <ol className="flex flex-col gap-2">
        {events.map((event) => (
          <li key={event.id} className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <FoodStatusBadge category={event.fromCategory} />
              <ArrowRight className="size-3.5 text-muted-foreground" aria-label="menjadi" />
              <FoodStatusBadge category={event.toCategory} />
            </div>
            <p className="text-muted-foreground">
              {formatDateTime(event.occurredAt)} · {DEGRADATION_REASON_LABEL[event.reason]} ·{" "}
              {formatQuantity(event.quantityBefore, event.unitBefore)} →{" "}
              {formatQuantity(event.quantityAfter, event.unitAfter)}
            </p>
            {event.note && <p className="italic">“{event.note}”</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}

export { CategoryHistory }
