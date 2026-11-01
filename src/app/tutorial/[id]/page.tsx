import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  Target,
} from "lucide-react";
import { LANDING_TUTORIALS } from "@/constants/landing-tutorials";
import { LandingHeader } from "@/app/_components/landing-header";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCurrentUser } from "@/features/auth/action";

interface TutorialPageProps {
  params: Promise<{ id: string }>;
}

function getTutorial(id: string) {
  return LANDING_TUTORIALS.find((tutorial) => tutorial.id === id);
}

export function generateStaticParams() {
  return LANDING_TUTORIALS.map(({ id }) => ({ id }));
}

export async function generateMetadata({
  params,
}: TutorialPageProps): Promise<Metadata> {
  const { id } = await params;
  const tutorial = getTutorial(id);

  return {
    title: tutorial?.title ?? "Tutorial",
    description: tutorial?.excerpt,
  };
}

export default async function TutorialArticlePage({
  params,
}: TutorialPageProps) {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const tutorial = getTutorial(id);

  if (!tutorial) {
    notFound();
  }

  return (
    <ScrollArea className="h-svh w-full bg-background [&>div]:block! [&_[data-radix-scroll-area-viewport]>div]:block! [&_[data-radix-scroll-area-viewport]>div]:min-w-0!">
      <div className="min-h-full bg-background text-foreground">
        <LandingHeader isLoggedIn={user !== null} />
        <main className="px-4 pt-24 pb-16 sm:pt-28">
          <article className="mx-auto max-w-3xl">
            <Link
              href="/#edukasi"
              className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4" />
              Kembali ke daftar tutorial
            </Link>

            <header className="mb-10 space-y-5 border-b pb-8">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                  {tutorial.category}
                </span>
                <span className="text-muted-foreground">
                  {tutorial.readTime}
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                {tutorial.title}
              </h1>
              <p className="text-base leading-relaxed sm:text-lg">
                {tutorial.excerpt}
              </p>
            </header>

            <div className="space-y-10">
              <section className="space-y-3">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Sparkles className="size-5" />
                  <h2 className="text-lg">Mengenal Fitur</h2>
                </div>
                <p className="pl-7 leading-relaxed">{tutorial.overview}</p>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Target className="size-5" />
                  <h2 className="text-lg">Tujuan dan Kegunaan</h2>
                </div>
                <p className="pl-7 leading-relaxed">{tutorial.purpose}</p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <ListOrdered className="size-5" />
                  <h2 className="text-lg">Cara Menggunakan</h2>
                </div>
                <ol className="space-y-4">
                  {tutorial.steps.map((step, index) => (
                    <li
                      key={step}
                      className="flex items-start gap-3 leading-relaxed"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <CheckCircle2 className="size-5" />
                  <h2 className="text-lg">Manfaat untuk Anda</h2>
                </div>
                <ul className="space-y-3">
                  {tutorial.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-3 leading-relaxed"
                    >
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border bg-muted/30 p-6 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h2 className="font-semibold">Siap mencoba HanFin?</h2>
                <p className="text-sm text-muted-foreground">
                  Mulai kelola keuangan dan aset Anda dengan lebih teratur.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link href="/login">
                  Mulai Sekarang <ArrowRight className="size-4" />
                </Link>
              </Button>
            </section>

            <div className="mt-10 border-t pt-6">
              <Link
                href="/#edukasi"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <BookOpen className="size-4" />
                Baca tutorial lainnya
              </Link>
            </div>
          </article>
        </main>
      </div>
    </ScrollArea>
  );
}
