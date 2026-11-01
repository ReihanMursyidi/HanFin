"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { LANDING_TUTORIALS } from "@/constants/landing-tutorials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TutorialSection() {
  return (
    <section
      id="edukasi"
      className="scroll-mt-24 sm:scroll-mt-28 py-16 px-4 max-w-6xl mx-auto space-y-10"
    >
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
                <Link
                  href={`/tutorial/${tutorial.id}`}
                  className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Baca Selengkapnya <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
