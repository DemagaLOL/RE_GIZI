"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Tombol membuka dialog cetak browser (bisa disimpan sebagai PDF). */
export function PrintButton() {
  return (
    <Button type="button" variant="outline" className="h-11" onClick={() => window.print()}>
      <Printer data-icon="inline-start" aria-hidden />
      Cetak
    </Button>
  )
}
