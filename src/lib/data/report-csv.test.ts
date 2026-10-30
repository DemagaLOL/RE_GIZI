import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { toReportCsv } from "./report-csv"
import type { ReportEvent } from "./types"

const EVENT: ReportEvent = {
  at: "2026-10-16T03:00:00.000Z",
  kind: "distributed",
  category: "B",
  menu: "Sisa nasi",
  quantity: 2.5,
  unit: "kg",
  kg: 2.5,
  party: "Kelompok Lele",
}

/** Baris data pertama, tanpa BOM dan akhir baris. */
const firstRow = (event: ReportEvent) => toReportCsv([event]).split("\r\n")[1]

describe("toReportCsv", () => {
  it("diawali BOM dan memakai pemisah titik koma", () => {
    const csv = toReportCsv([])
    assert.equal(csv.charCodeAt(0), 0xfeff)
    assert.ok(csv.slice(1).startsWith("Waktu (WIB);Kejadian;Kategori;"))
    assert.ok(csv.endsWith("\r\n"))
  })

  it("menulis waktu WIB, label, dan desimal koma", () => {
    assert.equal(
      firstRow(EVENT),
      "2026-10-16 10:00;Tersalurkan;B;Pakan Ternak;Sisa nasi;2,5;kg;2,5;Kelompok Lele;"
    )
  })

  it("mengutip sel yang memuat pemisah, kutip, atau baris baru", () => {
    assert.ok(firstRow({ ...EVENT, menu: 'Nasi; ayam "kecap"' }).includes('"Nasi; ayam ""kecap"""'))
    const csv = toReportCsv([{ ...EVENT, note: "baris 1\nbaris 2" }])
    assert.ok(csv.includes('"baris 1\nbaris 2"'))
  })

  it("mencegah injeksi formula pada isian pengguna", () => {
    for (const value of ['=HYPERLINK("http://x")', "+1+1", "-1+1", "@SUM(A1)", "  =1+1", "\t=1+1"]) {
      const row = firstRow({ ...EVENT, party: value })
      assert.ok(!row.split(";").some((cell) => /^"?[\s]*[=+\-@]/.test(cell)), row)
    }
  })

  it("teks biasa tidak berubah dan pihak kosong tetap sel kosong", () => {
    const row = firstRow({ ...EVENT, party: undefined, menu: "Roti - cokelat" })
    assert.ok(row.includes(";Roti - cokelat;"))
    assert.ok(row.endsWith(";;"))
  })
})
