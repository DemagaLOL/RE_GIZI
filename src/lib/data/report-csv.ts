import { CATEGORY_LABEL, REPORT_EVENT_LABEL } from "./constants"
import { wibDateTime } from "./report-core"
import type { ReportEvent } from "./types"

/**
 * Berkas CSV laporan: UTF-8 dengan BOM, pemisah `;`, dan desimal koma, agar langsung rapi
 * di Excel berbahasa Indonesia. Modul murni agar mudah dites.
 */

const SEPARATOR = ";"
const LINE_END = "\r\n"
const BOM = "﻿"
const HEADER = [
  "Waktu (WIB)",
  "Kejadian",
  "Kategori",
  "Keterangan Kategori",
  "Menu",
  "Jumlah",
  "Satuan",
  "Berat (kg)",
  "Pihak",
  "Catatan",
]

/**
 * Satu sel teks. Awalan `=`, `+`, `-`, `@`, tab, atau CR membuat spreadsheet menjalankan isi
 * sel sebagai formula, padahal nama penerima dan menu diketik pengguna; sel seperti itu
 * diberi awalan `'` agar tetap dibaca sebagai teks.
 */
function textCell(value: string): string {
  const safe = /^[\s]*[=+\-@]|^[\t\r]/.test(value) ? `'${value}` : value
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Satu sel angka dengan desimal koma. */
function numberCell(value: number): string {
  return String(value).replace(".", ",")
}

/** Susun kejadian laporan menjadi isi berkas CSV. */
export function toReportCsv(events: readonly ReportEvent[]): string {
  const rows = events.map((event) =>
    [
      textCell(wibDateTime(event.at)),
      textCell(REPORT_EVENT_LABEL[event.kind]),
      textCell(event.category),
      textCell(CATEGORY_LABEL[event.category]),
      textCell(event.menu),
      numberCell(event.quantity),
      textCell(event.unit),
      numberCell(event.kg),
      textCell(event.party ?? ""),
      textCell(event.note ?? ""),
    ].join(SEPARATOR)
  )
  return BOM + [HEADER.map(textCell).join(SEPARATOR), ...rows].join(LINE_END) + LINE_END
}
