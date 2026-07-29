import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getPhotoStorage, storageScopeForSlug } from "@/lib/storage";
import { getTenantSlug } from "@/lib/tenant/server";
import { classifyUploadError, safeErrorMessage } from "@/lib/upload-errors";
import { logUploadEvent } from "@/lib/upload-logging";
import {
  parseClientUploadPayload,
  parseTokenPayload,
  readTokenTenant,
  toTokenPayload,
} from "@/lib/upload-payload";
import { getUploadSessionStore } from "@/lib/upload-session-store";
import { ensureUploadAuthorized, ensureUploadRateLimit } from "@/lib/upload-security";
import { isUploadV2Enabled } from "@/lib/upload-config";
import { maxBytesForMime } from "@/lib/types/photo";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob storage not configured" },
      { status: 503 },
    );
  }
  if (!isUploadV2Enabled()) {
    return NextResponse.json(
      { error: "Client blob uploads are disabled" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    // This runs in the browser's request, so the host identifies the tenant.
    const requestTenant = await getTenantSlug();
    const requestScope = storageScopeForSlug(requestTenant);
    await ensureUploadAuthorized(request, requestTenant);
    ensureUploadRateLimit(request, `blob-token:${requestTenant}`);

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientUploadPayload(clientPayload, requestScope.blobMediaPrefix);
        if (!pathname.startsWith(requestScope.blobMediaPrefix)) {
          throw new Error("Invalid pathname");
        }
        if (payload.pathname !== pathname) {
          throw new Error("Payload pathname mismatch");
        }
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: maxBytesForMime(payload.mime),
          addRandomSuffix: false,
          // The tenant is stamped in server-side here. onUploadCompleted below
          // has no host to resolve it from, so this is the only way it survives.
          tokenPayload: JSON.stringify(toTokenPayload(payload, requestTenant)),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Vercel Blob calls this server-to-server: there is no tenant host here,
        // so the tenant must come from the token we signed, never from getTenantSlug().
        const tenant = readTokenTenant(tokenPayload);
        const scope = storageScopeForSlug(tenant);
        const payload = parseTokenPayload(tokenPayload, scope.blobMediaPrefix);

        const storage = getPhotoStorage(tenant);
        const sessions = getUploadSessionStore(tenant);
        if (!storage.registerClientUpload) return;
        await sessions.patchFile(payload.sessionId, payload.fileClientId, {
          status: "uploaded",
          uploadedAt: new Date().toISOString(),
          incrementAttempts: true,
        });
        try {
          const photo = await storage.registerClientUpload({
            pathname: blob.pathname,
            filename: payload.filename,
            mime: payload.mime,
          });
          await sessions.markPhotoRegistered(payload.sessionId, payload.fileClientId, photo.id);
          logUploadEvent("blob-upload.completed", {
            sessionId: payload.sessionId,
            fileClientId: payload.fileClientId,
            photoId: photo.id,
            pathname: blob.pathname,
            mime: payload.mime,
          });
        } catch (error) {
          const message = safeErrorMessage(error);
          await sessions.patchFile(payload.sessionId, payload.fileClientId, {
            status: "failed",
            error: message,
          });
          logUploadEvent(
            "blob-upload.failed",
            {
              sessionId: payload.sessionId,
              fileClientId: payload.fileClientId,
              pathname: blob.pathname,
              mime: payload.mime,
              error: message,
              class: classifyUploadError(error),
            },
            "error",
          );
          throw error;
        }
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const message = safeErrorMessage(e);
    const retryAfterMs = (e as Error & { retryAfterMs?: number })?.retryAfterMs;
    logUploadEvent(
      "blob-upload.request-failed",
      {
        error: message,
        class: classifyUploadError(e),
      },
      "warn",
    );
    return NextResponse.json(
      {
        error: message,
        class: classifyUploadError(e),
        retryAfterMs: retryAfterMs ?? null,
      },
      { status: message === "Unauthorized" ? 401 : message.startsWith("Rate limited") ? 429 : 400 },
    );
  }
}
