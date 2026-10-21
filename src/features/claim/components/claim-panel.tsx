import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ELIGIBLE_RECIPIENTS, RECIPIENT_TYPE_LABEL, type SurplusBatchWithSppg } from "@/lib/data"
import { getSession } from "@/features/session"
import { ClaimForm } from "./claim-form"

/** Pesan pengganti form saat klaim tidak bisa dilakukan. */
function Notice({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted-foreground">{children}</p>
      {action}
    </div>
  )
}

/**
 * Panel klaim di halaman detail: menampilkan form bila penerima yang masuk berhak,
 * atau alasan mengapa batch tidak bisa diklaim. Membaca cookie — render dalam `<Suspense>`.
 */
export async function ClaimPanel({ batch }: { batch: SurplusBatchWithSppg }) {
  const session = await getSession()
  const eligible = ELIGIBLE_RECIPIENTS[batch.category]

  let content: React.ReactNode
  if (batch.status === "discarded") {
    content = <Notice>Sisa kategori D tidak layak dimanfaatkan dan menunggu diangkut TPS.</Notice>
  } else if (batch.status === "collected") {
    content = <Notice>Sisa kategori D ini sudah diangkut TPS.</Notice>
  } else if (batch.status === "expired") {
    content = <Notice>Batch ini sudah melewati batas aman dan tidak bisa diklaim.</Notice>
  } else if (batch.status !== "available") {
    content = <Notice>Batch ini sudah habis diklaim.</Notice>
  } else if (!session) {
    content = (
      <Notice
        action={
          <Button asChild size="lg">
            <Link href="/masuk">Masuk untuk mengklaim</Link>
          </Button>
        }
      >
        Masuk sebagai penerima untuk mengklaim sisa makanan ini.
      </Notice>
    )
  } else if (session.role === "sppg") {
    content = <Notice>Anda masuk sebagai SPPG. Klaim hanya bisa dilakukan oleh penerima.</Notice>
  } else if (session.role === "tps") {
    content = <Notice>Anda masuk sebagai TPS. TPS hanya mengangkut sisa kategori D.</Notice>
  } else if (!eligible.includes(session.recipient.type)) {
    content = (
      <Notice>
        Kategori ini hanya untuk {eligible.map((t) => RECIPIENT_TYPE_LABEL[t]).join(", ")}.
        Akun Anda terdaftar sebagai {RECIPIENT_TYPE_LABEL[session.recipient.type]}.
      </Notice>
    )
  } else {
    content = <ClaimForm batchId={batch.id} unit={batch.unit} remaining={batch.remainingQuantity} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Klaim Sisa Makanan</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
