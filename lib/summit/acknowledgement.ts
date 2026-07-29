/**
 * Client-side cookie and event names for the onboarding flow.
 *
 * The copy that used to live here moved to tenants/<slug>/content/onboarding.json
 * so it can differ per tenant. These names stay shared: cookies are scoped to a
 * host by the browser, and each tenant is served from its own domain, so two
 * tenants never see each other's onboarding state.
 */
export const ACKNOWLEDGEMENT_COOKIE_NAME = "ct-acknowledged-country";
export const ACKNOWLEDGEMENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const ACKNOWLEDGEMENT_ACCEPTED_EVENT = "ct:acknowledgement-accepted";

export const DASHBOARD_ONBOARDING_COOKIE_NAME = "ct-dashboard-onboarding-complete";
export const HOMESCREEN_PROMPT_COOKIE_NAME = "ct-homescreen-prompt-complete";
