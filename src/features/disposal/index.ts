/**
 * Fitur pembuangan sisa tidak layak (kategori D): TPS melihat antrean sisa D dari
 * SPPG, menandainya sudah diangkut, dan melihat riwayatnya. Peran lain hanya melihat
 * ringkasan jumlahnya (`DisposalSummary`), bukan detail batch.
 */

export { DisposalHistory } from "./components/disposal-history"
export { DisposalLockedNotice } from "./components/disposal-locked-notice"
export { DisposalQueue } from "./components/disposal-queue"
export { DisposalSummary } from "./components/disposal-summary"
