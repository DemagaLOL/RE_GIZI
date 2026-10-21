import { SimpleHeader } from "@/components/shared/simple-header"

/** Kerangka halaman masuk/daftar: header bersih tanpa navigasi utama dan footer. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SimpleHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  )
}
