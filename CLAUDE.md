# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A dependency-free, build-free static web app that generates geometric GrapheneOS-style
wallpapers as SVG and exports them to raster (WebP/JPEG/PNG) entirely client-side. There
is no npm, no bundler, no backend, no package manager in the shipped product. The deliverable
is [index.html](index.html) plus [src/](src/) (`core.js`, `styles/*.js`, `app.js`, `style.css`)
and a PWA service worker ([sw.js](sw.js)).

This dependency-free, zero-network posture is a deliberate project value — **do not introduce a
build step, framework, runtime dependency, or web font** without explicit direction. Everything
(the GrapheneOS logo, fonts) is inlined; nothing is fetched at runtime.

## Commands

There is no build step. The app is shipped as-is; `package.json`/`node_modules` exist **only**
for the test tooling and are gitignored so they never reach the Pages artifact.

```bash
# Syntax-check a file (no build, so this is the fast sanity check)
node --check src/styles/forge.js

# Run locally — open index.html directly, or serve it:
python3 -m http.server 8000        # then open http://localhost:8000

# End-to-end tests (Playwright) — dev-only, two engines: Brave + WebKit(Safari)
npm install                        # @playwright/test only; bundled browsers skipped (we use Brave)
npx playwright install webkit      # once, for the Safari-engine project
npx playwright test                # both engines
npx playwright test --project=brave # Brave only (the fast default during dev)
npx playwright test -g "forge"     # run a subset by title
```

The Playwright suite ([tests/](tests/), [playwright.config.js](playwright.config.js)) serves the
static site via `python3 -m http.server` and runs two projects: **brave** (Chromium via
`executablePath`, override with `BRAVE_PATH`) and **webkit** (Safari's engine, which guards the
WebP→JPEG export fallback). Per-style specs live in [tests/styles/](tests/styles/).

Deployment is automatic and **push-to-`main` = production**: it triggers
[.github/workflows/deploy.yml](.github/workflows/deploy.yml), which uploads the repo root as-is to
GitHub Pages (no build in the workflow). Only push when explicitly told to.

## Architecture

The app is **ordered classic `<script>` files sharing one global scope** (no ES modules — that
keeps `file://` working and the test globals visible). Load order in [index.html](index.html):
`core.js` → every `styles/<id>.js` → `app.js` (last). `app.js`'s top-level code (`initApp()`,
event listeners) runs once everything else is defined.

- **[src/core.js](src/core.js)** — data + pure primitives shared by all styles: `DEVICE_PRESETS`,
  `PALETTE_PRESETS` (the shared 36-palette library), `DEFAULT_PARAMS`, `INPUT_IDS`, the **style
  registry** (`registerStyle`/`STYLES`/`allStyleOptions`/`effectiveDefaults`/`allInputIds`),
  `projectPalettes`, the **shared sensor model** (`sensorGeom`/`sensorMaskDef`/`sensorMaskAttr`/
  `sensorRing`/`sensorMark`/`cornerBrand`), color math (`mix`/`hexToRgb`/`scaleColor`/
  `complementaryPair`/`clamp01`), the seeded PRNG `mulberry32` + `valueNoise2D`, geometry helpers,
  and the inlined `OFFICIAL_LOGO_PATH`.
- **[src/styles/lattice.js](src/styles/lattice.js)** — `generateLatticeSvg`, the original isometric
  generator. Lattice is the one **built-in** style (hand-written controls in `index.html`).
- **[src/styles/<id>.js](src/styles/)** — every other style. Each is self-contained, depends only
  on `core.js`, and **self-registers via `registerStyle({...})`** at the bottom of the file.
- **[src/app.js](src/app.js)** — the `generateWallpaperSvg` dispatcher, raster export, and all UI
  wiring (tabs, style toggle, control injection, params↔inputs).

### The render pipeline (one-directional)

1. **Params object** — a flat object (seeded from `DEFAULT_PARAMS` + every registered style's
   `defaults` via `effectiveDefaults()`) holds all state.
2. **DOM inputs are the source of truth during interaction.** `readParamsFromInputs()` reads every
   control (per `allInputIds()`) into a fresh params object; `setInputsFromParams()` pushes a
   params object back onto the controls. Device/palette/`<id>Preset` selects are keyed separately
   (by id), not in `allInputIds`.
3. **`generateWallpaperSvg(p)` is the pure core** — returns a complete SVG string, no DOM deps.
   It's a thin dispatcher: `STYLES[p.style].generate(p)` if registered, else `generateLatticeSvg`.
4. **`render()`** reads inputs, generates SVG, injects into `#preview`, updates the device readout.
   Bound to control events via a 40ms `debounce`. State is **not** persisted to the URL (reload
   resets to defaults).

### Style registry (how styles plug in)

`registerStyle({ id, label, generate, defaults, inputIds, colorIds, presets, controlsHtml })`:
- `generate(p) → SVG string` (pure, deterministic).
- `defaults` merged into the global params via `effectiveDefaults()`.
- `inputIds` — control element ids this style owns (added to `allInputIds`).
- `colorIds` — which of those are colors (editing one flips the style's preset dropdown to Custom).
- `presets` — usually `projectPalettes(p => ({ <styleColorId>: p.accent|accent2|lineColor|background* }))`,
  populating the style's `<id>Preset` `<select>`. **The preset select id MUST be `<id>Preset`**.
- `controlsHtml: { setup?, form?, color? }` — HTML injected into the matching control panel,
  wrapped in a `[data-styles="<id>"]` group; `applyStyle()` shows only the active style's groups.

To add a style: create `src/styles/<id>.js` (registering itself), add a `<script>` for it before
`app.js` in `index.html`, add it to the Composition `data-styles` group + `sw.js` precache, and add
`tests/styles/<id>.spec.js`. Follow [docs/superpowers/specs/2026-06-23-style-contract.md](docs/superpowers/specs/2026-06-23-style-contract.md).

There are **12 top-level styles**: lattice, topographic, constellation, flow, circuit, bokeh,
facets, modulation, matrix, crashdump, keepcalm, forge. (`sonar.js`/`truchet.js` are generator-only
modules — no `registerStyle` — hosted as alternate **Forms** under topographic; facets has a Form
select too. **Forge** is the metal-tessellation port of [GOS-Chic](https://github.com/rinc3w1nd/GOS-Chic)
that replaced the retired "Chic" style.)

### Shared palette library

`PALETTE_PRESETS` (36 curated dark palettes; fields `accent`/`accent2`/`lineColor`/`backgroundTop`
/`Mid`/`Bottom`) is the single color library for the whole suite. `projectPalettes(mapFn)` maps it
onto a style's color roles so a palette reads as the same identity in every style. The **selected
palette persists across style switches**: `paletteForStyle()` re-applies the current `paletteId`
onto whatever style you switch to; hand-editing a color sets `paletteId = "custom"` so the carry
doesn't clobber it. Lattice uses `#palette` (`paramsForPalette`); registered styles use `#<id>Preset`.

### Shared sensor (fingerprint) model

Styles treat the fingerprint sensor as a focal void. `sensorGeom(p)` returns
`{ unit, cx, cy, r, on }` (`on = p.fingerprintEnabled !== false`). When on, wrap structural content
in a group carrying `sensorMaskAttr(p)` + add `sensorMaskDef(p)` (clears a soft disc), then draw
`sensorRing(p, color, accent2, shape)` on top (or `sensorMark` when `sensorLogo` is set). **All of
these return `""` when the sensor is off** — so a style's *extra* sensor decoration (a glow, bloom,
callout, etc.) must be guarded on `sensorGeom(p).on` explicitly, or it will wrongly draw when off.
`cornerBrand(p, color)` is the shared bottom-right GRAPHENEOS watermark. Sensor controls:
`fingerprintXPct`/`YPct`, `fingerprintRadiusPct`, `fingerprintRingOpacity`, `fingerprintEnabled`,
`sensorLogo`. Lattice keeps its own richer aperture (see below).

### Determinism & export-safe SVG (hard constraints)

- **Deterministic for a given `seed`**: randomness comes only from `mulberry32(p.seed)` /
  `valueNoise2D(p.seed)`. Never use `Math.random()` or `Date` in a generator.
- **Export-safe filters only.** The SVG is rasterised by drawing it into an `<img>`→canvas, where
  `feSpecularLighting` / `feDiffuseLighting` / `feDisplacementMap` **silently fail**. Safe:
  `feTurbulence`, `feColorMatrix`, `feComponentTransfer`, `feGaussianBlur`, `feMerge`, gradients.
- **Bounded element count** (< ~4000) — no per-pixel canvas styles (aurora/fractal were removed for
  this reason).
- **ID-collision gotcha:** a registered style's SVG element `id=` must never equal one of its
  control input ids (e.g. a `<linearGradient id="forgeMetal">` collides with `<input id="forgeMetal">`,
  silently breaking that color picker). Namespace SVG ids (`forgeMetalGrad`, etc.).

### Device presets

`DEVICE_PRESETS` are GrapheneOS-supported Pixels (`id`, `label`, `codename`, `width`, `height`,
`category`, optional `fpYPct`). `paramsForDevice()` sets width/height, rescales lattice geometry for
wide vs. tall screens, and applies the **per-device fingerprint height** `fingerprintYPct: d.fpYPct ?? 72.5`
(sensors are horizontally centered, so only Y is tracked; unmeasured devices fall back to 72.5). When
adding a device keep it aligned with real Pixel hardware and include a `codename`.

### Official logo handling

`useOfficialLogo`/`sensorLogo` render the real GrapheneOS mark, **inlined** as `OFFICIAL_LOGO_PATH`
(sourced from `assets/grapheneos.svg`). No runtime fetch — inlining makes it work under `file://`
and avoids tainting the canvas on raster export. The asset's own black fill is dropped and the mark
is tinted via the parent element's `fill` (else black-on-black). Note: the official logo embeds a
nested `<svg>`, so `#preview svg` is ambiguous — target the root with `#preview > svg`.

### Lattice fingerprint aperture (lattice-specific)

Lattice has its own aperture (richer than the shared `sensorRing`): `generateLatticeSvg` wraps the
structural layers in `<g id="geometry" mask="url(#apertureMask)">`; `apertureMaskDef()` clears a
soft-edged disc at the void; `fingerprintAperture()` draws a hex ring + accent "rim nodes" where
lattice segments cross the void boundary (`lineCircleIntersections()` against `latticeSegments`).
Interior left empty — Android paints the real sensor UI there.

### Raster export

`downloadSvgAsRaster()` loads the SVG into an `Image`, draws to a canvas at `pngScale`, and exports
via `canvas.toBlob(blob, mimeType, quality)`. Format/quality/scale come from `exportFormat` /
`rasterQuality` / `pngScale` (all honored — a prior bug hardcoded PNG; keep these wired). Default is
WebP @ 0.90 @ 1.0. **Engine fallback:** `encodeRaster()` retries as JPEG if a WebP request returns a
non-WebP blob (Safari/WebKit has no canvas WebP encoder). The download filename's extension is derived
from the produced blob's `.type` (via `extForType`), **never** from the requested format — preserve
both invariants when touching export: derive-extension-from-actual-bytes, and the lossy fallback. The
caller passes a base name **without** extension. SVG export is a plain text-blob download.

### Controls UI (mobile-first, segmented tabs)

A sticky **segmented tab bar** (`setupTabs()`) swaps one `.panel` at a time
(`Setup`/`Form`/`Color`/`Export`); the sliding pill is driven by a `--active` index custom property.
The whole control set lives in `<form id="controls">`, and `app.js` keys all state off
`allInputIds`/`readParamsFromInputs`/`setInputsFromParams` — so panels can be reorganized freely **as
long as every input `id` is preserved**. Each range row is a slider + a tappable **value chip**
(`enhanceRangeControls()`) that opens a `<dialog>` picker. The chip-toggle markup
(`label.chip-toggle > input + span`) is load-bearing for the Playwright suite. The style picker is a
`<dialog>` opened by the header `#open-style` button (`.style-opt[data-style]` buttons built by
`buildStyleToggle()`). Styling lives in one `src/style.css` (design tokens in `:root`, system
`ui-monospace` stack — no web fonts).

### PWA / service worker

[sw.js](sw.js) is network-first with a precache `SHELL` list (bump `CACHE_NAME` when the shell
changes). When adding/removing a style file, update the `SHELL` list and the cache version.
