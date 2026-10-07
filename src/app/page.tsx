"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CoinsIcon, Loader2Icon } from "lucide-react";
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

// SUB-KOMPONEN: LANDING HERO
function LandingHero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
      <CoinsIcon className="text-primary size-20" />
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-primary">
        Welcome to HanFin
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Your personal finance app powered by AI
      </p>
      <Button className="mt-6" size="lg" onClick={onGetStarted}>
        Get Started
      </Button>
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
    onSuccess: (message) => {
      toast.success(message);
      if (!isRegister) {
        // Hapus cache lama saat login berhasil lalu arahkan ke dashboard
        queryClient.removeQueries();
        router.push("/home/dashboard");
      } else {
        setIsRegister(false);
        form.reset();
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

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-linear-to-br from-background via-muted/50 to-primary/15 dark:from-background dark:via-slate-950 dark:to-primary/20">
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      {!showForm ? (
        <LandingHero onGetStarted={() => setShowForm(true)} />
      ) : (
        <Card className="w-full max-w-md shadow-sm border-primary/20 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <CardHeader className="space-y-1.5 text-center">
            <div className="flex justify-center mb-2">
              <CoinsIcon className="text-primary size-12" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isRegister ? "Create an Account" : "Login to HanFin"}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
  );
}
