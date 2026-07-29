import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import type { PhotoRecord } from "../types/photo";
import {
  extensionForMime,
  isAllowedMediaType,
  isAllowedVideoType,
  maxBytesForMime,
} from "../types/photo";
import { makeImageDerivatives } from "../image-derivatives";
import type {
  FileVariant,
  PhotoStorage,
  ReadFileRange,
  ReadFileResult,
  StorageScope,
} from "./types";
import { recordToPhoto } from "./types";

/**
 * Filesystem layout for one tenant. Derived from its StorageScope rather than
 * fixed at module level, so two tenants never share a manifest or upload dir.
 */
type Paths = { dataDir: string; uploadsDir: string; indexPath: string };

function pathsFor(scope: StorageScope): Paths {
  const dataDir = path.isAbsolute(scope.dataDir)
    ? scope.dataDir
    : path.join(process.cwd(), scope.dataDir);
  return {
    dataDir,
    uploadsDir: path.join(dataDir, "uploads"),
    indexPath: path.join(dataDir, "photos.json"),
  };
}

async function readStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function ensureDirs(p: Paths): Promise<void> {
  await fs.mkdir(p.uploadsDir, { recursive: true });
}

async function readIndex(p: Paths): Promise<PhotoRecord[]> {
  try {
    const raw = await fs.readFile(p.indexPath, "utf-8");
    const parsed = JSON.parse(raw) as PhotoRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(p: Paths, records: PhotoRecord[]): Promise<void> {
  await fs.mkdir(p.dataDir, { recursive: true });
  const tmp = `${p.indexPath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(records, null, 2), "utf-8");
  await fs.rename(tmp, p.indexPath);
}

async function makeBlurDataUrl(buffer: Buffer): Promise<string | undefined> {
  try {
    const out = await sharp(buffer)
      .rotate()
      .resize(12, 12, { fit: "inside" })
      .jpeg({ quality: 55 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function readMeta(buffer: Buffer): Promise<{ width?: number; height?: number }> {
  try {
    const meta = await sharp(buffer).metadata();
    return {
      width: meta.width ?? undefined,
      height: meta.height ?? undefined,
    };
  } catch {
    return {};
  }
}

function variantMime(variant: FileVariant, recMime: string): string {
  if (variant === "wall") return "image/webp";
  if (variant === "thumb") return "image/webp";
  if (variant === "display") return "image/jpeg";
  return recMime;
}

function variantCandidates(rec: PhotoRecord): string[] {
  const names = new Set<string>();
  if (rec.storedName) names.add(rec.storedName);
  if (rec.wallStoredName) names.add(rec.wallStoredName);
  if (rec.thumbStoredName) names.add(rec.thumbStoredName);
  if (rec.displayStoredName) names.add(rec.displayStoredName);

  const baseNames = new Set<string>();
  if (rec.id) baseNames.add(rec.id);
  const storedBase = rec.storedName.replace(/\.[^.]+$/, "");
  if (storedBase) baseNames.add(storedBase);

  const uploadId = (rec as Record<string, unknown>).uploadId;
  if (typeof uploadId === "string" && uploadId.trim()) {
    baseNames.add(uploadId.trim());
  }

  for (const base of baseNames) {
    names.add(`${base}-wall.webp`);
    names.add(`${base}-thumb.webp`);
    names.add(`${base}-display.jpg`);
    names.add(`${base}-display.jpeg`);
  }

  return [...names];
}

export function createFilesystemStorage(scope: StorageScope): PhotoStorage {
  const P = pathsFor(scope);
  return {
    async list() {
      const records = await readIndex(P);
      return records.map(recordToPhoto);
    },

    async listPaged(offset: number, limit: number) {
      const records = await readIndex(P);
      const total = records.length;
      const slice = records.slice(offset, offset + limit);
      return { photos: slice.map(recordToPhoto), total };
    },

    async listByIds(ids: string[]) {
      if (!ids.length) return [];
      const records = await readIndex(P);
      const byId = new Map(records.map((r) => [r.id, r]));
      return ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((r) => recordToPhoto(r!));
    },

    async getFileMeta(id: string, variant: FileVariant = "original") {
      const records = await readIndex(P);
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      if (variant === "wall" && !rec.wallStoredName) return null;
      if (variant === "thumb" && !rec.thumbStoredName) return null;
      if (variant === "display" && !rec.displayStoredName) return null;
      const name =
        variant === "wall" && rec.wallStoredName
          ? rec.wallStoredName
          : variant === "thumb" && rec.thumbStoredName
          ? rec.thumbStoredName
          : variant === "display" && rec.displayStoredName
            ? rec.displayStoredName
            : rec.storedName;
      const filePath = path.join(P.uploadsDir, name);
      try {
        const stat = await fs.stat(filePath);
        return { totalSize: stat.size, mime: variantMime(variant, rec.mime) };
      } catch {
        return null;
      }
    },

    async createFromBuffer(input) {
      const { buffer, filename, mime } = input;
      const uploadedAt = input.uploadedAt ?? new Date().toISOString();
      if (!isAllowedMediaType(mime)) {
        throw new Error("Unsupported media type");
      }
      const limit = maxBytesForMime(mime);
      if (buffer.length > limit) {
        throw new Error("File too large");
      }

      await ensureDirs(P);
      const id = randomUUID();
      const ext = extensionForMime(mime);
      const storedName = `${id}.${ext}`;
      const filePath = path.join(P.uploadsDir, storedName);

      await fs.writeFile(filePath, buffer);

      const isVideo = isAllowedVideoType(mime);
      let wallStoredName: string | undefined;
      let thumbStoredName: string | undefined;
      let displayStoredName: string | undefined;
      const [blurDataUrl, meta] = isVideo
        ? [undefined, {}] as [undefined, { width?: number; height?: number }]
        : await Promise.all([makeBlurDataUrl(buffer), readMeta(buffer)]);

      if (!isVideo) {
        const { wall, thumb, display } = await makeImageDerivatives(buffer);
        wallStoredName = `${id}-wall.webp`;
        thumbStoredName = `${id}-thumb.webp`;
        displayStoredName = `${id}-display.jpg`;
        await fs.writeFile(path.join(P.uploadsDir, wallStoredName), wall);
        await fs.writeFile(path.join(P.uploadsDir, thumbStoredName), thumb);
        await fs.writeFile(path.join(P.uploadsDir, displayStoredName), display);
      }

      const record: PhotoRecord = {
        id,
        filename: filename || (isVideo ? `video.${ext}` : `photo.${ext}`),
        uploadedAt,
        storedName,
        mime,
        blurDataUrl,
        width: meta.width,
        height: meta.height,
        wallStoredName,
        thumbStoredName,
        displayStoredName,
      };

      const records = await readIndex(P);
      records.unshift(record);
      await writeIndex(P, records);

      return recordToPhoto(record);
    },

    async readFile(
      id: string,
      range?: ReadFileRange,
      variant: FileVariant = "original",
    ): Promise<ReadFileResult | null> {
      const records = await readIndex(P);
      const rec = records.find((r) => r.id === id);
      if (!rec) return null;
      if (variant === "wall" && !rec.wallStoredName) return null;
      if (variant === "thumb" && !rec.thumbStoredName) return null;
      if (variant === "display" && !rec.displayStoredName) return null;
      const fileName =
        variant === "wall" && rec.wallStoredName
          ? rec.wallStoredName
          : variant === "thumb" && rec.thumbStoredName
          ? rec.thumbStoredName
          : variant === "display" && rec.displayStoredName
            ? rec.displayStoredName
            : rec.storedName;
      const filePath = path.join(P.uploadsDir, fileName);
      const outMime = variantMime(variant, rec.mime);
      try {
        const stat = await fs.stat(filePath);
        const totalSize = stat.size;
        if (!range) {
          const buffer = await fs.readFile(filePath);
          return { buffer, mime: outMime, totalSize, ranged: false };
        }
        const { start } = range;
        let { end } = range;
        if (start >= totalSize) return null;
        end = Math.min(end, totalSize - 1);
        if (start > end || start < 0) return null;
        const stream = createReadStream(filePath, { start, end });
        const buffer = await readStreamToBuffer(stream);
        return { buffer, mime: outMime, totalSize, ranged: true };
      } catch {
        return null;
      }
    },

    async deleteById(id: string) {
      const records = await readIndex(P);
      const rec = records.find((r) => r.id === id);
      if (!rec) return false;
      const next = records.filter((r) => r.id !== id);
      await writeIndex(P, next);
      const paths = variantCandidates(rec).map((name) => path.join(P.uploadsDir, name));
      for (const filePath of paths) {
        try {
          await fs.unlink(filePath);
        } catch {
          /* file already missing */
        }
      }
      return true;
    },

    async repairManifest() {
      const records = await readIndex(P);
      const deduped: PhotoRecord[] = [];
      const seen = new Set<string>();
      for (const record of records) {
        if (seen.has(record.id)) continue;
        seen.add(record.id);
        deduped.push(record);
      }
      if (deduped.length !== records.length) {
        await writeIndex(P, deduped);
        return { repaired: true, details: ["Removed duplicate ids from photos.json"] };
      }
      return { repaired: false, details: ["No filesystem index issues detected"] };
    },
  };
}
