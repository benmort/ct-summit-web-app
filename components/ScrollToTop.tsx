"use client";

import { ArrowUpIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";

const SHOW_AFTER_PX = 400;

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollUp}
      className="fixed bottom-[max(1rem,var(--album-safe-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-veil/15 text-ink-50 shadow-lg ring-1 ring-veil/20 backdrop-blur-sm transition hover:bg-veil/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-page sm:right-6"
      aria-label="Scroll to top"
    >
      <ArrowUpIcon className="h-6 w-6" aria-hidden />
    </button>
  );
}
