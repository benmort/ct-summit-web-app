import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { CONTENT_SLUGS, tenantContent } from "@/lib/tenant/content-registry";
import { TENANT_IDENTITIES, TENANT_SLUGS } from "@/lib/tenant/domains";

const ROOT = process.cwd();
const CONTENT_FILES = [
  "brand.json",
  "navigation.json",
  "onboarding.json",
  "guidance.json",
  "integrations.json",
];

test("every registered tenant has content, and vice versa", () => {
  assert.deepEqual(
    [...CONTENT_SLUGS].sort(),
    [...TENANT_SLUGS].sort(),
    "lib/tenant/content.ts and lib/tenant/domains.ts list different tenants",
  );
});

test("every tenant has all five content files on disk", () => {
  for (const slug of TENANT_SLUGS) {
    for (const file of CONTENT_FILES) {
      const rel = path.join("tenants", slug, "content", file);
      assert.ok(existsSync(path.join(ROOT, rel)), `${rel} is missing`);
    }
  }
});

test("every tenant's content has the required fields populated", () => {
  for (const slug of TENANT_SLUGS) {
    const { brand, navigation, onboarding, guidance, integrations } = tenantContent(slug);

    for (const [field, value] of Object.entries({
      name: brand.name,
      wordmark: brand.wordmark,
      description: brand.description,
      themeColor: brand.themeColor,
    })) {
      assert.ok(value?.trim(), `${slug}: brand.${field} must not be empty`);
    }
    assert.match(brand.themeColor, /^#[0-9a-f]{3,8}$/i, `${slug}: brand.themeColor must be hex`);

    assert.ok(navigation.tabs.length > 0, `${slug}: needs at least one bottom tab`);
    assert.ok(navigation.menu.length > 0, `${slug}: needs at least one menu item`);
    for (const item of [...navigation.tabs, ...navigation.menu]) {
      assert.match(item.href, /^\//, `${slug}: nav href "${item.href}" must be a root-relative path`);
      assert.ok(item.label.trim(), `${slug}: nav item ${item.href} needs a label`);
    }
    // Every menu href needs a tagline, since the menu renders one per row.
    for (const item of navigation.menu) {
      assert.ok(item.subtitle?.trim(), `${slug}: menu item ${item.href} needs a subtitle`);
    }

    assert.ok(
      onboarding.acknowledgement.paragraphs.length > 0,
      `${slug}: acknowledgement needs at least one paragraph`,
    );
    assert.ok(onboarding.slides.length > 0, `${slug}: needs at least one onboarding slide`);
    for (const slide of onboarding.slides) {
      assert.ok(slide.heading.trim(), `${slug}: every onboarding slide needs a heading`);
      assert.ok(slide.paragraphs.length > 0, `${slug}: slide "${slide.heading}" needs body copy`);
    }
    assert.ok(onboarding.homescreenPrompt.iosSteps.length > 0, `${slug}: needs iOS install steps`);

    assert.ok(guidance.title.trim(), `${slug}: guidance needs a page title`);
    assert.ok(guidance.sections.length > 0, `${slug}: guidance needs at least one section`);

    assert.match(
      integrations.supportEmail,
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
      `${slug}: integrations.supportEmail must be a valid address`,
    );
  }
});

/**
 * A font key that isn't in the registry falls back to the system stack with only
 * a console warning, which is easy to miss. lib/tenant/fonts.ts cannot be
 * imported here — it pulls in next/font, which only loads inside Next — so the
 * registry keys are read out of its source instead.
 */
test("every font a tenant names exists in the font registry", () => {
  const source = readFileSync(path.join(ROOT, "lib/tenant/fonts.ts"), "utf8");
  const registry = source.split("const REGISTRY")[1] ?? "";
  const available = [...registry.matchAll(/^\s*"?([a-z0-9-]+)"?:\s*\{/gm)].map((m) => m[1]);
  assert.ok(available.length > 0, "could not parse the font registry");

  for (const tenant of TENANT_IDENTITIES) {
    const fonts = tenant.theme.fonts;
    if (!fonts) continue;
    for (const [role, key] of Object.entries(fonts)) {
      if (!key) continue;
      assert.ok(
        available.includes(key),
        `${tenant.slug} theme.fonts.${role} is "${key}", which is not in the registry ` +
          `(${available.join(", ")}) — it would silently fall back to the system font`,
      );
    }
  }
});

/**
 * Guards the failure mode that matters most for an Acknowledgement of Country:
 * one tenant silently inheriting another's, which would name the wrong Country.
 */
test("no tenant reuses another tenant's Acknowledgement of Country", () => {
  const seen = new Map<string, string>();
  for (const slug of TENANT_SLUGS) {
    const text = tenantContent(slug).onboarding.acknowledgement.paragraphs.join(" ");
    const owner = seen.get(text);
    assert.equal(
      owner,
      undefined,
      `"${slug}" has the same Acknowledgement of Country as "${owner}" — each must name its own Country`,
    );
    seen.set(text, slug);
  }
});

test("tenant copy does not leak another tenant's brand name", () => {
  const names = TENANT_SLUGS.map((slug) => ({ slug, name: tenantContent(slug).brand.name }));
  for (const { slug } of names) {
    const content = tenantContent(slug);
    const haystack = [
      content.brand.wordmark,
      content.brand.description,
      ...content.onboarding.slides.flatMap((s) => [s.eyebrow, s.heading, ...s.paragraphs]),
    ]
      .join(" ")
      .toLowerCase();

    for (const other of names) {
      if (other.slug === slug) continue;
      assert.ok(
        !haystack.includes(other.name.toLowerCase()),
        `"${slug}" copy mentions "${other.name}" — likely copied from that tenant`,
      );
    }
  }
});
