"use client"

import { useActionState, useState } from "react"
import { DatabaseZap, FastForward, Loader2, Pause, Play, RotateCcw } from "lucide-react"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_ORDER, CLOCK_SPEED_PRESETS, SAFE_WINDOW_HOURS } from "@/lib/data/constants"
import type { ClockState } from "@/lib/data/types"
import { formatSpeed } from "@/lib/format"
import { clockAction } from "../actions"
import { ADVANCE_OPTIONS_HOURS } from "../options"
import type { ClockFormState } from "../types"
import { ClockTicker } from "./clock-ticker"

const INITIAL_STATE: ClockFormState = { status: "idle" }

/** Keterangan rentang waktu tiap kategori sejak dimasak, mis. `0–4 jam`. */
function categoryRange(index: number): string {
  const category = CATEGORY_ORDER[index]
  const from = index === 0 ? 0 : SAFE_WINDOW_HOURS[CATEGORY_ORDER[index - 1]]
  return category === "D" ? `setelah ${from} jam` : `${from}–${SAFE_WINDOW_HOURS[category]} jam`
}

/** Judul kecil tiap grup kontrol. */
function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-muted-foreground">{children}</h2>
}

/**
 * Panel simulasi waktu untuk demo: atur laju (1×–600×), jeda/lanjut, lompat beberapa
 * jam, pindah ke tanggal-jam tertentu, atau kembali ke waktu nyata. Kategori sisa
 * makanan turun otomatis mengikuti jam ini.
 * @param clock Keadaan jam dari server (`getClockState`).
 * @param futureData Ada data bertanggal setelah waktu nyata (`hasFutureData`); menampilkan peringatan.
 * @param canResetData Tombol "Reset jam & data demo" tersedia (`canResetDemoData`, mode demo).
 */
export function ClockPanel({
  clock,
  futureData,
  canResetData,
}: {
  clock: ClockState
  futureData: boolean
  canResetData: boolean
}) {
  const [state, formAction, pending] = useActionState(clockAction, INITIAL_STATE)
  const [confirmingReset, setConfirmingReset] = useState(false)

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-1 rounded-xl border bg-card p-4 md:p-6">
        <GroupTitle>Jam aplikasi (WIB)</GroupTitle>
        <ClockTicker
          now={clock.now}
          speed={clock.speed}
          paused={clock.paused}
          className="font-mono text-2xl font-bold tabular-nums md:text-4xl"
        />
        <p className="text-sm text-muted-foreground">
          {clock.simulated
            ? `Disimulasikan · ${clock.paused ? "dijeda" : `laju ${formatSpeed(clock.speed)}`}`
            : "Mengikuti waktu nyata"}
        </p>
      </section>

      {(state.status === "error" || state.status === "success") && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "text-sm font-medium text-destructive"
              : "text-sm font-medium text-success"
          }
        >
          {state.message}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <GroupTitle>Laju waktu</GroupTitle>
        <div className="flex flex-wrap gap-2">
          {CLOCK_SPEED_PRESETS.map((speed) => (
            <Button
              key={speed}
              type="submit"
              name="intent"
              value={`speed:${speed}`}
              variant={clock.speed === speed ? "default" : "outline"}
              aria-pressed={clock.speed === speed}
              className="h-11 min-w-16 font-mono"
              disabled={pending}
            >
              {formatSpeed(speed)}
            </Button>
          ))}
          <Button
            type="submit"
            name="intent"
            value={clock.paused ? "resume" : "pause"}
            variant="secondary"
            className="h-11"
            disabled={pending}
          >
            {clock.paused ? (
              <Play data-icon="inline-start" aria-hidden />
            ) : (
              <Pause data-icon="inline-start" aria-hidden />
            )}
            {clock.paused ? "Lanjutkan" : "Jeda"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          60× = 1 menit nyata menjadi 1 jam; 600× = 1 detik nyata menjadi 10 menit.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <GroupTitle>Lompat ke depan</GroupTitle>
        <div className="flex flex-wrap gap-2">
          {ADVANCE_OPTIONS_HOURS.map((hours) => (
            <Button
              key={hours}
              type="submit"
              name="intent"
              value={`advance:${hours}`}
              variant="outline"
              className="h-11"
              disabled={pending}
            >
              <FastForward data-icon="inline-start" aria-hidden />+{hours} jam
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <GroupTitle>Pindah ke tanggal & jam (WIB)</GroupTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="at" className="sr-only">
            Tanggal & jam tujuan
          </label>
          <input
            id="at"
            name="at"
            type="datetime-local"
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-auto"
          />
          <Button type="submit" name="intent" value="jump" variant="outline" className="h-11" disabled={pending}>
            Pindah
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Tujuan harus setelah jam aplikasi sekarang; untuk mundur gunakan pilihan di bagian bawah.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <GroupTitle>Ambang turun kategori (sejak dimasak)</GroupTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CATEGORY_ORDER.map((category, i) => (
            <li key={category} className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <FoodStatusBadge category={category} />
              <span className="font-mono">{categoryRange(i)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Saat turun kategori, klaim yang belum diambil dibatalkan dan sisanya ditawarkan ke penerima
          kategori berikutnya.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <GroupTitle>Kembali ke waktu nyata</GroupTitle>
        {futureData && (
          <p className="rounded-lg bg-warning px-4 py-3 text-sm text-warning-foreground">
            Ada sisa makanan atau klaim yang dicatat saat jam dimajukan. Di waktu nyata, data itu
            berada &quot;di masa depan&quot; sehingga batas amannya tidak sesuai lagi (mis. makanan
            matang tetap kategori A berhari-hari).
            {canResetData
              ? " Gunakan \"Reset jam & data demo\" untuk memulai ulang dari keadaan bersih."
              : " Kosongkan data dengan npm run db:reset untuk memulai ulang."}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            name="intent"
            value="reset"
            variant="ghost"
            className="h-11"
            disabled={pending || !clock.simulated}
          >
            <RotateCcw data-icon="inline-start" aria-hidden />
            Kembali ke waktu nyata
          </Button>
          {canResetData && !confirmingReset && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => setConfirmingReset(true)}
            >
              <DatabaseZap data-icon="inline-start" aria-hidden />
              Reset jam &amp; data demo
            </Button>
          )}
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Memproses" />}
        </div>
        {canResetData && confirmingReset && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <p className="text-sm">
              Kosongkan semua sisa makanan, klaim, dan akun yang didaftarkan sendiri, lalu isi ulang
              akun contoh dan kembalikan jam ke waktu nyata? Semua pengguna akan keluar. Tindakan ini
              tidak bisa dibatalkan.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                name="intent"
                value="reset-data"
                variant="destructive"
                className="h-11"
                disabled={pending}
              >
                Ya, Reset Semua
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                disabled={pending}
                onClick={() => setConfirmingReset(false)}
              >
                Tidak
              </Button>
            </div>
          </div>
        )}
      </section>
    </form>
  )
}
