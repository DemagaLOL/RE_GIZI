import Link from "next/link"
import { Lock } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { RECIPIENT_TYPE_LABEL, type RecipientType } from "@/lib/data"

/**
 * Pengganti detail batch bagi penerima yang jenisnya tidak berhak atas kategori batch
 * tersebut (mis. warga membuka tautan sisa pakan ternak). Isi batch tidak ditampilkan.
 * @param recipientType Jenis penerima yang sedang masuk.
 */
export function CategoryLockedNotice({ recipientType }: { recipientType: RecipientType }) {
  return (
    <EmptyState
      icon={Lock}
      title="Sisa ini bukan untuk jenis penerima Anda"
      description={`Akun Anda terdaftar sebagai ${RECIPIENT_TYPE_LABEL[recipientType]}. Anda hanya dapat melihat dan mengklaim kategori yang sesuai.`}
      action={
        <Button asChild variant="outline" size="lg">
          <Link href="/sisa-makanan">Lihat sisa yang bisa diklaim</Link>
        </Button>
      }
    />
  )
}
