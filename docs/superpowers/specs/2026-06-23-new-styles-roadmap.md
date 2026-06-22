# New Wallpaper Styles — Roadmap

Date: 2026-06-23
Status: Approved (decomposition)

Four new styles beyond Lattice + Chic, each its own spec → plan → TDD build → **its own
commit** → push. Front-loaded with shared plumbing introduced alongside Style 1.

## Targets & structure

- **Deploy target:** GitHub Pages (HTTPS); a **PWA** later (manifest + service worker).
  Opening `index.html` via `file://` is a nice-to-have, not a hard requirement.
- **Code structure (decided): modular via classic scripts** — ordered `<script src>` tags
  sharing one global scope. No bundler, no ES modules (ES modules would break `file://` and
  hide the globals the Playwright suite relies on; module syntax isn't needed for Pages or
  PWA). Layout:
  - `src/core.js` — data + primitives (color math, `mulberry32`, `valueNoise2D`, geometry
    helpers, inlined logo, `DEVICE_PRESETS`/`PALETTE_PRESETS`/`CHIC_PRESETS`,
    `DEFAULT_PARAMS`, `INPUT_IDS`).
  - `src/styles/<id>.js` — one self-contained generator per style, registered in `STYLES`.
  - `src/app.js` — UI wiring + the `generateWallpaperSvg` dispatcher.
  - `index.html` loads them in order: core → styles → app.
  - Step 0: perform this split as a **no-behavior-change refactor** with all tests green, in
    its own commit, before adding any new style.

## Shared plumbing (with Style 1)

- **N-style switch.** Replace the 2-button toggle + `.lattice-only`/`.chic-only` CSS with a
  data-driven scheme: a `STYLES` registry, a `body.style-<id>` class, and control groups
  tagged `data-styles="lattice topo …"` toggled by a `applyStyleVisibility(style)` helper
  (so a group can belong to several styles). The Style control scales to 6 options
  (dropdown or scrollable segments).
- **Seeded value-noise** `valueNoise2D(seed)` — tiny, no-dep. Reused by Topographic + Flow.

## Sequence

1. **Topographic** (M) — noise-warped concentric contour lines centered on the sensor.
   Carries the plumbing + value-noise. Reuses the lattice palettes/colors + seed.
2. **Constellation mesh** (M) — seeded node field + nearest-neighbor links + density
   falloff; sensor = bright hub. Reuses `mulberry32`.
3. **Flow field** (M–L) — streamlines integrated over the value-noise vector field; sensor =
   vortex/attractor. Reuses value-noise from #1.
4. **Circuit traces** (L) — routed PCB traces + pads/vias; sensor = chip pad. Most
   algorithmic; last.

## Shared by all

Dispatcher branch in `generateWallpaperSvg`, device presets, `width`/`height`, the
fingerprint position (each style's focal element), and the export pipeline. Each style ships
with Brave + WebKit tests and a visual check.

## Future styles (backlog)

Status: not started. Three more styles to add later, each via the existing style contract
(`docs/superpowers/specs/2026-06-23-style-contract.md`): a single self-registering
`src/styles/<id>.js` + `tests/styles/<id>.spec.js`, no edits to shared files, deterministic
via `mulberry32`/`valueNoise2D`, OLED-dark, integrating the shared sensor model
(`sensorMaskDef`/`sensorMaskAttr`/`sensorRing`) and `cornerBrand`, plus a per-style color
preset dropdown (`presets`/`colorIds`).

- **Bokeh** — "Bokeh": layered translucent defocused light discs of varying radius and
  opacity scattered with a depth falloff, soft additive glow, warm/cool palette. The sensor
  is the one crisp, in-focus ring amid the blur. Params: disc count, size range, blur/softness,
  opacity, depth falloff + 2 colors. Deterministic via `mulberry32`.
- **Aurora** — "Aurora": flowing aurora-borealis curtains as vertical, value-noise-warped
  gradient bands (green/teal/violet) with soft additive glow; the sensor a calm gap the
  curtains drape around. Reuses `valueNoise2D`. Params: band count, warp amount/scale, glow,
  opacity + 2-3 colors.
- **Fractal** — "Fractal": recursive geometric structure centered on the sensor — e.g.
  escape-time field (Julia/Mandelbrot) drawn as thin iso-contours, or recursive subdivision
  (Sierpinski / subdivided triangles). Thin accent-tinted strokes over dark. Params:
  iteration depth, scale/zoom, warp + colors. Deterministic; bound the element count.
