import type { Metadata } from "next"
import { ContactPage } from "@/features/contact"

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi tim RE:GIZI lewat email, WhatsApp, atau media sosial.",
}

/** Rute `/kontak`. */
export default function Page() {
  return <ContactPage />
}
