/**
 * Fitur simulasi waktu untuk demo: panel pengatur jam aplikasi (laju, jeda, lompat,
 * kembali ke waktu nyata) dan pita penanda saat jam disimulasikan. Batas aman dan
 * degradasi kategori sisa makanan (A → B → C → D) mengikuti jam ini.
 */

export { clockAction } from "./actions"
export { ClockPanel } from "./components/clock-panel"
export { ClockTicker } from "./components/clock-ticker"
export { SimClockBanner } from "./components/sim-clock-banner"
export type { ClockFormState } from "./types"
