"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  className?: string;
  /** Jarak scroll (px) sebelum tombol muncul. */
  threshold?: number;
}

export default function ScrollToTopButton({
  className,
  threshold = 400,
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <Button
      type="button"
      size="icon"
      aria-label="Kembali ke atas"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-opacity duration-300",
        visible ? "opacity-100" : "pointer-events-none opacity-0 translate-y-2",
        className,
      )}
    >
      <ArrowUp className="size-4" />
    </Button>
  );
}
