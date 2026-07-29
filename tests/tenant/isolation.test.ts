import assert from "node:assert/strict";
import test from "node:test";

import {
  isModerationConfigured,
  moderationCookieName,
  signModerationSession,
  verifyModerationPassword,
  verifyModerationToken,
} from "@/lib/moderation-auth";
import { TENANT_IDENTITIES, TENANT_SLUGS, identityForSlug } from "@/lib/tenant/domains";
import { tenantStorage } from "@/lib/tenant/types";
import {
  parseClientUploadPayload,
  parseTokenPayload,
  readTokenTenant,
  toTokenPayload,
} from "@/lib/upload-payload";

const storageFor = (slug: string) => tenantStorage(identityForSlug(slug)!);

// --- storage partitioning ----------------------------------------------------

test("no two tenants share a blob prefix, manifest or data directory", () => {
  const seen = { media: new Map(), manifest: new Map(), dataDir: new Map() } as Record<
    string,
    Map<string, string>
  >;

  for (const tenant of TENANT_IDENTITIES) {
    const s = tenantStorage(tenant);
    for (const [field, value] of [
      ["media", s.blobMediaPrefix],
      ["manifest", s.blobManifestPrefix],
      ["dataDir", s.dataDir],
    ] as const) {
      const owner = seen[field].get(value);
      assert.equal(
        owner,
        undefined,
        `${field} "${value}" is used by both "${owner}" and "${tenant.slug}" — their photos would collide`,
      );
      seen[field].set(value, tenant.slug);
    }
  }
});

test("no tenant's blob prefix is a prefix of another's", () => {
  // "album-img/" vs "album-img-2/" would be distinct strings but overlapping
  // namespaces once listed by prefix.
  for (const a of TENANT_IDENTITIES) {
    for (const b of TENANT_IDENTITIES) {
      if (a.slug === b.slug) continue;
      const pa = tenantStorage(a).blobMediaPrefix;
      const pb = tenantStorage(b).blobMediaPrefix;
      assert.ok(
        !pb.startsWith(pa),
        `"${b.slug}" prefix "${pb}" sits inside "${a.slug}" prefix "${pa}"`,
      );
    }
  }
});

test("the default tenant keeps its pre-existing paths, so no data migration is needed", () => {
  // Changing any of these orphans the live Common Threads photo album.
  const s = storageFor("common-threads");
  assert.equal(s.blobMediaPrefix, "album-img/");
  assert.equal(s.blobManifestPrefix, "album-manifests/");
  assert.equal(s.blobLegacyManifestPath, "album-manifest.json");
  assert.equal(s.dataDir, "data");
  assert.equal(s.moderationCookie, "ct_mod");
  assert.equal(s.moderationEnvPrefix, "MODERATION");
});

test("a tenant added later is namespaced by slug and has no legacy manifest", () => {
  const s = storageFor("woven");
  assert.equal(s.blobMediaPrefix, "woven/album-img/");
  assert.equal(s.blobManifestPrefix, "woven/album-manifests/");
  assert.equal(s.blobLegacyManifestPath, null);
  assert.equal(s.dataDir, "data/tenants/woven");
});

// --- moderation sessions -----------------------------------------------------

/** Reset moderation env between tests so ordering cannot mask a failure. */
function setModerationEnv(vars: Record<string, string | undefined>) {
  for (const name of [
    "MODERATION_SECRET",
    "MODERATION_PASSWORD",
    "MODERATION_WOVEN_SECRET",
    "MODERATION_WOVEN_PASSWORD",
  ]) {
    delete process.env[name];
  }
  for (const [name, value] of Object.entries(vars)) {
    if (value !== undefined) process.env[name] = value;
  }
}

test("each tenant has its own moderation cookie and its own override env names", () => {
  const cookies = new Set<string>();
  const prefixes = new Set<string>();
  for (const slug of TENANT_SLUGS) {
    const s = storageFor(slug);
    assert.ok(!cookies.has(s.moderationCookie), `duplicate cookie ${s.moderationCookie}`);
    assert.ok(!prefixes.has(s.moderationEnvPrefix), `duplicate env prefix ${s.moderationEnvPrefix}`);
    cookies.add(s.moderationCookie);
    prefixes.add(s.moderationEnvPrefix);
  }
});

test("one shared password signs in on every tenant", () => {
  // The operating model: a single MODERATION_PASSWORD for the whole team, with no
  // per-tenant secrets to manage.
  setModerationEnv({
    MODERATION_SECRET: "test-secret-at-least-16-chars",
    MODERATION_PASSWORD: "shared-password",
  });

  for (const slug of TENANT_SLUGS) {
    assert.ok(isModerationConfigured(slug), `${slug} should use the shared credentials`);
    assert.ok(
      verifyModerationPassword(slug, "shared-password"),
      `${slug} should accept the shared password`,
    );
    assert.equal(verifyModerationPassword(slug, "wrong"), false);
  }
});

/**
 * The load-bearing security property. Sharing one secret across tenants must not
 * share access: signing in on Woven cannot grant any authority over the Common
 * Threads album.
 */
test("a session is still confined to its tenant even with one shared secret", () => {
  setModerationEnv({
    MODERATION_SECRET: "test-secret-at-least-16-chars",
    MODERATION_PASSWORD: "shared-password",
  });

  const ctToken = signModerationSession("common-threads");
  assert.ok(verifyModerationToken("common-threads", ctToken), "own tenant should accept");
  assert.equal(
    verifyModerationToken("woven", ctToken),
    false,
    "a Common Threads session must not authorise Woven, despite the shared secret",
  );

  const wovenToken = signModerationSession("woven");
  assert.ok(verifyModerationToken("woven", wovenToken));
  assert.equal(
    verifyModerationToken("common-threads", wovenToken),
    false,
    "a Woven session must not authorise Common Threads",
  );

  // Cookie names differ too, so the browser never even sends the wrong one.
  assert.notEqual(moderationCookieName("common-threads"), moderationCookieName("woven"));
});

test("a per-tenant override replaces the shared credentials for that tenant only", () => {
  setModerationEnv({
    MODERATION_SECRET: "test-secret-at-least-16-chars",
    MODERATION_PASSWORD: "shared-password",
    MODERATION_WOVEN_SECRET: "woven-secret-at-least-16-chars",
    MODERATION_WOVEN_PASSWORD: "woven-only-password",
  });

  assert.ok(verifyModerationPassword("woven", "woven-only-password"));
  assert.equal(
    verifyModerationPassword("woven", "shared-password"),
    false,
    "an explicit override must take precedence over the shared password",
  );
  // The other tenant is unaffected.
  assert.ok(verifyModerationPassword("common-threads", "shared-password"));
  assert.equal(verifyModerationPassword("common-threads", "woven-only-password"), false);
});

test("moderation is unconfigured only when neither the override nor the shared vars are set", () => {
  setModerationEnv({});
  for (const slug of TENANT_SLUGS) {
    assert.equal(isModerationConfigured(slug), false, `${slug} should be unconfigured`);
    assert.equal(verifyModerationPassword(slug, "anything"), false);
  }

  // A tenant override alone is enough, with no shared credentials present.
  setModerationEnv({
    MODERATION_WOVEN_SECRET: "woven-secret-at-least-16-chars",
    MODERATION_WOVEN_PASSWORD: "woven-only-password",
  });
  assert.ok(isModerationConfigured("woven"));
  assert.equal(isModerationConfigured("common-threads"), false);
});

test("a too-short secret or password counts as unconfigured", () => {
  setModerationEnv({ MODERATION_SECRET: "too-short", MODERATION_PASSWORD: "shared-password" });
  assert.equal(isModerationConfigured("common-threads"), false, "secret under 16 chars");

  setModerationEnv({ MODERATION_SECRET: "test-secret-at-least-16-chars", MODERATION_PASSWORD: "abc" });
  assert.equal(isModerationConfigured("common-threads"), false, "password under 6 chars");
});

// --- upload payloads ---------------------------------------------------------

const payloadFor = (pathname: string) =>
  JSON.stringify({
    filename: "a.jpg",
    mime: "image/jpeg",
    pathname,
    sessionId: "session-abc",
    fileClientId: "file-abc",
    expectedCount: 1,
    size: 1234,
  });

test("an upload path outside the calling tenant's prefix is rejected", () => {
  const ct = storageFor("common-threads").blobMediaPrefix;
  const woven = storageFor("woven").blobMediaPrefix;

  assert.ok(parseClientUploadPayload(payloadFor(`${ct}a.jpg`), ct));
  assert.throws(
    () => parseClientUploadPayload(payloadFor(`${woven}a.jpg`), ct),
    /Invalid pathname/,
    "Woven must not be able to write into the Common Threads namespace",
  );
  assert.throws(
    () => parseClientUploadPayload(payloadFor(`${ct}a.jpg`), woven),
    /Invalid pathname/,
  );
});

test("path traversal out of a tenant namespace is rejected", () => {
  const woven = storageFor("woven").blobMediaPrefix;
  assert.throws(
    () => parseClientUploadPayload(payloadFor(`${woven}../../album-img/a.jpg`), woven),
    /Invalid pathname/,
  );
});

test("the tenant survives the blob upload round trip", () => {
  // onUploadCompleted is a server-to-server callback with no tenant host, so the
  // slug has to come back out of the token payload.
  const woven = storageFor("woven").blobMediaPrefix;
  const payload = parseClientUploadPayload(payloadFor(`${woven}a.jpg`), woven);
  const signed = JSON.stringify(toTokenPayload(payload, "woven"));

  assert.equal(readTokenTenant(signed), "woven");
  const parsed = parseTokenPayload(signed, woven);
  assert.equal(parsed.tenant, "woven");
  assert.equal(parsed.pathname, `${woven}a.jpg`);
});

test("a token payload naming no or a malformed tenant is rejected", () => {
  const woven = storageFor("woven").blobMediaPrefix;
  const base = JSON.parse(payloadFor(`${woven}a.jpg`)) as Record<string, unknown>;

  assert.throws(() => readTokenTenant(JSON.stringify(base)), /Invalid tenant/);
  assert.throws(() => readTokenTenant(null), /Missing token payload/);
  assert.throws(() => readTokenTenant("not json"), /Invalid token payload/);
  for (const bad of ["../other", "Woven", "woven/../ct", ""]) {
    assert.throws(
      () => readTokenTenant(JSON.stringify({ ...base, tenant: bad })),
      /Invalid tenant/,
      `tenant "${bad}" should be rejected`,
    );
  }
});

test("a token for one tenant fails validation against another's prefix", () => {
  const ct = storageFor("common-threads").blobMediaPrefix;
  const woven = storageFor("woven").blobMediaPrefix;
  const payload = parseClientUploadPayload(payloadFor(`${woven}a.jpg`), woven);
  const signed = JSON.stringify(toTokenPayload(payload, "woven"));

  assert.throws(() => parseTokenPayload(signed, ct), /Invalid pathname/);
});
