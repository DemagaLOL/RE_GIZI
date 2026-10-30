import type { Metadata } from "next"
import { Suspense } from "react"
import { Container } from "@/components/shared/container"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileCard } from "@/features/profile"
import { requireSession, SignOutButton } from "@/features/session"

export const metadata: Metadata = {
  title: "Profil",
}

/** Pastikan sudah masuk lalu tampilkan data akunnya. */
async function Profile() {
  const session = await requireSession()
  return (
    <>
      <ProfileCard session={session} />
      <SignOutButton />
    </>
  )
}

/** Rute `/profil`: data akun untuk semua peran. */
export default function Page() {
  return (
    <Container className="py-8 md:py-12">
      <div className="flex max-w-xl flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Profil</h1>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <Profile />
        </Suspense>
      </div>
    </Container>
  )
}
