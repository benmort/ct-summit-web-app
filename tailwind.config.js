/** @type {import('tailwindcss').Config} */

// Tenant-themable colour ramps. Each step resolves through a CSS variable holding
// space-separated RGB channels, so Tailwind's opacity modifier keeps working
// (`bg-surface-900/70`, `border-brand-300/45`). Values are set per tenant in the
// root layout; app/globals.css holds the dark defaults.
const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function ramp(name) {
  return Object.fromEntries(
    RAMP_STEPS.map((step) => [step, `rgb(var(--${name}-${step}) / <alpha-value>)`]),
  );
}

module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: "var(--font-body)",
        display: "var(--font-display)",
      },
      colors: {
        // Tenant-configurable
        brand: ramp("brand"),
        accent: ramp("accent"),
        // Mode-derived neutrals
        surface: ramp("surface"),
        ink: ramp("ink"),
        // Mode-aware but not tenant-configurable
        danger: ramp("danger"),
        success: ramp("success"),

        // Page background. Inverts with mode.
        page: "rgb(var(--page) / <alpha-value>)",
        // Subtle tint laid over a surface. Inverts with mode.
        veil: "rgb(var(--veil) / <alpha-value>)",
        // Backdrop behind photos and modals. Stays dark in every mode, because
        // media reads best on dark regardless of the tenant's theme.
        scrim: "rgb(var(--scrim) / <alpha-value>)",
        // Text on a scrim. Fixed like scrim itself: if these mirrored with the
        // ink ramp they would go dark on a permanently dark backdrop.
        "on-scrim": "rgb(var(--on-scrim) / <alpha-value>)",
        "on-scrim-muted": "rgb(var(--on-scrim-muted) / <alpha-value>)",
        // Text sitting on a brand-coloured fill. Mode-independent.
        "on-brand": "rgb(var(--on-brand) / <alpha-value>)",
        "on-brand-muted": "rgb(var(--on-brand-muted) / <alpha-value>)",
        // Always-light panel (the upload UI island) and its text. Mode-independent.
        panel: "rgb(var(--panel) / <alpha-value>)",
        "on-panel": "rgb(var(--on-panel) / <alpha-value>)",
      },
      keyframes: {
        "showreel-marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "showreel-marquee": "showreel-marquee 60s linear infinite",
      },
      boxShadow: {
        highlight: "inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
      },
      screens: {
        narrow: { raw: "(max-aspect-ratio: 3 / 2)" },
        wide: { raw: "(min-aspect-ratio: 3 / 2)" },
        "taller-than-854": { raw: "(min-height: 854px)" },
      },
    },
  },
  plugins: [],
};
