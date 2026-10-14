import Link from "next/link"
import { cn } from "@/lib/utils"
import { CATEGORY_LABEL, type Regency, type SurplusCategory } from "@/lib/data"

const REGENCIES: readonly Regency[] = ["Purbalingga", "Banyumas"]

/** Bangun URL `/sisa-makanan` dengan query filter yang tidak kosong. */
function buildHref(category?: SurplusCategory, regency?: Regency): string {
  const params = new URLSearchParams()
  if (category) params.set("kategori", category)
  if (regency) params.set("kabupaten", regency)
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

/**
 * Filter kategori dan kabupaten berbasis URL (`?kategori=&kabupaten=`), tanpa JavaScript klien.
 * @param categories Kategori yang boleh dilihat pengguna saat ini.
 */
export function ListingFilters({
  categories,
  category,
  regency,
}: {
  categories: readonly SurplusCategory[]
  category?: SurplusCategory
  regency?: Regency
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <FilterChip href={buildHref(undefined, regency)} active={!category}>
          Semua kategori
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c} href={buildHref(c, regency)} active={category === c}>
            {c} · {CATEGORY_LABEL[c]}
          </FilterChip>
        ))}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <FilterChip href={buildHref(category, undefined)} active={!regency}>
          Semua wilayah
        </FilterChip>
        {REGENCIES.map((r) => (
          <FilterChip key={r} href={buildHref(category, r)} active={regency === r}>
            {r}
          </FilterChip>
        ))}
      </div>
    </div>
  )
}

/** Pastikan nilai query adalah kabupaten yang dikenal. */
export function parseRegency(value: unknown): Regency | undefined {
  return REGENCIES.find((r) => r === value)
}
