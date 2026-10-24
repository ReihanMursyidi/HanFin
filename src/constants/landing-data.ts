export interface Article {
  slug: string;
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
  date: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export const LANDING_ARTICLES: Article[] = [
  {
    slug: "mengapa-risk-to-reward-1-3-kunci-survive-di-pasar",
    title:
      "Mengapa Rasio Risk-to-Reward 1:3 Menjadi Kunci Konsistensi Trading?",
    category: "Manajemen Risiko",
    readTime: "4 menit baca",
    excerpt:
      "Banyak trader gagal bukan karena salah menganalisis, melainkan karena rasio kerugian yang tidak terukur. Pelajari kalkulasi matematika di balik R:R 1:3.",
    date: "12 Februari 2026",
  },
  {
    slug: "panduan-menggabungkan-portofolio-saham-dan-kripto",
    title: "Cara Mengonsolidasikan Portofolio Multi-Aset Tanpa Pusing",
    category: "Portofolio",
    readTime: "5 menit baca",
    excerpt:
      "Lacak pergerakan aset Saham dan Kripto secara bersamaan. Hindari kesalahan umum saat menghitung Floating PnL terkonversi IDR/USD.",
    date: "08 Februari 2026",
  },
  {
    slug: "stop-pencatatan-kas-manual-di-spreadsheet",
    title:
      "3 Alasan Mengapa Pencatatan Kas Manual Sering Terhenti di Tengah Jalan",
    category: "Manajemen Kas",
    readTime: "3 menit baca",
    excerpt:
      "Evaluasi kebiasaan financial tracking Anda. Temukan cara menyederhanakan alur pencatatan kas agar tetap konsisten bulanan.",
    date: "01 Februari 2026",
  },
];

export const LANDING_FAQS: FAQItem[] = [
  {
    question:
      "Apakah HanFin memerlukan akses langsung ke rekening bank atau akun exchange saya?",
    answer:
      "Tidak. HanFin tidak pernah meminta kredensial login bank atau API key penarikan dana. Seluruh pencatatan kas dan portofolio diinput secara aman tanpa akses transaksi langsung ke rekening Anda.",
  },
  {
    question: "Bagaimana cara kerja fitur kalkulasi Manajemen Risiko 1:3?",
    answer:
      "Algoritma HanFin menghitung jarak antara Entry Price dan Stop Loss (Risk), lalu memastikan target Take Profit bernilai minimal 3 kali lipat dari jarak risiko tersebut sebelum mengeluarkan rekomendasi.",
  },
  {
    question: "Apakah HanFin gratis untuk digunakan?",
    answer:
      "Ya, HanFin menyediakan akses gratis untuk fitur pencatatan kas harian, pemantauan pasar, dan analisis portofolio dasar.",
  },
];

export const JSON_LD_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "HanFin",
      operatingSystem: "Web Browser",
      applicationCategory: "FinanceApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IDR",
      },
      description:
        "Aplikasi manajemen keuangan pribadi dan pemantauan portofolio saham/kripto terintegrasi.",
    },
    {
      "@type": "Organization",
      name: "HanFin Indonesia",
      url: "https://hanfin.app",
      logo: "https://hanfin.app/icon.png",
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@hanfin.app",
        contactType: "customer support",
        availableLanguage: ["Indonesian", "English"],
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: LANDING_FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};
