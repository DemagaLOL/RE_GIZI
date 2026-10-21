import { AtSign, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react"
import type { ComponentType } from "react"
import { Container } from "@/components/shared/container"
import { Card, CardContent } from "@/components/ui/card"
import { CONTACT_CONTENT, type ContactChannelType } from "../content"

const CHANNEL_ICONS: Record<ContactChannelType, ComponentType<{ className?: string }>> = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  instagram: AtSign,
  address: MapPin,
}

/** Halaman "Kontak"; seluruh teksnya diambil dari `CONTACT_CONTENT`. */
export function ContactPage() {
  const { hero, channels, hours } = CONTACT_CONTENT

  return (
    <Container className="flex flex-col gap-8 py-8 md:gap-12 md:py-12">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{hero.title}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{hero.subtitle}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {channels.map((channel, i) => {
          const Icon = CHANNEL_ICONS[channel.type]
          return (
            <Card key={i}>
              <CardContent className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{channel.label}</p>
                  <p className="break-words font-semibold">{channel.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {hours ? (
        <section className="flex items-start gap-4 rounded-xl bg-secondary p-6">
          <Clock className="mt-1 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">{hours.title}</h2>
            <p className="text-muted-foreground">{hours.description}</p>
          </div>
        </section>
      ) : null}
    </Container>
  )
}
