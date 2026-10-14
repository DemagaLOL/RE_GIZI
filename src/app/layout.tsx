import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionNav } from "@/features/session";
import { Suspense } from "react";
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
    default: "RE:GIZI — Selamatkan Sisa Makanan MBG",
    template: "%s | RE:GIZI",
  },
  description:
    "Platform yang menghubungkan SPPG dengan UMKM, peternak, petani, dan warga untuk menyalurkan sisa makanan program MBG.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8f1" },
    { media: "(prefers-color-scheme: dark)", color: "#13211a" },
  ],
};

/** Layout global: Navbar menempel di atas, konten utama, Footer di bawah. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Navbar
          sessionSlot={
            <Suspense fallback={<Skeleton className="h-10 w-24 rounded-lg" />}>
              <SessionNav />
            </Suspense>
          }
        />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
