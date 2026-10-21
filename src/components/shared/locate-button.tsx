"use client"

import { useState } from "react"
import { Loader2, LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GeoPoint } from "@/lib/data/types"

type LocateStatus =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "done" }
  | { kind: "error"; message: string }

/** Pesan galat Geolocation API dalam Bahasa Indonesia. */
function errorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return "Izin lokasi ditolak."
  if (error.code === error.TIMEOUT) return "Lokasi tidak ditemukan tepat waktu. Coba lagi."
  return "Lokasi tidak tersedia di perangkat ini."
}

/**
 * Tombol untuk membaca lokasi perangkat (GPS) lewat Geolocation API browser.
 * @param onLocate Dipanggil dengan titik yang ditemukan; boleh async (tombol menunggu).
 * @param doneText Teks setelah berhasil, mis. "Lokasi tersimpan".
 * @param fallbackText Ditambahkan ke pesan galat, mis. apa yang dipakai bila lokasi gagal.
 */
export function LocateButton({
  label = "Gunakan Lokasi Saya",
  doneText = "Lokasi didapat.",
  fallbackText,
  onLocate,
}: {
  label?: string
  doneText?: string
  fallbackText?: string
  onLocate: (point: GeoPoint) => void | Promise<void>
}) {
  const [status, setStatus] = useState<LocateStatus>({ kind: "idle" })

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus({ kind: "error", message: "Perangkat ini tidak mendukung lokasi." })
      return
    }
    setStatus({ kind: "locating" })
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await onLocate({ lat: coords.latitude, lng: coords.longitude })
          setStatus({ kind: "done" })
        } catch {
          setStatus({ kind: "error", message: "Lokasi gagal disimpan. Coba lagi." })
        }
      },
      (error) => setStatus({ kind: "error", message: errorMessage(error) }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-fit"
        disabled={status.kind === "locating"}
        onClick={locate}
      >
        {status.kind === "locating" ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : (
          <LocateFixed data-icon="inline-start" aria-hidden />
        )}
        {label}
      </Button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {status.kind === "done" && doneText}
        {status.kind === "error" && (
          <span className="text-destructive">
            {status.message}
            {fallbackText && ` ${fallbackText}`}
          </span>
        )}
      </p>
    </div>
  )
}
