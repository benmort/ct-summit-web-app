import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { tenantContent } from "@/lib/tenant/content-registry";
import { tenantSummitData } from "@/lib/summit/tenant-data";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { messagesFor } from "@/lib/i18n/messages";
import { ORIGINAL_FIELD_SUFFIX } from "@/lib/summit/fields";
import { roleHashToken } from "@/lib/summit/crew-filters";

const ROOT = process.cwd();
const TRANSLATED: Locale[] = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

const readJson = (p: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));

/**
 * Overlays replace arrays wholesale rather than merging element-by-element, so a
 * translated array of the wrong length would drop or duplicate real content —
 * a missing guidance section, a slide that repeats.
 */
test("every translated array keeps the length of its English source", () => {
  const english = tenantContent("woven", DEFAULT_LOCALE);
  for (const locale of TRANSLATED) {
    const translated = tenantContent("woven", locale);
    assert.equal(
      translated.navigation.tabs.length,
      english.navigation.tabs.length,
      `${locale}: navigation.tabs length drifted`,
    );
    assert.equal(
      translated.navigation.menu.length,
      english.navigation.menu.length,
      `${locale}: navigation.menu length drifted`,
    );
    assert.equal(
      translated.onboarding.slides.length,
      english.onboarding.slides.length,
      `${locale}: onboarding.slides length drifted`,
    );
    assert.equal(
      translated.guidance.sections.length,
      english.guidance.sections.length,
      `${locale}: guidance.sections length drifted`,
    );
    translated.guidance.sections.forEach((section, index) => {
      assert.equal(
        section.paragraphs.length,
        english.guidance.sections[index].paragraphs.length,
        `${locale}: guidance section ${index} lost or gained a paragraph`,
      );
    });
  }
});

/** Hrefs are routes, not copy. A translated one is a 404. */
test("translation never touches a route or a page-subtitle key", () => {
  const english = tenantContent("woven", DEFAULT_LOCALE);
  for (const locale of TRANSLATED) {
    const translated = tenantContent("woven", locale);
    assert.deepEqual(
      translated.navigation.tabs.map((t) => t.href),
      english.navigation.tabs.map((t) => t.href),
      `${locale}: a tab href was translated`,
    );
    assert.deepEqual(
      translated.navigation.menu.map((m) => m.href),
      english.navigation.menu.map((m) => m.href),
      `${locale}: a menu href was translated`,
    );
    assert.deepEqual(
      Object.keys(translated.navigation.pageSubtitles).sort(),
      Object.keys(english.navigation.pageSubtitles).sort(),
      `${locale}: a pageSubtitles key was translated`,
    );
  }
});

/** The dictionary is keyed by English string; a drifted key silently never matches. */
test("every data dictionary carries exactly the source keys", () => {
  const source = Object.keys(readJson("tenants/woven/data.i18n/_source.en.json"));
  for (const locale of TRANSLATED) {
    const dictionary = readJson(`tenants/woven/data.i18n/${locale}.json`);
    const missing = source.filter((key) => !(key in dictionary));
    const extra = Object.keys(dictionary).filter((key) => !source.includes(key));
    assert.deepEqual(missing, [], `${locale}: data dictionary is missing source keys`);
    assert.deepEqual(extra, [], `${locale}: data dictionary has keys not in the source`);
  }
});

/**
 * Names of Country and the terms that carry cultural meaning must survive
 * verbatim. "Country" here is ancestral homeland, and a translator rendering it
 * as a nation-state is the failure this whole glossary exists to prevent.
 */
test("protected terms survive verbatim in every language", () => {
  const NATIONS = ["Gimuy Walubara Yidinji", "Yirrganydji", "Ngadjon-Jii", "Gunggandji"];
  for (const locale of TRANSLATED) {
    const acknowledgement = tenantContent("woven", locale).onboarding.acknowledgement;
    const text = acknowledgement.paragraphs.join(" ");
    for (const nation of NATIONS) {
      assert.ok(text.includes(nation), `${locale}: acknowledgement lost the name "${nation}"`);
    }
  }

  const TERMS = ["Welcome to Country", "On Country", "Yarning", "Dreaming"];
  for (const locale of TRANSLATED) {
    const dictionary = readJson(`tenants/woven/data.i18n/${locale}.json`) as Record<string, string>;
    for (const [english, translated] of Object.entries(dictionary)) {
      for (const term of TERMS) {
        if (!english.includes(term)) continue;
        assert.ok(
          translated.includes(term),
          `${locale}: "${english}" lost the protected term "${term}" (became "${translated}")`,
        );
      }
    }
  }
});

/**
 * The code-of-conduct page deep-links a delegate to the wellbeing contact using
 * the English role, and the slug it builds keeps only [a-z0-9] — so a translated
 * role would never match, and every Cyrillic role would collapse to one empty
 * token. Reporting a grievance is the last link that should quietly break.
 */
test("crew roles keep an English key so the wellbeing deep link survives translation", () => {
  const WELLBEING = "Wellbeing and Grievance Coordinator";
  const wanted = roleHashToken(WELLBEING);
  assert.ok(wanted, "the wellbeing role must produce a non-empty hash token");

  for (const locale of LOCALES) {
    const crew = tenantSummitData("woven", locale).crew;
    const keys = crew.flatMap((record) => {
      const original = record.fields[`Role${ORIGINAL_FIELD_SUFFIX}`];
      const role = record.fields.Role;
      const source = Array.isArray(original) ? original : Array.isArray(role) ? role : [];
      return source.filter((value): value is string => typeof value === "string");
    });
    assert.ok(
      keys.some((key) => roleHashToken(key) === wanted),
      `${locale}: no crew role resolves to "${wanted}" — the code-of-conduct link is broken`,
    );
  }
});

/** Machinery inside a record must never be translated, or the joins come apart. */
test("translation leaves record ids, schedule links and times untouched", () => {
  const english = tenantSummitData("woven", DEFAULT_LOCALE);
  for (const locale of TRANSLATED) {
    const translated = tenantSummitData("woven", locale);
    assert.deepEqual(
      translated.events.map((e) => e.id),
      english.events.map((e) => e.id),
      `${locale}: event ids changed`,
    );
    translated.events.forEach((event, index) => {
      const source = english.events[index];
      assert.deepEqual(
        event.fields.Schedule,
        source.fields.Schedule,
        `${locale}: event ${event.id} lost its schedule link`,
      );
      assert.equal(
        event.fields["DateTime Start [Schedule]"],
        source.fields["DateTime Start [Schedule]"],
        `${locale}: event ${event.id} start time changed`,
      );
    });
  }
});

/**
 * The UI catalogue is flat and hand-merged, so it drifts easily: a key added to
 * English after a translation pass silently renders English to a delegate who
 * chose another language, and a placeholder dropped in translation renders the
 * literal "{count}".
 */
test("every language has the whole UI catalogue, with placeholders intact", () => {
  const english = messagesFor(DEFAULT_LOCALE);
  const keys = Object.keys(english);
  const placeholders = (value: string) =>
    [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

  for (const locale of TRANSLATED) {
    const catalogue = readJson(`lib/i18n/messages/${locale}.json`) as Record<string, string>;

    assert.deepEqual(
      keys.filter((key) => !(key in catalogue)),
      [],
      `${locale}: UI catalogue is missing keys`,
    );
    assert.deepEqual(
      Object.keys(catalogue).filter((key) => !keys.includes(key)),
      [],
      `${locale}: UI catalogue has keys English does not`,
    );

    for (const key of keys) {
      assert.equal(
        placeholders(catalogue[key]),
        placeholders(english[key]),
        `${locale}: "${key}" changed its placeholders — it would render a literal brace`,
      );
    }
  }
});

/** A key referenced by a component but absent from English renders as the raw key. */
test("every t() key used in the app exists in the English catalogue", () => {
  const english = messagesFor(DEFAULT_LOCALE);
  const used = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const next = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else if (entry.name.endsWith(".tsx")) {
        const source = readFileSync(path.join(ROOT, next), "utf8");
        for (const match of source.matchAll(/\bt\(\s*"([a-z][\w.]+)"/g)) used.add(match[1]);
      }
    }
  };
  walk("components");
  walk("app");

  const missing = [...used].filter((key) => !(key in english)).sort();
  assert.deepEqual(missing, [], "components reference catalogue keys that do not exist");
  assert.ok(used.size > 100, `expected the app to use the catalogue widely, saw ${used.size} keys`);
});
