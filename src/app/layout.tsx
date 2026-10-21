import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RE:GIZI",
    template: "%s | RE:GIZI",
  },
  description:
    "Platform yang menghubungkan SPPG dengan UMKM, peternak, petani, dan warga untuk menyalurkan sisa makanan program MBG.",
};

// Hanya mode terang: token `.dark` belum diaktifkan, jadi bilah browser ikut terang (krem).
export const viewport: Viewport = {
  themeColor: "#fbf8f1",
};

/**
 * Layout akar: html, body, dan font saja. Kerangka halaman diatur per grup rute —
 * `(marketing)` pengenalan, `(auth)` masuk/daftar, `(app)` fungsi utama.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
