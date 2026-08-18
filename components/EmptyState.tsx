"use client";

import { useT } from "@/components/MessagesProvider";

type Props = {
  variant?: "album" | "home" | "heroDark";
};

export default function EmptyState({ variant = "album" }: Props) {
  const t = useT();

  if (variant === "heroDark") {
    return (
      <p className="text-center text-sm text-ink-50/60">
        <span className="md:hidden">{t("moments.nothingSelectedMobile")}</span>
        <span className="hidden md:inline">{t("moments.nothingSelected")}</span>
      </p>
    );
  }
  if (variant === "home") {
    return (
      <p className="text-center text-sm text-ink-400">
        <span className="md:hidden">{t("moments.nothingSelectedMobile")}</span>
        <span className="hidden md:inline">{t("moments.nothingSelected")}</span>
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <div className="rounded-2xl bg-veil/10 px-5 py-4 text-4xl" aria-hidden>
        🖼️
      </div>
      <h2 className="text-lg font-medium text-ink-100">{t("moments.noPhotosTitle")}</h2>
      <p className="max-w-xs text-sm leading-relaxed text-ink-400">
        <span className="md:hidden">{t("moments.noPhotosBodyMobile")}</span>
        <span className="hidden md:inline">{t("moments.noPhotosBody")}</span>
      </p>
    </div>
  );
}
