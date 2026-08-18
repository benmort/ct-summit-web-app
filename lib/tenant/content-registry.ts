import "server-only";

import { DEFAULT_TENANT_SLUG } from "@/lib/tenant/domains";
import type { TenantContent } from "@/lib/tenant/content-types";
import { overlayTranslations } from "@/lib/i18n/merge";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

import wvEs from "@/tenants/woven/content/i18n/es.json";
import wvFr from "@/tenants/woven/content/i18n/fr.json";
import wvPt from "@/tenants/woven/content/i18n/pt.json";
import wvRu from "@/tenants/woven/content/i18n/ru.json";

import ctBrand from "@/tenants/common-threads/content/brand.json";
import ctGuidance from "@/tenants/common-threads/content/guidance.json";
import ctIntegrations from "@/tenants/common-threads/content/integrations.json";
import ctNavigation from "@/tenants/common-threads/content/navigation.json";
import ctOnboarding from "@/tenants/common-threads/content/onboarding.json";

import wvBrand from "@/tenants/woven/content/brand.json";
import wvGuidance from "@/tenants/woven/content/guidance.json";
import wvIntegrations from "@/tenants/woven/content/integrations.json";
import wvNavigation from "@/tenants/woven/content/navigation.json";
import wvOnboarding from "@/tenants/woven/content/onboarding.json";

/**
 * Per-tenant copy. Static imports again, because Next cannot bundle a dynamic
 * import with a variable path.
 *
 * ADDING A TENANT: add the five imports and one entry below.
 * tests/tenant/content.test.ts checks every registered tenant has content.
 */
const CONTENT: Record<string, TenantContent> = {
  "common-threads": {
    brand: ctBrand as TenantContent["brand"],
    navigation: ctNavigation as TenantContent["navigation"],
    onboarding: ctOnboarding as TenantContent["onboarding"],
    guidance: ctGuidance as TenantContent["guidance"],
    integrations: ctIntegrations as TenantContent["integrations"],
  },
  woven: {
    brand: wvBrand as TenantContent["brand"],
    navigation: wvNavigation as TenantContent["navigation"],
    onboarding: wvOnboarding as TenantContent["onboarding"],
    guidance: wvGuidance as TenantContent["guidance"],
    integrations: wvIntegrations as TenantContent["integrations"],
  },
};

/**
 * Translation overlays, laid over the English above.
 *
 * Partial by design — a locale with an empty overlay simply renders English, so a
 * language can be added a file at a time without ever showing a delegate a hole.
 *
 * ADDING A LANGUAGE TO A TENANT: add the import and one entry here.
 */
const TRANSLATIONS: Record<string, Partial<Record<Locale, unknown>>> = {
  woven: { es: wvEs, ru: wvRu, fr: wvFr, pt: wvPt },
};

const TRANSLATED_CACHE = new Map<string, TenantContent>();

export const CONTENT_SLUGS = Object.keys(CONTENT);

export function tenantContent(slug: string, locale: Locale = DEFAULT_LOCALE): TenantContent {
  const english = englishContent(slug);
  if (locale === DEFAULT_LOCALE) return english;

  const overlay = TRANSLATIONS[slug]?.[locale];
  if (!overlay) return english;

  const key = `${slug}:${locale}`;
  let translated = TRANSLATED_CACHE.get(key);
  if (!translated) {
    translated = overlayTranslations(english, overlay);
    TRANSLATED_CACHE.set(key, translated);
  }
  return translated;
}

function englishContent(slug: string): TenantContent {
  const content = CONTENT[slug];
  if (content) return content;

  console.warn(
    `[tenant] "${slug}" has no content registered; serving "${DEFAULT_TENANT_SLUG}" copy.`,
  );
  const fallback = CONTENT[DEFAULT_TENANT_SLUG];
  if (!fallback) {
    throw new Error(
      `Default tenant "${DEFAULT_TENANT_SLUG}" has no content in lib/tenant/content.ts`,
    );
  }
  return fallback;
}
