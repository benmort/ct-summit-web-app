import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

import en from "@/lib/i18n/messages/en.json";
import es from "@/lib/i18n/messages/es.json";
import fr from "@/lib/i18n/messages/fr.json";
import pt from "@/lib/i18n/messages/pt.json";
import ru from "@/lib/i18n/messages/ru.json";

/**
 * UI chrome strings — the words that belong to the app rather than to a tenant.
 *
 * Tenant copy lives in tenants/<slug>/content and is translated separately; this
 * is everything hardcoded in a component, from "View Details" to the empty
 * states. Flat dot-namespaced keys, because the nesting buys nothing and a flat
 * file is far easier to hand to a translator and diff afterwards.
 */
export type Messages = Record<string, string>;

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

const CATALOGUES: Record<Locale, Messages> = { en, es, ru, fr, pt };

/**
 * A locale's catalogue laid over English.
 *
 * Partial by design: an untranslated key falls back to English rather than
 * rendering a raw key at a delegate.
 */
export function messagesFor(locale: Locale): Messages {
  if (locale === DEFAULT_LOCALE) return en;
  return { ...en, ...CATALOGUES[locale] };
}

export function createTranslate(messages: Messages): Translate {
  return (key, vars) => {
    const template = messages[key] ?? en[key as keyof typeof en] ?? key;
    if (!vars) return template;
    return Object.entries(vars).reduce(
      (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
      template,
    );
  };
}
