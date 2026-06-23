# GrapheneOS Wallpaper Studio, Vanilla Edition

A dependency-free static wallpaper generator for GrapheneOS-supported Pixel devices.

No npm. No TypeScript build. No Vite. No backend. No package manager.

Open `index.html` directly or host it on GitHub Pages.

## Files

```text
index.html                     # markup + control panel; loads the scripts in order
sw.js                          # PWA service worker (network-first, offline shell)
manifest.webmanifest
src/
  core.js                      # shared data, primitives, style registry, sensor model
  styles/<id>.js               # one self-registering SVG generator per style
  app.js                       # dispatcher, raster export, all UI wiring (loaded last)
  style.css                    # one consolidated stylesheet (no web fonts)
.github/workflows/deploy.yml   # push-to-main → GitHub Pages, no build step
```

## Features

- **12 wallpaper styles** (see below), all pure client-side SVG
- Browser-side raster export (WebP / JPEG / PNG) via canvas, with an automatic Safari WebP→JPEG fallback
- Deterministic output for a given seed
- A shared curated palette library (36 dark technical palettes) that reads as the same identity across every style, and persists when you switch styles
- Device presets for GrapheneOS-supported Pixels — including fold cover/inner screens — each with its real per-device fingerprint-sensor placement
- Installable PWA that runs fully offline (zero runtime network requests)
- GitHub Pages workflow with no build step

## Wallpaper styles

Pick a style from the **Style** button at the top of the control panel. Every style draws from the
same palette library and frames the under-display fingerprint sensor (which you can move, resize, or
disable):

- **Lattice** — the original isometric geometric structure with a hexagonal fingerprint aperture
- **Topographic** — contour-line topography (with **Sonar** and **Truchet** form variants)
- **Constellation** — a seeded star-field node graph centered on the sensor
- **Flow** — flow-field streamlines bending around the sensor like an attractor
- **Circuit** — PCB trace routing radiating from the sensor
- **Bokeh** — soft defocused light discs
- **Facets** — a low-poly crystalline tessellation (**Gemstone** / **Mosaic** forms)
- **Modulation** — a dot-matrix "pin-art" field
- **Matrix** — dense digital rain parting around the sensor
- **Crashdump** — a mobile kernel-panic / hexdump in five languages (English / Русский / 中文 / 한국어 / فارسی) with a GrapheneOS shield
- **Keep Calm** — the WWII poster tearing away to reveal a hidden MTE crash terminal
- **Forge** — the GrapheneOS mark tessellated as weathered, frosted metal — a client-side SVG port of [GOS-Chic](https://github.com/rinc3w1nd/GOS-Chic)

## Device presets

Includes practical presets for GrapheneOS-supported Pixel-class devices:

- Pixel 10a / 10 / 10 Pro / 10 Pro XL, Pixel 10 Pro Fold cover and inner
- Pixel 9a / 9 / 9 Pro / 9 Pro XL, Pixel 9 Pro Fold cover and inner
- Pixel 8a / 8 / 8 Pro
- Pixel Fold cover and inner, Pixel Tablet portrait and landscape
- Pixel 7a / 7 / 7 Pro, Pixel 6a / 6 / 6 Pro
- Custom dimensions

Display resolutions are based on Google Pixel hardware specs. Each device also carries its
**fingerprint-sensor vertical position** (sensors are horizontally centered, so only the height
varies), so the sensor aperture lands correctly on each phone; devices without a measured value fall
back to a sensible default.

## Curated palettes

The app ships a single shared library of 36 dark, low-glare technical palettes (GrapheneOS-style
greens and teals, graphite/oxide/blueprint neutrals, and editor-theme-inspired sets like Nord,
Tokyo Night, Solarized, Gruvbox, Catppuccin). A palette reads as the same identity in every style,
and stays selected when you switch styles. Manually editing any color field switches the selector to
**Custom**.

## Local usage

Double-click `index.html`, or serve it locally:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Push to `main`.
2. In GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Run or wait for `.github/workflows/deploy.yml` (it uploads the repo root as-is — no build step).

## Export formats and file size

Raster export honors the **format** (WebP / JPEG / PNG), **quality**, and **scale** controls in the
Export panel. Defaults are WebP at quality 0.90 and full (1.0) device scale, which produces crisp,
wallpaper-grade output at a small size.

- **WebP** (default) and **JPEG** are lossy and handle gradients + grain efficiently.
- **PNG** is lossless and pixel-exact, but the grain layer makes every pixel unique, so PNG files are
  large (multiple MB). Use it only if you need lossless.
- Keep **scale at 1.0** so it renders at native device resolution; lower scales get upscaled by the OS
  and look soft.

**Safari note:** Safari's canvas has no WebP encoder and silently falls back to lossless PNG (~5 MB
with grain). The app detects this and **automatically falls back to JPEG**, and always names the
downloaded file by the bytes it actually produced — so on Safari a "WebP" export arrives as a small
`.jpg` rather than a multi-MB file mislabeled `.webp`. Chromium browsers (incl. Brave) get true WebP.

## Testing

End-to-end tests use [Playwright](https://playwright.dev/), dev-only tooling — the app itself ships
with zero runtime dependencies.

```bash
npm install                          # @playwright/test only (bundled browsers skipped; we use Brave)
npx playwright install webkit        # once, for the Safari-engine project
npx playwright test                  # Brave + WebKit
npx playwright test --project=brave  # Brave only (the fast default during dev)
```

The suite ([tests/](tests/), with per-style specs in [tests/styles/](tests/styles/)) serves the
static site via `python3 -m http.server` and runs two engines: **Brave** (Chromium) and **WebKit**
(Safari's engine, guarding the WebP→JPEG export fallback). Override the Brave binary with
`BRAVE_PATH=/path/to/brave`.

## Official GrapheneOS logo note

The **Official Logo** / sensor-logo options use the real GrapheneOS mark, inlined directly in
`src/core.js` (`OFFICIAL_LOGO_PATH`, sourced from `assets/grapheneos.svg`). It is inlined rather than
fetched so it works when you open `index.html` directly (`file://` blocks `fetch`) and never taints
the canvas on raster export. The mark is tinted to the active accent at render time.

## Fingerprint sensor

The under-display fingerprint sensor is treated as a focal point: structural geometry is cleared from
a soft disc around it, and a hex ring (or the GrapheneOS mark) frames it. The interior is left empty —
Android draws the real sensor UI there at runtime. Position, size, ring opacity, and the sensor logo
are adjustable, and the sensor can be disabled entirely for devices without an under-display sensor.

## License

GPL-3.0-or-later. See [LICENSE.md](LICENSE.md).

## Security / dependency note

This project has no external runtime dependencies and makes no network requests by default. The whole
thing is static HTML/CSS/JS.
