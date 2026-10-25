export interface TutorialItem {
  id: string;
  category: string;
  readTime: string;
  title: string;
  excerpt: string;
  overview: string;
  purpose: string;
  steps: string[];
  benefits: string[];
}

export const LANDING_TUTORIALS: TutorialItem[] = [
  {
    id: "wizard-input",
    category: "Pencatatan Kas & Aset",
    readTime: "2 Menit Baca",
    title: "Wizard Input Transaksi",
    excerpt:
      "Pelajari cara menginput data transaksi keuangan kas dan aset secara cepat tanpa harus mengisi form manual.",
    overview:
      "Wizard Input adalah fitur untuk input data transaksi kas harian maupun aset saham dan kripto tanpa harus mengisi form secara manual. Fitur ini berbasis AI yang dapat diakses langsung melalui halaman Dashboard, Transaction, dan Financial Market.",
    purpose:
      "Memudahkan pengguna mencatat transaksi secara instan tanpa kerumitan mengisi berbagai kolom formulir manual serta meminimalisir kesalahan input angka.",
    steps: [
      "Masuk ke halaman Dashboard, Transaction, atau Financial Market di aplikasi HanFin.",
      "Temukan komponen 'Wizard Input' yang tersedia di bagian atas atau utama halaman.",
      "Ketik perintah transaksi (contoh: 'Beli 10 lot BBCA harga 8000' atau 'Makan siang 25 ribu') atau tekan ikon mikrofon untuk instruksi suara.",
      "Sistem AI akan mengekstrak data nominal, kategori, tanggal, dan aset secara otomatis tanpa pengisian form manual.",
      "Konfirmasi hasil pencatatan dan data transaksi akan langsung diperbarui di portofolio/catatan kas Anda.",
    ],
    benefits: [
      "Menginput transaksi kas dan pasar finansial secara instan tanpa perlu mengisi form secara manual.",
      "Dapat diakses fleksibel dari halaman Dashboard, Transaction, maupun Financial Market.",
      "Mendukung input instruksi suara dan bahasa sehari-hari yang intuitif.",
    ],
  },
  {
    id: "ai-financial-advisor",
    category: "Konsultasi Keuangan",
    readTime: "3 Menit Baca",
    title: "Hanbot - AI Financial Advisor",
    excerpt:
      "Manfaatkan Hanbot dengan Mode Umum untuk edukasi finansial & Mode Personal untuk analisis otomatis data transaksi kas pribadi Anda.",
    overview:
      "Hanbot adalah asisten AI Financial Advisor terintegrasi pada HanFin. Dilengkapi dengan dua mode pintar: 'Mode Umum' untuk menjawab pertanyaan umum seputar literasi dan teori keuangan, serta 'Mode Personal' yang secara aman membaca profil dan riwayat pencatatan transaksi kas Anda untuk analisis yang presisi.",
    purpose:
      "Membantu Anda menganalisis kesehatan anggaran harian, mengevaluasi alokasi dana bulanan, dan melacak riwayat pengeluaran kas lama hanya dengan percakapan bahasa alami.",
    steps: [
      "Klik ikon melayang Chatbot Drawer di pojok kanan bawah halaman dashboard atau navigasi utama.",
      "Pilih 'Mode Percakapan' yang diinginkan: Mode Umum (edukasi umum) atau Mode Personal (berbasis data pencatatan transaksi kas Anda).",
      "Gunakan tombol pintas (Quick Prompt Shortcuts) atau ketik pertanyaan langsung di kolom percakapan (contoh: 'Berapa total pengeluaran kopi saya bulan ini?').",
      "Hanbot akan memproses konteks dan memberikan rekomendasi tindakan, grafik ringkasan, atau rincian pencarian secara otomatis.",
    ],
    benefits: [
      "Memiliki dua mode fleksibel (Mode Umum & Mode Personal) sesuai kebutuhan privasi dan kedalaman analisis Anda.",
      "Memungkinkan pencarian riwayat transaksi lama berbasis bahasa alami tanpa perlu memfilter tabel secara manual.",
      "Memberikan rekomendasi penghematan dan alokasi anggaran yang relevan sesuai kondisi finansial nyata Anda.",
    ],
  },
  {
    id: "ai-market-analyst",
    category: "Analisis Pasar & Trading",
    readTime: "3 Menit Baca",
    title: "HanFin Market Pulse",
    excerpt:
      "Dapatkan analisis teknikal otomatis untuk saham & kripto berbasis 4 strategi dan rasio Risk-to-Reward 1:3 yang terdisiplin.",
    overview:
      "HanFin Market Pulse adalah fitur analitik cerdas yang mengevaluasi indikator teknikal secara real-time pada aset saham dan kripto. Fitur ini menyajikan rekomendasi objektif serta estimasi target harga yang disiplin.",
    purpose:
      "Membantu investor dan trader mengambil keputusan rasional berbasis data teknikal, memisahkan sinyal beli/jual dari emosi pasar (FOMO), serta memproteksi modal melalui rasio ketat Risk-to-Reward 1 : 3.",
    steps: [
      "Masuk ke halaman Financial Market (pilih tab Saham atau Kripto).",
      "Pada section HanFin Market Pulse, Pilih simbol aset yang ingin dianalisis.",
      "Pilih strategi trading Anda: Scalping, Day Trading, Swing Trade, atau Investing.",
      "Pilih indikator teknikal sesuai preferensi Anda dari kategori Trend, Momentum, dan Volume.",
      "Klik 'Jalankan Analisis AI' untuk memulai analisa, lalu tunggu hasilnya.",
    ],
    benefits: [
      "Mengotomatisasi analisis teknikal multi-indikator tanpa rumus manual.",
      "Fleksibel mendukung 4 pilihan gaya trading (Scalping, Day Trading, Swing Trade, dan Investing).",
      "Menjaga disiplin modal dengan proteksi rasio Risk-to-Reward minimal 1 : 3 serta penyaringan otomatis sinyal 'Wait & See'.",
    ],
  },
];
