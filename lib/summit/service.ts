import "server-only";

import { getTenantSlug } from "@/lib/tenant/server";
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

export async function getSummitsAll(): Promise<SummitRecord[]> {
  return readTenantSummits(await getTenantSlug());
}

export async function getOrganisationsAll(): Promise<SummitRecord[]> {
  return readTenantOrganisations(await getTenantSlug());
}

export async function getCrewAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantCrew(await getTenantSlug());
}

export async function getEventsAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantEvents(await getTenantSlug());
}

export async function getScheduleAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantSchedule(await getTenantSlug());
}

export async function getSpeakersAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantSpeakers(await getTenantSlug());
}

export async function getProgramDaysAll(): Promise<SummitRecord[]> {
  return readTenantProgramDays(await getTenantSlug());
}

export async function getSponsorsAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantSponsors(await getTenantSlug());
}

export async function getVenuesAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantVenues(await getTenantSlug());
}

export async function getAttractionsAll(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantAttractions(await getTenantSlug());
}

export async function getCodeConductStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  ignoreViewName(summitViewName);
  return readTenantCodeConduct(await getTenantSlug());
}

export async function getSecurityGuidelinesStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  ignoreViewName(summitViewName);
  return readTenantSecurityGuidelines(await getTenantSlug());
}

export async function getMapStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord | null> {
  ignoreViewName(summitViewName);
  return readTenantMap(await getTenantSlug());
}

export async function getSurveysStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantSurveys(await getTenantSlug());
}

export async function getWhatsappChannelsStatic(
  summitViewName = DEFAULT_SUMMIT_VIEW_NAME,
): Promise<SummitRecord[]> {
  ignoreViewName(summitViewName);
  return readTenantWhatsappChannels(await getTenantSlug());
}
