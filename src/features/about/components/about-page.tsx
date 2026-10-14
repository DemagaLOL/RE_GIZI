import { Container } from "@/components/shared/container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ABOUT_CONTENT } from "../content"

/** Judul section dengan gaya seragam. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold tracking-tight">{children}</h2>
}

/** Halaman "Tentang"; seluruh teksnya diambil dari `ABOUT_CONTENT`. */
export function AboutPage() {
  const { hero, problem, mission, steps, impact, team } = ABOUT_CONTENT

  return (
    <Container className="flex flex-col gap-12 py-8 md:gap-16 md:py-12">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{hero.title}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{hero.subtitle}</p>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SectionTitle>{problem.title}</SectionTitle>
          {problem.paragraphs.map((text, i) => (
            <p key={i} className="text-muted-foreground">{text}</p>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <SectionTitle>{mission.title}</SectionTitle>
          {mission.paragraphs.map((text, i) => (
            <p key={i} className="text-muted-foreground">{text}</p>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>{steps.title}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.items.map((item, i) => (
            <Card key={i}>
              <CardHeader>
                <span className="font-mono text-sm text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>{impact.title}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {impact.items.map((item, i) => (
            <Card key={i} className="bg-secondary">
              <CardContent className="flex flex-col gap-1">
                <p className="font-mono text-3xl font-bold text-primary">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>{team.title}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {team.members.map((member, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-3">
                {member.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ) : null}
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  )
}
