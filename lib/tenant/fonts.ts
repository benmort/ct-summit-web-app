import { Anuphan, Fjalla_One } from "next/font/google";

/**
 * Fonts a tenant may choose, by key in its tenant.json `theme.fonts`.
 *
 * next/font requires literal, statically analysable calls — the font name cannot
 * come from a variable — so available typefaces are registered here rather than
 * named freely in tenant.json. Adding one means adding an import and an entry.
 *
 * Every font is self-hosted and preloaded by Next at build time, so no request
 * goes to Google at runtime and the CSP needs no external font host.
 */
const anuphan = Anuphan({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const fjallaOne = Fjalla_One({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export type TenantFont = {
  /** Applied to <html> so Next emits the @font-face rules and preloads the files. */
  className: string;
  /** The resolved family stack, injected as a CSS variable. */
  fontFamily: string;
};

const REGISTRY: Record<string, TenantFont> = {
  anuphan: { className: anuphan.className, fontFamily: anuphan.style.fontFamily },
  "fjalla-one": { className: fjallaOne.className, fontFamily: fjallaOne.style.fontFamily },
};

export const AVAILABLE_FONTS = Object.keys(REGISTRY);

function lookup(key: string | undefined, tenantSlug: string): TenantFont | null {
  if (!key) return null;
  const font = REGISTRY[key];
  if (!font) {
    console.warn(
      `[tenant:${tenantSlug}] unknown font "${key}"; using the system stack. ` +
        `Available: ${AVAILABLE_FONTS.join(", ")}`,
    );
    return null;
  }
  return font;
}

/**
 * Resolves a tenant's fonts into the CSS variables and the classes that load
 * them. Returns empty values when the tenant declares no fonts, leaving the
 * system stack from app/globals.css in place.
 */
export function resolveTenantFonts(
  fonts: { display?: string; body?: string } | undefined,
  tenantSlug: string,
): { classNames: string; vars: Record<string, string> } {
  const body = lookup(fonts?.body, tenantSlug);
  const display = lookup(fonts?.display, tenantSlug);

  const vars: Record<string, string> = {};
  if (body) vars["font-body"] = body.fontFamily;
  // Headings fall back to the body font when only one is given.
  if (display) vars["font-display"] = display.fontFamily;
  else if (body) vars["font-display"] = body.fontFamily;

  const classNames = [body?.className, display?.className]
    .filter((c): c is string => !!c)
    // Both fonts can resolve to the same class; de-duplicate.
    .filter((c, i, all) => all.indexOf(c) === i)
    .join(" ");

  return { classNames, vars };
}
