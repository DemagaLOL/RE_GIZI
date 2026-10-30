import type { NextRequest } from "next/server"
import { getSession } from "@/features/session"
import { getSppgReport, toReportCsv } from "@/lib/data"

/**
 * Unduhan CSV laporan SPPG yang sedang masuk (`?dari=&sampai=`). ID SPPG selalu diambil
 * dari sesi, tidak pernah dari URL, agar data SPPG lain tidak bisa diambil.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (session?.role !== "sppg") {
    return new Response("Masuk sebagai SPPG terlebih dahulu.", { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const report = await getSppgReport(session.sppg.id, {
    from: searchParams.get("dari") ?? undefined,
    to: searchParams.get("sampai") ?? undefined,
  })
  if (!report.ok) return new Response(report.error, { status: 400 })

  const { period, events } = report.data
  return new Response(toReportCsv(events), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-regizi-${period.from}-${period.to}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
