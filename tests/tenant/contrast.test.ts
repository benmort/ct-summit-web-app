import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { TENANT_IDENTITIES } from "@/lib/tenant/domains";
import { themeVariables } from "@/lib/tenant/ramp";
import type { TenantTheme } from "@/lib/tenant/types";

/**
 * Legibility audit for the token system.
 *
 * Light mode works by mirroring the neutral and brand ramps, which means a token
 * pair that reads well in dark mode can silently invert into
 * dark-text-on-dark-background. That is not hypothetical: it shipped twice —
 * `on-brand` on the mirrored brand chip, and bright ink over the permanently dark
 * `scrim` — and both were found by this check rather than by eye.
 */

const ROOT = process.cwd();

/** Token defaults from globals.css, used for anything a tenant does not override. */
function cssDefaults(): Record<string, string> {
  const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*(\d+ \d+ \d+);/g)) out[m[1]] = m[2];
  return out;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

function luminance(channels: string): number {
  const [r, g, b] = channels.split(" ").map((v) => toLinear(Number(v) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Foreground/background pairs that actually occur in the rendered UI. */
const PAIRS: Array<[fg: string, bg: string, what: string]> = [
  ["ink-100", "page", "body text on the page"],
  ["ink-50", "surface-900", "card heading on a card"],
  ["ink-200", "surface-900", "card body on a card"],
  ["ink-300", "surface-900", "muted card text"],
  ["brand-200", "page", "accent text on the page"],
  ["brand-100", "surface-900", "accent text on a card"],
  ["brand-200", "surface-900", "accent label on a card"],
  ["on-brand", "brand-200", "text on the selected-day chip"],
  ["on-brand-muted", "brand-200", "muted text on the chip"],
  ["on-scrim", "scrim", "text over a photo backdrop"],
  ["on-scrim-muted", "scrim", "muted text over a photo backdrop"],
  ["on-panel", "panel", "text on the upload panel"],
];

/**
 * Themes to audit: every registered tenant, plus synthetic ones covering the
 * corners a future tenant could hit — a very dark brand, a very light brand, and
 * light mode with no custom colours at all.
 */
function themesUnderTest(): Array<{ label: string; theme: TenantTheme }> {
  const registered = TENANT_IDENTITIES.map((t) => ({
    label: `${t.slug} (${t.theme.mode})`,
    theme: t.theme,
  }));
  const synthetic: Array<{ label: string; theme: TenantTheme }> = [
    { label: "synthetic: light, no custom colours", theme: { mode: "light" } },
    { label: "synthetic: light, very dark brand", theme: { mode: "light", primary: "#0b1f1a" } },
    { label: "synthetic: light, very light brand", theme: { mode: "light", primary: "#ffe9a3" } },
    { label: "synthetic: dark, very dark brand", theme: { mode: "dark", primary: "#0b1f1a" } },
    { label: "synthetic: dark, very light brand", theme: { mode: "dark", primary: "#ffe9a3" } },
  ];
  return [...registered, ...synthetic];
}

/** WCAG AA for body text. Anything under this is a real legibility problem. */
const MIN_RATIO = 4.5;

test("every token pair stays legible in every tenant theme", () => {
  const defaults = cssDefaults();
  const failures: string[] = [];

  for (const { label, theme } of themesUnderTest()) {
    const vars = { ...defaults, ...themeVariables(theme) };
    for (const [fg, bg, what] of PAIRS) {
      const a = vars[fg];
      const b = vars[bg];
      assert.ok(a, `${label}: token "${fg}" is not defined`);
      assert.ok(b, `${label}: token "${bg}" is not defined`);

      const ratio = contrastRatio(a, b);
      if (ratio < MIN_RATIO) {
        failures.push(
          `${label}: ${what} — ${fg} (${a}) on ${bg} (${b}) is only ${ratio.toFixed(2)}:1`,
        );
      }
    }
  }

  assert.deepEqual(
    failures,
    [],
    `These token pairs fall below WCAG AA (${MIN_RATIO}:1).\n` +
      `A pair usually breaks because one side mirrors in light mode and the other ` +
      `is fixed — check whether the foreground needs an "on-*" token that stays ` +
      `put, the way on-scrim and on-brand do.\n\n${failures.join("\n")}`,
  );
});

test("the tokens that must not mirror really do stay fixed", () => {
  // scrim is a media backdrop and panel is the upload sheet: both are dark/light
  // by nature, not by theme, so their paired text must be fixed too.
  const defaults = cssDefaults();
  for (const { label, theme } of themesUnderTest()) {
    const vars = themeVariables(theme);
    for (const token of ["scrim", "on-scrim", "on-scrim-muted", "panel", "on-panel"]) {
      assert.equal(
        vars[token],
        undefined,
        `${label}: "${token}" must never be overridden per theme`,
      );
      assert.ok(defaults[token], `"${token}" should be defined in globals.css`);
    }
  }
});
