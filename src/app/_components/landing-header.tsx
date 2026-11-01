import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export function LandingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center font-bold text-xl sm:text-2xl tracking-tight hover:opacity-90 transition-opacity select-none"
        >
          <span className="text-black dark:text-white">Han</span>
          <span className="text-primary">Fin</span>
        </Link>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button size="lg" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
