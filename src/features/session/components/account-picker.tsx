import { ChefHat, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getRecipients, getSppgList, RECIPIENT_TYPE_LABEL } from "@/lib/data"
import { signInAs } from "../actions"

/** Satu baris akun yang bisa dipilih; menekan baris langsung masuk. */
function AccountButton({ account, title, subtitle }: { account: string; title: string; subtitle: string }) {
  return (
    <form action={signInAs}>
      <input type="hidden" name="account" value={account} />
      <button
        type="submit"
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex flex-col">
          <span className="font-medium">{title}</span>
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </form>
  )
}

/** Daftar akun demo (SPPG dan penerima) untuk masuk tanpa kata sandi. */
export async function AccountPicker() {
  const [sppgList, recipients] = await Promise.all([getSppgList(), getRecipients()])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="size-5 text-primary" aria-hidden />
            Masuk sebagai SPPG
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {sppgList.map((sppg) => (
            <AccountButton
              key={sppg.id}
              account={`sppg:${sppg.id}`}
              title={sppg.name}
              subtitle={`${sppg.district}, ${sppg.regency}`}
            />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Masuk sebagai Penerima</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {recipients.map((recipient) => (
            <AccountButton
              key={recipient.id}
              account={`recipient:${recipient.id}`}
              title={recipient.name}
              subtitle={`${RECIPIENT_TYPE_LABEL[recipient.type]} · ${recipient.district}`}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
