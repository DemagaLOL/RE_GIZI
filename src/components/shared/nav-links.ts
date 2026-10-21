/** Satu tautan navigasi utama. */
type NavLink = { href: string; label: string }

/** Tautan navigasi utama, dipakai bersama oleh Navbar, menu mobile, dan Footer. */
const NAV_LINKS: readonly NavLink[] = [
  { href: "/", label: "Beranda" },
  { href: "/tentang", label: "Tentang" },
  { href: "/kontak", label: "Kontak" },
]

export { NAV_LINKS, type NavLink }
