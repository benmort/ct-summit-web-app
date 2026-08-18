import "server-only";

import { CONTENT_SLUGS, tenantContent } from "@/lib/tenant/content-registry";
import { getTenantSlug } from "@/lib/tenant/server";
import { getLocale } from "@/lib/i18n/server";
import type { TenantContent } from "@/lib/tenant/content-types";

/**
 * Request-scoped access to tenant copy.
 *
 * The registry itself lives in content-registry.ts, which deliberately does not
 * import next/headers — that keeps it loadable from tests and scripts, where
 * there is no request to read a tenant from.
 */
export { CONTENT_SLUGS, tenantContent };

/** Content for the current request's tenant, in the reader's chosen language. */
export async function getTenantContent(): Promise<TenantContent> {
  const [slug, locale] = await Promise.all([getTenantSlug(), getLocale()]);
  return tenantContent(slug, locale);
}

/**
 * The slice sent to the browser for client components.
 *
 * `guidance` is deliberately excluded: only a server page renders it, and it is
 * the largest document, so shipping it would bloat every page's payload.
 */
export type TenantClientContent = Pick<
  TenantContent,
  "brand" | "navigation" | "onboarding" | "integrations"
>;

export async function getTenantClientContent(): Promise<TenantClientContent> {
  const { brand, navigation, onboarding, integrations } = await getTenantContent();
  return { brand, navigation, onboarding, integrations };
}
