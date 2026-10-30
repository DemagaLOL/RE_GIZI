"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/data/constants"
import type { ReportPeriod, SurplusCategory } from "@/lib/data/types"
import { cn } from "@/lib/utils"

const SELECT_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

/** Filter rincian yang sedang aktif. */
type EventFilterValues = { day?: string; category?: SurplusCategory }

/** Bangun URL laporan dengan periode dan filter rincian yang tidak kosong. */
function buildHref(period: ReportPeriod, { day, category }: EventFilterValues): string {
  const params = new URLSearchParams({ dari: period.from, sampai: period.to })
  if (day) params.set("hari", day)
  if (category) params.set("kategori", category)
  return `/dasbor/laporan?${params}`
}

/**
 * Filter rincian kejadian: kalender hari (terbatas pada periode laporan), lalu pilihan
 * kategori di bawahnya. Filter tersimpan di URL dan posisi halaman dipertahankan karena
 * rincian berada di bawah.
 */
export function EventFilters({
  period,
  day,
  category,
}: EventFilterValues & { period: ReportPeriod }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const apply = (next: EventFilterValues) => {
    startTransition(() => router.push(buildHref(period, next), { scroll: false }))
  }

  return (
    <div className={cn("flex max-w-sm flex-col gap-3 print:hidden", pending && "opacity-60")}>
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-hari" className="text-sm font-medium">
          Hari
        </label>
        <div className="flex gap-2">
          <input
            key={day}
            id="filter-hari"
            type="date"
            min={period.from}
            max={period.to}
            defaultValue={day}
            onChange={(e) => apply({ day: e.target.value || undefined, category })}
            className={SELECT_CLASS}
          />
          {day && (
            <Button
              type="button"
              variant="ghost"
              className="h-11 shrink-0"
              onClick={() => apply({ category })}
            >
              Semua hari
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="filter-kategori" className="text-sm font-medium">
          Kategori
        </label>
        <select
          key={category}
          id="filter-kategori"
          defaultValue={category ?? ""}
          onChange={(e) =>
            apply({ day, category: CATEGORY_ORDER.find((c) => c === e.target.value) })
          }
          className={SELECT_CLASS}
        >
          <option value="">Semua kategori</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {c} · {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
