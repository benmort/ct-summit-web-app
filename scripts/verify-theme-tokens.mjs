import { readFileSync, readdirSync, statSync } from "node:fs";

function walk(dir, rx, out = []) {
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) walk(p, rx, out);
    else if (rx.test(p)) out.push(p);
  }
  return out;
}

const cssFiles = walk(".next/static/css", /\.css$/);
const css = cssFiles.map((f) => readFileSync(f, "utf8")).join("\n");
console.log(`css chunks: ${cssFiles.length}`);

const src = ["app", "components", "lib"].flatMap((d) => walk(d, /\.(tsx|ts)$/));

const RAMPS = "brand|accent|surface|ink|danger|success";
const SINGLES = "veil|scrim|page|on-brand-muted|on-brand|on-panel|panel";
const PFX =
  "bg|text|border|border-t|border-b|border-l|border-r|ring|ring-offset|divide|from|to|via|decoration|outline|placeholder|caret|fill|stroke";

// Capture the bare utility (variants stripped) — we substring-match in CSS so a
// variant-only class like `hover:bg-surface-900/75` still resolves.
const re = new RegExp(
  `\\b((?:${PFX})-(?:(?:${RAMPS})-(?:50|100|200|300|400|500|600|700|800|900|950)|(?:${SINGLES}))(?:\\/\\d+)?)\\b`,
  "g",
);

const used = new Set();
for (const f of src) {
  for (const m of readFileSync(f, "utf8").matchAll(re)) used.add(m[1]);
}

/**
 * Pre-existing dead classes. Tailwind's opacity scale moves in steps of 5, so
 * these emit no CSS at all. They predate the colour tokenisation (they were
 * `from-black/32`, `via-black/46`, `to-zinc-950/92`) and were left alone so that
 * refactor stayed pixel-identical — fixing them changes rendering.
 */
const KNOWN_DEAD = new Set(["from-scrim/32", "via-scrim/46", "to-surface-950/92"]);

// Tailwind escapes "/" as "\/" inside selectors.
const cssName = (c) => c.replace(/\//g, "\\/");
const missing = [...used].filter((c) => !css.includes(cssName(c)) && !KNOWN_DEAD.has(c));

console.log(`distinct token classes used in source: ${used.size}`);
if (missing.length) {
  console.log(`\nNOT COMPILED (${missing.length}) — these render as nothing:`);
  for (const c of missing.sort()) console.log(`  ${c}`);
  console.log("\nA colour class emits no CSS if its /alpha is not a multiple of 5,");
  console.log("or if the token does not exist. Check tailwind.config.js and app/globals.css.");
  process.exit(1);
}
console.log(
  `PASS: every token class in source compiled into CSS ` +
    `(${KNOWN_DEAD.size} known pre-existing dead classes ignored)`,
);
