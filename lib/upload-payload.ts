import { isAllowedMediaType, maxBytesForMime } from "@/lib/types/photo";

export type ClientUploadPayload = {
  filename: string;
  mime: string;
  pathname: string;
  sessionId: string;
  fileClientId: string;
  expectedCount: number;
  size: number;
};

/**
 * What the server signs into the Vercel Blob token.
 *
 * The tenant is added here, server-side, from the request host — never taken
 * from the browser. It has to travel in the token because `onUploadCompleted` is
 * a server-to-server callback from Vercel with no tenant host to resolve from.
 */
export type UploadTokenPayload = ClientUploadPayload & { tenant: string };

function isSafeId(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{3,160}$/.test(value);
}

function isSafeSlug(value: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(value);
}

/**
 * Validates a payload supplied by the browser.
 *
 * `mediaPrefix` is the calling tenant's blob prefix, resolved from the request
 * host. Requiring it means a client cannot ask for an upload path inside another
 * tenant's namespace.
 */
export function parseClientUploadPayload(
  raw: string | null | undefined,
  mediaPrefix: string,
): ClientUploadPayload {
  if (!raw) {
    throw new Error("Missing client payload");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid client payload");
  }
  const payload = parsed as Partial<ClientUploadPayload>;
  const filename = (payload.filename || "").trim();
  const mime = (payload.mime || "").toLowerCase().trim();
  const pathname = (payload.pathname || "").trim();
  const sessionId = (payload.sessionId || "").trim();
  const fileClientId = (payload.fileClientId || "").trim();
  const expectedCount = Number(payload.expectedCount);
  const size = Number(payload.size);

  if (!filename) throw new Error("Missing filename");
  if (!mediaPrefix) throw new Error("Missing tenant media prefix");
  if (!pathname.startsWith(mediaPrefix)) throw new Error("Invalid pathname");
  // Block traversal out of the tenant's namespace, e.g. "woven/album-img/../../x".
  if (pathname.includes("..")) throw new Error("Invalid pathname");
  if (!isAllowedMediaType(mime)) throw new Error("Unsupported media type");
  if (!isSafeId(sessionId)) throw new Error("Invalid session id");
  if (!isSafeId(fileClientId)) throw new Error("Invalid file id");
  if (!Number.isFinite(expectedCount) || expectedCount < 1 || expectedCount > 200) {
    throw new Error("Invalid expected count");
  }
  if (!Number.isFinite(size) || size < 1) {
    throw new Error("Invalid file size");
  }
  if (size > maxBytesForMime(mime)) {
    throw new Error("File too large");
  }
  return {
    filename,
    mime,
    pathname,
    sessionId,
    fileClientId,
    expectedCount,
    size,
  };
}

export function toTokenPayload(
  payload: ClientUploadPayload,
  tenant: string,
): UploadTokenPayload {
  if (!isSafeSlug(tenant)) throw new Error("Invalid tenant");
  return { ...payload, tenant };
}

/**
 * Which tenant a signed token belongs to.
 *
 * Read this first so the caller can look up that tenant's media prefix, then
 * pass it to `parseTokenPayload` for full validation. Split in two because the
 * prefix is only knowable once the tenant is known.
 */
export function readTokenTenant(raw: string | null | undefined): string {
  if (!raw) throw new Error("Missing token payload");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid token payload");
  }
  const tenant = ((parsed as Partial<UploadTokenPayload>).tenant || "").trim();
  if (!isSafeSlug(tenant)) throw new Error("Invalid tenant in token payload");
  return tenant;
}

/**
 * Reads back a payload this server signed, re-validating the upload path against
 * the named tenant's own prefix so a malformed or tampered token cannot land a
 * file in another tenant's album.
 */
export function parseTokenPayload(
  raw: string | null | undefined,
  mediaPrefix: string,
): UploadTokenPayload {
  const tenant = readTokenTenant(raw);
  const payload = parseClientUploadPayload(raw, mediaPrefix);
  return { ...payload, tenant };
}
