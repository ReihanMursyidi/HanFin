import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  LineChart,
  Bot,
  CheckCircle2,
  Lock,
  Mail,
  HelpCircle,
  MapPin,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { AnimatedBlobBackground } from "@/components/landing/animated-blob-background";
import { ScrollToTop } from "@/components/landing/scroll-to-top";
import { TutorialSection } from "@/app/_components/tutorial-section";

import { getCurrentUser } from "@/features/auth/action";
import {
  FAQItem,
  JSON_LD_SCHEMA,
  LANDING_FAQS,
} from "@/constants/landing-data";

export default async function LandingPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/home/dashboard");
  }

  const isLoggedIn = !!user;

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* Background Animated Blobs */}
      <AnimatedBlobBackground />

      {/* Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_SCHEMA) }}
      />

      {/* Header Navigation (Sembunyi otomatis ketika modal-open aktif) */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300 in-[.modal-open]:hidden">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo Teks "HanFin" */}
          <Link
            href="/"
            className="flex items-center font-bold text-xl sm:text-2xl tracking-tight hover:opacity-90 transition-opacity select-none"
          >
            <span className="text-black dark:text-white">Han</span>
            <span className="text-primary">Fin</span>
          </Link>

          {/* Action Navbar */}
          <div className="flex items-center gap-2">
            <ModeToggle />
            {isLoggedIn ? (
              <Button size="lg" asChild className="gap-1.5 font-medium">
                <Link href="/home/dashboard">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 pt-16">
        {/* Hero Section */}
        <section className="py-16 sm:py-20 px-4 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-background/60 backdrop-blur-sm text-xs sm:text-sm font-medium">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Manajemen Keuangan Transparan & Terukur</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-balance">
            Stop Lacak Keuangan & Investasi Pakai Spreadsheet Manual
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
            HanFin menggabungkan pencatatan kas harian, pemantauan portofolio
            saham & kripto, serta kalkulasi rasio risiko trading secara disiplin
            dalam satu platform terpadu.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" className="w-full sm:w-auto px-4" asChild>
              <Link href="/login">
                Mulai Kelola Keuangan <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto bg-background/50 backdrop-blur-sm"
              asChild
            >
              <Link href="#edukasi">Lihat Tutorial Fitur</Link>
            </Button>
          </div>

          <div className="pt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground border-t max-w-md mx-auto">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" /> Tanpa Akses
              Bank Direct
            </span>
            <span className="flex items-center gap-1">
              <Lock className="size-3.5 text-emerald-500" /> Enkripsi Data
              Pribadi
            </span>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="fitur"
          className="scroll-mt-36 sm:scroll-mt-40 py-16 bg-muted/30 border-y px-4 backdrop-blur-xs"
        >
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Solusi Konkret untuk Masalah Finansial Anda
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Dirancang untuk membantu Anda mengambil keputusan keuangan
                berbasis data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-muted bg-background/80 backdrop-blur-sm">
                <CardContent className="pt-6 space-y-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Wallet className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    Pencatatan Kas Terpusat
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Catat arus kas masuk dan keluar dengan kategorisasi
                    otomatis. Pantau sisa anggaran bulanan tanpa perlu rumus
                    kompleks.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-muted bg-background/80 backdrop-blur-sm">
                <CardContent className="pt-6 space-y-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <LineChart className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    Pantau Portofolio Multi-Aset
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Gabungkan pantauan pasar Saham dan Kripto secara real-time
                    lengkap dengan kalkulasi Floating PnL dan konversi nilai
                    IDR/USD.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-muted bg-background/80 backdrop-blur-sm">
                <CardContent className="pt-6 space-y-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Bot className="size-5" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    Analisis Risiko Terdisiplin
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Dapatkan proyeksi teknikal berbasis kriteria ketat
                    Risk-to-Reward 1:3 untuk mencegah keputusan beli impulsif.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section Tutorial */}
        <TutorialSection />

        {/* Section FAQ */}
        <section className="py-16 bg-muted/20 border-t px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider">
                <HelpCircle className="size-4" /> Pertanyaan Umum
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="space-y-4">
              {LANDING_FAQS.map((faq: FAQItem, index: number) => (
                <div
                  key={index}
                  className="border rounded-xl p-5 bg-background/80 backdrop-blur-sm space-y-2"
                >
                  <h3 className="font-bold text-sm sm:text-base">
                    {faq.question}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Transparansi Kontak */}
        <section
          id="kontak"
          className="scroll-mt-36 sm:scroll-mt-40 py-16 px-4 max-w-4xl mx-auto"
        >
          <div className="border rounded-2xl p-6 sm:p-8 bg-background/80 backdrop-blur-sm space-y-6">
            <div className="space-y-2">
              <h3 className="font-bold text-lg sm:text-xl">
                Tentang Tim Pengembang HanFin
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                HanFin dikembangkan secara transparan untuk menyediakan platform
                pencatatan keuangan pribadi dan pemantauan pasar yang
                independen, aman, dan tanpa biaya tersembunyi.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <Mail className="size-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    Dukungan & Pertanyaan
                  </p>
                  <a
                    href="mailto:support@hanfin.app"
                    className="text-muted-foreground hover:text-primary"
                  >
                    support@hanfin.app
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="size-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    Lokasi Operasional
                  </p>
                  <p className="text-muted-foreground">
                    Depok, Jawa Barat, Indonesia
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Siap Merapikan Keuangan Anda Hari Ini?
            </h2>
            <p className="text-sm sm:text-base opacity-90">
              Mulai kelola kas harian serta portofolio Anda secara terstruktur.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t py-10 px-4 bg-background/80 backdrop-blur-sm text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center font-bold text-sm sm:text-base tracking-tight hover:opacity-90 transition-opacity select-none"
            >
              <span className="text-black dark:text-white">Han</span>
              <span className="text-primary">Fin</span>
            </Link>
            <span>— Finance & Market Intelligence</span>
          </div>
          <div className="flex items-center gap-6 text-muted-foreground">
            <a
              href="mailto:support@hanfin.app"
              className="hover:text-foreground"
            >
              Kontak
            </a>
            <Link href="#edukasi" className="hover:text-foreground">
              Tutorial
            </Link>
            <Link href="#fitur" className="hover:text-foreground">
              Fitur
            </Link>
          </div>
          <p>
            © {new Date().getFullYear()} HanFin. Hak Cipta Dilindungi
            Undang-Undang.
          </p>
        </div>
      </footer>

      {/* Tombol Auto Scroll Up */}
      <ScrollToTop />
    </div>
  );
}
