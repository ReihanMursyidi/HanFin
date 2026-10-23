import { CheckCircle2 } from "lucide-react";
import type { LandingFeature } from "./landing-features";

export default function LandingFeatureSection({
  id,
  title,
  icon: Icon,
  description,
  highlights,
}: LandingFeature) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-xl border border-border/40 bg-background/60 p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
          {title}
        </h2>
      </div>

      <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
        {description}
      </p>

      <ul className="mt-4 space-y-2">
        {highlights.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
