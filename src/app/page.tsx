"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CoinsIcon, Loader2Icon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser, registerUser } from "@/features/auth/action";
import { authSchema, type AuthInput } from "@/features/auth/schema";
import { ModeToggle } from "@/components/mode-toggle";
import { LANDING_FEATURES } from "./_components/landing-features";
import LandingSidebar from "./_components/landing-sidebar";
import LandingFeatureSection from "./_components/landing-feature-section";
import ScrollToTopButton from "./_components/scroll-to-top-button";

// SUB-KOMPONEN: LANDING HERO
function LandingHero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto py-12">
      <CoinsIcon className="text-primary size-20" />
      <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-primary">
        Welcome to HanFin
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Your personal finance & market investment app powered by AI
      </p>
      <Button className="mt-6 gap-2" size="lg" onClick={onGetStarted}>
        Get Started <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

// SUB-KOMPONEN: DAFTAR FITUR (sidebar + penjelasan tiap fitur)
function LandingFeatures() {
  return (
    <div
      id="fitur"
      className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6 lg:gap-10 py-8"
    >
      <LandingSidebar />
      <div className="space-y-6">
        {LANDING_FEATURES.map((feature) => (
          <LandingFeatureSection key={feature.id} {...feature} />
        ))}
      </div>
    </div>
  );
}

// KOMPONEN UTAMA (HOME / AUTH)
export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const form = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: AuthInput) => {
      if (isRegister) {
        return await registerUser(data);
      }
      return await loginUser(data);
    },
    onSuccess: (response) => {
      if (isRegister) {
        toast.success(
          typeof response === "string" ? response : "Registration successful!",
        );
        setIsRegister(false);
        form.reset();
      } else {
        queryClient.removeQueries();
        toast.success("Welcome!");

        router.push("/home/dashboard");
        router.refresh();
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "An unexpected error has occurred",
      );
    },
  });

  const onSubmit = (data: AuthInput) => {
    mutate(data);
  };

  const toggleMode = () => {
    setIsRegister((prev) => !prev);
    form.reset();
  };

  const handleOpenLogin = () => {
    setShowForm(true);
    setIsRegister(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-background via-muted/50 to-primary/15 dark:from-background dark:via-slate-950 dark:to-primary/20">
      {/* NAVBAR HEADER */}
      <header className="w-full border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              form.reset();
            }}
            className="flex items-center gap-2 text-xl font-bold text-primary hover:opacity-80 transition-opacity focus:outline-none"
          >
            <CoinsIcon className="size-6 text-primary" />
            <span>HanFin</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2 text-xs font-semibold"
              onClick={handleOpenLogin}
            >
              Login
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-4">
        {/* Dekorasi blur dibungkus overflow-hidden sendiri, terpisah dari
            konten, supaya "justify-center" pada konten yang lebih tinggi
            dari viewport tidak ikut membatasi area scroll (dulu ini
            menyebabkan halaman tidak bisa discroll sampai paling atas). */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/15 blur-3xl motion-safe:animate-blob" />
          <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl motion-safe:animate-blob [animation-delay:-6s]" />
        </div>

        {!showForm ? (
          <div className="w-full flex flex-col items-center">
            <LandingHero onGetStarted={handleOpenLogin} />
            <LandingFeatures />
            <ScrollToTopButton />
          </div>
        ) : (
          <Card className="w-full max-w-md shadow-sm border-primary/20 animate-in slide-in-from-bottom-4 fade-in duration-300 relative z-10">
            <CardHeader className="space-y-1.5 text-center">
              <div className="flex justify-center mb-2">
                <CoinsIcon className="text-primary size-12" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {isRegister ? "Create an Account" : "Login to HanFin"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {isRegister && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="johndoe"
                      autoComplete="username"
                      disabled={isPending}
                      {...form.register("username")}
                    />
                    {form.formState.errors.username && (
                      <p className="text-xs font-medium text-destructive">
                        {form.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    autoComplete="email"
                    disabled={isPending}
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs font-medium text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    disabled={isPending}
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs font-medium text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full mt-2"
                  type="submit"
                  disabled={isPending}
                >
                  {isPending && (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  )}
                  {isPending
                    ? isRegister
                      ? "Creating account..."
                      : "Signing in..."
                    : isRegister
                      ? "Sign Up"
                      : "Login"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col items-center gap-2 pt-4 border-t border-border/40">
              <div className="text-sm text-muted-foreground">
                {isRegister
                  ? "Already have an account? "
                  : "Don't have an account? "}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium focus:outline-none"
                  onClick={toggleMode}
                  disabled={isPending}
                >
                  {isRegister ? "Login here" : "Sign up here"}
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowForm(false);
                  form.reset();
                }}
                disabled={isPending}
              >
                Back to Home
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
