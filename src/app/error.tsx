"use client"

import { useEffect } from "react"
import { TriangleAlert } from "lucide-react"
import { Container } from "@/components/shared/container"
import { EmptyState } from "@/components/shared/empty-state"
import { SimpleHeader } from "@/components/shared/simple-header"
import { Button } from "@/components/ui/button"

/** Batas error global: pesan ramah dan tombol coba lagi. */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <>
      <SimpleHeader />
      <main className="flex flex-1 flex-col">
        <Container className="py-12">
          <EmptyState
            icon={TriangleAlert}
            title="Terjadi kesalahan"
            description="Maaf, halaman ini gagal dimuat. Silakan coba lagi."
            action={
              <Button size="lg" onClick={() => retry()}>
                Coba Lagi
              </Button>
            }
          />
        </Container>
      </main>
    </>
  )
}
