import Link from "next/link"
import { SearchX } from "lucide-react"
import { Container } from "@/components/shared/container"
import { EmptyState } from "@/components/shared/empty-state"
import { SimpleHeader } from "@/components/shared/simple-header"
import { Button } from "@/components/ui/button"

/** Halaman 404 global. */
export default function NotFound() {
  return (
    <>
      <SimpleHeader />
      <main className="flex flex-1 flex-col">
        <Container className="py-12">
          <EmptyState
            icon={SearchX}
            title="Halaman tidak ditemukan"
            description="Halaman atau sisa makanan yang Anda cari tidak ada atau sudah dihapus."
            action={
              <Button asChild size="lg">
                <Link href="/">Kembali ke Beranda</Link>
              </Button>
            }
          />
        </Container>
      </main>
    </>
  )
}
