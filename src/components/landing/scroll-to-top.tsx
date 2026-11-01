"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    scrollContainerRef.current = scrollContainer;

    const toggleVisibility = () => {
      setIsVisible((scrollContainer?.scrollTop ?? window.scrollY) > 300);
    };

    const scrollTarget: Window | HTMLElement = scrollContainer ?? window;
    scrollTarget.addEventListener("scroll", toggleVisibility, {
      passive: true,
    });
    toggleVisibility();
    return () => {
      scrollTarget.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 bg-primary text-primary-foreground"
      aria-label="Kembali ke atas"
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
