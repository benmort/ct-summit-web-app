# Translations

Woven is offered in English, Spanish, Russian, French and Portuguese — the
languages its delegates travel from. Interpreters in the room cover a narrower
set: English, Spanish and Portuguese (brief 8.9), so for a French- or
Russian-speaking delegate the app is the only thing in their own language.

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
| UI chrome | `lib/i18n/messages/<locale>.json` | flat `key: string`, laid over English; `_notes.en.json` carries the per-key context a translator needs |
| Event data | `tenants/<slug>/data.i18n/<locale>.json` | flat `{ english: translated }` dictionary |
| Registration | `lib/tenant/content-registry.ts`, `lib/summit/tenant-data.ts` | one import and one entry per language |

**Overlays are partial by design.** A missing key falls back to English rather than
leaving a hole, so a language can be filled in a file at a time.

**Arrays replace wholesale.** `guidance.sections`, `onboarding.slides`,
`navigation.menu` — a half-translated array would interleave two languages, so the
translated array must keep the same length and order. `tests/tenant/i18n.test.ts`
enforces that.

**The data dictionary is keyed by the English string,** not by record and field.
The programme repeats itself heavily — one venue name across forty-three events —
so this turns well over a thousand fields into 142 things to write once.
`tenants/woven/data.i18n/_source.en.json` is the generated source list; regenerate
it with `pnpm generate:i18n-source woven` whenever the English data changes, then
fill the four dictionaries — the i18n suite fails until their keys match.

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
(`LOCALE_MACHINE_TRANSLATION_NOTICE`). Woven funds Spanish and Portuguese
interpreters, who are the right people to review those two; French and Russian
have no reviewer attached to the gathering. Each file replaces one-for-one.

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

## UI chrome

The app's own words — buttons, headings, empty states, screen-reader labels — live in
`lib/i18n/messages/`, 182 flat dot-namespaced keys across five languages.

    // client component
    import { useT } from "@/components/MessagesProvider";
    const t = useT();
    <span>{t("program.viewDetails")}</span>

    // server component
    import { getT } from "@/lib/i18n/server-messages";
    const t = await getT();

Interpolate with named braces — `t("lists.emptyBody", { label })` — never by gluing
translated fragments together, because word order differs between languages.

`lib/i18n/messages/_notes.en.json` records, per key, where the string appears and how
much room it has. Keep it up to date: it is the only thing telling a translator that
a string sits in a 78px button versus being screen-reader-only.

Two tests guard this. One asserts every language has every key with placeholders
intact, so a key added to English cannot silently render English to a Spanish reader.
The other asserts every `t("…")` key used in a component exists, so a typo fails the
build rather than printing the raw key at a delegate.

Still English by choice: the moderation login and admin dialogs, which are
password-gated staff surfaces.

## Adding a language

1. Add it to `LOCALES` and both label maps in `lib/i18n/locales.ts`.
2. Add `tenants/<slug>/content/i18n/<locale>.json` and `data.i18n/<locale>.json`.
3. Register both in `lib/tenant/content-registry.ts` and `lib/summit/tenant-data.ts`.
4. `pnpm test` — the i18n suite checks array lengths, key fidelity, protected terms,
   untouched machinery and the wellbeing deep link.
