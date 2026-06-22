# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A dependency-free, build-free static web app that generates geometric GrapheneOS-style
wallpapers as SVG and exports them to raster (WebP/JPEG/PNG) entirely client-side. There
is no npm, no bundler, no backend, no package manager. The deliverable is three files:
[index.html](index.html), [src/app.js](src/app.js), [src/style.css](src/style.css).

This dependency-free posture is a deliberate project value (see the security note in the
README) — do not introduce a build step, framework, or runtime dependency without explicit
direction.

## Commands

There is no build step. The app is shipped as-is.

```bash
# Syntax-check the single JS file (this is what VALIDATION.txt records)
node --check src/app.js

# Run locally — open index.html directly, or serve it:
python3 -m http.server 8000   # then open http://localhost:8000

# End-to-end tests (Playwright) — dev-only tooling, two engines: Brave + WebKit(Safari)
npm install                   # @playwright/test only; bundled browsers skipped (we use Brave)
npx playwright install webkit # once, for the Safari-engine project
npm test                      # both engines; add -- --project=brave for Brave only
npx playwright test -g "grain=true"   # run a subset by title
```

The Playwright suite lives in [tests/](tests/) with [playwright.config.js](playwright.config.js);
it serves the static site via `python3 -m http.server` and runs two projects: **brave**
(Chromium, launched by `executablePath`, override with `BRAVE_PATH`) and **webkit** (Safari's
engine, guarding the WebP→JPEG export fallback). `package.json`/`node_modules` exist **only**
for tests — the shipped app ([index.html](index.html), [src/](src/)) stays dependency-free,
and `node_modules` is gitignored so it never reaches the Pages artifact.

Deployment is automatic: pushing to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml),
which uploads the repo root as-is to GitHub Pages (no build step in the workflow either).

## Architecture

All application logic lives in [src/app.js](src/app.js) as plain `"use strict"` script (no
modules). It runs top-to-bottom: pure helpers first, then `initApp()` is called at the
bottom, then event listeners are wired.

The data flow is a one-directional render pipeline:

1. **Params object** — a flat `DEFAULT_PARAMS` object holds all state (device, palette,
   colors, geometry numbers, toggles, export settings).
2. **DOM inputs are the source of truth during interaction.** `readParamsFromInputs()`
   reads every control into a fresh params object; `setInputsFromParams()` pushes a params
   object back onto the controls. `INPUT_IDS` is the canonical list of control element ids.
3. **`generateWallpaperSvg(params)` is the pure core** — given params it returns a complete
   SVG string. It composes layers in order (top scaffold → background lattice → main
   isometric cube cluster → triangular facets → central emblem → dot matrix → bottom fade →
   brand → fingerprint aperture). It has no DOM dependencies.
4. **`render()`** reads inputs, generates the SVG, injects it into `#preview`, and updates
   the device readout. Bound to control events via a 40ms `debounce`.

### Isometric geometry

The visual structure is built from an isometric projection. `iso(x, y, z, p)` maps lattice
coordinates to screen pixels using `unitX`/`unitY`/`unitZ` scale params and an origin
expressed as percentages of canvas size. `vertices()` / `cube()` build unit cubes from this;
`baseCluster` is the hand-authored list of cube positions and `accentMap` marks which cubes
get accent-colored faces. Randomness (node dots, which cubes render) comes from `mulberry32`,
a seeded PRNG — so output is **deterministic for a given `seed`**.

### Presets

`DEVICE_PRESETS` and `PALETTE_PRESETS` are plain arrays at the top of the file. Selecting a
device runs `paramsForDevice()` (sets width/height and rescales geometry for wide vs. tall
screens); selecting a palette runs `paramsForPalette()` (overwrites the six color fields).
Editing any color field manually switches the palette selector to a synthetic "Custom"
option (`setPaletteCustom()`). When adding devices, keep them aligned with
GrapheneOS-supported Pixel hardware and include a `codename`.

### Official logo handling

`useOfficialLogo` renders the real GrapheneOS mark, **inlined** as `OFFICIAL_LOGO_PATH` /
`OFFICIAL_LOGO_VIEWBOX` constants (sourced from `assets/grapheneos.svg`). No runtime fetch —
inlining makes it work under `file://` and avoids tainting the canvas on raster export.
`officialGrapheneLogo()` tints it via `fill="${p.accent2}"` (the asset's own black fill is
dropped, else it'd be black-on-black). `brandMark()` uses it in both the central emblem and
the corner brand; toggle off → procedural `grapheneMark()`. Note: the official logo embeds a
nested `<svg>`, so a `#preview svg` selector is ambiguous — target the root with
`#preview > svg`.

## Fingerprint aperture

`generateWallpaperSvg()` wraps the structural layers (top-scaffold → dot-matrix) in a
`<g id="geometry" mask="url(#apertureMask)">`. When the fingerprint is enabled,
`apertureMaskDef()` emits a mask (white field minus a soft-edged radial-gradient disc at the
void) so geometry is cleared inside the void with a soft rim fade; disabled → no mask
attribute. `fingerprintAperture()` then draws (unmasked, over the geometry) a hex ring at the
void boundary plus accent "rim nodes" at the points where lattice segments cross the boundary
(`lineCircleIntersections()` against the `latticeSegments` collected during lattice
generation). The interior is left empty on purpose — Android paints the real sensor UI there.
Controls: `fingerprintXPct`/`YPct` (center), `fingerprintRadiusPct` (void+ring radius),
`fingerprintRingOpacity` (ring+node opacity), `fingerprintEnabled` (whole aperture + mask).
Design rationale: [docs/superpowers/specs/2026-06-23-fingerprint-aperture-and-logo-design.md](docs/superpowers/specs/2026-06-23-fingerprint-aperture-and-logo-design.md).

### Raster export

`downloadSvgAsRaster()` loads the SVG string into an `Image`, draws it to a canvas at
`pngScale`, and exports via `canvas.toBlob(blob, mimeType, quality)`. Format/quality/scale
come from `exportFormat` / `rasterQuality` / `pngScale` and are all honored (a prior bug
hardcoded lossless PNG and ignored the UI; keep these wired). Defaults are WebP @ quality
0.90 @ full scale (1.0) for crisp, small wallpaper-grade output — PNG is lossless but the
grain layer makes it multi-MB.

**Engine fallback:** `encodeRaster()` wraps the encode because Safari/WebKit has no canvas
WebP encoder and silently emits lossless PNG (~5 MB with grain). If a WebP request comes
back as a non-WebP blob, it retries as JPEG. The download filename's extension is derived
from the produced blob's `.type` (via `extForType`), never from the requested format — so
files are never mislabeled (Safari gets a real `.jpg`, Chromium a real `.webp`). The caller
passes a base name **without** an extension. When changing export code, preserve both
invariants: derive-extension-from-actual-bytes, and the lossy fallback.

SVG export is a plain text-blob download. Note: `render()` deliberately does not persist
state to the URL — reload resets controls to `DEFAULT_PARAMS`.

### Controls UI (mobile-first, segmented tabs)

The control panel is a precision-instrument layout: a sticky **segmented tab bar**
(`setupTabs()`) swaps one `.panel` at a time (`Setup` / `Form` / `Color` / `Export`); the
sliding pill is driven by a `--active` index custom property on `.tabbar`. The whole control
set lives in `<form id="controls">`, and `app.js` keys all state off `INPUT_IDS` /
`readParamsFromInputs` / `setInputsFromParams` — so panels can be reorganized freely **as long
as every input `id` is preserved**. Each range row is a visible slider plus a tappable
**value chip** (`enhanceRangeControls()`); the chip opens a `<dialog>` value picker
(`openValuePicker`) for precise entry. The chip-toggle markup (`label.chip-toggle > input +
span`) is load-bearing for the Playwright suite. Styling lives in one consolidated
`src/style.css` (design tokens in `:root`, system `ui-monospace` stack — no web fonts, to keep
the zero-network-request guarantee). Design rationale:
[docs/superpowers/specs/2026-06-23-mobile-ui-redesign-design.md](docs/superpowers/specs/2026-06-23-mobile-ui-redesign-design.md).
