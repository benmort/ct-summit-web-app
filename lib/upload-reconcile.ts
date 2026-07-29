import { getPhotoStorage } from "@/lib/storage";
import { TENANT_SLUGS } from "@/lib/tenant/domains";
import { logUploadEvent } from "@/lib/upload-logging";
import { getUploadSessionStore } from "@/lib/upload-session-store";

export type ReconcileResult = {
  tenant: string;
  scannedSessions: number;
  completedSessions: number;
  healedFiles: number;
  repairedManifest: boolean;
  details: string[];
};

/** Sweep one tenant's stalled upload sessions and repair its manifest. */
export async function reconcileUploads(slug: string): Promise<ReconcileResult> {
  const store = getUploadSessionStore(slug);
  const sessions = await store.listActive(200);
  let healedFiles = 0;
  let completedSessions = 0;
  const details: string[] = [];
  const now = Date.now();

  for (const session of sessions) {
    const expired = new Date(session.expiresAt).getTime() <= now;
    if (session.complete) {
      completedSessions += 1;
      continue;
    }
    if (!expired) continue;
    for (const file of Object.values(session.files)) {
      if (file.status === "registered" || file.status === "failed") continue;
      await store.patchFile(session.sessionId, file.clientFileId, {
        status: "failed",
        error: "Session expired before upload completion",
      });
      healedFiles += 1;
    }
    details.push(`Expired session ${session.sessionId} marked incomplete files as failed`);
  }

  let repairedManifest = false;
  const storage = getPhotoStorage(slug);
  if (storage.repairManifest) {
    const result = await storage.repairManifest();
    repairedManifest = result.repaired;
    details.push(...result.details);
  }

  logUploadEvent("uploads.reconciled", {
    tenant: slug,
    scannedSessions: sessions.length,
    healedFiles,
    repairedManifest,
  });

  return {
    tenant: slug,
    scannedSessions: sessions.length,
    completedSessions,
    healedFiles,
    repairedManifest,
    details,
  };
}

/**
 * Sweep every tenant.
 *
 * The cron route has no request host to resolve a tenant from, so it cannot pick
 * one — it has to walk the registry. Tenants are processed independently so one
 * failing backend does not stop the rest.
 */
export async function reconcileAllTenants(): Promise<{
  tenants: ReconcileResult[];
  errors: Array<{ tenant: string; error: string }>;
}> {
  const tenants: ReconcileResult[] = [];
  const errors: Array<{ tenant: string; error: string }> = [];

  for (const slug of TENANT_SLUGS) {
    try {
      tenants.push(await reconcileUploads(slug));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reconciliation failed";
      errors.push({ tenant: slug, error: message });
      logUploadEvent("uploads.reconcile-failed", { tenant: slug, error: message }, "error");
    }
  }

  return { tenants, errors };
}
