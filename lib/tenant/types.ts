export type ThemeMode = "dark" | "light";

export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type RampStep = (typeof RAMP_STEPS)[number];

export type TenantTheme = {
  mode: ThemeMode;
  /**
   * Primary colour 1 — drives the `brand` ramp. Treated as the 500 step; the
   * other ten steps are generated around it.
   *
   * Omit (along with `secondary`) to inherit the palette baked into
   * app/globals.css. The default tenant does exactly that, which is what makes
   * its rendering provably unchanged by the multi-tenant refactor.
   */
  primary?: string;
  /** Primary colour 2 — drives the `accent` ramp, same rules as `primary`. */
  secondary?: string;
  /**
   * Pin individual CSS variables, e.g. { "brand-500": "#fca400" }. Applied last,
   * so a pin always wins over a generated step.
   */
  overrides?: Record<string, string>;
  /**
   * Typefaces, by key from the registry in lib/tenant/fonts.ts. Omit either to
   * fall back to the device's system font stack, which is what the default
   * tenant uses.
   */
  fonts?: {
    /** Headings and the app wordmark. */
    display?: string;
    /** Body copy. */
    body?: string;
  };
};

export type TenantRedirect = {
  /** Path on this tenant's domain, e.g. "/community". */
  source: string;
  /** Absolute destination URL. */
  destination: string;
};

/**
 * The Edge-safe slice of a tenant: everything middleware needs to route a
 * request. Kept deliberately small — middleware must not pull in content or
 * event data.
 */
export type TenantFeatures = {
  /** The shared photo gallery. Defaults to true. */
  moments?: boolean;
};

/**
 * Where this tenant's photos live, and how its moderation session is named.
 *
 * Every field defaults to a slug-namespaced value, so a new tenant is isolated
 * without configuring anything. The default tenant overrides them to the
 * un-namespaced paths its existing photos already occupy — that is what makes
 * this change require no data migration.
 *
 * Secrets are never stored here: `moderationEnvPrefix` names the env vars to
 * read them from.
 */
export type TenantStorage = {
  /** Blob pathname prefix for media. Default `<slug>/album-img/`. */
  blobMediaPrefix?: string;
  /** Blob pathname prefix for manifest shards. Default `<slug>/album-manifests/`. */
  blobManifestPrefix?: string;
  /** Pre-sharding manifest, migrated on first read. Only the default tenant has one. */
  blobLegacyManifestPath?: string | null;
  /** Filesystem root for the local backend, relative to cwd. Default `data/tenants/<slug>`. */
  dataDir?: string;
  /** Env prefix for moderation secrets: `<PREFIX>_SECRET`, `<PREFIX>_PASSWORD`. Default `MODERATION_<SLUG>`. */
  moderationEnvPrefix?: string;
  /** Moderation cookie name. Default `mod_<slug>`. */
  moderationCookie?: string;
};

export type ResolvedTenantStorage = Required<TenantStorage>;

function envPrefixFor(slug: string): string {
  return `MODERATION_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

export function tenantStorage(tenant: TenantIdentity): ResolvedTenantStorage {
  const s = tenant.storage ?? {};
  return {
    blobMediaPrefix: s.blobMediaPrefix ?? `${tenant.slug}/album-img/`,
    blobManifestPrefix: s.blobManifestPrefix ?? `${tenant.slug}/album-manifests/`,
    blobLegacyManifestPath: s.blobLegacyManifestPath ?? null,
    dataDir: s.dataDir ?? `data/tenants/${tenant.slug}`,
    moderationEnvPrefix: s.moderationEnvPrefix ?? envPrefixFor(tenant.slug),
    moderationCookie: s.moderationCookie ?? `mod_${tenant.slug}`,
  };
}

export type TenantIdentity = {
  slug: string;
  /** Display name used in metadata and fallback copy. */
  name: string;
  /** Hostnames that resolve to this tenant. Port and case are ignored. */
  domains: string[];
  theme: TenantTheme;
  features?: TenantFeatures;
  storage?: TenantStorage;
  redirects?: TenantRedirect[];
};

/** Feature flags with defaults applied. */
export function tenantFeatures(tenant: TenantIdentity): Required<TenantFeatures> {
  return { moments: tenant.features?.moments ?? true };
}
