import "server-only";

import { rawTenantData } from "@/lib/tenant/registry";
import type { SummitRecord } from "@/lib/summit/types";

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

/** Exposed for tests and scripts; normal reads go through the accessors below. */
export function tenantSummitData(slug: string): SummitData {
  let data = cache.get(slug);
  if (!data) {
    data = normalizeSummitData(rawTenantData(slug) as SummitDataRaw, slug);
    cache.set(slug, data);
  }
  return data;
}

export const readTenantSummits = (slug: string) => cloneRecordList(tenantSummitData(slug).summits);
export const readTenantSpeakers = (slug: string) => cloneRecordList(tenantSummitData(slug).speakers);
export const readTenantEvents = (slug: string) => cloneRecordList(tenantSummitData(slug).events);
export const readTenantSchedule = (slug: string) => cloneRecordList(tenantSummitData(slug).schedule);
export const readTenantProgramDays = (slug: string) =>
  cloneRecordList(tenantSummitData(slug).programDays);
export const readTenantVenues = (slug: string) => cloneRecordList(tenantSummitData(slug).venues);
export const readTenantCrew = (slug: string) => cloneRecordList(tenantSummitData(slug).crew);
export const readTenantAttractions = (slug: string) =>
  cloneRecordList(tenantSummitData(slug).attractions);
export const readTenantOrganisations = (slug: string) =>
  cloneRecordList(tenantSummitData(slug).organisations);
export const readTenantSponsors = (slug: string) => cloneRecordList(tenantSummitData(slug).sponsors);
export const readTenantSurveys = (slug: string) => cloneRecordList(tenantSummitData(slug).surveys);
export const readTenantWhatsappChannels = (slug: string) =>
  cloneRecordList(tenantSummitData(slug).whatsappChannels);

const cloneOrNull = (record: SummitRecord | null) => (record ? cloneRecord(record) : null);

export const readTenantCodeConduct = (slug: string) =>
  cloneOrNull(tenantSummitData(slug).codeConduct);
export const readTenantSecurityGuidelines = (slug: string) =>
  cloneOrNull(tenantSummitData(slug).securityGuidelines);
export const readTenantMap = (slug: string) => cloneOrNull(tenantSummitData(slug).map);
