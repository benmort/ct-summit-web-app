import "server-only";

import { rawTenantData } from "@/lib/tenant/registry";
import type { SummitRecord } from "@/lib/summit/types";
import { ORIGINAL_FIELD_SUFFIX } from "@/lib/summit/fields";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";

import wvDataEs from "@/tenants/woven/data.i18n/es.json";
import wvDataFr from "@/tenants/woven/data.i18n/fr.json";
import wvDataPt from "@/tenants/woven/data.i18n/pt.json";
import wvDataRu from "@/tenants/woven/data.i18n/ru.json";

/**
 * Which fields a delegate actually reads, and so which get translated.
 *
 * Everything else in a record — ids, dates, urls, schedule links — is machinery
 * and must survive untouched, or the joins between events, speakers and schedule
 * slots break.
 */
const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  summits: ["Name", "Location"],
  events: ["Title", "Description", "Tags", "Room/Area"],
  speakers: ["Full Name", "Title", "Bio", "Description", "Tags", "Talk Format", "Room/Area"],
  venues: ["Name", "Subtitle", "Location", "Description", "Instructions"],
  crew: ["Role"],
  attractions: ["Title", "Description", "Tags"],
  organisations: ["Name", "Country", "Summary"],
  programDays: ["Day Of Week", "Date Label", "Title"],
  codeConduct: ["Content Body"],
  securityGuidelines: ["Content Body"],
};

/**
 * Translations are keyed by the English string rather than by record and field.
 *
 * The programme repeats itself heavily — one venue name across thirty-one events,
 * a handful of category chips — so keying by source string turns roughly five
 * hundred fields into ninety-two things a translator has to write once.
 */
const DATA_TRANSLATIONS: Record<string, Partial<Record<Locale, Record<string, string>>>> = {
  woven: { es: wvDataEs, ru: wvDataRu, fr: wvDataFr, pt: wvDataPt },
};

function translateField(value: unknown, dictionary: Record<string, string>): unknown {
  if (typeof value === "string") return dictionary[value] ?? value;
  if (Array.isArray(value)) return value.map((entry) => translateField(entry, dictionary));
  return value;
}

function translateRecord(
  record: SummitRecord,
  fields: string[],
  dictionary: Record<string, string>,
): SummitRecord {
  const translated = { ...record.fields };
  for (const field of fields) {
    if (!(field in translated)) continue;
    const original = translated[field];
    const next = translateField(original, dictionary);
    if (next !== original) {
      translated[`${field}${ORIGINAL_FIELD_SUFFIX}`] = original;
    }
    translated[field] = next;
  }
  return { id: record.id, fields: translated };
}

/**
 * Normalises and caches each tenant's event data.
 *
 * Previously this normalised one static import at module load. It is now keyed
 * by tenant slug and memoised on first use, so a request for one tenant never
 * pays to parse another's data — and two tenants can never share mutated state,
 * because every read returns a shallow clone.
 */

type SummitDataRaw = {
  summits?: unknown;
  speakers?: unknown;
  events?: unknown;
  schedule?: unknown;
  programDays?: unknown;
  venues?: unknown;
  crew?: unknown;
  attractions?: unknown;
  organisations?: unknown;
  sponsors?: unknown;
  surveys?: unknown;
  whatsappChannels?: unknown;
  codeConduct?: unknown;
  securityGuidelines?: unknown;
  map?: unknown;
};

type SummitData = {
  summits: SummitRecord[];
  speakers: SummitRecord[];
  events: SummitRecord[];
  schedule: SummitRecord[];
  /** Optional per-day programme labels, keyed by `id` = date (YYYY-MM-DD). */
  programDays: SummitRecord[];
  venues: SummitRecord[];
  crew: SummitRecord[];
  attractions: SummitRecord[];
  organisations: SummitRecord[];
  sponsors: SummitRecord[];
  surveys: SummitRecord[];
  whatsappChannels: SummitRecord[];
  codeConduct: SummitRecord | null;
  securityGuidelines: SummitRecord | null;
  map: SummitRecord | null;
};

function fallbackSummit(slug: string): SummitRecord {
  return {
    id: `${slug}-summit-fallback`,
    fields: {
      Name: "Summit",
      Location: "TBD",
      "Start Date": "2026-01-01",
      "End Date": "2026-01-01",
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecord(value: unknown): SummitRecord | null {
  if (!isObject(value)) return null;
  const id = value.id;
  const fields = value.fields;
  if (typeof id !== "string" || !id.trim()) return null;
  if (!isObject(fields)) return null;
  return { id, fields: { ...fields } };
}

function normalizeRecordList(value: unknown): SummitRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeRecord).filter((r): r is SummitRecord => !!r);
}

function cloneRecord(record: SummitRecord): SummitRecord {
  return { id: record.id, fields: { ...record.fields } };
}

function cloneRecordList(records: SummitRecord[]): SummitRecord[] {
  return records.map(cloneRecord);
}

function normalizeSummitData(raw: SummitDataRaw, slug: string): SummitData {
  const summitsRaw = normalizeRecordList(raw.summits);
  const summits = summitsRaw.length > 0 ? [summitsRaw[0]] : [fallbackSummit(slug)];

  const data: SummitData = {
    summits,
    speakers: normalizeRecordList(raw.speakers),
    events: normalizeRecordList(raw.events),
    schedule: normalizeRecordList(raw.schedule),
    programDays: normalizeRecordList(raw.programDays),
    venues: normalizeRecordList(raw.venues),
    crew: normalizeRecordList(raw.crew),
    attractions: normalizeRecordList(raw.attractions),
    organisations: normalizeRecordList(raw.organisations),
    sponsors: normalizeRecordList(raw.sponsors),
    surveys: normalizeRecordList(raw.surveys),
    whatsappChannels: normalizeRecordList(raw.whatsappChannels),
    codeConduct: normalizeRecord(raw.codeConduct),
    securityGuidelines: normalizeRecord(raw.securityGuidelines),
    map: normalizeRecord(raw.map),
  };

  const listSections = [
    "summits", "speakers", "events", "schedule", "venues", "crew",
    "attractions", "organisations", "sponsors", "surveys", "whatsappChannels",
  ] as const;
  for (const section of listSections) {
    if (data[section].length === 0) {
      console.warn(`[tenant:${slug}] section "${section}" is empty or invalid.`);
    }
  }
  for (const section of ["codeConduct", "securityGuidelines", "map"] as const) {
    if (!data[section]) {
      console.warn(`[tenant:${slug}] section "${section}" is missing or invalid.`);
    }
  }

  return data;
}

const cache = new Map<string, SummitData>();

/** Applies a locale's dictionary across every translatable field of every section. */
function translateSummitData(data: SummitData, dictionary: Record<string, string>): SummitData {
  const translated = { ...data } as SummitData;
  for (const [section, fields] of Object.entries(TRANSLATABLE_FIELDS)) {
    const value = data[section as keyof SummitData];
    if (Array.isArray(value)) {
      (translated as Record<string, unknown>)[section] = value.map((record) =>
        translateRecord(record, fields, dictionary),
      );
    } else if (value) {
      (translated as Record<string, unknown>)[section] = translateRecord(
        value as SummitRecord,
        fields,
        dictionary,
      );
    }
  }
  return translated;
}

/** Exposed for tests and scripts; normal reads go through the accessors below. */
export function tenantSummitData(slug: string, locale: Locale = DEFAULT_LOCALE): SummitData {
  const key = `${slug}:${locale}`;
  let data = cache.get(key);
  if (!data) {
    data = normalizeSummitData(rawTenantData(slug) as SummitDataRaw, slug);
    const dictionary = locale === DEFAULT_LOCALE ? null : DATA_TRANSLATIONS[slug]?.[locale];
    if (dictionary && Object.keys(dictionary).length > 0) {
      data = translateSummitData(data, dictionary);
    }
    cache.set(key, data);
  }
  return data;
}

export const readTenantSummits = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).summits);
export const readTenantSpeakers = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).speakers);
export const readTenantEvents = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).events);
export const readTenantSchedule = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).schedule);
export const readTenantProgramDays = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).programDays);
export const readTenantVenues = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).venues);
export const readTenantCrew = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).crew);
export const readTenantAttractions = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).attractions);
export const readTenantOrganisations = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).organisations);
export const readTenantSponsors = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).sponsors);
export const readTenantSurveys = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).surveys);
export const readTenantWhatsappChannels = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneRecordList(tenantSummitData(slug, locale).whatsappChannels);

const cloneOrNull = (record: SummitRecord | null) => (record ? cloneRecord(record) : null);

export const readTenantCodeConduct = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneOrNull(tenantSummitData(slug, locale).codeConduct);
export const readTenantSecurityGuidelines = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneOrNull(tenantSummitData(slug, locale).securityGuidelines);
export const readTenantMap = (slug: string, locale: Locale = DEFAULT_LOCALE) =>
  cloneOrNull(tenantSummitData(slug, locale).map);
