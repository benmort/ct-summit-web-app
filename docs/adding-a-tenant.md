# Adding a tenant

One event = one tenant = one folder plus three registry lines. No component changes.

## 1. Create the folder

```
tenants/<slug>/
  tenant.json          # domains, theme, feature flags
  data.json            # speakers, events, schedule, venues, crew, …
  content/
    brand.json         # names, description, asset paths
    navigation.json    # bottom tabs, menu, page taglines
    onboarding.json    # Acknowledgement of Country, welcome slides
    guidance.json      # the event-guidance sections
    integrations.json  # support email, group chats, transport
```

Copy `tenants/woven/` as the starting point — it is a complete, valid tenant with
placeholder copy. The shapes are typed in `lib/tenant/types.ts` and
`lib/tenant/content-types.ts`; the questionnaire in
`docs/tenant-questionnaire.md` maps every field to a question.

Per-tenant images go in `public/tenants/<slug>/` and are referenced from
`brand.json → assets`.

## 2. Register it in three places

They are separate on purpose: middleware runs on the Edge runtime and must not
pull in two ~200 KB `data.json` files just to route a request.

| File | Add | Why separate |
| --- | --- | --- |
| `lib/tenant/domains.ts` | import `tenant.json`, push to `TENANT_IDENTITIES` | Edge-safe: tiny, no heavy imports |
| `lib/tenant/registry.ts` | import `data.json`, add to `RAW_DATA` | Server-only event data |
| `lib/tenant/content-registry.ts` | import the five content files, add to `CONTENT` | Server-only copy |

`tests/tenant/registry.test.ts` and `tests/tenant/content.test.ts` fail if these
three ever drift apart, so a half-registered tenant cannot ship.

## 3. Point the domain at it

Add the hostname to `tenant.json → domains`, then add it as a domain on the
Vercel project. Nothing else is host-specific.

Locally, `<slug>.localhost:3000` works with no `/etc/hosts` edit — so
`woven.localhost:3000` serves Woven while `localhost:3000` serves the default.
Unknown hosts (bare `localhost`, `*.vercel.app` previews) fall back to
`DEFAULT_TENANT_SLUG`; set the `DEFAULT_TENANT` env var to point a preview
deployment at a different tenant.

## 4. Check it

```bash
pnpm test          # registry/content/theme guards
pnpm build
pnpm start
curl -s -H 'Host: <slug>.localhost' http://localhost:3000/ | grep data-tenant
```

## Theming

A tenant supplies two hex colours and a mode:

```json
"theme": { "mode": "light", "primary": "#0d9488", "secondary": "#7c3aed" }
```

`primary` becomes the `brand` ramp and `secondary` the `accent` ramp. Each is
expanded to eleven shades in Oklab using the tonal profile of Tailwind's amber —
the palette the components were designed against — so the colour you give lands
exactly on step 500 (`bg-brand-500`, the button fill) and the rest follow.

`mode: "light"` mirrors the neutral and brand ramps: `bg-surface-950` is the
darkest surface in dark mode and the lightest in light mode, `text-ink-100`
flips from near-white to near-black, and mid-tones barely move. That is why there
are no `dark:` variants anywhere — the same class works in both modes.

Pin an individual shade if a brand guide demands it:

```json
"theme": { "mode": "dark", "primary": "#fca400", "overrides": { "brand-500": "#fca400" } }
```

**The default tenant deliberately declares no colours.** With `mode: "dark"` and
no `primary`/`secondary`, nothing is injected and the palette in
`app/globals.css` applies verbatim. That is what keeps Common Threads
byte-identical to the pre-multi-tenant app, and
`tests/tenant/theme-tokens.test.ts` asserts those defaults still equal the
Tailwind colours they replaced.

Never reintroduce raw palette classes (`bg-zinc-900`, `text-amber-200`). Use the
tokens: `brand`, `accent`, `surface`, `ink`, `danger`, `success`, plus `page`,
`veil` (tint that inverts), `scrim` (media backdrop, always dark), `on-brand`,
`panel`. Run `pnpm verify:theme` after a build to confirm every token class you
used actually compiled.

`on-brand` is derived, not fixed. It is the text on the selected-day chip, which
is a `brand-200 → brand-100` gradient — and that chip goes dark both in light
mode (mirroring) and for a tenant with a dark primary like `#124a3e`. So
`on-brand` follows the chip's luminance and flips to near-white when needed. A
fixed dark value would be invisible on Woven.

## Fonts

```json
"theme": { "fonts": { "display": "fjalla-one", "body": "anuphan" } }
```

`display` is used for the wordmark and page headings (`font-display`), `body` for
everything else (`font-sans`). Omit either and it falls back to the device's
system stack, which is what the default tenant does — Common Threads loads no web
fonts at all.

Available keys live in `lib/tenant/fonts.ts`. next/font needs literal,
statically-analysable calls, so a font has to be registered there rather than
named freely in tenant.json; adding one is an import plus a registry entry. Fonts
are self-hosted and preloaded by Next, so nothing is requested from Google at
runtime and the CSP needs no external font host.
`tests/tenant/content.test.ts` fails on a font key that isn't registered, since
an unknown key otherwise falls back silently.

## Feature flags

```json
"features": { "moments": true }
```

`moments` gates the shared photo gallery — pages, media API, upload broker and
moderation login — in `middleware.ts`. Defaults to enabled. Turn it off for a
tenant that isn't collecting photos; every one of those routes then 404s for that
host.

## Photos and moderation

Each tenant has its own album. Nothing needs configuring: the defaults namespace
everything by slug.

```json
"storage": {
  "blobMediaPrefix": "woven/album-img/",
  "blobManifestPrefix": "woven/album-manifests/",
  "dataDir": "data/tenants/woven",
  "moderationEnvPrefix": "MODERATION_WOVEN",
  "moderationCookie": "mod_woven"
}
```

**The default tenant overrides these to its pre-existing paths** (`album-img/`,
`album-manifests/`, `data/`, `ct_mod`, `MODERATION`), which is why partitioning
storage required no migration of the live Common Threads album, and why existing
moderator sessions kept working. `tests/tenant/isolation.test.ts` pins those exact
values — changing them orphans the live photos.

Isolation is structural rather than something each route remembers to check:

- `getPhotoStorage(slug)` returns an instance bound to that tenant's
  `StorageScope`; both backends take the scope instead of module-level constants.
- `/api/photos/[id]/file` looks an id up in *that tenant's* manifest, so one
  tenant's photo id 404s on another's host even though both share a blob store.
- Moderation secrets come from `<moderationEnvPrefix>_SECRET` and
  `_PASSWORD`, and the tenant slug is signed into the session cookie — so a
  cookie minted for one tenant is rejected by another even if they share a
  secret. Secrets are never stored in `tenant.json`.
- Upload rate-limit buckets and upload-session stores are per tenant.

### Set these env vars per tenant

```
MODERATION_WOVEN_SECRET=<32+ random chars>
MODERATION_WOVEN_PASSWORD=<what moderators type>
```

The "moderation is not configured" notice in the gallery prints the correct
variable names for whichever tenant you are viewing.

### The one non-obvious bit

Vercel Blob's client-upload flow has two callbacks with different execution
contexts. `onBeforeGenerateToken` runs inside the browser's request, so the host
identifies the tenant — that is where the slug is stamped into `tokenPayload`.
`onUploadCompleted` is a **server-to-server callback from Vercel with no tenant
host**, so it must read the slug back out of the token and must never call
`getTenantSlug()`. Both directions are covered by
`tests/tenant/isolation.test.ts`.
