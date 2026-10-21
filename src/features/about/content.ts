import type { SurplusCategory } from "@/lib/data/types"

/**
 * Isi halaman "Tentang". Edit teks di file ini saja — tampilan ada di
 * `components/about-page.tsx`.
 */

/** Satu poin singkat dengan judul. */
type ContentItem = { title: string; description: string }

/** Satu kategori sisa pangan (A–D) beserta penerimanya. */
type Pathway = {
  category: SurplusCategory
  title: string
  /** Jenis sisa yang masuk kategori ini. */
  forWhat: string
  recipients: string
}

/** Struktur lengkap isi halaman Tentang. */
type AboutContent = {
  hero: { title: string; subtitle: string }
  /** Latar belakang masalah. Tiap string menjadi satu paragraf. */
  problem: { title: string; paragraphs: string[] }
  /** Misi, ditampilkan sebagai daftar bernomor. */
  mission: { title: string; items: ContentItem[] }
  /** Langkah kerja platform. */
  steps: { title: string; subtitle: string; items: ContentItem[] }
  pathways: { title: string; items: Pathway[] }
}

const ABOUT_CONTENT: AboutContent = {
  hero: {
    title: "Tentang RE:GIZI",
    subtitle:
      "RE:GIZI adalah platform web yang mengubah sisa pangan dapur MBG dari beban pembuangan menjadi pasokan bernilai bagi warga, peternak, petani, dan UMKM terdekat dalam hitungan jam setelah sisa pangan tersedia.",
  },
  problem: {
    title: "Masalah yang Kami Hadapi",
    paragraphs: [
      "Program Makan Bergizi Gratis (MBG) menjangkau lebih dari 62 juta penerima. Kajian Bappenas memperkirakan sisa makanannya mencapai 1,1–1,4 juta ton per tahun.",
      "Peraturan BGN Nomor 1 Tahun 2026 mewajibkan SPPG mendata dan mengelola sisa pangan, tetapi belum ada alat yang menghubungkan SPPG dengan pihak pemanfaat dalam jendela waktu yang sempit. Makanan matang hanya aman dikonsumsi sekitar empat jam, jadi keputusan harus diambil cepat.",
    ],
  },
  mission: {
    title: "Misi Kami",
    items: [
      {
        title: "Memudahkan pencatatan.",
        description:
          "SPPG mencatat sisa pangan dengan cepat untuk mendukung kewajiban pendataan Peraturan BGN Nomor 1 Tahun 2026.",
      },
      {
        title: "Menjaga keamanan pangan.",
        description:
          "Kategori turun otomatis ketika batas aman terlewati, dan klaim yang belum diambil dibatalkan.",
      },
      {
        title: "Menghubungkan dengan penerima yang tepat.",
        description:
          "Sisa pangan hanya tampil ke penerima yang sesuai kategorinya, diurutkan menurut jarak atau batas aman.",
      },
      {
        title: "Menelusuri setiap serah terima.",
        description:
          "Setiap pengambilan, perubahan kategori, dan pengangkutan TPS tercatat sebagai data dampak.",
      },
    ],
  },
  steps: {
    title: "Cara Kerja",
    subtitle: "Empat langkah, satu alur",
    items: [
      {
        title: "Catat",
        description:
          "Petugas SPPG mencatat menu, jumlah, waktu matang, catatan, dan memilih kategori A–D sesuai kondisi makanan. Batas aman dihitung otomatis.",
      },
      {
        title: "Jaga",
        description:
          "Kategori hanya bisa turun. Lewat batas aman kumulatif (A 4 jam, B 24 jam, C 72 jam sejak dimasak) kategori turun otomatis; SPPG juga bisa menurunkannya lebih awal. Setiap perubahan tercatat.",
      },
      {
        title: "Klaim",
        description:
          "Warga, UMKM, peternak, petani, dan komposter hanya melihat kategori yang sesuai, lalu mengklaim dan mendapat kode ambil 6 digit. Penerima menjemput sendiri ke SPPG.",
      },
      {
        title: "Serahkan",
        description:
          "Petugas SPPG memasukkan kode ambil untuk mengonfirmasi serah terima dan dampak di dasbor bertambah. Sisa kategori D masuk antrean TPS untuk diangkut.",
      },
    ],
  },
  pathways: {
    title: "Empat Kategori Sisa Pangan",
    items: [
      {
        category: "A",
        title: "Layak konsumsi",
        forWhat: "Makanan yang masih aman dimakan, maksimal 4 jam sejak dimasak",
        recipients: "Warga dan UMKM",
      },
      {
        category: "B",
        title: "Pakan ternak",
        forWhat:
          "Sisa yang tidak lagi layak dimakan manusia tetapi aman untuk pakan, hingga 24 jam sejak dimasak",
        recipients: "Peternak",
      },
      {
        category: "C",
        title: "Kompos",
        forWhat: "Sisa organik untuk diolah menjadi pupuk, hingga 72 jam sejak dimasak",
        recipients: "Petani dan komposter",
      },
      {
        category: "D",
        title: "Tidak layak (dibuang)",
        forWhat: "Sisa yang tidak bisa dimanfaatkan lagi, termasuk yang melewati batas kategori C",
        recipients: "Tidak dapat diklaim; diangkut petugas TPS",
      },
    ],
  },
}

export { ABOUT_CONTENT, type AboutContent, type ContentItem, type Pathway }
