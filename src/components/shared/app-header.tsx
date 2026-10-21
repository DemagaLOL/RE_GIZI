import * as React from "react"
import { Container } from "./container"
import { Logo } from "./logo"

/**
 * Header ringkas untuk halaman fungsi utama (app shell).
 * @param nav Navigasi desktop di tengah (disembunyikan di mobile, diganti tab bar).
 * @param actions Konten kanan, mis. nama akun dan tombol Keluar/Masuk.
 */
function AppHeader({ nav, actions }: { nav?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <Container className="flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo />
          {nav}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </Container>
    </header>
  )
}

export { AppHeader }
