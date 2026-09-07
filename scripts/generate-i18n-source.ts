/**
 * Regenerates a tenant's `data.i18n/_source.en.json` from its English data.
 *
 * The data dictionary is keyed by the English string, so the source list is
 * every distinct string the translatable fields hold. Editing the programme
 * without regenerating leaves the four dictionaries carrying keys that no
 * longer match anything, and `tests/tenant/i18n.test.ts` fails — this is what
 * that test is telling you to run.
 *
 *   pnpm generate:i18n-source woven
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { TRANSLATABLE_FIELDS } from "@/lib/summit/tenant-data";

const slug = process.argv[2];
if (!slug) {
  console.error("usage: pnpm generate:i18n-source <tenant-slug>");
  process.exit(1);
}

const root = process.cwd();
const dataPath = path.join(root, "tenants", slug, "data.json");
const outPath = path.join(root, "tenants", slug, "data.i18n", "_source.en.json");

const data = JSON.parse(readFileSync(dataPath, "utf8")) as Record<string, unknown>;

function* strings(value: unknown): Generator<string> {
  if (typeof value === "string") {
    if (value.trim()) yield value;
  } else if (Array.isArray(value)) {
    for (const entry of value) yield* strings(entry);
  }
}

/** First-seen order, so a regenerated file diffs cleanly against the last one. */
const source = new Map<string, string>();
for (const [table, fields] of Object.entries(TRANSLATABLE_FIELDS)) {
  const raw = data[table];
  const records = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const record of records) {
    const recordFields = (record as { fields?: Record<string, unknown> }).fields ?? {};
    for (const field of fields) {
      for (const value of strings(recordFields[field])) source.set(value, value);
    }
  }
}

writeFileSync(outPath, `${JSON.stringify(Object.fromEntries(source), null, 2)}\n`);
console.log(`${outPath}: ${source.size} source strings`);
