"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulasi autentikasi
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Simpan status autentikasi ke cookie & localStorage
      document.cookie = "is_logged_in=true; path=/; max-age=86400";
      localStorage.setItem("is_logged_in", "true");

      // Gunakan router Next.js untuk pengalihan halaman internal
      router.push("/home/dashboard");
    } catch (error) {
      console.error("Login Error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Beranda
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="size-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto text-xl shadow-md">
            H
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Selamat Datang di HanFin
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Masuk untuk mengelola keuangan dan portofolio Anda
          </p>
        </div>

        <Card className="border-muted shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Masukkan email dan kata sandi akun Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">
                    Kata Sandi
                  </Label>
                  <Link
                    href="#"
                    className="text-xs text-primary hover:underline"
                  >
                    Lupa sandi?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Memproses..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="size-4 text-emerald-500" />
          <span>Keamanan Data Terenkripsi</span>
        </div>
      </div>
    </div>
  );
}
