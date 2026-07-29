import { type Photo, type PhotoRecord, mediaKindFromMime } from "../types/photo";

export type ReadFileResult = {
  buffer: Buffer;
  mime: string;
  /** Full object size in bytes */
  totalSize: number;
  /** True when `buffer` is a byte range slice, not the full file */
  ranged: boolean;
};

export type ReadFileRange = { start: number; end: number };

export type FileMeta = {
  totalSize: number;
  mime: string;
};

/**
 * Swap this implementation for Supabase, S3, Cloudinary, etc.
 * Keep the same surface area for uploads and listing.
 */
/**
 * Which tenant's photos a storage instance may touch.
 *
 * Both backends take one of these instead of module-level path constants, so two
 * tenants can never read or delete each other's media. Built from tenant.json by
 * `getPhotoStorage`.
 */
export type StorageScope = {
  slug: string;
  /** Blob pathname prefix for media, e.g. "album-img/" or "woven/album-img/". */
  blobMediaPrefix: string;
  /** Blob pathname prefix for manifest shards. */
  blobManifestPrefix: string;
  /** Pre-sharding manifest to migrate from, or null if this tenant never had one. */
  blobLegacyManifestPath: string | null;
  /** Filesystem root for the local backend, relative to cwd. */
  dataDir: string;
};

export type FileVariant = "original" | "wall" | "thumb" | "display";

export interface PhotoStorage {
  list(): Promise<Photo[]>;
  /** Paginated list (newest first). */
  listPaged(offset: number, limit: number): Promise<{ photos: Photo[]; total: number }>;
  /** Targeted fetch by IDs; used to avoid eventual-consistency list races. */
  listByIds?(ids: string[]): Promise<Photo[]>;
  /** Append one image or video; returns public Photo + persisted record */
  createFromBuffer(input: {
    buffer: Buffer;
    filename: string;
    mime: string;
    /** Override the stored timestamp (defaults to now). Controls gallery order. */
    uploadedAt?: string;
  }): Promise<Photo>;
  /** Size and MIME for Range requests and headers (no full body read). */
  getFileMeta(id: string, variant?: FileVariant): Promise<FileMeta | null>;
  readFile(
    id: string,
    range?: ReadFileRange,
    variant?: FileVariant,
  ): Promise<ReadFileResult | null>;
  /** Remove manifest entry and stored media; returns true if a record existed. */
  deleteById(id: string): Promise<boolean>;
  /** After Vercel Blob client upload completes (blob storage only). */
  registerClientUpload?(input: {
    pathname: string;
    filename: string;
    mime: string;
  }): Promise<Photo>;
  /** Optional operational hook for shard/index verification and repair. */
  repairManifest?(): Promise<{ repaired: boolean; details: string[] }>;
}

export function recordToPhoto(r: PhotoRecord): Photo {
  const base = `/api/photos/${r.id}/file`;
  const kind = mediaKindFromMime(r.mime);
  const wallUrl =
    kind === "image" && r.wallStoredName
      ? `${base}?variant=wall`
      : undefined;
  const thumbUrl =
    kind === "image" && r.thumbStoredName
      ? `${base}?variant=thumb`
      : undefined;
  const displayUrl =
    kind === "image" && r.displayStoredName
      ? `${base}?variant=display`
      : undefined;
  return {
    id: r.id,
    filename: r.filename,
    url: base,
    wallUrl,
    thumbUrl,
    displayUrl,
    uploadedAt: r.uploadedAt,
    kind,
    blurDataUrl: r.blurDataUrl,
    width: r.width,
    height: r.height,
  };
}
