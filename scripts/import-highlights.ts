/* eslint-disable no-console */
/**
 * Bulk-import the Common Threads Summit 2026 photographer highlights into the
 * moments gallery, ordered Day 1 -> Day 2 -> Day 3 (folder/filename order within
 * each day). Reuses the app's storage layer so wall/thumb/display derivatives and
 * the manifest are produced exactly like a normal upload.
 *
 * Target is chosen by the storage layer: Vercel Blob when BLOB_READ_WRITE_TOKEN
 * is set, otherwise the local ./data filesystem.
 *
 * Usage:
 *   pnpm import:highlights -- [--wipe] [--src "<highlights dir>"] [--base <iso>] [--dry]
 *
 * Production (destructive — deletes all existing photos first):
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... pnpm import:highlights -- --wipe
 */
import { readdir, readFile, stat } from "fs/promises";
import { extname, join } from "path";
import { getPhotoStorage } from "@/lib/storage";
import { isAllowedImageType } from "@/lib/types/photo";

const DEFAULT_SRC =
  "/Users/benjaminmort/Downloads/Common Threads Summit 2026 photographs/Common Threads Summit 2026 highlights";
const DEFAULT_BASE_ISO = "2026-07-01T12:00:00.000Z";
const STEP_MS = 1000;

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

type Arg = { wipe: boolean; dry: boolean; src: string; baseIso: string };

function parseArgs(argv: string[]): Arg {
  const out: Arg = {
    wipe: false,
    dry: false,
    src: DEFAULT_SRC,
    baseIso: DEFAULT_BASE_ISO,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--wipe") out.wipe = true;
    else if (a === "--dry" || a === "--dry-run") out.dry = true;
    else if (a === "--src") out.src = argv[++i] ?? out.src;
    else if (a === "--base") out.baseIso = argv[++i] ?? out.baseIso;
  }
  return out;
}

/** Rank a day folder so ordering is Day One -> Two -> Three regardless of the
 *  folder's leading words (alphabetical sort does not work here). */
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

function isImageFile(name: string): boolean {
  return extname(name).toLowerCase() in IMAGE_MIME_BY_EXT;
}

function byNameNumeric(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

async function collectOrderedFiles(src: string): Promise<string[]> {
  const entries = await readdir(src, { withFileTypes: true });
  const dayDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => {
      const r = dayRank(a) - dayRank(b);
      return r !== 0 ? r : byNameNumeric(a, b);
    });

  const files: string[] = [];
  for (const dir of dayDirs) {
    const dirPath = join(src, dir);
    const names = (await readdir(dirPath))
      .filter(isImageFile)
      .sort(byNameNumeric);
    console.log(`  ${dir}  ->  ${names.length} image(s)`);
    for (const name of names) files.push(join(dirPath, name));
  }
  return files;
}

async function wipeAll(storage: ReturnType<typeof getPhotoStorage>, dry: boolean) {
  const existing = await storage.list();
  console.log(`Wiping ${existing.length} existing photo(s)...`);
  if (dry) return;
  let removed = 0;
  for (const p of existing) {
    try {
      await storage.deleteById(p.id);
      removed++;
      if (removed % 20 === 0) console.log(`  deleted ${removed}/${existing.length}`);
    } catch (e) {
      console.error(`  failed to delete ${p.id}: ${(e as Error).message}`);
    }
  }
  console.log(`Wiped ${removed}/${existing.length}.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const usingBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

  console.log(
    JSON.stringify(
      {
        target: usingBlob ? "vercel-blob (production)" : "filesystem (local ./data)",
        src: args.src,
        wipe: args.wipe,
        dry: args.dry,
        baseIso: args.baseIso,
      },
      null,
      2,
    ),
  );

  try {
    const s = await stat(args.src);
    if (!s.isDirectory()) throw new Error("not a directory");
  } catch {
    console.error(`Source directory not found: ${args.src}`);
    process.exit(1);
  }

  const baseMs = Date.parse(args.baseIso);
  if (Number.isNaN(baseMs)) {
    console.error(`Invalid --base ISO date: ${args.baseIso}`);
    process.exit(1);
  }

  console.log("Scanning day folders:");
  const files = await collectOrderedFiles(args.src);
  if (files.length === 0) {
    console.error("No image files found. Aborting.");
    process.exit(1);
  }
  console.log(`Total images to import: ${files.length}`);

  const storage = getPhotoStorage();

  if (args.wipe) {
    await wipeAll(storage, args.dry);
  }

  if (args.dry) {
    console.log("--dry: skipping import. Order (first 5):");
    files.slice(0, 5).forEach((f, i) => console.log(`  ${i + 1}. ${f.split("/").pop()}`));
    console.log("  ...");
    return;
  }

  // Assign strictly-decreasing timestamps so descending-by-uploadedAt sort (Blob)
  // yields Day 1 first -> Day 3 last. Process in reverse so the filesystem
  // backend's unshift produces the same array order too.
  let ok = 0;
  const failures: string[] = [];
  for (let i = files.length - 1; i >= 0; i--) {
    const filePath = files[i];
    const filename = filePath.split("/").pop() || `photo-${i + 1}.jpg`;
    const mime = IMAGE_MIME_BY_EXT[extname(filename).toLowerCase()] || "image/jpeg";
    if (!isAllowedImageType(mime)) {
      failures.push(`${filename} (unsupported type ${mime})`);
      continue;
    }
    const uploadedAt = new Date(baseMs - i * STEP_MS).toISOString();
    try {
      const buffer = await readFile(filePath);
      await storage.createFromBuffer({ buffer, filename, mime, uploadedAt });
      ok++;
      const done = files.length - i;
      if (done % 10 === 0 || done === files.length) {
        console.log(`  imported ${done}/${files.length}`);
      }
    } catch (e) {
      failures.push(`${filename}: ${(e as Error).message}`);
      console.error(`  failed ${filename}: ${(e as Error).message}`);
    }
  }

  console.log(
    JSON.stringify(
      { imported: ok, failed: failures.length, failures: failures.slice(0, 20) },
      null,
      2,
    ),
  );
  if (failures.length) process.exit(1);
}

void main();
