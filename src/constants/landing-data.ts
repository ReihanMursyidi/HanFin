export interface FAQItem {
  question: string;
  answer: string;
}

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
      mainEntity: LANDING_FAQS.map((faq: FAQItem) => ({
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
