import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

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
      legalEntity: brand.legalEntity,
      eventBlurb: brand.eventBlurb,
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

test("referenced brand image assets exist in public/", () => {
  for (const slug of TENANT_SLUGS) {
    const { brand } = tenantContent(slug);
    const paths = [
      brand.assets.logo.src,
      brand.assets.favicon,
      brand.assets.appleTouchIcon,
      // Both are read by components now, so a bad path is a broken screen
      // rather than unused config.
      brand.assets.onboardingBackground,
      brand.assets.heroVideo,
      ...(brand.assets.heroImages ?? []),
      ...brand.assets.faviconPng.map((i) => i.url),
      ...brand.assets.androidChrome.map((i) => i.url),
      ...(brand.assets.headerLogo ? [brand.assets.headerLogo.src] : []),
    ];
    for (const p of paths) {
      assert.ok(
        existsSync(path.join(ROOT, "public", p.replace(/^\//, ""))),
        `${slug}: brand asset "${p}" is referenced but missing from public/`,
      );
    }
  }
});

/**
 * The same guard as above, for `data.json`.
 *
 * Event, attraction and venue records carry their own image paths, and nothing
 * validated them — a typo rendered a broken image rather than failing, because
 * `fieldAttachmentUrl` happily returns whatever string it finds. Remote URLs are
 * left alone; only tenant-local paths are checked.
 *
 * Paths are percent-decoded first: several filenames contain spaces, so the data
 * legitimately stores them encoded and they resolve correctly over HTTP.
 */
test("local image paths in data.json exist in public/", () => {
  for (const slug of TENANT_SLUGS) {
    const raw: unknown = JSON.parse(
      readFileSync(path.join(ROOT, "tenants", slug, "data.json"), "utf8"),
    );
    const missing = new Set<string>();

    const walk = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(walk);
      if (value && typeof value === "object") return Object.values(value).forEach(walk);
      if (typeof value !== "string") return;
      if (!value.startsWith("/") || !/\.(png|jpe?g|webp|avif|svg|mp4|webm)$/i.test(value)) return;
      let decoded = value;
      try {
        decoded = decodeURIComponent(value);
      } catch {
        // Malformed escape: fall through and let the existence check report it.
      }
      if (!existsSync(path.join(ROOT, "public", decoded.replace(/^\//, "")))) missing.add(value);
    };
    walk(raw);

    assert.deepEqual(
      [...missing].sort(),
      [],
      `${slug}: data.json references local images that are missing from public/`,
    );
  }
});

test("brand logos declare their true pixel dimensions", async () => {
  // Both are rendered by next/image at a fixed height with `w-auto`, so a wrong
  // ratio letterboxes the artwork inside the space it reserved rather than
  // failing loudly. Comparing against the file on disk is what surfaces that —
  // the showreel logo shipped as 520x200 against a 3037x1707 file for months.
  for (const slug of TENANT_SLUGS) {
    const { assets } = tenantContent(slug).brand;
    for (const [field, logo] of Object.entries({
      logo: assets.logo,
      headerLogo: assets.headerLogo,
    })) {
      if (!logo) continue;
      assert.ok(logo.src.startsWith("/"), `${slug}: ${field}.src must be a root-relative path`);
      assert.ok(logo.width > 0 && logo.height > 0, `${slug}: ${field} needs real dimensions`);

      const file = path.join(ROOT, "public", logo.src.replace(/^\//, ""));
      const { width, height } = await sharp(file).metadata();
      assert.deepEqual(
        { width: logo.width, height: logo.height },
        { width, height },
        `${slug}: ${field} declares ${logo.width}x${logo.height} but ${logo.src} is ${width}x${height}`,
      );
    }
  }
});

test("the default tenant keeps its text wordmark in the header", () => {
  // Adding a headerLogo to the default tenant would change the Common Threads
  // header, which this refactor is meant to leave untouched.
  assert.equal(
    tenantContent("common-threads").brand.assets.headerLogo,
    undefined,
    "common-threads should render its wordmark as text, not a logo image",
  );
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
