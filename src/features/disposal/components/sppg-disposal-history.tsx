import { History } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { getDisposalsBySppg } from "@/lib/data"
import { formatDateTime, formatQuantity } from "@/lib/format"

/**
 * Riwayat pengangkutan sisa kategori D milik satu SPPG: siapa yang mengangkut, kapan, dan
 * berapa banyak. Hanya untuk SPPG pemiliknya. Render dalam `<Suspense>`.
 */
export async function SppgDisposalHistory({ sppgId }: { sppgId: string }) {
  const disposals = await getDisposalsBySppg(sppgId)

  if (disposals.length === 0) {
    return <EmptyState icon={History} title="Belum ada pengangkutan" />
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {disposals.map((d) => (
        <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 p-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-medium">{d.menu}</p>
            <p className="text-sm text-muted-foreground">Diangkut {d.tpsName}</p>
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
