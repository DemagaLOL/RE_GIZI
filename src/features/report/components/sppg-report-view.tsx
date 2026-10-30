import { ChartColumn, Download, FileText } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatTile } from "@/features/dashboard-sppg"
import {
  CATEGORY_ORDER,
  filterReportEvents,
  getSppgReport,
  MAX_REPORT_DAYS,
  parseEventDay,
  REPORT_EVENT_LABEL,
  type ReportEvent,
  type ReportPeriod,
  type Sppg,
} from "@/lib/data"
import { formatDateTime, formatLongDate, formatNumber, formatQuantity } from "@/lib/format"
import { EventFilters } from "./event-filters"
import { PrintButton } from "./print-button"
import { TrendChart } from "./trend-chart"

/** Jumlah kejadian terbaru yang langsung tampil. */
const RECENT_EVENTS = 5

const FIELD_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

/** Form periode berbasis URL, jalan tanpa JavaScript klien. */
function PeriodForm({ period }: { period: ReportPeriod }) {
  return (
    <form
      action="/dasbor/laporan"
      className="flex flex-col gap-3 sm:flex-row sm:items-end print:hidden"
    >
      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor="dari" className="text-sm font-medium">
          Dari tanggal
        </label>
        <input id="dari" name="dari" type="date" required defaultValue={period.from} className={FIELD_CLASS} />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor="sampai" className="text-sm font-medium">
          Sampai tanggal
        </label>
        <input id="sampai" name="sampai" type="date" required defaultValue={period.to} className={FIELD_CLASS} />
      </div>
      <Button type="submit" className="h-11">
        Tampilkan
      </Button>
    </form>
  )
}

/** Daftar ringkas kejadian; satu kejadian dua baris agar muat di ponsel tanpa geser. */
function EventList({ events }: { events: readonly ReportEvent[] }) {
  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {events.map((event, i) => (
        <li key={i} className="flex flex-col gap-1 p-3 print:break-inside-avoid">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate font-medium">{event.menu}</p>
            <p className="shrink-0 font-mono text-sm font-semibold">
              {formatQuantity(event.quantity, event.unit)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <FoodStatusBadge category={event.category} />
            <span>
              {[REPORT_EVENT_LABEL[event.kind], formatDateTime(event.at), event.party]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Rincian kejadian, terbaru dulu: hanya `RECENT_EVENTS` yang langsung tampil, sisanya dilipat
 * agar halaman tidak panjang. Saat dicetak semua kejadian ikut tampil.
 */
function EventDetails({ events }: { events: readonly ReportEvent[] }) {
  const newestFirst = events.toReversed()
  const recent = newestFirst.slice(0, RECENT_EVENTS)
  const older = newestFirst.slice(RECENT_EVENTS)

  return (
    <div className="flex flex-col gap-3">
      <EventList events={recent} />
      {older.length > 0 && (
        <>
          <details className="print:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">
              Lihat {formatNumber(older.length)} kejadian lainnya
            </summary>
            <EventList events={older} />
          </details>
          <div className="hidden print:block">
            <EventList events={older} />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Laporan sisa pangan satu SPPG: periode, ringkasan, grafik, tabel kejadian, unduhan CSV,
 * dan tampilan cetak. Periode yang tidak valid menampilkan pesan lalu memakai periode bawaan.
 * Render dalam `<Suspense>`.
 */
export async function SppgReportView({
  sppg,
  from,
  to,
  day,
  category,
}: {
  sppg: Sppg
  from?: string
  to?: string
  /** Filter rincian: tanggal `YYYY-MM-DD`; nilai di luar periode diabaikan. */
  day?: string
  /** Filter rincian: kategori; nilai yang tidak dikenal diabaikan. */
  category?: string
}) {
  const requested = await getSppgReport(sppg.id, { from, to })
  const fallback = requested.ok ? requested : await getSppgReport(sppg.id)
  if (!fallback.ok) return <p role="alert">{fallback.error}</p>

  const { period, generatedAt, trend, totals, events } = fallback.data
  const query = new URLSearchParams({ dari: period.from, sampai: period.to })
  const activeDay = parseEventDay(day, period)
  const activeCategory = CATEGORY_ORDER.find((c) => c === category)
  const shownEvents = filterReportEvents(events, { day: activeDay, category: activeCategory })

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Laporan Sisa Pangan</h1>
          <p className="text-muted-foreground">
            {sppg.name} · {sppg.operator} · {sppg.district}, {sppg.regency}
          </p>
          <p className="text-muted-foreground">
            Periode {formatLongDate(period.from)} – {formatLongDate(period.to)} · Dibuat{" "}
            {formatDateTime(generatedAt)} WIB
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild className="h-11">
            <a href={`/dasbor/laporan/unduh?${query}`} download>
              <Download data-icon="inline-start" aria-hidden />
              Unduh CSV
            </a>
          </Button>
          <PrintButton />
        </div>
      </section>

      <PeriodForm period={period} />
      {!requested.ok && (
        <p role="alert" className="text-sm font-medium text-destructive print:hidden">
          {requested.error} Menampilkan periode bawaan.
        </p>
      )}
      <p className="text-sm text-muted-foreground print:hidden">
        Satu laporan paling panjang {MAX_REPORT_DAYS} hari.
      </p>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile value={totals.registeredBatches} label="Batch dicatat" />
        <StatTile value={totals.portionsA} unit="porsi" label="A · Tersalurkan" />
        <StatTile value={totals.kgB} unit="kg" label="B · Tersalurkan" />
        <StatTile value={totals.kgC} unit="kg" label="C · Tersalurkan" />
        <StatTile value={totals.distributedKg} unit="kg" label="Total tersalurkan" />
        <StatTile value={totals.collectedKg} unit="kg" label="D · Diangkut TPS" />
      </section>

      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle>Tren Penyaluran Harian</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.some((p) => p.totalKg > 0) ? (
            <TrendChart points={trend} />
          ) : (
            <EmptyState icon={ChartColumn} title="Belum ada penyaluran pada periode ini" />
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Rincian Kejadian</h2>
        {events.length > 0 ? (
          <>
            <EventFilters period={period} day={activeDay} category={activeCategory} />
            {shownEvents.length > 0 ? (
              <EventDetails key={`${activeDay}-${activeCategory}`} events={shownEvents} />
            ) : (
              <EmptyState icon={FileText} title="Tidak ada kejadian untuk filter ini" />
            )}
          </>
        ) : (
          <EmptyState icon={FileText} title="Belum ada kejadian pada periode ini" />
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        Berat kategori A diperkirakan dari jumlah porsi (0,4 kg per porsi). Batch yang ditarik SPPG
        tidak termasuk dalam laporan ini.
      </p>
    </>
  )
}
