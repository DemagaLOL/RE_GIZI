import { Card, CardContent } from "@/components/ui/card"
import { identityName, type Session } from "@/features/session"
import { RECIPIENT_TYPE_LABEL } from "@/lib/data"

/** Label peran akun, mis. `Penerima · UMKM`. */
function roleLabel(session: NonNullable<Session>): string {
  if (session.role === "sppg") return "SPPG"
  if (session.role === "tps") return "TPS"
  return `Penerima · ${RECIPIENT_TYPE_LABEL[session.recipient.type]}`
}

/** Data akun yang sedang masuk: nama terdaftar, email, dan peran. */
export function ProfileCard({ session }: { session: NonNullable<Session> }) {
  return (
    <Card>
      <CardContent>
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Nama</dt>
            <dd className="font-semibold break-words">{identityName(session)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="font-semibold break-words">{session.email}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Peran</dt>
            <dd className="font-semibold">{roleLabel(session)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
