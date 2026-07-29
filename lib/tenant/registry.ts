import "server-only";

import { DEFAULT_TENANT_SLUG, TENANT_SLUGS } from "@/lib/tenant/domains";
import commonThreadsData from "@/tenants/common-threads/data.json";
import wovenData from "@/tenants/woven/data.json";

/**
 * Server-side tenant registry: the heavy documents that middleware must never
 * load. Imports are static because Next's bundler cannot resolve `import()`
 * with a variable path.
 *
 * ADDING A TENANT: add the import and one entry below, and the matching entry in
 * lib/tenant/domains.ts. tests/tenant/registry.test.ts fails if the two drift.
 */
const RAW_DATA: Record<string, unknown> = {
  "common-threads": commonThreadsData,
  woven: wovenData,
};

/** Slugs that have an event-data document registered. */
export const REGISTERED_DATA_SLUGS = Object.keys(RAW_DATA);

/**
 * The tenant's raw event data, exactly as authored. Falls back to the default
 * tenant so an unregistered slug renders the default rather than crashing.
 */
export function rawTenantData(slug: string): unknown {
  const data = RAW_DATA[slug];
  if (data) return data;

  if (!TENANT_SLUGS.includes(slug)) {
    console.warn(
      `[tenant] "${slug}" is not a registered tenant; serving "${DEFAULT_TENANT_SLUG}".`,
    );
  } else {
    console.warn(
      `[tenant] "${slug}" has no data.json in lib/tenant/registry.ts; ` +
        `serving "${DEFAULT_TENANT_SLUG}".`,
    );
  }

  const fallback = RAW_DATA[DEFAULT_TENANT_SLUG];
  if (!fallback) {
    throw new Error(
      `Default tenant "${DEFAULT_TENANT_SLUG}" has no data registered in lib/tenant/registry.ts`,
    );
  }
  return fallback;
}
