# GrapheneOS Wallpaper Studio, Vanilla Edition

A dependency-free static wallpaper generator for GrapheneOS-supported Pixel devices.

No npm. No TypeScript build. No Vite. No backend. No package manager séance.

Open `index.html` directly or host it on GitHub Pages.

## Files

```text
index.html
src/
  app.js
  style.css
.github/
  workflows/
    deploy.yml
```

## Features

- Client-side structural geometric SVG generation
- Browser-side raster export (WebP / JPEG / PNG) using canvas
- Deterministic seed
- Accent color controls
- Large curated palette set for accent/background pairings
- Device presets including fold cover and inner screens
- GitHub Pages workflow with no build step

## Device presets

Includes practical presets for:

- Pixel 10a / 10 / 10 Pro / 10 Pro XL
- Pixel 10 Pro Fold cover and inner
- Pixel 9a / 9 / 9 Pro / 9 Pro XL
- Pixel 9 Pro Fold cover and inner
- Pixel 8a / 8 / 8 Pro
- Pixel Fold cover and inner
- Pixel Tablet portrait and landscape
- Pixel 7a / 7 / 7 Pro
- Pixel 6a / 6 / 6 Pro
- Custom dimensions

The preset list is intended to match GrapheneOS production-supported Pixel-class devices, with display resolutions based on Google Pixel hardware specs where available. Pixel 10a is included as a practical A-series preset and should be updated if its official resolution differs.

## Curated palettes

The app includes a large curated palette list ranging from subdued GrapheneOS-style greens and teals through graphite, moonstone, oxide, blueprint, Nord, Tokyo Night, Solarized, Gruvbox, Catppuccin, and other low-glare technical palettes. Choosing a palette updates accent A, accent B, line color, and background colors. Manually editing any of those color fields switches the palette selector to **Custom**.

## Local usage

Double-click `index.html`, or serve it locally:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a GitHub repo.
2. Put these files in the repo.
3. Push to `main`.
4. In GitHub: **Settings → Pages → Source: GitHub Actions**.
5. Run or wait for `.github/workflows/deploy.yml`.

## Export formats and file size

Raster export honors the **format** (WebP / JPEG / PNG), **quality**, and **scale**
controls in the Output panel. Defaults are WebP at quality 0.90 and full (1.0) device
scale, which produces crisp, wallpaper-grade output at a small size — a 1344×2992 export
with grain lands around ~70 KB.

Notes:

- **WebP** (default) and **JPEG** are lossy and handle the gradient + grain efficiently.
- **PNG** is lossless and ideal for pixel-exact output, but the grain layer makes every
  pixel unique, so PNG files are large (multiple MB). Use PNG only if you specifically need
  lossless.
- For a crisp wallpaper, keep **scale at 1.0** so it renders at native device resolution;
  lower scales are upscaled by the OS and look soft.

**Safari note:** Safari's canvas has no WebP encoder and silently falls back to lossless
PNG (which, with grain, is ~5 MB). The app detects this and **automatically falls back to
JPEG** when WebP isn't available, and always names the downloaded file by the bytes it
actually produced — so on Safari a "WebP" export arrives as a small `.jpg` (~360 KB) rather
than a multi-MB file mislabeled `.webp`. Chromium browsers (incl. Brave) get true WebP.

## Testing

End-to-end tests use [Playwright](https://playwright.dev/) and drive **Brave** (Chromium).
This is dev-only tooling — the app itself ships with zero runtime dependencies.

```bash
npm install                 # installs @playwright/test (bundled browsers skipped; we use Brave)
npx playwright install webkit   # once, for the Safari-engine project
npm test                    # runs the suite against Brave + WebKit
npm test -- --project=brave # Brave only (no WebKit download needed)
npm run test:headed         # watch it run
```

The suite (`tests/wallpaper.spec.js`) serves the static site via `python3 -m http.server`
and covers the grain × fingerprint toggle matrix plus the default raster export. It runs on
two engines: **Brave** (Chromium) and **WebKit** (Safari's engine), the latter guarding the
WebP→JPEG export fallback. Override the Brave binary location with
`BRAVE_PATH=/path/to/brave npm test` if it isn't at the standard install path.

## Official GrapheneOS logo note

The **Official Logo** toggle uses the real GrapheneOS mark, inlined directly in `src/app.js`
(`OFFICIAL_LOGO_PATH`, sourced from `assets/grapheneos.svg`). It is inlined rather than
fetched so it works when you open `index.html` directly (`file://` blocks `fetch`) and never
taints the canvas on raster export. The mark is tinted to the active accent color at render
time, so it stays visible on the dark background. Turn the toggle off for the
procedurally-drawn approximation (`grapheneMark()`). To swap the logo, replace the path data
in `OFFICIAL_LOGO_PATH` (and its `OFFICIAL_LOGO_VIEWBOX`).

## Fingerprint aperture

The fingerprint region is rendered as a deliberate **architectural aperture**: the structural
geometry is masked out of a hexagonal void, the surrounding lattice lines are capped with
accent nodes where they meet the rim, and a hex ring frames it. The interior is intentionally
left empty — Android draws the real under-display sensor UI there at runtime. Position, size,
and ring opacity are adjustable in the Fingerprint panel; toggle it off entirely if your
device has no under-display sensor.

## Security / dependency note

This project has no external runtime dependencies and makes no network requests by default. The whole thing is static HTML/CSS/JS.

Because apparently "a wallpaper generator should not need a supply chain risk register" is a radical position now.
