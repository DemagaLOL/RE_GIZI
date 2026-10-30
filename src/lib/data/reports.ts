import { io } from "next/cache"
import { simNow } from "./clock"
import { getDb } from "./db/client"
import { syncDueChanges } from "./due-changes"
import {
  buildDailyTrend,
  buildReportTotals,
  parseReportPeriod,
  recentPeriod,
  selectReportEvents,
} from "./report-core"
import type { DailyTrendPoint, DataResult, SppgReport } from "./types"

/**
 * Rekap harian penyaluran satu SPPG untuk `days` hari terakhir.
 * Hanya untuk SPPG pemiliknya — jangan tampilkan ke peran lain.
 */
export async function getDailyTrend(sppgId: string, days: number): Promise<DailyTrendPoint[]> {
  await io()
  const db = getDb()
  const now = simNow(db)
  syncDueChanges(db, now)
  const period = recentPeriod(now, days)
  return buildDailyTrend(selectReportEvents(db, sppgId, period), period)
}

/**
 * Laporan sisa pangan satu SPPG. Hanya untuk SPPG pemiliknya.
 * @param range Tanggal `YYYY-MM-DD` dari query URL; kosong = periode bawaan.
 * @returns Laporan, atau pesan galat bila periodenya tidak valid.
 */
export async function getSppgReport(
  sppgId: string,
  range: { from?: string; to?: string } = {}
): Promise<DataResult<SppgReport>> {
  await io()
  const db = getDb()
  const now = simNow(db)
  syncDueChanges(db, now)
  const parsed = parseReportPeriod(range.from, range.to, now)
  if (!parsed.ok) return parsed

  const period = parsed.data
  const events = selectReportEvents(db, sppgId, period)
  return {
    ok: true,
    data: {
      period,
      generatedAt: new Date(now).toISOString(),
      trend: buildDailyTrend(events, period),
      totals: buildReportTotals(events),
      events,
    },
  }
}
