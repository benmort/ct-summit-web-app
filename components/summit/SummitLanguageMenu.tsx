"use client";

import { useRouter } from "next/navigation";

import {
  LOCALES,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  LOCALE_LABELS,
  type Locale,
} from "@/lib/i18n/locales";

type Props = {
  onChange?: () => void;
};

function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`));
  const value = match?.split("=")[1];
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : null;
}

/**
 * Change language after onboarding.
 *
 * The language screen only appears once, so without this a delegate who tapped
 * the wrong flag on arrival — or who shares a phone — would be stuck.
 */
export default function SummitLanguageMenu({ onChange }: Props) {
  const router = useRouter();

  const select = (locale: Locale) => {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    onChange?.();
    // Copy is resolved on the server, so the new language needs a server re-render.
    router.refresh();
  };

  const active = readLocaleCookie();

  return (
    <div className="lg:col-span-2">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        Language
      </p>
      <div className="flex flex-wrap gap-2">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            lang={locale}
            onClick={() => select(locale)}
            aria-current={locale === active}
            className={
              locale === active
                ? "min-h-9 rounded-md border border-brand-300/45 bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-100"
                : "min-h-9 rounded-md border border-veil/25 bg-veil/5 px-3 py-1.5 text-xs font-medium text-ink-200 transition hover:border-brand-300/40 hover:bg-veil/10"
            }
          >
            {LOCALE_LABELS[locale]}
          </button>
        ))}
      </div>
    </div>
  );
}
