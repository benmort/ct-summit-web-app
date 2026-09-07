import { domainLabel } from "@/lib/summit/domain-data";
import type { NavigationContent } from "@/lib/tenant/content-types";
import type { SummitListDomain } from "@/lib/summit/types";

/**
 * What a tenant calls one of its sections.
 *
 * The platform's own label is English and fixed — "Sponsors" — but a tenant
 * renames the section in its navigation ("Suppliers and Thanks") and translates
 * it there, so the menu and the page it opens would otherwise disagree in every
 * language. The nav label is the tenant's answer; the platform label is the
 * fallback for a section the tenant never lists.
 */
export function tenantDomainLabel(
  domain: SummitListDomain,
  navigation: NavigationContent,
  fallback?: string,
): string {
  const entry = navigation.menu.find((item) => item.href === `/${domain}`);
  return entry?.label?.trim() || fallback || domainLabel(domain);
}
