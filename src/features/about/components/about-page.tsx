import { Container } from "@/components/shared/container"
import { FoodStatusBadge } from "@/components/shared/food-status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ABOUT_CONTENT } from "../content"

/** Judul section dengan gaya seragam. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold tracking-tight">{children}</h2>
}

/** Halaman "Tentang"; seluruh teksnya diambil dari `ABOUT_CONTENT`. */
export function AboutPage() {
  const { hero, problem, mission, steps, pathways } = ABOUT_CONTENT

  return (
    <Container className="flex flex-col gap-12 py-8 md:gap-16 md:py-12">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{hero.title}</h1>
        <p className="max-w-3xl text-lg text-muted-foreground">{hero.subtitle}</p>
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
          <ol className="flex flex-col gap-3">
            {mission.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground">
                  {i + 1}
                </span>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.title}</span>{" "}
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <SectionTitle>{steps.title}</SectionTitle>
          <p className="text-muted-foreground">{steps.subtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <SectionTitle>{pathways.title}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pathways.items.map((item) => (
            <Card key={item.category}>
              <CardHeader className="gap-3">
                <FoodStatusBadge category={item.category} />
                <CardTitle>
                  {item.category}. {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="font-medium">Untuk</p>
                  <p className="text-muted-foreground">{item.forWhat}</p>
                </div>
                <div>
                  <p className="font-medium">Penerima</p>
                  <p className="text-muted-foreground">{item.recipients}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </Container>
  )
}
