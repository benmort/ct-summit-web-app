import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { generateRamp, parseHex, themeStyleSheet, themeVariables } from "@/lib/tenant/ramp";
import { RAMP_STEPS } from "@/lib/tenant/types";

const require = createRequire(import.meta.url);
const colors = require("tailwindcss/colors") as Record<string, Record<string, string>>;

const channels = (hex: string) => parseHex(hex).join(" ");
const distance = (a: string, b: string) => {
  const [a1, a2, a3] = a.split(" ").map(Number);
  const [b1, b2, b3] = b.split(" ").map(Number);
  return Math.max(Math.abs(a1 - b1), Math.abs(a2 - b2), Math.abs(a3 - b3));
};

test("the default tenant injects nothing, so globals.css governs it verbatim", () => {
  // This is the guarantee that tokenising colours did not change how Common
  // Threads renders: with no primary/secondary and dark mode, there is no
  // override block at all.
  assert.equal(themeStyleSheet({ mode: "dark" }), "");
  assert.deepEqual(themeVariables({ mode: "dark" }), {});
});

test("a ramp generated from amber-500 reproduces Tailwind's amber ramp", () => {
  // Validates the whole pipeline at once: the lightness/chroma profile, the
  // sRGB->Oklab->sRGB round trip, and gamut clamping.
  const ramp = generateRamp(colors.amber[500]);
  const worst: string[] = [];
  for (const step of RAMP_STEPS) {
    const delta = distance(ramp[step], channels(colors.amber[step]));
    // Exact: the profile was derived from this ramp, and the Oklab round trip
    // is lossless at 8-bit precision.
    if (delta > 1) {
      worst.push(
        `amber-${step}: generated ${ramp[step]}, tailwind ${channels(colors.amber[step])} (delta ${delta})`,
      );
    }
  }
  assert.deepEqual(
    worst,
    [],
    `Generated ramp drifted from the profile it was derived from:\n${worst.join("\n")}`,
  );
});

test("the tenant's primary colour lands exactly on step 500", () => {
  // Buttons and fills use brand-500, so the colour a tenant supplies must be
  // the colour they actually get.
  for (const hex of ["#f59e0b", "#fca400", "#2563eb", "#16a34a", "#db2777"]) {
    const ramp = generateRamp(hex);
    assert.ok(
      distance(ramp[500], channels(hex)) <= 1,
      `${hex}: step 500 was ${ramp[500]}, expected ${channels(hex)}`,
    );
  }
});

test("generated ramps run light to dark without reversals", () => {
  const luma = (c: string) => {
    const [r, g, b] = c.split(" ").map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (const hex of ["#fca400", "#2563eb", "#16a34a"]) {
    const ramp = generateRamp(hex);
    for (let i = 1; i < RAMP_STEPS.length; i++) {
      const prev = RAMP_STEPS[i - 1];
      const curr = RAMP_STEPS[i];
      assert.ok(
        luma(ramp[curr]) < luma(ramp[prev]),
        `${hex}: step ${curr} should be darker than ${prev}`,
      );
    }
  }
});

test("light mode mirrors the neutral ramps so existing classes keep working", () => {
  const vars = themeVariables({ mode: "light" });

  // The darkest surface in dark mode must become the lightest in light mode,
  // because components say bg-surface-950 for "page-level surface".
  assert.equal(vars["surface-950"], channels(colors.zinc[50]));
  assert.equal(vars["surface-900"], channels(colors.zinc[100]));
  assert.equal(vars["surface-50"], channels(colors.zinc[950]));

  // text-ink-100 means "brightest body text" — near-white on dark, near-black on light.
  assert.equal(vars["ink-100"], channels(colors.stone[900]));
  assert.equal(vars["ink-900"], channels(colors.stone[100]));

  // Mid-tones are muted text in both modes and must barely move.
  assert.equal(vars["ink-500"], channels(colors.stone[500]));
  assert.equal(vars["surface-500"], channels(colors.zinc[500]));

  // Page background flips; subtle tints flip from white to black.
  assert.equal(vars.page, channels(colors.stone[50]));
  assert.equal(vars.veil, "0 0 0");
});

test("scrim and panel stay fixed across modes", () => {
  // Media backdrops read best dark whatever the theme, and the upload panel is
  // always light, so neither may be emitted as an override.
  const light = themeVariables({ mode: "light" });
  for (const name of ["scrim", "panel", "on-panel"]) {
    assert.equal(
      light[name],
      undefined,
      `${name} is mode-independent and must not be overridden in light mode`,
    );
  }
});

/**
 * `text-on-brand` sits on a brand-200 -> brand-100 gradient chip. Mirroring in
 * light mode, or a tenant choosing a dark primary, flips that chip dark — so a
 * fixed dark text colour would be unreadable. It has to follow the chip.
 */
test("on-brand contrasts with the brand chip in every mode", () => {
  const luma = (c: string) => {
    const [r, g, b] = c.split(" ").map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };

  const cases = [
    { label: "dark + light brand", theme: { mode: "dark", primary: "#f59e0b" } },
    { label: "light + light brand", theme: { mode: "light", primary: "#f59e0b" } },
    { label: "dark + dark brand", theme: { mode: "dark", primary: "#124a3e" } },
    { label: "light + dark brand", theme: { mode: "light", primary: "#124a3e" } },
    { label: "light, no custom brand", theme: { mode: "light" } },
  ] as const;

  for (const { label, theme } of cases) {
    const vars = themeVariables(theme);
    const chip = vars["brand-200"];
    const text = vars["on-brand"];
    assert.ok(chip, `${label}: brand-200 should be emitted`);
    assert.ok(text, `${label}: on-brand should be emitted`);
    assert.ok(
      Math.abs(luma(chip) - luma(text)) > 0.4,
      `${label}: on-brand ${text} is not readable on brand-200 ${chip}`,
    );
  }
});

test("the default tenant still emits no on-brand override", () => {
  // Dark mode with no custom colours must stay a no-op, so globals.css governs.
  const vars = themeVariables({ mode: "dark" });
  assert.equal(vars["on-brand"], undefined);
  assert.deepEqual(vars, {});
});

test("light mode mirrors the brand ramp so brand text stays legible", () => {
  const dark = themeVariables({ mode: "dark", primary: "#f59e0b" });
  const light = themeVariables({ mode: "light", primary: "#f59e0b" });
  // text-brand-200 is light gold on dark; on a light page it must be dark gold.
  assert.equal(light["brand-200"], dark["brand-800"]);
  // Fills anchored at 500 are unchanged, so buttons keep the tenant's colour.
  assert.equal(light["brand-500"], dark["brand-500"]);
});

test("explicit overrides beat generated steps", () => {
  const vars = themeVariables({
    mode: "dark",
    primary: "#f59e0b",
    overrides: { "brand-500": "#fca400" },
  });
  assert.equal(vars["brand-500"], channels("#fca400"));
});

test("themeStyleSheet emits a :root block only when there is something to set", () => {
  const css = themeStyleSheet({ mode: "dark", primary: "#fca400" });
  assert.match(css, /^:root\{--brand-50:/);
  assert.match(css, /--brand-500:252 164 0/);
  assert.ok(!css.includes("undefined"));
});

test("parseHex accepts shorthand and rejects junk", () => {
  assert.deepEqual(parseHex("#fff"), [255, 255, 255]);
  assert.deepEqual(parseHex("f59e0b"), [245, 158, 11]);
  for (const bad of ["#12", "not-a-colour", "#gggggg", "rgb(1,2,3)", ""]) {
    assert.throws(() => parseHex(bad), /Invalid hex colour/, `${bad} should throw`);
  }
});
