import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  CATEGORY_LABEL,
  REGENCIES,
  type BatchSort,
  type Regency,
  type SurplusCategory,
} from "@/lib/data"

/** Nilai filter yang tercermin di query URL. */
type FilterValues = {
  category?: SurplusCategory
  regency?: Regency
  sort?: BatchSort
}

/** Nilai query `?urut=` → urutan. Default (tanpa query) = batas aman terdekat. */
const SORT_QUERY: Record<BatchSort, string | undefined> = {
  deadline: undefined,
  distance: "jarak",
}

/** Bangun URL `/sisa-makanan` dengan query filter yang tidak kosong. */
function buildHref({ category, regency, sort }: FilterValues): string {
  const params = new URLSearchParams()
  if (category) params.set("kategori", category)
  if (regency) params.set("kabupaten", regency)
  const sortQuery = sort && SORT_QUERY[sort]
  if (sortQuery) params.set("urut", sortQuery)
  const query = params.toString()
  return query ? `/sisa-makanan?${query}` : "/sisa-makanan"
}

/** Satu chip filter berbentuk tautan. */
function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}

const ROW_CLASS = "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"

/**
 * Filter kategori, kabupaten, dan urutan berbasis URL (`?kategori=&kabupaten=&urut=`),
 * tanpa JavaScript klien.
 * @param categories Kategori yang boleh dilihat pengguna saat ini.
 * @param canSortByDistance Tampilkan pilihan urutan jarak (hanya bila lokasi pengguna diketahui).
 */
export function ListingFilters({
  categories,
  category,
  regency,
  sort = "deadline",
  canSortByDistance = false,
}: {
  categories: readonly SurplusCategory[]
  canSortByDistance?: boolean
} & FilterValues) {
  const current: FilterValues = { category, regency, sort }

  return (
    <div className="flex flex-col gap-3">
      <div className={ROW_CLASS}>
        <FilterChip href={buildHref({ ...current, category: undefined })} active={!category}>
          Semua kategori
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c} href={buildHref({ ...current, category: c })} active={category === c}>
            {c} · {CATEGORY_LABEL[c]}
          </FilterChip>
        ))}
      </div>
      <div className={ROW_CLASS}>
        <FilterChip href={buildHref({ ...current, regency: undefined })} active={!regency}>
          Semua wilayah
        </FilterChip>
        {REGENCIES.map((r) => (
          <FilterChip key={r} href={buildHref({ ...current, regency: r })} active={regency === r}>
            {r}
          </FilterChip>
        ))}
      </div>
      {canSortByDistance && (
        <div className={ROW_CLASS} aria-label="Urutkan">
          <FilterChip href={buildHref({ ...current, sort: "deadline" })} active={sort === "deadline"}>
            Batas aman terdekat
          </FilterChip>
          <FilterChip href={buildHref({ ...current, sort: "distance" })} active={sort === "distance"}>
            Jarak terdekat
          </FilterChip>
        </div>
      )}
    </div>
  )
}

/** Pastikan nilai query adalah kabupaten yang dikenal. */
export function parseRegency(value: unknown): Regency | undefined {
  return REGENCIES.find((r) => r === value)
}

/** Nilai query `?urut=` → urutan; selain `jarak` = default. */
export function parseSort(value: unknown): BatchSort {
  return value === SORT_QUERY.distance ? "distance" : "deadline"
}
