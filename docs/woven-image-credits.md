# Woven imagery — provenance and policy

Where every picture in the Woven tenant comes from, and the rules that decided
which slots got a photograph and which deliberately did not.

## The policy

**Woven's own photography carries anything that represents the gathering or its
people.** The `bw-participant-*` portraits are the dashboard hero, and the
`colour-collage-*` cut-outs illustrate Woven's own programme sessions.

**Stock imagery only ever covers generic blocks and nearby places** — a meal, a
rainforest, an aquarium. It is decorative. It never stands in for a delegate, a
speaker, a crew member, or a specific named building.

**Three slots were left without a photograph on purpose:**

| Slot | Why |
| --- | --- |
| 13 speaker headshots | Stock portraits would put strangers' faces forward as this gathering's Indigenous leaders. Waiting on real headshots (brief 6.4). |
| 10 crew headshots | Same reason (brief 7.3). |
| The venue, and both Registration sessions | Nothing suitable existed that was not either a recognisable building somewhere else or full of identifiable faces. A placeholder is more honest (brief 4.7). |

Candidates were rejected during sourcing for exactly these reasons: London's
Natural History Museum captioned as Cairns Museum, Borough Market as the Cairns
Night Markets, a Mediterranean promenade as the Cairns Esplanade, and a US fan
convention full of legible faces as Registration.

## Woven-supplied

`public/images/woven/` — provided by Woven, committed in `647f82f`.

| File | Used for |
| --- | --- |
| `bw-participant-1..4.webp` | Dashboard hero cross-fade (`brand.assets.heroImages`) |
| `bw-participant-2.webp` | Also the onboarding backdrop (`brand.assets.onboardingBackground`) |
| `colour-collage-1..5.webp` | Programme session images for Woven's own sessions |
| `team.webp` | Shared Commitments and Closing Ceremony |

Two things to know about the collages: they are **cut-outs with transparent
backgrounds**, and they use Woven's **previous** olive/purple/mint palette, which
sits oddly beside the current `#ed813a` / `#721112` theme. Worth a look with
fresh eyes — swapping the collages or the theme would settle it.

### Squared tiles — `public/images/woven/tiles/`

`collage-1..5.webp`, generated from the collages above. Card thumbnails crop with
`object-cover`, and on a wide transparent cut-out that lands on empty pixels, so
the cards rendered blank. Each collage is therefore contained on a 900×900 tile
with a 64px inset and flattened onto the cream `#F3EEDF`, which survives any crop.

Regenerate them if the collages or the page colour change:

```js
// with sharp, from the repo root
sharp(`public/images/woven/colour-collage-${n}.webp`)
  .resize(772, 772, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 64, bottom: 64, left: 64, right: 64, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .flatten({ background: { r: 0xF3, g: 0xEE, b: 0xDF, alpha: 1 } })
  .webp({ quality: 80 })
```

The supplied photographs are all ~1130px wide. The hero is displayed up to about
1770px on a desktop, so it upscales and softens there. Higher-resolution
originals would fix it (brief 14.1).

## Unsplash

[Unsplash License](https://unsplash.com/license): free to use commercially, no
permission or attribution required. Credited here anyway, and so the exact source
can be found again. All fetched at `w=1400&h=900&fit=crop&crop=entropy&q=72&fm=webp`.

### Nearby places — `public/images/woven/nearby/`

| File | Photographer | Source | Note |
| --- | --- | --- | --- |
| `great-barrier-reef.webp` | Yanguang Lan | [unsplash](https://unsplash.com/photos/aerial-photography-of-seawater-nPtKc0jqNus) | Genuinely the Great Barrier Reef — Heart Reef from the air |
| `cairns-aquarium.webp` | Zachary Spears | [unsplash](https://unsplash.com/photos/aquarium-hallway-DcweRpj62Ds) | A generic aquarium tunnel, not Cairns Aquarium |
| `cairns-koalas-and-creatures.webp` | Kerin Gedge | [unsplash](https://unsplash.com/photos/koala-bear-on-brown-tree-branch-P3sEj29SHD8) | A koala |
| `cairns-museum.webp` | Artur Matosyan | `photo-1564399579883-451a5d44ec08` | A generic museum interior, not Cairns Museum |
| `cairns-art-gallery.webp` | Andrew Neel | [unsplash](https://unsplash.com/photos/assorted-picture-frames-on-wall-acowe0pCVBg) | A generic gallery wall |
| `cairns-night-markets.webp` | alicharmant | `photo-1733959541069-1a289a05a59f` | A lit food stall, not the Cairns Night Markets |
| `cairns-festival.webp` | Kate Trysh | [unsplash](https://unsplash.com/photos/a-crowd-of-people-walking-around-a-street-next-to-tents-E5xQlNnngO0) | A generic community festival; daytime, no stage |
| `the-reef-eye.webp` | Markolf von Ketelhodt | [unsplash](https://unsplash.com/photos/a-ferris-wheel-sitting-on-top-of-a-pier-lHB_47fnnRM) | A ferris wheel on a pier, not The Reef Eye |

Six of these eight illustrate the *idea* rather than the actual venue. They are
fine as card decoration; do not caption any of them as a photograph of the place.

### Programme blocks — `public/images/woven/events/`

| File | Photographer | Source |
| --- | --- | --- |
| `morning-tea.webp` | John Tecuceanu | [unsplash](https://unsplash.com/photos/UdHh5w-1a44) |
| `lunch.webp` | engin akyurt | [unsplash](https://unsplash.com/photos/6dPXcMvniHU) |
| `dinner.webp` | Alexander Mass | `photo-1783818412534-370b60b8a1d8` |
| `on-country.webp` | David Clode | [unsplash](https://unsplash.com/photos/a-forest-filled-with-lots-of-green-trees-OcRre9E1ARo) |

`on-country.webp` is misty wet-tropics rainforest and reads convincingly as far
north Queensland, but it is not a photograph of the On Country session location,
which is still unconfirmed (brief 5.8).
