import Link from "next/link"
import { Lock } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"

/**
 * Pengganti detail batch kategori D bagi peran selain TPS dan SPPG pemiliknya:
 * isi (menu, alamat, berat) sengaja tidak ditampilkan.
 */
export function DisposalLockedNotice() {
  return (
    <EmptyState
      icon={Lock}
      title="Sisa tidak layak — hanya dapat diakses TPS"
      description="Sisa kategori D tidak bisa dimanfaatkan dan diangkut oleh petugas TPS. Jumlahnya tetap tercatat di ringkasan katalog."
      action={
        <Button asChild variant="outline">
          <Link href="/sisa-makanan">Lihat sisa yang bisa diklaim</Link>
        </Button>
      }
    />
  )
}
