/**
 * Isi halaman "Kontak". Edit teks di file ini saja — tampilan ada di
 * `components/contact-page.tsx`. Hapus satu objek dari `channels` untuk
 * menghilangkan saluran kontak itu.
 */

/** Jenis saluran; menentukan ikon. */
type ContactChannelType = "email" | "phone" | "whatsapp" | "instagram" | "address"

/**
 * Satu saluran kontak.
 * `value` = teks yang tampil (teks biasa, tidak bisa diklik).
 */
type ContactChannel = {
  type: ContactChannelType
  label: string
  value: string
}

/** Struktur lengkap isi halaman Kontak. */
type ContactContent = {
  hero: { title: string; subtitle: string }
  channels: ContactChannel[]
  /** Jam layanan; hapus objeknya bila tidak perlu. */
  hours?: { title: string; description: string }
}

const CONTACT_CONTENT: ContactContent = {
  hero: {
    title: "Hubungi Kami",
    subtitle: "Jangan sungkan memberi kami masukan anda.",
  },
  channels: [
    {
      type: "email",
      label: "Email",
      value: "danawendra.girinandana@email.com",
    },
    {
      type: "whatsapp",
      label: "WhatsApp",
      value: "+62 897-9853-025",
    },
    {
      type: "instagram",
      label: "Instagram",
      value: "Dnawen.gir",
    },
    {
      type: "address",
      label: "Alamat",
      value: "Jl. Mayjen Sungkono Km. 5, Blater, Kecamatan Kalimanah, Kabupaten Purbalingga, Jawa Tengah",
    },
  ],
  hours: {
    title: "Jam Layanan",
    description: "Senin - Jumat, 08.00 - 15.00 WIB.",
  },
}

export {
  CONTACT_CONTENT,
  type ContactChannel,
  type ContactChannelType,
  type ContactContent,
}
