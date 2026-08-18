import "server-only";

import { getTenantSlug } from "@/lib/tenant/server";
import { getLocale } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/locales";
import type { SummitRecord } from "@/lib/summit/types";
import {
  readTenantAttractions,
  readTenantCodeConduct,
  readTenantCrew,
  readTenantEvents,
  readTenantMap,
  readTenantOrganisations,
  readTenantProgramDays,
  readTenantSchedule,
  readTenantSecurityGuidelines,
  readTenantSpeakers,
  readTenantSponsors,
  readTenantSummits,
  readTenantSurveys,
  readTenantVenues,
  readTenantWhatsappChannels,
} from "@/lib/summit/tenant-data";

/**
 * Request-scoped content API.
 *
 * Each function resolves the tenant itself from the request, which is why none
 * of the ~20 call sites in app/ and components/ needed to change when this
 * became multi-tenant. The reads are already `async`, so the tenant lookup adds
 * no new asynchrony.
 *
 * The `summitViewName` parameter is inherited from the original Airtable-backed
 * implementation and has never been used for filtering. It is kept so call sites
 * stay untouched; removing it is a safe, separate cleanup.
 */

const DEFAULT_SUMMIT_VIEW_NAME = "All";

function ignoreViewName(_summitViewName: string): void {
  void _summitViewName;
}

/** Tenant and language for the current request, resolved once per call. */
async function requestScope(): Promise<[string, Locale]> {
  return Promise.all([getTenantSlug(), getLocale()]);
}

export async function getSummitsAll(): Promise<SummitRecord[]> {
  const [slug, locale] = await requestScope();
  return readTenantSummits(slug, locale);
}

export async function getOrganisationsAll(): Promise<SummitRecord[]> {
  const [slug, locale] = await requestScope();
  return readTenantOrganisations(slug, locale);
}

export async function getCrewAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantCrew(slug, locale);
}

export async function getEventsAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantEvents(slug, locale);
}

export async function getScheduleAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantSchedule(slug, locale);
}

export async function getSpeakersAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantSpeakers(slug, locale);
}

export async function getProgramDaysAll(): Promise<SummitRecord[]> {
  const [slug, locale] = await requestScope();
  return readTenantProgramDays(slug, locale);
}

export async function getSponsorsAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantSponsors(slug, locale);
}

export async function getVenuesAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantVenues(slug, locale);
}

export async function getAttractionsAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantAttractions(slug, locale);
}

export async function getCodeConductStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantCodeConduct(slug, locale);
}

export async function getSecurityGuidelinesStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantSecurityGuidelines(slug, locale);
}

export async function getMapStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantMap(slug, locale);
}

export async function getSurveysStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantSurveys(slug, locale);
}

export async function getWhatsappChannelsStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  const [slug, locale] = await requestScope();
  return readTenantWhatsappChannels(slug, locale);
}
