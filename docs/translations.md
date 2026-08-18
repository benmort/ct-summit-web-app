# Translations

Woven is offered in English, Spanish, Russian, French and Portuguese — the
languages its delegates travel from, and the ones its interpreters cover.

## How it fits together

Locale lives in a `ct-locale` cookie, not the URL. Every link in the app is
root-relative and the tenant is already resolved from the host in middleware, so a
locale path segment would mean reworking both for a delegate app nobody deep-links
into by language. `<html lang>` is set from it, which also stops the browser
offering to machine-translate copy that is already translated.

| Layer | Where | Shape |
| --- | --- | --- |
| Language choice | `lib/i18n/locales.ts`, `lib/i18n/server.ts` | cookie + `Accept-Language` for the preselected button only |
| Tenant copy | `tenants/<slug>/content/i18n/<locale>.json` | same shape as the English files, laid over them by `lib/i18n/merge.ts` |
| Event data | `tenants/<slug>/data.i18n/<locale>.json` | flat `{ english: translated }` dictionary |
| Registration | `lib/tenant/content-registry.ts`, `lib/summit/tenant-data.ts` | one import and one entry per language |

**Overlays are partial by design.** A missing key falls back to English rather than
leaving a hole, so a language can be filled in a file at a time.

**Arrays replace wholesale.** `guidance.sections`, `onboarding.slides`,
`navigation.menu` — a half-translated array would interleave two languages, so the
translated array must keep the same length and order. `tests/tenant/i18n.test.ts`
enforces that.

**The data dictionary is keyed by the English string,** not by record and field.
The programme repeats itself heavily — one venue name across thirty-one events —
so this turns ~500 fields into 92 things to write once.
`tenants/woven/data.i18n/_source.en.json` is the generated source list; regenerate
it if the English data changes.

## Two traps

**Some values are identity, not just display text.** A crew `Role` is also the key
the code-of-conduct page deep-links on, and `roleHashToken` keeps only `[a-z0-9]` —
so a translated role would never match in Spanish, and every Cyrillic role would
collapse to the same empty token. Translation therefore keeps the original beside
the translation under `Role [en]` (`ORIGINAL_FIELD_SUFFIX`), and the crew screen
matches on that key while displaying the translated label. If you add another field
that is matched on rather than merely shown, do the same.

**Never translate machinery.** `TRANSLATABLE_FIELDS` in `lib/summit/tenant-data.ts`
is a whitelist for exactly this reason: ids, `Schedule` links and datetimes must
survive untouched or the joins between events, speakers and schedule slots break.

## The glossary

Names of Country and terms carrying cultural meaning are reproduced verbatim inside
translated sentences — nation names, `Country`, `Dreaming`, `Welcome to Country`,
`On Country`, `Yarning`, `Traditional Custodians`, `Elders`, `First Nations`, plus
organisation, venue and personal names. "Country" here means ancestral homeland; a
translator rendering it as a nation-state (`el País`) is the failure the glossary
exists to prevent. `tests/tenant/i18n.test.ts` asserts the terms survive.

## Status: machine-assisted, under review

These translations were produced by an AI, not a professional translator, and the
language screen says so in English and in the reader's own language
(`LOCALE_MACHINE_TRANSLATION_NOTICE`). Woven funds interpreters in exactly these
four languages; they are the right people to review, and each file replaces
one-for-one.

Points a reviewer should look at first:

- **`ACKNOWLEDGEMENT OF COUNTRY`** is left fully in English as a protected term, so
  a Spanish- or Russian-only reader gets no cue what the first heading means.
  Worth a conscious decision.
- **`Cultural Immersion Activities`** is preserved even where the English used it as
  lowercase running prose, so the register jumps mid-sentence and an incidental
  mention now looks like a named programme item.
- **Crew role titles** were translated as gender-neutral function nouns, because the
  crew members' genders are not knowable from the data. Every locale initially
  inferred a gender for Tiana Jakicevich from their name; that was corrected to
  neutral phrasing in all four. Do not reintroduce it.
- **Times** stay in the English `3pm` / `6:30am` form inside translated sentences
  rather than being localised.
- **`Gathering`** is translated (`el Encuentro`, `Всемирная встреча`). If Woven wants
  "Global Gathering" kept as an untranslated event name, that is a find-and-replace.

## Still English

The UI chrome — roughly 95 hardcoded strings across the components, things like
`View Details`, `All roles`, `Filter by role`, `MENU` and the language screen's own
labels — is not yet extracted into a message catalogue. Tenant copy, which is the
overwhelming majority of the words a delegate reads, is translated.

## Adding a language

1. Add it to `LOCALES` and both label maps in `lib/i18n/locales.ts`.
2. Add `tenants/<slug>/content/i18n/<locale>.json` and `data.i18n/<locale>.json`.
3. Register both in `lib/tenant/content-registry.ts` and `lib/summit/tenant-data.ts`.
4. `pnpm test` — the i18n suite checks array lengths, key fidelity, protected terms,
   untouched machinery and the wellbeing deep link.
