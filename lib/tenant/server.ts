import "server-only";

import { headers } from "next/headers";
import {
  DEFAULT_TENANT_SLUG,
  TENANT_HEADER,
  hostFromHeaders,
  identityForSlug,
  resolveTenantSlug,
} from "@/lib/tenant/domains";
import type { TenantIdentity } from "@/lib/tenant/types";

/**
 * The tenant for the current request.
 *
 * Reads the header set by middleware.ts, falling back to resolving the host
 * directly. The fallback matters for execution paths middleware does not cover
 * — notably Vercel Blob's server-to-server upload callback, which arrives with
 * no tenant host at all. Anything on that path must pass the tenant explicitly
 * rather than call this.
 *
 * Note this opts the calling route into dynamic rendering, which is intended:
 * a statically prerendered page would bake one tenant's content into every
 * tenant's HTML.
 */
export async function getTenantSlug(): Promise<string> {
  const h = await headers();
  const fromMiddleware = h.get(TENANT_HEADER);
  if (fromMiddleware && identityForSlug(fromMiddleware)) {
    return fromMiddleware;
  }
  return resolveTenantSlug(hostFromHeaders(h));
}

export async function getTenantIdentity(): Promise<TenantIdentity> {
  const slug = await getTenantSlug();
  const identity = identityForSlug(slug) ?? identityForSlug(DEFAULT_TENANT_SLUG);
  if (!identity) {
    throw new Error(
      `No tenant registered for "${slug}", and the default tenant ` +
        `"${DEFAULT_TENANT_SLUG}" is missing from lib/tenant/domains.ts`,
    );
  }
  return identity;
}
