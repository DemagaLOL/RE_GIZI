import type { Metadata } from "next"
import { Container } from "@/components/shared/container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RegisterForm } from "@/features/session"

export const metadata: Metadata = {
  title: "Daftar",
  description: "Daftar sebagai penerima sisa makanan SPPG: UMKM, warga, peternak, petani, atau komposter.",
}

/** Rute `/daftar`: pendaftaran mandiri penerima. */
export default function Page() {
  return (
    <Container className="flex flex-col items-center py-8 md:py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Daftar sebagai Penerima</CardTitle>
          <CardDescription>
            Untuk UMKM, warga, peternak, petani, dan komposter. SPPG yang ingin bergabung silakan
            hubungi kami lewat halaman Kontak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </Container>
  )
}
