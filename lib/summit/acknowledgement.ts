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

export type OnboardingStage = "acknowledgement" | "onboarding" | "homescreenPrompt" | "ready";

/**
 * Which onboarding step a visitor is up to, from whichever cookie jar you have.
 *
 * Shared so the server and the client agree. The server resolves this from the
 * request cookies and seeds the gate with it, which is what puts the dashboard in
 * the server-rendered HTML: it used to resolve only in a mount effect, so the
 * whole home screen arrived after load — invisible to browser translation, and a
 * blank first paint for every returning delegate.
 */
export function onboardingStageFrom(hasCookie: (name: string) => boolean): OnboardingStage {
  if (hasCookie(DASHBOARD_ONBOARDING_COOKIE_NAME)) {
    return hasCookie(HOMESCREEN_PROMPT_COOKIE_NAME) ? "ready" : "homescreenPrompt";
  }
  return hasCookie(ACKNOWLEDGEMENT_COOKIE_NAME) ? "onboarding" : "acknowledgement";
}
