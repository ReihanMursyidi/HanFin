"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  X,
  Sparkles,
  CheckCircle2,
  ListOrdered,
  Target,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  LANDING_TUTORIALS,
  type TutorialItem,
} from "@/constants/landing-tutorials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TutorialSection() {
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialItem | null>(
    null,
  );

  // Efek untuk menyembunyikan Navbar & mengunci scroll body saat modal dibuka
  useEffect(() => {
    if (selectedTutorial) {
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    }

    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    };
  }, [selectedTutorial]);

  return (
    <section
      id="edukasi"
      className="scroll-mt-36 sm:scroll-mt-40 py-16 px-4 max-w-6xl mx-auto space-y-10"
    >
      {/* Section Header dengan offset scroll aman */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <BookOpen className="size-4" /> Pusat Edukasi & Panduan
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tutorial Lengkap Fitur Utama HanFin
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
          Pelajari tata cara penggunaan fitur-fitur unggulan HanFin untuk
          memaksimalkan pengelolaan keuangan dan portofolio pasar Anda.
        </p>
      </div>

      {/* Grid Tutorial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {LANDING_TUTORIALS.map((tutorial) => (
          <Card
            key={tutorial.id}
            className="border bg-background/80 backdrop-blur-sm flex flex-col justify-between hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {tutorial.category}
                </span>
                <span>{tutorial.readTime}</span>
              </div>
              <CardTitle className="text-base font-bold leading-snug line-clamp-2">
                {tutorial.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {tutorial.excerpt}
              </p>
              <div className="text-[11px] text-muted-foreground pt-3 border-t flex justify-end items-center">
                <button
                  type="button"
                  onClick={() => setSelectedTutorial(tutorial)}
                  className="font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Baca Selengkapnya <ArrowRight className="size-3" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Dialog Tutorial Detail */}
      {selectedTutorial && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-background border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b flex items-start justify-between gap-4 bg-muted/20">
              <div className="space-y-1">
                <span className="inline-block text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-1">
                  {selectedTutorial.category}
                </span>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                  {selectedTutorial.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTutorial(null)}
                className="rounded-full shrink-0"
              >
                <X className="size-5" />
              </Button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-foreground custom-scrollbar">
              {/* 1. Pengenalan Fitur */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Sparkles className="size-4" />
                  <span>Fitur apakah ini?</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-6">
                  {selectedTutorial.overview}
                </p>
              </div>

              {/* 2. Kegunaan & Tujuan */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Target className="size-4" />
                  <span>Tujuan & Kegunaan Utama</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-6">
                  {selectedTutorial.purpose}
                </p>
              </div>

              {/* 3. Cara Menggunakan (Langkah demi Langkah) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <ListOrdered className="size-4" />
                  <span>Cara Menggunakan (Langkah demi Langkah)</span>
                </div>
                <ol className="space-y-2 pl-6 list-none">
                  {selectedTutorial.steps.map((step, idx) => (
                    <li
                      key={idx}
                      className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2.5"
                    >
                      <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* 4. Bagaimana Memudahkan Pengguna */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <CheckCircle2 className="size-4" />
                  <span>Bagaimana Fitur Ini Memudahkan Anda?</span>
                </div>
                <ul className="space-y-2 pl-6 list-none">
                  {selectedTutorial.benefits.map((benefit, idx) => (
                    <li
                      key={idx}
                      className="text-xs sm:text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Siap mencoba fitur ini? Sign In untuk langsung memulai.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTutorial(null)}
                  className="w-full sm:w-auto"
                >
                  Tutup
                </Button>
                <Button size="sm" className="w-full sm:w-auto" asChild>
                  <Link href="/login">Coba Fitur Sekarang</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
