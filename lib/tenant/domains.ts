/**
 * Edge-safe tenant routing.
 *
 * This module is imported by middleware.ts, which runs on the Edge runtime. It
 * may only import tenant.json files — small identity/theme documents. Never
 * import content/*.json or data.json here: data.json alone is ~195 KB per
 * tenant and would blow up the middleware bundle for no benefit.
 *
 * ADDING A TENANT: create tenants/<slug>/tenant.json, then add it to the two
 * lists — here and in lib/tenant/registry.ts. tests/tenant/registry.test.ts
 * fails if the two ever drift apart.
 */
import commonThreads from "@/tenants/common-threads/tenant.json";
import woven from "@/tenants/woven/tenant.json";
import type { TenantIdentity, TenantRedirect } from "@/lib/tenant/types";

export const TENANT_IDENTITIES: TenantIdentity[] = [
  commonThreads as TenantIdentity,
  woven as TenantIdentity,
];

/** Header middleware uses to hand the resolved tenant to server components. */
export const TENANT_HEADER = "x-tenant";

/**
 * The tenant served for unknown hosts: bare localhost, *.vercel.app previews,
 * and anything not explicitly mapped. Override with DEFAULT_TENANT to point a
 * preview deployment at a different tenant.
 */
export const DEFAULT_TENANT_SLUG =
  process.env.DEFAULT_TENANT?.trim() || "common-threads";

export const TENANT_SLUGS: string[] = TENANT_IDENTITIES.map((t) => t.slug);

const BY_SLUG = new Map(TENANT_IDENTITIES.map((t) => [t.slug, t]));

const BY_DOMAIN: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const tenant of TENANT_IDENTITIES) {
    for (const domain of tenant.domains) {
      const key = normaliseHost(domain);
      const existing = map.get(key);
      if (existing && existing !== tenant.slug) {
        throw new Error(
          `Domain "${key}" is claimed by both "${existing}" and "${tenant.slug}"`,
        );
      }
      map.set(key, tenant.slug);
    }
    // Local development: <slug>.localhost resolves without editing /etc/hosts.
    map.set(`${tenant.slug}.localhost`, tenant.slug);
  }
  return map;
})();

/** Lowercase and drop the port, so "Woven.LOCALHOST:3000" matches "woven.localhost". */
export function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Map a request host to a tenant slug, falling back to the default tenant.
 * Unknown hosts deliberately resolve rather than 404 so preview URLs work.
 */
export function resolveTenantSlug(host: string | null | undefined): string {
  if (!host) return DEFAULT_TENANT_SLUG;
  return BY_DOMAIN.get(normaliseHost(host)) ?? DEFAULT_TENANT_SLUG;
}

/** Prefer x-forwarded-host: behind Vercel's proxy, `host` is the internal hostname. */
export function hostFromHeaders(headers: Headers): string | null {
  return headers.get("x-forwarded-host") ?? headers.get("host");
}

export function identityForSlug(slug: string): TenantIdentity | null {
  return BY_SLUG.get(slug) ?? null;
}

export function redirectsForSlug(slug: string): TenantRedirect[] {
  return identityForSlug(slug)?.redirects ?? [];
}
