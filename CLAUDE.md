# CLAUDE.md — RE:GIZI

@AGENTS.md

## 1. Ringkasan Produk

**RE:GIZI** adalah platform yang menghubungkan **SPPG** (Satuan Pelayanan Pemenuhan Gizi — dapur program Makan Bergizi Gratis/MBG) dengan **UMKM, peternak, petani, dan warga** untuk menyalurkan sisa makanan agar tidak terbuang.

**Rescue** dan **Recycle** hanyalah nama merek/narasi, **bukan** kategori, rute, atau tipe di kode. Sisa makanan dibedakan menjadi 4 kategori menurut kondisinya, ditentukan oleh SPPG saat membuat listing:

| Kategori | Kondisi | Penerima | Satuan |
|---|---|---|---|
| **A** | Layak konsumsi | UMKM, warga | porsi |
| **B** | Pakan ternak | peternak | kg |
| **C** | Kompos | petani, komposter | kg |
| **D** | Tidak layak, dibuang | tidak ada — diangkut **TPS** (`discarded` → `collected`) | kg |

Peran akun (`AccountRole`): `sppg` (penyedia), `recipient` (penerima: `umkm`, `peternak`, `petani`, `warga`, `komposter`), dan `tps` (Tempat Pembuangan Sampah). Penerima hanya boleh melihat/mengklaim kategori yang sesuai (`ELIGIBLE_RECIPIENTS` di `src/lib/data/constants.ts`) — jangan pernah menampilkan sisa B/C ke penerima kategori A, dan kategori D tidak bisa diklaim siapa pun.

**Pembuangan kategori D** (`src/lib/data/disposals.ts`, fitur `disposal`, rute `/pembuangan`): batch D (`discarded`, termasuk hasil degradasi) masuk antrean TPS; TPS menandai seluruh batch "Sudah Diangkut" → tercatat di `disposals`, batch menjadi `collected`. **Detail batch D hanya boleh dilihat TPS dan SPPG pemiliknya**; peran lain hanya melihat angka agregat (`getDisposalSummary` / `<DisposalSummary />`). Akun TPS hanya dari seed (`tps@demo.regizi.id`), tidak bisa daftar mandiri.

**Mode demo** (`isDemoMode()` di `src/lib/data/seed.ts`): akun contoh `@demo.regizi.id` (sandi publik) hanya tampil & bisa dipakai di dev atau bila `DEMO_MODE=1` di produksi, dan tidak ikut dikunci saat gagal masuk berulang.

**Degradasi kategori** (`src/lib/data/degradation.ts`): kategori hanya bisa turun. Turun otomatis saat lewat batas aman (kumulatif sejak `cookedAt`: A 4 jam → B 24 jam → C 72 jam → D), atau lebih awal secara manual oleh SPPG (`degradeBatch`). **Makanan kering** (`foodType: "dry"`, hanya kategori A; roti, biskuit, dsb.) memakai batas layak `bestBefore` pilihan SPPG (maks. `DRY_MAX_DAYS` = 7 hari) sebagai batas A, lalu jendela digeser: B sampai `bestBefore` + 20 jam, C sampai + 68 jam (`windowBase`). Saat turun, klaim `pending` dibatalkan dan jumlahnya kembali ke sisa, satuan porsi dikonversi ke kg (`KG_PER_PORTION`), dan riwayatnya dicatat di `batch_category_events`. Klaim menyimpan snapshot `category`/`unit`. Degradasi dijalankan *lazy* setiap kali data batch dibaca/ditulis.

**Jam aplikasi** (`src/lib/data/clock.ts`): semua waktu domain sisa makanan memakai `simNow()`/`getNow()`, **jangan `Date.now()`**. Jam bisa disimulasikan untuk demo (dipercepat sampai 600×, dijeda, dimajukan) lewat `/waktu` (khusus SPPG). Statusnya disimpan di tabel `sim_clock`. Kembali ke waktu nyata bisa membuat data simulasi berada "di masa depan" (`hasFutureData`); panel menyediakan "Reset jam & data demo" (`resetDemoData`, setara `db:reset`). Aktif di dev; di produksi hanya bila `SIM_CLOCK=1`. Sesi & login tetap memakai waktu nyata.

## 2. Stack

- **Next.js 16** (App Router) + **React 19** — API berbeda dari data latih; baca `node_modules/next/dist/docs/` sebelum menulis kode (lihat AGENTS.md).
- **TypeScript** (`strict: true`), alias path `@/*` → `src/*`.
- **Tailwind CSS v4** — konfigurasi lewat CSS (`@theme` di `src/app/globals.css`), tidak ada `tailwind.config.*`.
- **shadcn/ui** (style `radix-nova`, berbasis Radix UI) + ikon **lucide-react**. Tambah komponen dengan `npx shadcn@latest add <nama>`.
- **SQLite lokal** (`better-sqlite3`) + **Drizzle ORM** — file `data/regizi.db` (di-*gitignore*, bisa diganti lewat env `DATABASE_PATH`). Skema di `src/lib/data/db/schema.ts`, migrasi di `drizzle/` (di-commit). Database kosong otomatis dimigrasi & diisi seed saat pertama diakses. Butuh disk persisten — tidak cocok untuk hosting serverless (Vercel).
- Perintah: `npm run dev`, `npm run build`, `npm run lint`, `npm test` (tes unit data layer via `tsx --test`), `npm run db:generate` (buat migrasi setelah ubah skema), `npm run db:reset` (kosongkan DB & isi ulang akun demo; aman saat `dev` menyala), `npm run db:studio`.

## 3. Konvensi

### Struktur folder (feature-based)

```
src/
  app/                 # Routing saja: page, layout, loading, error. Tipis — delegasi ke features.
  features/
    <fitur>/           # contoh: listing, claim, auth, dashboard-sppg
      components/      # Komponen khusus fitur ini
      hooks/
      actions.ts       # Server Actions fitur
      types.ts
      index.ts         # Public API fitur — impor dari luar fitur hanya lewat sini
  components/
    ui/                # Primitif shadcn/ui (generik, tanpa logika bisnis)
    shared/            # Komponen lintas-fitur (header, empty state, dsb.)
  lib/
    data/              # Data layer — satu-satunya pintu akses data
    utils.ts
```

- `src/app` dibagi tiga **route group** (tidak memengaruhi URL), masing-masing dengan `layout.tsx` sendiri di bawah satu root layout:
  - `(marketing)` — pengenalan (`/`, `/tentang`, `/kontak`): `Navbar` + `Footer`.
  - `(auth)` — `/masuk`, `/daftar`: `SimpleHeader` saja.
  - `(app)` — fungsi utama (`/dasbor`, `/klaim-saya`, `/sisa-makanan`): app shell `AppNav` (menu per peran + tab bar mobile; tamu melihat menu pengenalan Beranda/Tentang/Kontak + Masuk). Menu diatur di `APP_LINKS` (`src/features/session/components/app-nav.tsx`).
- Satu fitur tidak boleh mengimpor isi internal fitur lain; gunakan `index.ts`-nya.
- `src/components/ui` hanya berisi komponen presentasional generik. Logika bisnis masuk ke `src/features/*`.
- Default ke Server Components; tambahkan `"use client"` hanya bila perlu interaktivitas.
- Penamaan: file `kebab-case.tsx`, komponen `PascalCase`, hook `useCamelCase`.

### Bahasa

- **Semua teks UI dalam Bahasa Indonesia** (label, tombol, pesan error, metadata, `lang="id"`).
- Kode (nama variabel, fungsi, tipe) dalam Bahasa Inggris; istilah domain boleh tetap (`sppg`, `umkm`, `peternak`, `petani`).
- Format angka, tanggal, dan berat memakai locale `id-ID` (mis. `Intl.NumberFormat("id-ID")`, satuan `kg`).

### Commit

Gunakan **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`, `test:`. Scope opsional dengan nama fitur, mis. `feat(claim): tambah form klaim listing`.

## 4. Design Tokens

Nuansa **hijau-oranye hangat**: hijau = keberlanjutan/gizi, oranye = kehangatan/aksi. Token didefinisikan sebagai CSS variable shadcn di `src/app/globals.css` (format `oklch`). Selalu pakai token (`bg-primary`, `text-accent-foreground`, dst.) — **jangan hardcode warna**.

### Warna (mode terang)

| Token | Nilai | Kegunaan |
|---|---|---|
| `--background` | `oklch(0.985 0.012 85)` | Krem hangat, latar halaman |
| `--foreground` | `oklch(0.24 0.03 150)` | Teks utama, hijau sangat gelap |
| `--card` | `oklch(1 0 0)` | Kartu |
| `--primary` | `oklch(0.52 0.13 150)` | Hijau daun — aksi utama, kategori **A** |
| `--primary-foreground` | `oklch(0.98 0.01 85)` | Teks di atas primary |
| `--accent` | `oklch(0.72 0.16 55)` | Oranye hangat — highlight, CTA sekunder, kategori **B** |
| `--accent-foreground` | `oklch(0.25 0.05 50)` | Teks di atas accent |
| `--secondary` | `oklch(0.94 0.04 140)` | Hijau pucat — badge, latar sekunder |
| `--muted` | `oklch(0.95 0.015 80)` | Latar redup |
| `--muted-foreground` | `oklch(0.50 0.03 120)` | Teks sekunder |
| `--border` / `--input` | `oklch(0.90 0.02 85)` | Garis & input |
| `--ring` | `oklch(0.52 0.13 150)` | Fokus |
| `--destructive` | `oklch(0.58 0.22 27)` | Error, kedaluwarsa |

Token status (sudah terdaftar di `@theme inline`, masing-masing punya pasangan `-foreground`):

| Token | Kelas | Status |
|---|---|---|
| `--rescue` = `--primary` (hijau) | `bg-rescue` | Kategori **A** — Layak Konsumsi |
| `--feed` = `--accent` (oranye) | `bg-feed` | Kategori **B** — Pakan Ternak |
| `--compost` = `oklch(0.50 0.07 60)` (cokelat tanah) | `bg-compost` | Kategori **C** — Kompos |
| `--discard` = `oklch(0.45 0.02 60)` (abu hangat) | `bg-discard` | Kategori **D** — Tidak Layak (Dibuang) |
| `--warning` = `oklch(0.80 0.15 85)` | `bg-warning` | Mendekati batas layak |
| `--success` = `oklch(0.62 0.15 150)` | `bg-success` | Penyaluran selesai |

Tampilkan status lewat `<FoodStatusBadge category="A" | "B" | "C" | "D" />` (`src/components/shared/food-status-badge.tsx`), jangan merakit badge sendiri. Catatan: komponen shadcn memakai `--accent` untuk hover/fokus menu, jadi highlight menu akan berwarna oranye.

Mode gelap: pertahankan hue yang sama (hijau 150, oranye 55), turunkan lightness latar ke ~0.20 dan naikkan lightness primary/accent ~0.08 agar kontras tetap ≥ 4.5:1.

### Tipografi

- **Sans/heading:** `Plus Jakarta Sans` (via `next/font/google`, variable `--font-jakarta` → dipetakan ke `--font-sans`/`--font-heading`).
- **Mono:** `Geist Mono` (angka data/kode).
- Skala: `text-sm` (14) body padat, `text-base` (16) body default, `text-lg`/`text-xl` subjudul, `text-2xl`–`text-4xl` judul halaman. Heading `font-semibold`/`font-bold`, `tracking-tight`.

### Radius

`--radius: 0.75rem` (12px) — kesan ramah dan membulat. Turunan otomatis via `@theme`: `rounded-sm` (~7px), `rounded-md` (~10px), `rounded-lg` (12px), `rounded-xl` (~17px). Kartu `rounded-xl`, tombol/input `rounded-lg`, badge `rounded-full`.

### Spacing

Skala bawaan Tailwind (kelipatan 4px). Pola yang dipakai:

- Padding kartu: `p-4` (mobile) / `p-6` (desktop).
- Jarak antar elemen dalam grup: `gap-2`–`gap-3`; antar section: `gap-8`–`gap-12`.
- Container halaman: pakai `<Container>` (`src/components/shared/container.tsx`, = `mx-auto max-w-6xl px-4 md:px-6`).
- **Mobile-first** — mayoritas pengguna (warga, peternak, petani) memakai ponsel. Target sentuh minimal 44px (`h-11`).

## 5. Aturan Wajib

1. **Tidak ada `any`.** Gunakan tipe eksplisit, `unknown` + narrowing, atau generic. Jangan pakai `// @ts-ignore`; bila benar-benar perlu, `// @ts-expect-error` dengan alasan.
2. **Semua akses data lewat `src/lib/data`.** Komponen, Server Actions, dan route handler tidak boleh memanggil database/API/`fetch` eksternal secara langsung — panggil fungsi dari data layer (mis. `getListingsBySppg()`, `claimBatch()`). Data layer mengembalikan data bertipe domain yang jelas.
3. **Setiap fitur punya komentar JSDoc singkat** — di `index.ts` fitur (tujuan fitur) dan pada setiap fungsi/komponen yang diekspor (satu-dua kalimat, `@param`/`@returns` bila tidak jelas dari tipe).
4. Gunakan design token, bukan nilai warna/radius mentah.
5. Teks UI berbahasa Indonesia; jangan tinggalkan teks placeholder bawaan template (mis. "Create Next App").
