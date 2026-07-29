import "server-only";

import { DEFAULT_TENANT_SLUG } from "@/lib/tenant/domains";
import type { TenantContent } from "@/lib/tenant/content-types";

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

export const CONTENT_SLUGS = Object.keys(CONTENT);

export function tenantContent(slug: string): TenantContent {
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
