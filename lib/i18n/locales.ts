/**
 * The languages the app is offered in.
 *
 * Chosen for the Woven gathering: its delegates come from Spanish, Russian,
 * French and Portuguese speaking regions, and interpreters are provided in
 * exactly those four alongside English.
 *
 * Locale lives in a cookie rather than the URL. Every link in the app is
 * root-relative and the tenant is already resolved from the host in middleware;
 * putting a locale segment in front of every path would mean reworking both, for
 * a delegate app nobody deep-links into by language.
 */
export const LOCALES = ["en", "es", "ru", "fr", "pt"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE_NAME = "ct-locale";
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** Endonyms — a language picker written in a language you cannot read is useless. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  ru: "Русский",
  fr: "Français",
  pt: "Português",
};

/** Shown under the picker, in the language being offered. */
export const LOCALE_MACHINE_TRANSLATION_NOTICE: Record<Locale, string> = {
  en: "Machine-assisted translation, under review.",
  es: "Traducción automática, en revisión.",
  ru: "Машинный перевод, на проверке.",
  fr: "Traduction automatique, en cours de révision.",
  pt: "Tradução automática, em revisão.",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function normaliseLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Best offer from an `Accept-Language` header — used only to preselect a button
 * on the language screen, never to decide for someone.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
