import { Trash2 } from "lucide-react"
import { getDisposalSummary } from "@/lib/data"
import { formatNumber } from "@/lib/format"

/**
 * Ringkasan sisa tidak layak (kategori D) untuk semua peran: hanya jumlah kg & batch,
 * tanpa detail — isinya hanya bisa diakses TPS. Render dalam `<Suspense>`.
 * @param sppgId Batasi ke satu SPPG (dasbor SPPG); kosong = seluruh platform.
 */
export async function DisposalSummary({ sppgId }: { sppgId?: string }) {
  const summary = await getDisposalSummary({ sppgId })
  if (summary.awaitingBatches === 0 && summary.collectedBatches === 0) return null

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-discard text-discard-foreground">
        <Trash2 className="size-5" aria-hidden />
      </div>
      <div className="flex flex-col gap-0.5 text-sm">
        <p className="font-medium">
          {summary.awaitingBatches > 0 ? (
            <>
              <span className="font-mono">{formatNumber(summary.awaitingKg)} kg</span> sisa tidak layak dari{" "}
              {summary.awaitingBatches} batch menunggu diangkut TPS
            </>
          ) : (
            "Tidak ada sisa tidak layak yang menunggu diangkut"
          )}
        </p>
        <p className="text-muted-foreground">
          {formatNumber(summary.collectedKg)} kg sudah diangkut TPS.
          {!sppgId && " Detail sisa kategori D hanya dapat diakses petugas TPS."}
        </p>
      </div>
    </div>
  )
}
