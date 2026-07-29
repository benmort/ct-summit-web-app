import { identityForSlug, DEFAULT_TENANT_SLUG } from "@/lib/tenant/domains";
import { tenantStorage } from "@/lib/tenant/types";
import { createFilesystemStorage } from "./filesystem";
import type { PhotoStorage, StorageScope } from "./types";
import { createVercelBlobPhotoStorage } from "./vercel-blob";

/**
 * Photo storage, one instance per tenant.
 *
 * This used to be a single module-level singleton, which meant every tenant read
 * the same album. Instances are now memoised by slug and each is bound to a
 * `StorageScope` derived from its tenant.json, so isolation is structural rather
 * than something each API route has to remember to enforce.
 */
const instances = new Map<string, PhotoStorage>();

export function storageScopeForSlug(slug: string): StorageScope {
  const identity = identityForSlug(slug) ?? identityForSlug(DEFAULT_TENANT_SLUG);
  if (!identity) {
    throw new Error(`Unknown tenant "${slug}" and no default tenant registered`);
  }
  const storage = tenantStorage(identity);
  return {
    slug: identity.slug,
    blobMediaPrefix: storage.blobMediaPrefix,
    blobManifestPrefix: storage.blobManifestPrefix,
    blobLegacyManifestPath: storage.blobLegacyManifestPath,
    dataDir: storage.dataDir,
  };
}

export function getPhotoStorage(slug: string): PhotoStorage {
  const scope = storageScopeForSlug(slug);
  let instance = instances.get(scope.slug);
  if (!instance) {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    instance = blobToken
      ? createVercelBlobPhotoStorage(blobToken, scope)
      : createFilesystemStorage(scope);
    instances.set(scope.slug, instance);
  }
  return instance;
}

export type { PhotoStorage, StorageScope } from "./types";
