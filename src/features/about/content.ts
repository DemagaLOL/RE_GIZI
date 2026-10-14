/**
 * Isi halaman "Tentang". Edit teks di file ini saja — tampilan ada di
 * `components/about-page.tsx`. Hapus satu objek untuk menghilangkan bagian itu.
 */

/** Satu paragraf atau poin singkat dengan judul. */
type ContentItem = { title: string; description: string }

/** Anggota tim. `photo` opsional: path di folder `public/`, mis. "/tim/nama.jpg". */
type TeamMember = { name: string; role: string; photo?: string }

/** Struktur lengkap isi halaman Tentang. */
type AboutContent = {
  hero: { title: string; subtitle: string }
  /** Latar belakang masalah. Tiap string menjadi satu paragraf. */
  problem: { title: string; paragraphs: string[] }
  /** Misi dan tujuan. */
  mission: { title: string; paragraphs: string[] }
  /** Langkah kerja platform. */
  steps: { title: string; items: ContentItem[] }
  /** Angka dampak, mis. { title: "1.200 kg", description: "Sisa makanan terselamatkan" }. */
  impact: { title: string; items: ContentItem[] }
  team: { title: string; members: TeamMember[] }
}

const ABOUT_CONTENT: AboutContent = {
  hero: {
    title: "Tentang RE:GIZI",
    subtitle: "ISI: satu kalimat yang menjelaskan RE:GIZI.",
  },
  problem: {
    title: "Masalah yang Kami Hadapi",
    paragraphs: [
      "ISI: paragraf tentang masalah sisa makanan di dapur SPPG.",
      "ISI: paragraf tambahan (opsional), hapus bila tidak perlu.",
    ],
  },
  mission: {
    title: "Misi Kami",
    paragraphs: ["ISI: paragraf tentang misi dan tujuan RE:GIZI."],
  },
  steps: {
    title: "Cara Kerja",
    items: [
      { title: "ISI: Langkah 1", description: "ISI: penjelasan singkat." },
      { title: "ISI: Langkah 2", description: "ISI: penjelasan singkat." },
      { title: "ISI: Langkah 3", description: "ISI: penjelasan singkat." },
    ],
  },
  impact: {
    title: "Dampak",
    items: [
      { title: "ISI: angka", description: "ISI: keterangan angka." },
      { title: "ISI: angka", description: "ISI: keterangan angka." },
      { title: "ISI: angka", description: "ISI: keterangan angka." },
    ],
  },
  team: {
    title: "Tim Kami",
    members: [
      { name: "ISI: Nama", role: "ISI: Peran" },
      { name: "ISI: Nama", role: "ISI: Peran" },
    ],
  },
}

export { ABOUT_CONTENT, type AboutContent, type ContentItem, type TeamMember }
