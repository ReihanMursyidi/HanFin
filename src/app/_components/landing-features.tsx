import {
  Activity,
  Bot,
  LayoutDashboard,
  Mic,
  PieChart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface LandingFeature {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  highlights: string[];
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    id: "dashboard",
    title: "Dashboard Keuangan Terpusat",
    icon: LayoutDashboard,
    description:
      "Pantau kondisi keuangan Anda dalam satu tampilan: saldo terkini, arus kas masuk dan keluar, serta tren pengeluaran dari waktu ke waktu tanpa perlu membuka spreadsheet manual.",
    highlights: [
      "Ringkasan saldo & arus kas real-time",
      "Grafik tren pemasukan vs pengeluaran",
      "Akses cepat ke asisten AI Hanbot",
    ],
  },
  {
    id: "wizard-transaksi",
    title: "Catat Transaksi dengan AI Wizard Input",
    icon: Mic,
    description:
      "Fitur untuk menginput data transaksi tanpa harus mengisi form secara manual. Tersedia di halaman Dashboard, Transaction, dan Financial Market untuk kemudahan pencatatan berbasis perintah teks maupun suara.",
    highlights: [
      "Dapat diakses di Dashboard, Transaction, & Financial Market",
      "Input data otomatis tanpa isi form manual",
      "Mendukung teks & perintah suara bahasa sehari-hari",
    ],
  },
  {
    id: "hanbot",
    title: "Hanbot, Asisten Keuangan AI",
    icon: Bot,
    description:
      "Tanyakan apa saja seputar keuangan pribadi ke Hanbot. Mode umum menjawab pertanyaan edukasi finansial, sementara mode personal memahami profil dan riwayat transaksi Anda untuk memberi jawaban yang relevan dengan kondisi Anda sendiri.",
    highlights: [
      "Mode umum untuk edukasi & tanya-jawab keuangan",
      "Mode personal berbasis profil & riwayat transaksi",
      "Cari transaksi lama cukup dengan bahasa natural",
    ],
  },
  {
    id: "visualisasi",
    title: "Analisis & Visualisasi Otomatis",
    icon: PieChart,
    description:
      'Minta ringkasan seperti "total pengeluaran per kategori 6 bulan terakhir", dan AI akan menghitungnya langsung dari data transaksi Anda lalu menyajikannya sebagai chart, infografis, bahkan video ringkasan singkat.',
    highlights: [
      "Chart per kategori, tren bulanan, dan harian",
      "Infografis & gambar insight otomatis",
      "Video ringkasan keuangan dari AI",
    ],
  },
  {
    id: "pasar-saham-kripto",
    title: "Pasar Saham & Kripto Real-Time",
    icon: TrendingUp,
    description:
      "Pantau pergerakan IHSG, saham-saham Indonesia, dan aset kripto populer secara real-time. Kelola portofolio dengan perhitungan harga rata-rata otomatis, dan catat transaksi beli/jual lewat Wizard Input.",
    highlights: [
      "Data saham IHSG & kripto real-time",
      "Portofolio dengan harga rata-rata otomatis",
      "Input cepat beli/jual tanpa form manual",
    ],
  },
  {
    id: "ai-predictor",
    title: "AI Predictor – Analisis Teknikal",
    icon: Activity,
    description:
      "Dapatkan analisis berbasis indikator teknikal seperti SMA, EMA, ADX, RSI, MACD, Stochastic, OBV, dan VWAP, disesuaikan dengan strategi trading Anda – mulai dari scalping harian hingga investasi jangka panjang.",
    highlights: [
      "Indikator tren, momentum, dan volume",
      "Rekomendasi Beli / Jual / Tahan dari AI",
      "Level support & resistance otomatis",
    ],
  },
];
