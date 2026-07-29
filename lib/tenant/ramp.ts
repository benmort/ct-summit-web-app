import { RAMP_STEPS, type RampStep, type TenantTheme } from "@/lib/tenant/types";

/**
 * Generates the CSS custom properties that theme a tenant.
 *
 * Zero dependencies and no Node built-ins, so this is safe to run anywhere.
 * Colour maths happens in Oklab, which keeps perceived lightness even as hue
 * changes — a naive HSL ramp makes yellows look washed out and blues muddy at
 * the same nominal lightness.
 */

/**
 * Lightness, relative-chroma and hue-drift profile of Tailwind's amber ramp —
 * the scale `brand` replaced. Reusing its profile means a tenant's generated
 * ramp has the same tonal rhythm as the palette the components were designed
 * against.
 *
 * `hShift` is what makes this faithful. Tailwind's ramps are not constant-hue:
 * amber swings ~+25 degrees toward yellow as it lightens and ~-24 toward red as
 * it darkens. Holding hue fixed instead pushes the light steps outside sRGB,
 * where gamut clamping desaturates them into pale mud.
 *
 * Fed amber-500, this reconstructs every Tailwind amber step exactly;
 * tests/tenant/ramp.test.ts asserts that.
 */
const RAMP_PROFILE: Record<RampStep, { l: number; cScale: number; hShift: number }> = {
  50: { l: 0.9869, cScale: 0.13, hShift: 25.2 },
  100: { l: 0.9619, cScale: 0.3524, hShift: 25.54 },
  200: { l: 0.9243, cScale: 0.6992, hShift: 25.67 },
  300: { l: 0.879, cScale: 0.9317, hShift: 21.52 },
  400: { l: 0.8369, cScale: 0.9986, hShift: 14.35 },
  500: { l: 0.7686, cScale: 1.0, hShift: 0 },
  600: { l: 0.6658, cScale: 0.956, hShift: -11.76 },
  700: { l: 0.5553, cScale: 0.8837, hShift: -21.08 },
  800: { l: 0.4732, cScale: 0.7573, hShift: -23.88 },
  900: { l: 0.4137, cScale: 0.6399, hShift: -24.18 },
  950: { l: 0.2791, cScale: 0.4506, hShift: -24.45 },
};

const DEG_TO_RAD = Math.PI / 180;

/**
 * In light mode the neutral and brand ramps are mirrored rather than recomputed:
 * step 500 maps to itself, and the extremes swap. This is what lets every
 * existing class keep working in both modes — `bg-surface-950` is the darkest
 * surface in dark mode and the lightest in light mode, and `text-ink-100` flips
 * from near-white to near-black — with no `dark:` variants anywhere.
 * Mid-tones (400-600) barely move, so muted text stays muted in both.
 */
const MIRROR: Record<RampStep, RampStep> = {
  50: 950, 100: 900, 200: 800, 300: 700, 400: 600,
  500: 500,
  600: 400, 700: 300, 800: 200, 900: 100, 950: 50,
};

/**
 * The built-in brand and accent ramps (Tailwind amber and orange), matching the
 * defaults in app/globals.css. Needed as values, not just CSS defaults, so a
 * light-mode tenant that supplies no colours of its own still gets them mirrored.
 */
const DEFAULT_BRAND: Record<RampStep, string> = {
  50: "255 251 235", 100: "254 243 199", 200: "253 230 138", 300: "252 211 77",
  400: "251 191 36", 500: "245 158 11", 600: "217 119 6", 700: "180 83 9",
  800: "146 64 14", 900: "120 53 15", 950: "69 26 3",
};
const DEFAULT_ACCENT: Record<RampStep, string> = {
  50: "255 247 237", 100: "255 237 213", 200: "254 215 170", 300: "253 186 116",
  400: "251 146 60", 500: "249 115 22", 600: "234 88 12", 700: "194 65 12",
  800: "154 52 18", 900: "124 45 18", 950: "67 20 7",
};

/** Fixed neutral ramps: Tailwind zinc (surfaces) and stone (text). */
const NEUTRAL_SURFACE: Record<RampStep, string> = {
  50: "250 250 250", 100: "244 244 245", 200: "228 228 231", 300: "212 212 216",
  400: "161 161 170", 500: "113 113 122", 600: "82 82 91", 700: "63 63 70",
  800: "39 39 42", 900: "24 24 27", 950: "9 9 11",
};
const NEUTRAL_INK: Record<RampStep, string> = {
  50: "250 250 249", 100: "245 245 244", 200: "231 229 228", 300: "214 211 209",
  400: "168 162 158", 500: "120 113 108", 600: "87 83 78", 700: "68 64 60",
  800: "41 37 36", 900: "28 25 23", 950: "12 10 9",
};

type Oklch = { l: number; c: number; h: number };

/** WCAG relative luminance of an "R G B" channel string. */
function relativeLuminance(channels: string): number {
  const [r, g, b] = channels.split(" ").map((v) => srgbToLinear(Number(v) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mixChannels(a: string, b: string, t: number): string {
  const av = a.split(" ").map(Number);
  const bv = b.split(" ").map(Number);
  return av.map((v, i) => Math.round(v + (bv[i] - v) * t)).join(" ");
}

const NEAR_BLACK = "24 24 27"; // zinc-900, the historic on-brand value
const NEAR_WHITE = "250 250 249"; // stone-50
const WCAG_AA = 4.5;

/**
 * Text colours for a filled chip of `background`.
 *
 * Picks whichever of near-black/near-white actually contrasts more, rather than
 * thresholding luminance: a mid-tone brand colour can sit close enough to the
 * middle that a threshold guesses wrong in both directions. The muted variant is
 * then blended toward the background as far as it can go while still clearing
 * WCAG AA, so secondary text reads as secondary without becoming unreadable.
 */
function textOn(background: string): { base: string; muted: string } {
  const base =
    contrastRatio(NEAR_WHITE, background) >= contrastRatio(NEAR_BLACK, background)
      ? NEAR_WHITE
      : NEAR_BLACK;

  let muted = base;
  for (const t of [0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1]) {
    const candidate = mixChannels(base, background, t);
    if (contrastRatio(candidate, background) >= WCAG_AA) {
      muted = candidate;
      break;
    }
  }
  return { base, muted };
}

const srgbToLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const linearToSrgb = (v: number) =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function parseHex(hex: string): [number, number, number] {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw.split("").map((c) => c + c).join("")
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Invalid hex colour: "${hex}" (expected #rgb or #rrggbb)`);
  }
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function hexToOklch(hex: string): Oklch {
  const [r, g, b] = parseHex(hex).map((v) => srgbToLinear(v / 255));
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return { l, c: Math.hypot(a, bb), h: Math.atan2(bb, a) };
}

function oklchToRgb(
  { l, c, h }: Oklch,
): { rgb: [number, number, number]; inGamut: boolean } {
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const L = l_ ** 3;
  const M = m_ ** 3;
  const S = s_ ** 3;
  const lin = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  const inGamut = lin.every((v) => v >= -0.0001 && v <= 1.0001);
  const rgb = lin.map((v) => Math.round(clamp01(linearToSrgb(clamp01(v))) * 255)) as [
    number,
    number,
    number,
  ];
  return { rgb, inGamut };
}

/** Reduce chroma until the colour fits in sRGB, so no step clips to a flat blob. */
function toChannels(target: Oklch): string {
  let c = target.c;
  for (let i = 0; i < 24; i++) {
    const { rgb, inGamut } = oklchToRgb({ ...target, c });
    if (inGamut) return rgb.join(" ");
    c *= 0.92;
  }
  return oklchToRgb({ ...target, c: 0 }).rgb.join(" ");
}

const STEP_500_INDEX = RAMP_STEPS.indexOf(500);

/**
 * How strongly a step follows the base colour's own lightness rather than the
 * profile's absolute lightness: fully at 500, not at all at the extremes.
 *
 * This resolves a genuine tension. `bg-brand-500` is the button fill, so the
 * colour a tenant supplies must come back byte-exact at 500. But anchoring the
 * *whole* ramp to the base lightness would ruin a tenant who picks a very dark
 * or very light primary — every step would shift with it, leaving no light
 * steps for text. Tapering gives exactness where it is load-bearing and keeps
 * the extremes in a usable range.
 */
function baseWeight(index: number): number {
  const span = Math.max(STEP_500_INDEX, RAMP_STEPS.length - 1 - STEP_500_INDEX);
  return 1 - Math.abs(index - STEP_500_INDEX) / span;
}

/** Build an 11-step ramp around `baseHex`, which lands exactly on step 500. */
export function generateRamp(baseHex: string): Record<RampStep, string> {
  const base = hexToOklch(baseHex);
  const lightnessShift = base.l - RAMP_PROFILE[500].l;
  const out = {} as Record<RampStep, string>;

  RAMP_STEPS.forEach((step, index) => {
    const { l, cScale, hShift } = RAMP_PROFILE[step];
    out[step] = toChannels({
      l: clamp01(l + lightnessShift * baseWeight(index)),
      c: base.c * cScale,
      h: base.h + hShift * DEG_TO_RAD,
    });
  });

  return out;
}

function mirror(ramp: Record<RampStep, string>): Record<RampStep, string> {
  const out = {} as Record<RampStep, string>;
  for (const step of RAMP_STEPS) out[step] = ramp[MIRROR[step]];
  return out;
}

/**
 * The CSS custom properties for a tenant, as `{ "brand-500": "245 158 11" }`.
 *
 * Returns an empty object when the theme is dark and declares no colours: that
 * tenant inherits app/globals.css verbatim and nothing is injected.
 */
export function themeVariables(theme: TenantTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  const light = theme.mode === "light";

  const addRamp = (token: string, ramp: Record<RampStep, string>) => {
    const finalRamp = light ? mirror(ramp) : ramp;
    for (const step of RAMP_STEPS) vars[`${token}-${step}`] = finalRamp[step];
    return finalRamp;
  };

  // A custom colour is generated; otherwise the built-in ramp is used, which
  // still needs emitting in light mode because it has to be mirrored.
  const brandRamp =
    theme.primary || light
      ? addRamp("brand", theme.primary ? generateRamp(theme.primary) : DEFAULT_BRAND)
      : DEFAULT_BRAND;
  if (theme.secondary || light) {
    addRamp("accent", theme.secondary ? generateRamp(theme.secondary) : DEFAULT_ACCENT);
  }

  // `text-on-brand` always sits on a brand-200 -> brand-100 gradient chip, so its
  // contrast depends on where that lands. Mirroring in light mode, or a tenant
  // picking a dark primary, both flip that chip dark — and a fixed dark text
  // colour would then be unreadable. Derive it instead of assuming.
  if (theme.primary || light) {
    // brandRamp is already mirrored when the mode is light, so use it as-is.
    const onChip = textOn(brandRamp[200]);
    vars["on-brand"] = onChip.base;
    vars["on-brand-muted"] = onChip.muted;
  }

  if (light) {
    // Neutrals only need declaring when they differ from the dark defaults.
    addRamp("surface", NEUTRAL_SURFACE);
    addRamp("ink", NEUTRAL_INK);
    vars.page = "250 250 249"; // stone-50
    vars.veil = "0 0 0"; // subtle tints become dark-on-light
    // scrim, panel and on-panel stay as they are: media backdrops read best dark
    // whatever the theme, and the upload panel is always light.
  }

  for (const [name, hex] of Object.entries(theme.overrides ?? {})) {
    vars[name] = parseHex(hex).join(" ");
  }

  return vars;
}

/**
 * Render `themeVariables` as a `:root { … }` block, or "" when there is nothing
 * to override.
 *
 * `extraVars` carries values the pure colour maths cannot produce — currently the
 * resolved font families, which have to come from next/font on the server.
 */
export function themeStyleSheet(
  theme: TenantTheme,
  extraVars: Record<string, string> = {},
): string {
  const entries = Object.entries({ ...themeVariables(theme), ...extraVars });
  if (entries.length === 0) return "";
  return `:root{${entries.map(([k, v]) => `--${k}:${v}`).join(";")}}`;
}
