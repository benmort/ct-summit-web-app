"use client";

import { useT } from "@/components/MessagesProvider";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { SUMMIT_OPEN_MENU_EVENT } from "@/lib/summit/menu-events";

export default function SummitOpenMenuLink() {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(SUMMIT_OPEN_MENU_EVENT))}
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-brand-300"
    >
      {t("nav.viewFullMenu")}
      <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
