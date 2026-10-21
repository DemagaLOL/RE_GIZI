import { Suspense } from "react"
import { Footer } from "@/components/shared/footer"
import { Navbar } from "@/components/shared/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { SessionNav } from "@/features/session"

/** Kerangka halaman pengenalan: Navbar menempel di atas, konten, Footer di bawah. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar
        sessionSlot={
          <Suspense fallback={<Skeleton className="h-10 w-24 rounded-lg" />}>
            <SessionNav />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
    </>
  )
}
