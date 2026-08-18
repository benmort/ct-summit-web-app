"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";

import { useT } from "@/components/MessagesProvider";

import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_MACHINE_TRANSLATION_NOTICE,
  type Locale,
} from "@/lib/i18n/locales";

type Props = {
  open: boolean;
  /** Highlighted first, from the browser's own Accept-Language. Never chosen for them. */
  suggested: Locale;
  onSelect: (locale: Locale) => void;
};

/**
 * The first screen of the app: pick a language.
 *
 * It comes before the Acknowledgement of Country deliberately — the
 * Acknowledgement is the first thing a delegate is asked to read and accept, and
 * asking that of someone in a language they do not speak is worse than one extra
 * tap. Delegates travel here from Spanish, Russian, French and Portuguese
 * speaking regions.
 */
export default function SummitLanguageOverlay({ open, suggested, onSelect }: Props) {
  const t = useT();
  if (!open) return null;

  // Say "this is machine translated" in English and in whatever the browser asked
  // for, so the caveat is legible to the person most likely to need it.
  const notices = Array.from(new Set<Locale>(["en", suggested]));

  return (
    <div className="fixed inset-0 z-[260] flex min-h-dvh items-center justify-center bg-scrim/90 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-veil/15 bg-surface-950/95 p-6 shadow-2xl sm:p-8">
        <h1 className="text-center text-base font-semibold uppercase tracking-[0.16em] text-brand-200 sm:text-lg">
          {t("language.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-ink-300">{t("language.choose")}</p>

        <div className="mt-6 grid gap-2">
          {LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              lang={locale}
              onClick={() => onSelect(locale)}
              className={
                locale === suggested
                  ? "inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-brand-300/45 bg-gradient-to-br from-brand-200 to-brand-100 px-4 py-3 text-left text-base font-semibold text-on-brand transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200/80"
                  : "inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-dashed border-ink-500/55 bg-surface-900/40 px-4 py-3 text-left text-base font-semibold text-ink-100 transition hover:border-brand-300/45 hover:bg-surface-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200/80"
              }
            >
              {LOCALE_LABELS[locale]}
              <ChevronRightIcon className="h-5 w-5 shrink-0" aria-hidden />
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-1 text-center">
          {notices.map((locale) => (
            <p key={locale} lang={locale} className="text-[11px] leading-snug text-ink-400">
              {LOCALE_MACHINE_TRANSLATION_NOTICE[locale]}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
