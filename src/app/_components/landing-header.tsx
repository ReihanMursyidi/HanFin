import Link from "next/link";
import {
  Bitcoin,
  ChevronDown,
  LayoutDashboard,
  LineChart,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LandingHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const appFeatures = [
    {
      label: "Dashboard Keuangan",
      href: "/home/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Pencatatan Transaksi",
      href: "/home/transaction",
      icon: ReceiptText,
    },
    {
      label: "Pasar Saham",
      href: "/home/financial-market/stocks",
      icon: LineChart,
    },
    {
      label: "Pasar Kripto",
      href: "/home/financial-market/crypto",
      icon: Bitcoin,
    },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/50 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="flex items-center font-bold text-xl tracking-tight transition-opacity hover:opacity-90 sm:text-2xl"
          >
            <span className="text-black dark:text-white">Han</span>
            <span className="text-primary">Fin</span>
          </Link>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-1 px-2 text-sm sm:px-3"
              >
                Fitur
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {appFeatures.map(({ label, href, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={href} className="min-h-9 cursor-pointer text-sm">
                    <Icon className="size-4 text-primary" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button size="lg" asChild>
            <Link href={isLoggedIn ? "/home/dashboard" : "/login"}>
              {isLoggedIn ? "Dashboard" : "Sign In"}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
