import "server-only";

import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  localeFromAcceptLanguage,
  normaliseLocale,
  type Locale,
} from "@/lib/i18n/locales";

/** The language to render in. Falls back to English until someone chooses. */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return normaliseLocale(jar.get(LOCALE_COOKIE_NAME)?.value);
}

/**
 * Whether a language has actually been chosen.
 *
 * Distinct from `getLocale()`, which answers English for a first-time visitor —
 * the language screen needs to know the difference between "chose English" and
 * "has not been asked yet".
 */
export async function hasChosenLocale(): Promise<boolean> {
  const jar = await cookies();
  return jar.has(LOCALE_COOKIE_NAME);
}

/** Which language button to highlight first, from the browser's own preference. */
export async function suggestedLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  return localeFromAcceptLanguage(requestHeaders.get("accept-language")) ?? DEFAULT_LOCALE;
}
