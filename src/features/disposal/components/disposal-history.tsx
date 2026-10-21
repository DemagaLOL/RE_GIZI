import { History } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { getDisposalsByTps } from "@/lib/data"
import { formatDateTime, formatQuantity } from "@/lib/format"

/** Riwayat pengangkutan TPS, terbaru dulu. Render dalam `<Suspense>`. */
export async function DisposalHistory({ tpsId }: { tpsId: string }) {
  const disposals = await getDisposalsByTps(tpsId)

  if (disposals.length === 0) {
    return <EmptyState icon={History} title="Belum ada pengangkutan" />
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {disposals.map((d) => (
        <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 p-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-medium">{d.batch.sppg.name}</p>
            <p className="text-sm text-muted-foreground">{d.batch.menu}</p>
            {d.note && <p className="text-sm text-muted-foreground">Catatan: {d.note}</p>}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <p className="font-mono font-bold">{formatQuantity(d.quantity, "kg")}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(d.collectedAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
