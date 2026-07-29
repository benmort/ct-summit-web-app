import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const tailwindColors = require("tailwindcss/colors") as Record<
  string,
  Record<string, string>
>;

const ROOT = process.cwd();
const GLOBALS_CSS = path.join(ROOT, "app/globals.css");
const TAILWIND_CONFIG = path.join(ROOT, "tailwind.config.js");

/** Ramp token -> the stock Tailwind palette it replaced. */
const RAMP_ORIGIN = {
  brand: "amber",
  accent: "orange",
  surface: "zinc",
  ink: "stone",
  danger: "red",
  success: "emerald",
} as const;

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Singleton token -> the literal colour it replaced. */
const SINGLETON_ORIGIN: Record<string, string> = {
  page: "#000000", // bg-black on <body>
  veil: "#ffffff", // white/alpha tints
  scrim: "#000000", // black/alpha media + modal backdrops
  "on-brand": tailwindColors.zinc[900], // text-zinc-900 on brand fills
  "on-brand-muted": tailwindColors.zinc[700], // text-zinc-700 on brand fills
  panel: "#ffffff", // always-light upload panel
  "on-panel": tailwindColors.stone[900], // text-stone-900 on that panel
};

function hexToChannels(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(" ");
}

/** Every app source file Tailwind scans for class names. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(entry.name)) out.push(p);
    }
  };
  for (const dir of ["app", "components", "lib"]) walk(path.join(ROOT, dir));
  return out;
}

/** Parse `--name: v;` declarations out of globals.css. */
function readDeclaredVars(): Map<string, string> {
  const css = readFileSync(GLOBALS_CSS, "utf8");
  const vars = new Map<string, string>();
  for (const m of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    vars.set(m[1], m[2].trim());
  }
  return vars;
}

test("every ramp token equals the Tailwind colour it replaced", () => {
  const vars = readDeclaredVars();
  const mismatches: string[] = [];

  for (const [token, origin] of Object.entries(RAMP_ORIGIN)) {
    for (const step of STEPS) {
      const name = `${token}-${step}`;
      const actual = vars.get(name);
      const expectedHex = tailwindColors[origin]?.[step];

      assert.ok(expectedHex, `tailwind ${origin}-${step} should exist`);
      assert.ok(actual, `--${name} should be declared in app/globals.css`);

      const expected = hexToChannels(expectedHex);
      if (actual !== expected) {
        mismatches.push(
          `--${name}: got "${actual}", expected "${expected}" (${origin}-${step} ${expectedHex})`,
        );
      }
    }
  }

  assert.deepEqual(
    mismatches,
    [],
    `Default theme drifted from the pre-tokenisation palette:\n${mismatches.join("\n")}`,
  );
});

test("singleton tokens equal the literals they replaced", () => {
  const vars = readDeclaredVars();
  for (const [name, hex] of Object.entries(SINGLETON_ORIGIN)) {
    assert.equal(
      vars.get(name),
      hexToChannels(hex),
      `--${name} should still resolve to ${hex}`,
    );
  }
});

test("channels are space-separated RGB triples so /alpha keeps working", () => {
  const vars = readDeclaredVars();
  const colourNames = [
    ...Object.keys(RAMP_ORIGIN).flatMap((t) => STEPS.map((s) => `${t}-${s}`)),
    ...Object.keys(SINGLETON_ORIGIN),
  ];
  for (const name of colourNames) {
    const value = vars.get(name);
    assert.ok(value, `--${name} should be declared`);
    assert.match(
      value,
      /^\d{1,3} \d{1,3} \d{1,3}$/,
      `--${name} must be "R G B" channels, not "${value}" — Tailwind's ` +
        `rgb(var(--x) / <alpha-value>) cannot consume a hex or rgb() value`,
    );
  }
});

/**
 * Tailwind's opacity scale moves in steps of 5, so `bg-scrim/32` is silently
 * dropped: no CSS is emitted and the class does nothing. These three predate
 * the colour tokenisation (they were `from-black/32`, `via-black/46`,
 * `to-zinc-950/92`) and are left as-is so that refactor stayed pixel-identical.
 * Fixing them means nudging to the nearest valid step, which changes rendering.
 */
const KNOWN_DEAD_ALPHA = new Set([
  "from-scrim/32", // components/summit/SummitDashboardOnboardingGate.tsx:96
  "via-scrim/46", // components/summit/SummitDashboardOnboardingGate.tsx:96
  "to-surface-950/92", // components/summit/SummitDetailView.tsx:21
]);

test("colour utilities only use alpha values Tailwind can emit", () => {
  const validAlphas = new Set(
    Object.keys(require("tailwindcss/defaultTheme").opacity as Record<string, string>),
  );
  const prefixes =
    "bg|text|border|border-t|border-b|border-l|border-r|ring|ring-offset|divide|from|to|via|decoration|outline|placeholder|caret|fill|stroke";
  const ramps = "brand|accent|surface|ink|danger|success";
  const singles = "veil|scrim|page|on-brand-muted|on-brand|on-panel|panel";
  const re = new RegExp(
    `\\b((?:${prefixes})-(?:(?:${ramps})-\\d{2,3}|(?:${singles}))\\/(\\d+))\\b`,
    "g",
  );

  const offenders: string[] = [];
  for (const file of sourceFiles()) {
    for (const m of readFileSync(file, "utf8").matchAll(re)) {
      const [, cls, alpha] = m;
      if (validAlphas.has(alpha)) continue;
      if (KNOWN_DEAD_ALPHA.has(cls)) continue;
      offenders.push(`${path.relative(ROOT, file)}: ${cls}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "These classes use an alpha step Tailwind does not generate, so they render " +
      `as nothing. Use the nearest multiple of 5:\n${offenders.join("\n")}`,
  );
});

test("tailwind config and globals.css declare the same colour tokens", () => {
  const config = readFileSync(TAILWIND_CONFIG, "utf8");
  const vars = readDeclaredVars();

  // Every ramp named in the config must be fully declared in CSS.
  for (const token of Object.keys(RAMP_ORIGIN)) {
    assert.match(
      config,
      new RegExp(`ramp\\("${token}"\\)`),
      `tailwind.config.js should build the ${token} ramp`,
    );
    for (const step of STEPS) {
      assert.ok(
        vars.has(`${token}-${step}`),
        `--${token}-${step} is used by tailwind.config.js but not declared in globals.css`,
      );
    }
  }

  for (const name of Object.keys(SINGLETON_ORIGIN)) {
    assert.ok(
      config.includes(`var(--${name})`),
      `tailwind.config.js should expose a "${name}" colour`,
    );
  }
});
