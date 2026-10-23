"use client";

import { cn } from "@/lib/utils";
import { LANDING_FEATURES } from "./landing-features";

interface LandingSidebarProps {
  className?: string;
}

export default function LandingSidebar({ className }: LandingSidebarProps) {
  return (
    <nav
      aria-label="Navigasi fitur"
      className={cn(
        "w-full space-y-1 lg:sticky lg:top-24 lg:w-72 lg:shrink-0 lg:self-start",
        className,
      )}
    >
      <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Fitur Aplikasi
      </p>
      <ul className="space-y-1">
        {LANDING_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <li key={feature.id}>
              <a
                href={`#${feature.id}`}
                className="flex items-start gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <span className="leading-snug">{feature.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
