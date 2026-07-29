import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { DEFAULT_TENANT_SLUG, identityForSlug } from "@/lib/tenant/domains";
import { tenantStorage } from "@/lib/tenant/types";

/**
 * Per-tenant moderation sessions over one shared login.
 *
 * By default every tenant reads the same `MODERATION_SECRET` and
 * `MODERATION_PASSWORD`, so there is a single password for the team to manage. A
 * tenant can still diverge by setting its own `<moderationEnvPrefix>_SECRET` and
 * `_PASSWORD`, which take precedence when present.
 *
 * Sharing the credentials does NOT share access. Each tenant has its own cookie
 * name, and the tenant slug is signed into the session payload, so a cookie
 * minted for one tenant is rejected by another even when the secret is identical.
 * `tests/tenant/isolation.test.ts` proves this by configuring both tenants with
 * the same secret and requiring cross-tenant rejection.
 */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 6;
const MIN_SECRET_LENGTH = 16;

/** Env vars read for a tenant, in precedence order. */
export type ModerationEnvNames = {
  /** Tenant-specific override, e.g. MODERATION_WOVEN_SECRET. */
  tenantSecret: string;
  tenantPassword: string;
  /** Shared default used when the override is unset. */
  sharedSecret: "MODERATION_SECRET";
  sharedPassword: "MODERATION_PASSWORD";
  /** True when this tenant IS the shared pair, so there is no separate override. */
  isShared: boolean;
};

export type ModerationConfig = {
  slug: string;
  cookie: string;
  secret: string | null;
  password: string | null;
  env: ModerationEnvNames;
};

export function moderationEnvNames(slug: string): ModerationEnvNames {
  const identity = identityForSlug(slug) ?? identityForSlug(DEFAULT_TENANT_SLUG);
  const prefix = identity ? tenantStorage(identity).moderationEnvPrefix : "MODERATION";
  return {
    tenantSecret: `${prefix}_SECRET`,
    tenantPassword: `${prefix}_PASSWORD`,
    sharedSecret: "MODERATION_SECRET",
    sharedPassword: "MODERATION_PASSWORD",
    isShared: prefix === "MODERATION",
  };
}

export function moderationConfig(slug: string): ModerationConfig {
  const identity = identityForSlug(slug) ?? identityForSlug(DEFAULT_TENANT_SLUG);
  if (!identity) {
    throw new Error(`Unknown tenant "${slug}" and no default tenant registered`);
  }
  const { moderationCookie } = tenantStorage(identity);
  const env = moderationEnvNames(identity.slug);

  // Tenant-specific override first, then the shared credentials.
  const secret =
    process.env[env.tenantSecret] || process.env[env.sharedSecret] || "";
  const password =
    process.env[env.tenantPassword] || process.env[env.sharedPassword] || "";

  return {
    slug: identity.slug,
    cookie: moderationCookie,
    secret: secret.length >= MIN_SECRET_LENGTH ? secret : null,
    password: password.length >= MIN_PASSWORD_LENGTH ? password : null,
    env,
  };
}

export function isModerationConfigured(slug: string): boolean {
  const config = moderationConfig(slug);
  return !!config.secret && !!config.password;
}

export function moderationCookieName(slug: string): string {
  return moderationConfig(slug).cookie;
}

/**
 * The tenant slug is bound into the signature, so a cookie minted for one tenant
 * cannot be replayed against another even if they somehow shared a secret.
 */
export function signModerationSession(slug: string): string {
  const config = moderationConfig(slug);
  if (!config.secret) {
    throw new Error(
      `Moderation secret for "${slug}" must be set (min ${MIN_SECRET_LENGTH} chars)`,
    );
  }
  const exp = Date.now() + MAX_AGE_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({ exp, nonce, tenant: config.slug }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", config.secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyModerationToken(slug: string, token: string): boolean {
  try {
    const config = moderationConfig(slug);
    if (!config.secret) return false;
    const i = token.lastIndexOf(".");
    if (i <= 0) return false;
    const payload = token.slice(0, i);
    const sig = token.slice(i + 1);
    const expected = createHmac("sha256", config.secret).update(payload).digest("base64url");
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
      tenant?: string;
    };
    if (typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return false;
    // Reject a session issued for a different tenant.
    if (parsed.tenant !== config.slug) return false;
    return true;
  } catch {
    return false;
  }
}

export function verifyModerationPassword(slug: string, password: string): boolean {
  const config = moderationConfig(slug);
  if (!config.password) return false;
  const a = Buffer.from(password, "utf8");
  const b = Buffer.from(config.password, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function moderationCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  };
}
