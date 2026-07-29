import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { DEFAULT_TENANT_SLUG, TENANT_IDENTITIES, TENANT_SLUGS } from "@/lib/tenant/domains";
import { REGISTERED_DATA_SLUGS } from "@/lib/tenant/registry";
import { readTenantSpeakers, tenantSummitData } from "@/lib/summit/tenant-data";

const ROOT = process.cwd();

/**
 * Adding a tenant means editing two lists — the Edge-safe one in domains.ts and
 * the server-side one in registry.ts. This test is what makes that duplication
 * safe: forget either half and it fails here rather than at runtime.
 */
test("the Edge routing registry and the server data registry agree", () => {
  assert.deepEqual(
    [...REGISTERED_DATA_SLUGS].sort(),
    [...TENANT_SLUGS].sort(),
    "lib/tenant/domains.ts and lib/tenant/registry.ts list different tenants",
  );
});

test("every tenant has the files its registry entries claim", () => {
  for (const slug of TENANT_SLUGS) {
    for (const file of ["tenant.json", "data.json"]) {
      const rel = path.join("tenants", slug, file);
      assert.ok(existsSync(path.join(ROOT, rel)), `${rel} is missing`);
    }
  }
});

test("the default tenant is registered", () => {
  assert.ok(
    REGISTERED_DATA_SLUGS.includes(DEFAULT_TENANT_SLUG),
    `default tenant "${DEFAULT_TENANT_SLUG}" has no data registered`,
  );
});

test("no two tenants claim the same domain", () => {
  const seen = new Map<string, string>();
  for (const tenant of TENANT_IDENTITIES) {
    for (const domain of tenant.domains) {
      const key = domain.toLowerCase();
      const owner = seen.get(key);
      assert.equal(
        owner,
        undefined,
        `"${key}" is claimed by both "${owner}" and "${tenant.slug}"`,
      );
      seen.set(key, tenant.slug);
    }
  }
});

test("every tenant's data normalises to exactly one summit", () => {
  // Several components read summits[0] unconditionally; a tenant with zero
  // summit records must still get the fallback rather than crash.
  for (const slug of TENANT_SLUGS) {
    const data = tenantSummitData(slug);
    assert.equal(data.summits.length, 1, `${slug} should normalise to one summit`);
    assert.ok(data.summits[0].id, `${slug} summit needs an id`);
  }
});

test("tenant reads are cloned, so one request cannot corrupt another", () => {
  // The normalised data is memoised per slug and shared across requests, so the
  // accessors must hand out copies. Without this, a component mutating a record
  // would poison every later request for that tenant.
  const first = readTenantSpeakers(DEFAULT_TENANT_SLUG);
  assert.ok(first.length > 0, "fixture needs at least one speaker to test cloning");

  const originalName = first[0].fields.Name;
  first[0].fields.Name = "MUTATED BY TEST";
  first.push({ id: "injected", fields: {} });

  const second = readTenantSpeakers(DEFAULT_TENANT_SLUG);
  assert.equal(second[0].fields.Name, originalName, "record fields leaked between reads");
  assert.equal(second.length, first.length - 1, "the array itself leaked between reads");
});
