/* eslint-disable no-console */
/**
 * Import ALL Common Threads Summit 2026 "Small File" photos (Day 1 -> 2 -> 3) into
 * the moments gallery, deduplicated by image content, replacing the current wall.
 *
 * Robust against Vercel Blob eventual consistency:
 *  - Blob IDs are derived from the image content hash, so identical photos collapse
 *    to one path and re-runs skip already-uploaded blobs (idempotent / resumable).
 *  - Image blobs + derivatives are independent puts (no read-modify-write).
 *  - The manifest shard + index are written in a SINGLE atomic put each at the end.
 *  - Leftover unreferenced blobs (old highlights / orphans) are pruned.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... pnpm import:day-photos -- [--src "<parent dir>"] [--dry] [--no-clean]
 */
import { createHash } from "crypto";
import { readdir, readFile, stat } from "fs/promises";
import { extname, join } from "path";
import { del, list, put } from "@vercel/blob";
import sharp from "sharp";
import { makeImageDerivatives } from "@/lib/image-derivatives";

const DEFAULT_SRC =
  "/Users/benjaminmort/Downloads/Common Threads Summit 2026 photographs";
const BASE_ISO = "2026-07-01T12:00:00.000Z";
const STEP_MS = 1000;

const IMG_PREFIX = "album-img/";
const MANIFEST_PREFIX = "album-manifests/";
const INDEX_PATH = `${MANIFEST_PREFIX}index.json`;
const ACCESS = "private" as const;
const CONCURRENCY = 6;
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

type Args = { src: string; dry: boolean; clean: boolean };

function parseArgs(argv: string[]): Args {
  const out: Args = { src: DEFAULT_SRC, dry: false, clean: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry" || a === "--dry-run") out.dry = true;
    else if (a === "--no-clean") out.clean = false;
    else if (a === "--src") out.src = argv[++i] ?? out.src;
  }
  return out;
}

function dayOf(name: string): number {
  const n = name.toLowerCase();
  if (/day\s*(one|1)\b/.test(n)) return 1;
  if (/day\s*(two|2)\b/.test(n)) return 2;
  if (/day\s*(three|3)\b/.test(n)) return 3;
  if (/day\s*(four|4)\b/.test(n)) return 4;
  if (/day\s*(five|5)\b/.test(n)) return 5;
  return 9;
}

const byNameNumeric = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/** Recursively collect Small File images (exclude the Large Files sets). */
async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      // Skip the full-res "Large Files" sets and the curated "highlights" folder
      // (highlights are near-duplicate re-exports of the full-day shots).
      if (/large files/i.test(e.name) || /highlights/i.test(e.name)) continue;
      await walk(full, out);
    } else if (IMAGE_EXTS.has(extname(e.name).toLowerCase()) && /small file/i.test(e.name)) {
      out.push(full);
    }
  }
}

async function collectOrderedFiles(src: string): Promise<string[]> {
  const files: string[] = [];
  await walk(src, files);
  // Order: Day 1 -> 2 -> 3, then by numeric frame code within each day.
  files.sort((a, b) => {
    const fa = a.split("/").pop() || a;
    const fb = b.split("/").pop() || b;
    const d = dayOf(fa) - dayOf(fb);
    return d !== 0 ? d : byNameNumeric(fa, fb);
  });
  const counts: Record<number, number> = {};
  for (const f of files) {
    const d = dayOf(f.split("/").pop() || f);
    counts[d] = (counts[d] || 0) + 1;
  }
  console.log(`  found ${files.length} small-file images by day:`, JSON.stringify(counts));
  return files;
}

const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function putBlob(pathname: string, body: Buffer, contentType: string, token: string) {
  await put(pathname, body, {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    token,
  });
}

async function blurDataUrl(buf: Buffer): Promise<string | undefined> {
  try {
    const out = await sharp(buf).rotate().resize(12, 12, { fit: "inside" }).jpeg({ quality: 55 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return undefined;
  }
}

function shardKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type PhotoRecord = {
  id: string;
  filename: string;
  uploadedAt: string;
  storedName: string;
  mime: string;
  blurDataUrl?: string;
  width?: number;
  height?: number;
  wallStoredName?: string;
  thumbStoredName?: string;
  displayStoredName?: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN required.");
    process.exit(1);
  }
  console.log(JSON.stringify({ src: args.src, dry: args.dry, clean: args.clean }, null, 2));
  try {
    if (!(await stat(args.src)).isDirectory()) throw new Error("not a dir");
  } catch {
    console.error(`Source not found: ${args.src}`);
    process.exit(1);
  }
  const baseMs = Date.parse(BASE_ISO);

  console.log("Scanning source (excluding Large Files):");
  const files = await collectOrderedFiles(args.src);
  if (!files.length) {
    console.error("No small-file images found. Aborting.");
    process.exit(1);
  }

  // Dedupe by content hash, keeping first occurrence (day/frame order).
  console.log("Hashing + deduplicating by content...");
  const hashes = await mapPool(files, 8, async (f) => sha256(await readFile(f)));
  const seen = new Set<string>();
  type Item = { filePath: string; id: string; filename: string; index: number };
  const items: Item[] = [];
  for (let i = 0; i < files.length; i++) {
    const hash = hashes[i];
    if (seen.has(hash)) continue;
    seen.add(hash);
    items.push({
      filePath: files[i],
      id: hash.slice(0, 32),
      filename: files[i].split("/").pop() || `photo-${i}.jpg`,
      index: items.length,
    });
  }
  const dupes = files.length - items.length;
  console.log(`Unique photos: ${items.length} (removed ${dupes} content duplicate(s)).`);

  // List existing blobs once (for skip-existing + cleanup).
  const allBlobs: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const res = await list({ prefix: IMG_PREFIX, cursor, limit: 1000, token });
    for (const b of res.blobs) allBlobs.push({ pathname: b.pathname, url: b.url });
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  const blobSet = new Set(allBlobs.map((b) => b.pathname));
  console.log(`Existing album-img blobs: ${allBlobs.length}.`);

  // Upload (concurrent) + build records. Timestamps descending so Day 1 sorts first.
  let uploaded = 0;
  let skipped = 0;
  let done = 0;
  const records = await mapPool(items, CONCURRENCY, async (it) => {
    const storedName = `${it.id}.jpg`;
    const wallName = `${it.id}-wall.webp`;
    const thumbName = `${it.id}-thumb.webp`;
    const displayName = `${it.id}-display.jpg`;
    const uploadedAt = new Date(baseMs - it.index * STEP_MS).toISOString();

    const buffer = await readFile(it.filePath);
    const haveAll =
      blobSet.has(`${IMG_PREFIX}${storedName}`) &&
      blobSet.has(`${IMG_PREFIX}${wallName}`) &&
      blobSet.has(`${IMG_PREFIX}${thumbName}`) &&
      blobSet.has(`${IMG_PREFIX}${displayName}`);

    if (!haveAll && !args.dry) {
      const d = await makeImageDerivatives(buffer);
      await putBlob(`${IMG_PREFIX}${storedName}`, buffer, "image/jpeg", token);
      await putBlob(`${IMG_PREFIX}${wallName}`, d.wall, "image/webp", token);
      await putBlob(`${IMG_PREFIX}${thumbName}`, d.thumb, "image/webp", token);
      await putBlob(`${IMG_PREFIX}${displayName}`, d.display, "image/jpeg", token);
      uploaded++;
    } else {
      skipped++;
    }

    const meta = await sharp(buffer)
      .metadata()
      .catch(() => ({}) as sharp.Metadata);
    done++;
    if (done % 50 === 0) console.log(`  processed ${done}/${items.length} (uploaded ${uploaded}, skipped ${skipped})`);

    const rec: PhotoRecord = {
      id: it.id,
      filename: it.filename,
      uploadedAt,
      storedName,
      mime: "image/jpeg",
      blurDataUrl: await blurDataUrl(buffer),
      width: meta.width ?? undefined,
      height: meta.height ?? undefined,
      wallStoredName: wallName,
      thumbStoredName: thumbName,
      displayStoredName: displayName,
    };
    return rec;
  });

  console.log(`Uploaded ${uploaded}, skipped ${skipped}. Records: ${records.length}.`);

  const referenced = new Set<string>();
  for (const r of records) {
    for (const n of [r.storedName, r.wallStoredName, r.thumbStoredName, r.displayStoredName]) {
      if (n) referenced.add(`${IMG_PREFIX}${n}`);
    }
  }

  if (args.dry) {
    console.log("--dry: skipping manifest write + cleanup. First 3 / last 3:");
    [...records.slice(0, 3), ...records.slice(-3)].forEach((r) =>
      console.log(`  ${r.uploadedAt}  ${r.filename}`),
    );
    return;
  }

  // Atomic manifest write: group by month shard, single put each.
  const byShard = new Map<string, PhotoRecord[]>();
  for (const r of records) {
    const key = shardKey(r.uploadedAt);
    const arr = byShard.get(key) || [];
    arr.push(r);
    byShard.set(key, arr);
  }
  const shardKeys = [...byShard.keys()].sort((a, b) => b.localeCompare(a));
  for (const key of shardKeys) {
    const recs = byShard.get(key)!.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    await put(`${MANIFEST_PREFIX}${key}.json`, JSON.stringify(recs), {
      access: ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token,
    });
  }
  await put(INDEX_PATH, JSON.stringify({ version: 1, shards: shardKeys, updatedAt: new Date().toISOString() }), {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
  console.log(`Manifest written: shards [${shardKeys.join(", ")}], ${records.length} records.`);

  if (args.clean) {
    const toDelete = allBlobs.filter((b) => !referenced.has(b.pathname)).map((b) => b.url);
    console.log(`Deleting ${toDelete.length} unreferenced blob(s)...`);
    for (let i = 0; i < toDelete.length; i += 100) {
      try {
        await del(toDelete.slice(i, i + 100), { token });
      } catch (e) {
        console.error(`  batch delete failed: ${(e as Error).message}`);
      }
    }
    console.log("Cleanup done.");
  }
  console.log("Import complete.");
}

void main();
