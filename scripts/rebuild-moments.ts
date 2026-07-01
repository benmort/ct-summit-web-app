/* eslint-disable no-console */
/**
 * Recover + rebuild the moments manifest for the Common Threads Summit highlights.
 *
 * Background: importing 106 highlights via per-append manifest writes corrupted the
 * sharded manifest under Vercel Blob's eventual consistency — records were lost while
 * the underlying image blobs (originals + derivatives) survived at unique paths.
 *
 * This script:
 *   1. Hashes the 106 source highlight files (sha256) to know each file's identity + order.
 *   2. Lists every album-img/ blob and matches each ORIGINAL to a source file by content hash.
 *   3. Picks one blob per highlight (dedupe), regenerating any missing derivative.
 *   4. Uploads fresh only for highlights with no surviving blob.
 *   5. Writes the manifest shard + index in a SINGLE put each (no per-append RMW,
 *      so the consistency bug cannot recur) — records ordered Day 1 -> Day 2 -> Day 3.
 *   6. Deletes leftover unreferenced blobs (duplicates/orphans) to reclaim storage.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... pnpm rebuild:moments -- [--src "<dir>"] [--dry] [--no-clean]
 */
import { createHash } from "crypto";
import { readdir, readFile, stat } from "fs/promises";
import { extname, join } from "path";
import { del, get, list, put } from "@vercel/blob";
import sharp from "sharp";
import { makeImageDerivatives } from "@/lib/image-derivatives";

const DEFAULT_SRC =
  "/Users/benjaminmort/Downloads/Common Threads Summit 2026 photographs/Common Threads Summit 2026 highlights";
const BASE_ISO = "2026-07-01T12:00:00.000Z";
const STEP_MS = 1000;

const IMG_PREFIX = "album-img/";
const MANIFEST_PREFIX = "album-manifests/";
const INDEX_PATH = `${MANIFEST_PREFIX}index.json`;
const SHARD_KEY = "2026-07";
const SHARD_PATH = `${MANIFEST_PREFIX}${SHARD_KEY}.json`;
const ACCESS = "private" as const;
const DERIVATIVE_RE = /-(wall|thumb|display)\.(webp|jpe?g)$/i;
const DOWNLOAD_CONCURRENCY = 6;

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

function dayRank(name: string): number {
  const n = name.toLowerCase();
  const words: Array<[RegExp, number]> = [
    [/day\s*(one|1)\b/, 1],
    [/day\s*(two|2)\b/, 2],
    [/day\s*(three|3)\b/, 3],
    [/day\s*(four|4)\b/, 4],
    [/day\s*(five|5)\b/, 5],
  ];
  for (const [re, rank] of words) if (re.test(n)) return rank;
  return 999;
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const byNameNumeric = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

async function collectOrderedFiles(src: string): Promise<string[]> {
  const entries = await readdir(src, { withFileTypes: true });
  const dayDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => dayRank(a) - dayRank(b) || byNameNumeric(a, b));
  const files: string[] = [];
  for (const dir of dayDirs) {
    const dirPath = join(src, dir);
    const names = (await readdir(dirPath))
      .filter((n) => IMAGE_EXTS.has(extname(n).toLowerCase()))
      .sort(byNameNumeric);
    console.log(`  ${dir}  ->  ${names.length} image(s)`);
    for (const n of names) files.push(join(dirPath, n));
  }
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

async function downloadBlob(pathname: string, token: string): Promise<Buffer | null> {
  try {
    const r = await get(pathname, { access: ACCESS, token });
    if (!r?.stream || r.statusCode !== 200) return null;
    return Buffer.from(await new Response(r.stream).arrayBuffer());
  } catch (e) {
    console.error(`  download failed ${pathname}: ${(e as Error).message}`);
    return null;
  }
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
    console.error("BLOB_READ_WRITE_TOKEN is required (production blob).");
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

  console.log("Scanning source day folders:");
  const files = await collectOrderedFiles(args.src);
  console.log(`Source highlights: ${files.length}`);

  // 1. Hash each source file -> identity + display order.
  const source = await mapPool(files, 8, async (filePath, i) => {
    const buffer = await readFile(filePath);
    return {
      index: i,
      filename: filePath.split("/").pop() || `photo-${i + 1}.jpg`,
      filePath,
      hash: sha256(buffer),
      uploadedAt: new Date(baseMs - i * STEP_MS).toISOString(),
    };
  });
  const sourceByHash = new Map(source.map((s) => [s.hash, s]));
  if (sourceByHash.size !== source.length) {
    console.warn(`Note: ${source.length - sourceByHash.size} source file(s) share identical bytes.`);
  }

  // 2. List all album-img blobs.
  const allBlobs: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const res = await list({ prefix: IMG_PREFIX, cursor, limit: 1000, token });
    for (const b of res.blobs) allBlobs.push({ pathname: b.pathname, url: b.url });
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  const blobSet = new Set(allBlobs.map((b) => b.pathname));
  const originals = allBlobs.filter((b) => !DERIVATIVE_RE.test(b.pathname.slice(IMG_PREFIX.length)));
  console.log(`Blobs: ${allBlobs.length} total, ${originals.length} originals.`);

  // 3. Match each original blob to a source file by content hash (first blob wins per filename).
  const matchByName = new Map<string, { uuid: string; buffer: Buffer }>();
  let scanned = 0;
  await mapPool(originals, DOWNLOAD_CONCURRENCY, async (b) => {
    const buffer = await downloadBlob(b.pathname, token);
    scanned++;
    if (scanned % 25 === 0) console.log(`  scanned ${scanned}/${originals.length} originals`);
    if (!buffer) return;
    const s = sourceByHash.get(sha256(buffer));
    if (!s) return; // orphan / not one of our highlights
    if (!matchByName.has(s.filename)) {
      const base = b.pathname.slice(IMG_PREFIX.length).replace(/\.[^.]+$/, "");
      matchByName.set(s.filename, { uuid: base, buffer });
    }
  });
  console.log(`Matched ${matchByName.size}/${source.length} highlights to existing blobs.`);

  // 4/5. Build records, regenerating missing derivatives / uploading fresh where needed.
  let matched = 0;
  let regenerated = 0;
  let uploadedFresh = 0;
  const records: PhotoRecord[] = [];
  const referenced = new Set<string>();

  for (const s of source) {
    const hit = matchByName.get(s.filename);
    let uuid: string;
    let buffer: Buffer;
    if (hit) {
      uuid = hit.uuid;
      buffer = hit.buffer;
      matched++;
    } else {
      // No surviving blob for this file: upload the original fresh.
      buffer = await readFile(s.filePath);
      uuid = createHash("sha1").update(s.filename).digest("hex").slice(0, 32);
      if (!args.dry) await putBlob(`${IMG_PREFIX}${uuid}.jpg`, buffer, "image/jpeg", token);
      uploadedFresh++;
    }

    const storedName = `${uuid}.jpg`;
    const wallName = `${uuid}-wall.webp`;
    const thumbName = `${uuid}-thumb.webp`;
    const displayName = `${uuid}-display.jpg`;

    const needWall = !blobSet.has(`${IMG_PREFIX}${wallName}`);
    const needThumb = !blobSet.has(`${IMG_PREFIX}${thumbName}`);
    const needDisplay = !blobSet.has(`${IMG_PREFIX}${displayName}`);
    if (needWall || needThumb || needDisplay || !hit) {
      const d = await makeImageDerivatives(buffer);
      if (!args.dry) {
        await putBlob(`${IMG_PREFIX}${wallName}`, d.wall, "image/webp", token);
        await putBlob(`${IMG_PREFIX}${thumbName}`, d.thumb, "image/webp", token);
        await putBlob(`${IMG_PREFIX}${displayName}`, d.display, "image/jpeg", token);
      }
      if (hit) regenerated++;
    }

    const meta = await sharp(buffer)
      .metadata()
      .catch(() => ({}) as sharp.Metadata);
    records.push({
      id: uuid,
      filename: s.filename,
      uploadedAt: s.uploadedAt,
      storedName,
      mime: "image/jpeg",
      blurDataUrl: await blurDataUrl(buffer),
      width: meta.width ?? undefined,
      height: meta.height ?? undefined,
      wallStoredName: wallName,
      thumbStoredName: thumbName,
      displayStoredName: displayName,
    });
    for (const n of [storedName, wallName, thumbName, displayName]) referenced.add(`${IMG_PREFIX}${n}`);
  }

  records.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  console.log(
    `Records built: ${records.length} (matched ${matched}, regenerated derivatives ${regenerated}, uploaded fresh ${uploadedFresh}).`,
  );

  if (args.dry) {
    console.log("--dry: not writing manifest or deleting. First 3 + last 3:");
    [...records.slice(0, 3), ...records.slice(-3)].forEach((r) =>
      console.log(`  ${r.uploadedAt}  ${r.filename}`),
    );
    return;
  }

  // 6. Write manifest atomically (single put each).
  await put(SHARD_PATH, JSON.stringify(records), {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
  await put(INDEX_PATH, JSON.stringify({ version: 1, shards: [SHARD_KEY], updatedAt: new Date().toISOString() }), {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
  console.log(`Manifest written: 1 shard (${SHARD_KEY}), ${records.length} records.`);

  // 7. Delete unreferenced blobs (duplicates / orphans) by URL.
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

  console.log("Rebuild complete.");
}

void main();
