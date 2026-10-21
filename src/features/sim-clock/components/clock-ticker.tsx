"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { formatClock } from "@/lib/format"
import { REFRESH_INTERVAL_MS } from "../options"

/**
 * Jam aplikasi yang berjalan sendiri di browser: `now` dari server ditambah waktu nyata
 * sejak tampil × `speed` (tidak terpengaruh selisih jam klien–server).
 * @param refresh Bila `true` dan waktu dipercepat, halaman di-refresh berkala agar
 *   data (batas aman, degradasi kategori) ikut berjalan.
 */
export function ClockTicker({
  now,
  speed,
  paused,
  refresh = false,
  className,
}: {
  now: string
  speed: number
  paused: boolean
  refresh?: boolean
  className?: string
}) {
  const router = useRouter()
  const base = Date.parse(now)
  // Nilai berjalan disimpan bersama `base`-nya; bila server mengirim `now` baru, nilai lama diabaikan.
  const [tick, setTick] = useState<{ base: number; value: number } | null>(null)

  useEffect(() => {
    if (paused) return
    const start = Date.now()
    const id = setInterval(() => {
      setTick({ base, value: base + (Date.now() - start) * speed })
    }, 1000)
    return () => clearInterval(id)
  }, [base, speed, paused])

  useEffect(() => {
    if (!refresh || paused || speed <= 1) return
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh, paused, speed, router])

  const shown = !paused && tick?.base === base ? tick.value : base
  return (
    <time dateTime={new Date(shown).toISOString()} className={className} suppressHydrationWarning>
      {formatClock(shown)}
    </time>
  )
}
