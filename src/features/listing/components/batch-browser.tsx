import Link from "next/link"
import { SearchX } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  ELIGIBLE_RECIPIENTS,
  getBatches,
  getNow,
  RECIPIENT_TYPE_LABEL,
  type GeoPoint,
  type RecipientType,
  type SurplusCategory,
} from "@/lib/data"
import { BatchCard } from "./batch-card"
import { ListingFilters, parseRegency, parseSort } from "./listing-filters"

/** Kategori yang bisa diklaim (D tidak pernah tampil di daftar). */
const CLAIMABLE: readonly SurplusCategory[] = ["A", "B", "C"]

/** Kategori yang boleh dilihat: sesuai jenis penerima, atau semua A–C bila belum masuk/SPPG. */
function visibleCategories(recipientType?: RecipientType): readonly SurplusCategory[] {
  if (!recipientType) return CLAIMABLE
  return CLAIMABLE.filter((c) => ELIGIBLE_RECIPIENTS[c].includes(recipientType))
}

/**
 * Daftar batch tersedia beserta filter. Membaca `searchParams` dan data waktu-nyata,
 * jadi render di dalam `<Suspense>`.
 * @param recipientType Jenis penerima yang sedang masuk; membatasi kategori yang tampil.
 * @param near Lokasi penerima; bila ada, kartu menampilkan jarak dan bisa diurutkan terdekat.
 */
export async function BatchBrowser({
  searchParams,
  recipientType,
  near,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  recipientType?: RecipientType
  near?: GeoPoint
}) {
  const params = await searchParams
  const categories = visibleCategories(recipientType)
  const category = categories.find((c) => c === params.kategori)
  const regency = parseRegency(params.kabupaten)
  const sort = near ? parseSort(params.urut) : "deadline"

  const batches = (
    await getBatches({ status: "available", category, regency, recipientType, near, sort })
  ).filter((b) => categories.includes(b.category))
  const now = await getNow()

  return (
    <div className="flex flex-col gap-6">
      {recipientType && (
        <p className="text-sm text-muted-foreground">
          Menampilkan kategori yang sesuai untuk{" "}
          <span className="font-medium text-foreground">{RECIPIENT_TYPE_LABEL[recipientType]}</span>.
        </p>
      )}
      <ListingFilters
        categories={categories}
        category={category}
        regency={regency}
        sort={sort}
        canSortByDistance={near !== undefined}
      />
      {batches.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Belum ada sisa makanan tersedia"
          description="Coba ubah filter, atau cek lagi nanti — SPPG biasanya mendaftarkan sisa setelah jam makan siang."
          action={
            <Button asChild variant="outline">
              <Link href="/sisa-makanan">Hapus filter</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} now={now} />
          ))}
        </div>
      )}
    </div>
  )
}
