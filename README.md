# June Street Ventures — three directions

Three self-contained HTML files. No build step, no dependencies. Open any of them
in a browser and click through Home / Team / Portfolio.

| File | Direction | The idea in one line |
|---|---|---|
| `direction-1-meridian.html` | **Meridian** | A horizon line runs the length of the page and the sky advances dawn → dusk as you scroll. |
| `direction-2-atmosphere.html` | **Atmosphere** | Coastal light in four parallax layers, built entirely in CSS. Dark, big type, no photography. |
| `direction-3-almanac.html` | **Almanac** | Growth rings. Patient capital drawn as the thing it actually looks like over time. |

All three: responsive to 360px, keyboard focus visible, `prefers-reduced-motion`
respected, and every page reachable without JavaScript-heavy routing beyond a hash.

`index.html` is the entry point: a quiet page describing the three directions and
linking to each.

**What this repo contains.** The four HTML files and this README. The asset
folders the sections below refer to — `logos/`, `logos/white/`, `fonts/`, the
`bixby-*.jpg` grades and `logo-sourcing.md` — are not committed here, because
every asset is already inlined into each HTML file and the pages work without
them. Those sections stay because they describe how to move to real files for
production; when you do that, add the folders in the same commit.

---

## Editing content

Each file has one `<script>` block near the bottom with two arrays. Everything
else is plain HTML you can edit in place.

```js
const COMPANIES = [
  {n:"Crexi", f:"Commercial Real Estate Exchange, Inc.", s:"Financial services & platforms", u:""},
  // n = display name   f = full legal name   s = sector   u = website URL
];

const TEAM = [
  {name:"...", role:"...", bio:"..."},
];
```

Add a `u:"https://..."` and the portfolio card becomes a link.

## Meridian's sky

The horizon gradient runs a sunrise, warming from first light to risen as you
scroll. Four stops live in the `SKY` array. The hero copy sits over the sky, so
any new stop needs a contrast check — the hero lede is `#384640` rather than the
usual muted ink precisely because the first-light band pushed it under 4.5:1.

## Typography

All three use June Sans (Regular 400, Medium 500, Bold 700). No web fonts are
fetched. The `.otf` files you sent are converted to `.woff2` in `fonts/` and
inlined per file so the pitch opens offline.

For production, replace the base64 in each `@font-face` with
`url("fonts/JuneSans-Regular.woff2")` and ship the folder. That drops roughly
100KB per file.

June Sans has three weights, so nothing in the CSS uses 300 or 600 — a browser
would synthesise those and the result looks wrong. If you add a weight, add the
file too.

Because one family now replaces three different pairings, the directions
separate on treatment rather than typeface:

| | Weight | Scale | Tracking | Small caps |
|---|---|---|---|---|
| Meridian | Regular | 7.4vw | -0.028em | uppercase, +0.09em |
| Atmosphere | Bold | 10vw | -0.048em | uppercase, +0.10em |
| Almanac | Medium | moderate | -0.016em | uppercase, +0.13em |

## Almanac's palette

Eucalyptus ground, two moss tones, one marigold accent. Variables are named by
role rather than hue — `--mark` and `--mark-2` for the rings and the four
glyphs, `--accent` for active states — because this palette went to monochrome
and came back, and it may move again.

`--ink-40` is #636B5F. The original #8B9386 measured 2.81:1 against the lighter
ground and is used for sector labels, hero meta and the footer at 12-14px. If
you adjust the palette, re-check that one.

## Portfolio logos

All 17 are in `logos/`, with white silhouettes in `logos/white/` for the dark
direction, and they are also inlined into each HTML file so the pitch opens
anywhere with no folder beside it.

Resolution order per logo: a real file in `logos/`, then the inlined copy, then
a domain lookup. A real file always wins, so replacing one is still just
dropping it in the folder. For production, delete the `LOGO_INLINE` map and ship
the folder. See `logo-sourcing.md`.

## Atmosphere's photo

Bixby Bridge at sunset, from the Spencer Davis frame on Unsplash. Cropped to the
top 72% of the original, which cuts the bright surf out of frame entirely.

**It sits below the hero, not in it.** The hero is CSS weather only — four
gradient planes and a scrim, no image. The coastline gets the full-bleed section
directly beneath, where it expands from an inset window as it scrolls past and
nothing sits on top of it. That is the right split: the photograph never has to
fight the headline, and the headline never has to be rescued with a burn.

Grades on disk, warmest to coolest: `bixby-asis` (in use, essentially as shot),
`bixby-warm`, `bixby-dusk`, `bixby-twilight`, `bixby-deep`. One inlined copy
lives on `:root` as `--site-img`, so swapping is one line:

```css
:root{--site-img:url("bixby-dusk.jpg")}
```

Attribution is not required under the Unsplash license, but crediting Spencer
Davis in the footer would be reasonable.

## Swapping in the June Street mark

Search each file for `LOGO SWAP`. One block in the header, replace with:

```html
<img src="logo.svg" alt="June Street Ventures" height="30">
```

Direction 3 also uses a small ring glyph in the header lockup and four hand-built
SVG marks on the home page. Those are original and yours to keep or drop.

## Sharing a link with Bill

`index.html` is the entry point: a quiet page describing the three directions
and linking to each. Send one URL and he can click through everything.

Every file is self-contained — fonts, logos and the photograph are all inlined,
and nothing is fetched from a CDN. So any static host works with zero setup.
Fastest options, in order of how little friction they involve:

1. **Netlify Drop** (`app.netlify.com/drop`) — drag this folder onto the page,
   get a URL in about ten seconds. No account needed to start. Best for a draft
   you may replace twice before the meeting.
2. **The GoDaddy hosting you already have** — upload the folder to a
   subdirectory via cPanel File Manager, e.g. `junestreetventures.com/preview/`.
   Better if the URL being on their own domain matters to Bill.
3. **Send the files** — they open on double-click with no server. Worth knowing
   as a fallback if he has trouble with a link.

Two things before you send it:

- The pages carry `noindex, nofollow`, but a public URL is still public. If
  Bill would rather it not be findable, Netlify and most hosts support password
  protection, and an unguessable subdirectory name is a reasonable middle ground.
- The placeholders are visible. `index.html` says so in the footer, but it is
  worth saying in the email too, so the team page reading "Team member name"
  lands as a gap to fill rather than an oversight.

## Deploying to GoDaddy

These are static files. Whatever the hosting plan is, this works:

1. Pick a direction, rename it `index.html`.
2. Upload `index.html` plus the `logos/` folder to the site root via cPanel File
   Manager or SFTP.

The hash router (`#/team`, `#/portfolio`) means one file serves all three pages.
That's deliberate for the pitch stage. Once a direction is locked, splitting into
real `index.html` / `team.html` / `portfolio.html` is a fifteen-minute job and is
better for search. Ask Claude to do it.

## Placeholders to replace before launch

- `hello@junestreetventures.com` — appears in the contact block on all three pages
- The `TEAM` array — names, roles, bios, and headshot images
- Headshots: drop files into `.person .shot` in place of the initials span
- idealis is tagged "Consumer" as a holding position; worth confirming
