import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import QueryProvider from "@/providers/query-client";
import "./globals.css";

// FONT CONFIGURATIONS
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoSansHeading = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const fontVariables = cn(
  outfit.variable,
  notoSansHeading.variable,
  notoSans.variable,
  geistSans.variable,
  geistMono.variable,
);

export const metadata: Metadata = {
  metadataBase: new URL("https://hanfin.app"),
  title: {
    default: "HanFin - Aplikasi Manajemen Keuangan & Portofolio",
    template: "%s | HanFin",
  },
  description:
    "Solusi terpusat pencatatan kas harian, pemantauan portofolio saham & kripto, serta kalkulasi rasio risiko trading 1:3 secara terdisiplin.",
  keywords: [
    "Manajemen Keuangan",
    "Pencatat Transaksi Kas",
    "Portofolio Saham dan Kripto",
    "Crypto Tracker",
    "Manajemen Risiko Trading",
  ],
  authors: [{ name: "Reihan Mursyidi" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "HanFin - Kelola Keuangan & Portofolio Multi-Aset",
    description:
      "Stop lacak keuangan manual. Gabungkan kas harian dan analisis risiko portofolio investasi dalam satu platform terpercaya.",
    url: "https://hanfin.app",
    siteName: "HanFin",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HanFin - Personal Finance & Market Portfolio",
    description:
      "Aplikasi manajemen kas harian dan pantauan portofolio saham/kripto terintegrasi.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn(
        "h-full scroll-smooth antialiased font-sans",
        fontVariables,
      )}
    >
      <body
        className="flex flex-col min-h-full custom-scrollbar bg-background text-foreground"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
