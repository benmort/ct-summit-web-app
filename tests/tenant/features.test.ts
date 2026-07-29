import assert from "node:assert/strict";
import test from "node:test";

import { TENANT_IDENTITIES } from "@/lib/tenant/domains";
import { tenantFeatures, type TenantIdentity } from "@/lib/tenant/types";

test("moments defaults to enabled when unspecified", () => {
  const base: TenantIdentity = { slug: "x", name: "X", domains: [], theme: { mode: "dark" } };
  assert.equal(tenantFeatures(base).moments, true);
  assert.equal(tenantFeatures({ ...base, features: { moments: false } }).moments, false);
});

test("feature flags resolve for every registered tenant", () => {
  for (const tenant of TENANT_IDENTITIES) {
    const features = tenantFeatures(tenant);
    assert.equal(typeof features.moments, "boolean", `${tenant.slug} moments flag`);
  }
});
