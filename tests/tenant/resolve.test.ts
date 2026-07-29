import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_TENANT_SLUG,
  TENANT_SLUGS,
  hostFromHeaders,
  identityForSlug,
  normaliseHost,
  redirectsForSlug,
  resolveTenantSlug,
} from "@/lib/tenant/domains";

test("known domains resolve to their tenant", () => {
  assert.equal(
    resolveTenantSlug("summit.commonthreads.org.au"),
    "common-threads",
  );
});

test("host matching ignores port and case", () => {
  assert.equal(normaliseHost("Summit.CommonThreads.ORG.AU:3000"), "summit.commonthreads.org.au");
  assert.equal(resolveTenantSlug("SUMMIT.commonthreads.org.au:443"), "common-threads");
  assert.equal(resolveTenantSlug("  summit.commonthreads.org.au  "), "common-threads");
});

test("<slug>.localhost resolves for local multi-tenant development", () => {
  for (const slug of TENANT_SLUGS) {
    assert.equal(resolveTenantSlug(`${slug}.localhost:3000`), slug);
  }
});

test("unknown hosts fall back to the default tenant rather than failing", () => {
  // Preview deployments and bare localhost must still render something.
  for (const host of [
    "localhost:3000",
    "summit-web-git-main.vercel.app",
    "127.0.0.1:3000",
    "totally-unknown.example",
    "",
    null,
    undefined,
  ]) {
    assert.equal(resolveTenantSlug(host), DEFAULT_TENANT_SLUG);
  }
});

test("x-forwarded-host wins over host, because Vercel proxies requests", () => {
  const h = new Headers({
    host: "internal-vercel-hostname.local",
    "x-forwarded-host": "summit.commonthreads.org.au",
  });
  assert.equal(hostFromHeaders(h), "summit.commonthreads.org.au");
  assert.equal(resolveTenantSlug(hostFromHeaders(h)), "common-threads");
});

test("host is used when x-forwarded-host is absent", () => {
  const h = new Headers({ host: "summit.commonthreads.org.au" });
  assert.equal(hostFromHeaders(h), "summit.commonthreads.org.au");
});

test("every registered tenant is retrievable and has required identity fields", () => {
  assert.ok(TENANT_SLUGS.length > 0, "at least one tenant must be registered");
  assert.ok(
    TENANT_SLUGS.includes(DEFAULT_TENANT_SLUG),
    `DEFAULT_TENANT_SLUG "${DEFAULT_TENANT_SLUG}" must be a registered tenant`,
  );
  for (const slug of TENANT_SLUGS) {
    const t = identityForSlug(slug);
    assert.ok(t, `${slug} should resolve`);
    assert.equal(t.slug, slug, "slug in tenant.json must match its registry entry");
    assert.ok(t.name.trim().length > 0, `${slug} needs a display name`);
    assert.ok(Array.isArray(t.domains) && t.domains.length > 0, `${slug} needs domains`);
    assert.ok(
      t.theme.mode === "dark" || t.theme.mode === "light",
      `${slug} theme.mode must be "dark" or "light"`,
    );
  }
});

test("unknown slug does not resolve to an identity", () => {
  assert.equal(identityForSlug("no-such-tenant"), null);
});

test("per-tenant redirects replace the old global next.config.ts entries", () => {
  const redirects = redirectsForSlug("common-threads");
  const bySource = new Map(redirects.map((r) => [r.source, r.destination]));

  // These moved out of next.config.ts; losing them would silently 404.
  for (const source of [
    "/community",
    "/community/announcements",
    "/community/parents-carers",
    "/community/health-illness",
    "/community/accessibility-support",
    "/community/wellbeing",
    "/community/nearby-essentials",
  ]) {
    const destination = bySource.get(source);
    assert.ok(destination, `${source} redirect is missing`);
    assert.match(destination, /^https:\/\//, `${source} must redirect to an absolute URL`);
  }

  assert.deepEqual(redirectsForSlug("no-such-tenant"), []);
});
