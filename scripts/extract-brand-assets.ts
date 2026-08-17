import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Cuts the "Dreaming Into Our Future" brand assets out of the designer's PDF
 * into public/tenants/woven/.
 *
 * The PDF is entirely raster: every page is an embedded bitmap with a soft-mask
 * alpha channel, with no vector paths and all type outlined. So the artwork is
 * rasterised at high DPI and cropped rather than converted to SVG. If a vector
 * source turns up later, this script is what it replaces.
 *
 * Crop boxes are fractions of the page rather than pixels, measured from the
 * alpha channel, so they hold at any render resolution — swapping in one of the
 * other logo directions in the deck means editing ART and nothing else.
 *
 * Requires poppler for `pdftocairo`: brew install poppler
 *
 * Usage: pnpm extract:brand-assets ~/Downloads/DreamingIntoOurFuture-Logo.pdf
 */

/** Comfortably above what any of these outputs needs; page 1 lands at 4961x3508. */
const RENDER_DPI = 300;

/** The brand's paper stock. Fills the reversed logo and the opaque icon fields. */
const CREAM = "#F3EEDF";

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * PNG encoder settings for the finished files.
 *
 * The artwork is a handful of flat colours, so a palette costs nothing visually
 * and roughly quarters the file. Next's optimiser re-encodes what it serves
 * anyway; this is about what sits in the repo.
 */
const PNG_OUT = { palette: true, quality: 100, effort: 10 } as const;

type Art = { page: number; box: readonly [number, number, number, number] };

/** Source regions, as `[x0, y0, x1, y1]` fractions of the page. */
const ART = {
  /** The squiggle sun: orange blobs around a red centre pod. Square, AR 1.03. */
  emblem: { page: 1, box: [0.071, 0.119, 0.437, 0.621] },
  /** "DREAMING INTO OUR FUTURE" over two lines, without the subtitle beneath. */
  wordmark: { page: 1, box: [0.071, 0.648, 0.437, 0.7815] },
  /** Emblem left, headline and three-line subtitle right. AR 3.26. */
  horizontal: { page: 1, box: [0.521, 0.678, 0.937, 0.859] },
} as const satisfies Record<string, Art>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const outputDir = path.join(repoRoot, "public/tenants/woven");

const pageCache = new Map<number, Buffer>();

/** Renders one page to an RGBA PNG on stdout, transparent wherever there is no ink. */
function renderPage(pdf: string, page: number): Buffer {
  const cached = pageCache.get(page);
  if (cached) return cached;

  const png = execFileSync(
    "pdftocairo",
    [
      "-png",
      "-transp",
      "-r", String(RENDER_DPI),
      "-f", String(page),
      "-l", String(page),
      "-singlefile",
      pdf,
      "-",
    ],
    { maxBuffer: 1 << 28 },
  );
  pageCache.set(page, png);
  return png;
}

/**
 * Crops one region out of its page, then tightens to the ink inside it.
 *
 * The two passes are deliberate: chained onto a single pipeline, sharp trims
 * before it extracts, which shrinks the page out from under these absolute
 * coordinates and fails with "bad extract area". The trim matters because the
 * boxes share a column, so the emblem's box is as wide as the wordmark beneath
 * it rather than as wide as the emblem.
 */
async function cut(pdf: string, art: Art): Promise<Buffer> {
  const page = renderPage(pdf, art.page);
  const { width = 0, height = 0 } = await sharp(page).metadata();
  const [x0, y0, x1, y1] = art.box;

  const region = await sharp(page)
    .extract({
      left: Math.round(x0 * width),
      top: Math.round(y0 * height),
      width: Math.round((x1 - x0) * width),
      height: Math.round((y1 - y0) * height),
    })
    .png()
    .toBuffer();

  return sharp(region).trim().png().toBuffer();
}

/** Recolours artwork to a single flat fill, keeping its alpha as the shape. */
async function silhouette(source: Buffer, fill: string): Promise<Buffer> {
  const image = sharp(source).ensureAlpha();
  const { width = 0, height = 0 } = await image.metadata();
  const alpha = await image.extractChannel("alpha").raw().toBuffer();

  return sharp({ create: { width, height, channels: 3, background: fill } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

/**
 * A square icon on an opaque cream field.
 *
 * The manifest declares the android-chrome sizes `purpose: "maskable"`, so
 * Android crops them to a circle or squircle. `inset` keeps the emblem inside
 * that safe area — at full bleed the outer squiggles get sliced off. Favicons
 * are never masked, so they take a tighter inset and fill more of the square.
 */
async function icon(emblem: Buffer, size: number, inset: number): Promise<Buffer> {
  const artSize = Math.round(size * inset);
  const mark = await sharp(emblem)
    .resize(artSize, artSize, { fit: "contain", background: TRANSPARENT })
    .toBuffer();

  return sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
    .composite([{ input: mark, gravity: "centre" }])
    .png(PNG_OUT)
    .toBuffer();
}

/**
 * The header lockup: emblem beside the two-line headline.
 *
 * The deck's own horizontal lockup stacks the headline over a three-line
 * subtitle, but SummitNav renders this at 24-28px tall, where that subtitle is
 * about 6px of unreadable mush. Dropping it buys the headline roughly double
 * the cap height; the subtitle copy already lives in brand.description.
 */
async function headerLockup(emblem: Buffer, wordmark: Buffer): Promise<Buffer> {
  const height = 400;
  /** Weighting the emblem against the text, matching the deck's lockup. */
  const wordmarkScale = 0.78;
  const gap = Math.round(height * 0.12);

  const mark = await sharp(emblem).resize({ height }).toBuffer();
  const text = await sharp(wordmark)
    .resize({ height: Math.round(height * wordmarkScale) })
    .toBuffer();

  const markMeta = await sharp(mark).metadata();
  const textMeta = await sharp(text).metadata();
  const markWidth = markMeta.width ?? 0;
  const textWidth = textMeta.width ?? 0;
  const textHeight = textMeta.height ?? 0;

  return sharp({
    create: {
      width: markWidth + gap + textWidth,
      height,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([
      { input: mark, left: 0, top: 0 },
      { input: text, left: markWidth + gap, top: Math.round((height - textHeight) / 2) },
    ])
    .png()
    .toBuffer();
}

async function main(): Promise<void> {
  const pdf = process.argv[2];
  if (!pdf) {
    throw new Error("Usage: pnpm extract:brand-assets <path-to-DreamingIntoOurFuture-Logo.pdf>");
  }

  await mkdir(outputDir, { recursive: true });

  const emblem = await cut(pdf, ART.emblem);
  const wordmark = await cut(pdf, ART.wordmark);
  const horizontal = await cut(pdf, ART.horizontal);

  const outputs: Array<[string, Buffer]> = [
    // Header: full colour, sits on the light surface.
    ["logo.png", await sharp(await headerLockup(emblem, wordmark)).resize({ width: 1200 }).png(PNG_OUT).toBuffer()],
    // The showreel footer sits on `bg-scrim`, pinned near-black in every theme.
    // The blue subtitle only reaches ~4:1 against that, so reverse it to cream.
    ["logo-white.png", await sharp(await silhouette(horizontal, CREAM)).resize({ width: 1240 }).png(PNG_OUT).toBuffer()],
    ["android-chrome-512x512.png", await icon(emblem, 512, 0.7)],
    ["android-chrome-192x192.png", await icon(emblem, 192, 0.7)],
    // iOS discards alpha and squares off the corners itself.
    ["apple-touch-icon.png", await icon(emblem, 180, 0.82)],
    ["favicon-32x32.png", await icon(emblem, 32, 0.86)],
    ["favicon-16x16.png", await icon(emblem, 16, 0.9)],
  ];

  for (const [name, buffer] of outputs) {
    const target = path.join(outputDir, name);
    await writeFile(target, buffer);
    const { width, height } = await sharp(buffer).metadata();
    // eslint-disable-next-line no-console
    console.log(
      `${path.relative(repoRoot, target).padEnd(46)} ${String(width).padStart(5)}x${String(height).padEnd(5)} ${(buffer.length / 1024).toFixed(1)} kB`,
    );
  }
}

void main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
