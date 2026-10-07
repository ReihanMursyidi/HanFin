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
  weight: ["400", "500", "600", "700"],
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
  title: {
    default: "HanFin - Autonomous AI Finance Agent",
    template: "%s | HanFin",
  },
  description: "Autonomous AI Finance Agent for personal wealth management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased font-sans", fontVariables)}
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
