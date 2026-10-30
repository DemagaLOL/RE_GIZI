"use client"

import { useState } from "react"
import type { DailyTrendPoint } from "@/lib/data/types"
import { formatNumber, formatQuantity, formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Seri grafik, dari dasar kolom ke atas. Warnanya sama dengan kategori di seluruh aplikasi. */
const SERIES = [
  { key: "kgA", label: "A · Layak konsumsi", className: "bg-chart-1" },
  { key: "kgB", label: "B · Pakan ternak", className: "bg-chart-2" },
  { key: "kgC", label: "C · Kompos", className: "bg-chart-3" },
] as const

/** Jumlah label tanggal terbanyak di sumbu; lebih dari ini label saling bertabrakan di ponsel. */
const MAX_AXIS_LABELS = 7

/** Isi tooltip satu hari. */
function DayDetail({ point }: { point: DailyTrendPoint }) {
  return (
    <>
      <p className="font-medium">{formatShortDate(point.date)}</p>
      {point.totalKg === 0 ? (
        <p className="text-muted-foreground">Tidak ada penyaluran</p>
      ) : (
        <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
          {SERIES.map(({ key, label, className }) => (
            <div key={key} className="contents">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("size-2 rounded-full", className)} aria-hidden />
                {label}
              </dt>
              <dd className="text-right font-mono">{formatQuantity(point[key], "kg")}</dd>
            </div>
          ))}
          <dt className="font-medium">Total</dt>
          <dd className="text-right font-mono font-medium">{formatQuantity(point.totalKg, "kg")}</dd>
        </dl>
      )}
    </>
  )
}

/**
 * Grafik kolom bertumpuk penyaluran harian (kg), dengan legenda, tooltip saat hover atau
 * fokus, dan tabel data. Porsi kategori A sudah dikonversi ke kg oleh data layer.
 */
export function TrendChart({ points }: { points: readonly DailyTrendPoint[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...points.map((p) => p.totalKg))
  const labelEvery = Math.ceil(points.length / MAX_AXIS_LABELS)
  const activePoint = active === null ? undefined : points[active]

  return (
    <div className="flex flex-col gap-3 print:[print-color-adjust:exact]">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {SERIES.map(({ key, label, className }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", className)} aria-hidden />
            {label}
          </li>
        ))}
      </ul>

      <div className="relative">
        <div className="flex justify-between border-b pb-1 text-xs text-muted-foreground">
          <span>Kg per hari</span>
          <span className="font-mono">{formatNumber(max)} kg</span>
        </div>
        <ul className="flex h-44 items-end gap-0.5 border-b" onMouseLeave={() => setActive(null)}>
          {points.map((point, i) => (
            <li
              key={point.date}
              tabIndex={point.totalKg > 0 ? 0 : undefined}
              aria-label={`${formatShortDate(point.date)}: ${formatQuantity(point.totalKg, "kg")} tersalurkan`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="flex h-full min-w-0 flex-1 flex-col-reverse items-center gap-0.5 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {SERIES.map(({ key, className }, s) => {
                const isTop = SERIES.slice(s + 1).every((later) => point[later.key] === 0)
                return point[key] > 0 ? (
                  <span
                    key={key}
                    className={cn("w-full max-w-6", className, isTop && "rounded-t-sm")}
                    style={{ height: `${(point[key] / max) * 100}%` }}
                  />
                ) : null
              })}
            </li>
          ))}
        </ul>
        {activePoint && active !== null && (
          <div
            role="status"
            className={cn(
              "pointer-events-none absolute top-6 z-10 rounded-lg border bg-popover p-2 text-xs text-popover-foreground shadow-md print:hidden",
              active < points.length / 2 ? "right-0" : "left-0"
            )}
          >
            <DayDetail point={activePoint} />
          </div>
        )}
      </div>

      <ol className="flex gap-0.5 text-xs text-muted-foreground" aria-hidden>
        {points.map((point, i) => (
          <li key={point.date} className="relative h-4 min-w-0 flex-1">
            {i % labelEvery === 0 && (
              <span className="absolute left-0 whitespace-nowrap">{formatShortDate(point.date)}</span>
            )}
          </li>
        ))}
      </ol>

      <details className="text-sm print:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-primary">
          Lihat tabel data
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-2 pr-3 font-medium">Tanggal</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">A (porsi)</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">A (kg)</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">B (kg)</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">C (kg)</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Total (kg)</th>
                <th scope="col" className="py-2 text-right font-medium">D diangkut (kg)</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {points.map((point) => (
                <tr key={point.date} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-sans font-normal whitespace-nowrap">
                    {formatShortDate(point.date)}
                  </th>
                  <td className="py-2 pr-3 text-right">{formatNumber(point.portionsA)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(point.kgA)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(point.kgB)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(point.kgC)}</td>
                  <td className="py-2 pr-3 text-right">{formatNumber(point.totalKg)}</td>
                  <td className="py-2 text-right">{formatNumber(point.collectedKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
