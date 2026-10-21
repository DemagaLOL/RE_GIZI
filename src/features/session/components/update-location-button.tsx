"use client"

import { LocateButton } from "@/components/shared/locate-button"
import { updateLocationAction } from "../actions"

/**
 * Tombol penerima memperbarui lokasinya dari GPS perangkat; katalog lalu dirender
 * ulang dengan jarak yang baru.
 */
export function UpdateLocationButton() {
  return (
    <LocateButton
      label="Perbarui Lokasi Saya"
      doneText="Lokasi diperbarui. Jarak dihitung dari posisi Anda sekarang."
      onLocate={async (point) => {
        const error = await updateLocationAction(point)
        if (error) throw new Error(error)
      }}
    />
  )
}
