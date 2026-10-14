import type { Metadata } from "next"
import { AboutPage } from "@/features/about"

export const metadata: Metadata = {
  title: "Tentang",
  description: "Kenali RE:GIZI, misi, cara kerja, dan tim di balik platform ini.",
}

/** Rute `/tentang`. */
export default function Page() {
  return <AboutPage />
}
