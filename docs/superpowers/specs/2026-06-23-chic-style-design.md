# "Chic" Wallpaper Style (GOS-Chic port, lean)

Date: 2026-06-23
Status: Approved (brainstorm)
Scope: `src/app.js`, `index.html`, `src/style.css`, `tests/wallpaper.spec.js`

## Goal

Add a second wallpaper **style** alongside the current isometric "Lattice": a client-side
SVG port of the signature look from
[GOS-Chic](https://github.com/rinc3w1nd/GOS-Chic) — a **tessellated grid of the GrapheneOS
mark** on an OLED background with a single **accent tile at the fingerprint position**.
GOS-Chic is a Python/Pillow tool; we re-implement the look in SVG to keep the no-dependency,
no-network, client-side ethos. Scope is the **lean "signature look"**: grid + themes + tile/
accent colors + presets + FP accent + weave/tessellate + flat/gradient/duotone fills + glow.
Heavier raster effects (chrome, glossmix, emboss, specular, etched, frosted, shapes,
scalevar) are explicitly out of scope for now.

## Architecture

- New `params.style` ∈ `{lattice, chic}`, default `lattice`.
- Rename the current `generateWallpaperSvg` body to **`generateLatticeSvg(p)`**; make
  `generateWallpaperSvg(p)` a dispatcher: `p.style === "chic" ? generateChicSvg(p) : generateLatticeSvg(p)`.
  All callers (`render`, tests) keep using `generateWallpaperSvg`.
- **Shared & reused unchanged:** device presets, `width`/`height`, the inlined
  `OFFICIAL_LOGO_PATH`/`OFFICIAL_LOGO_VIEWBOX`, the fingerprint position controls
  (`fingerprintXPct`/`YPct`/`RadiusPct`) which place + size the Chic accent tile, and the
  export pipeline.

## Chic generator (`generateChicSvg`)

Faithful-enough SVG mapping of GOS-Chic `build_wallpaper` (lean path):

- **Background:** solid rect — dark `#000000` or light `#f0f0f0` (`chicTheme`).
- **Tile palette** (port of `derive_tile_palette`): from `chicTileColor` (base) scaled —
  `gradTop = base×1.1`, `gradBottom = base×0.6`, `flat = base×0.8`. Dark default base
  `#191919`; light default `#969696`. `chicDeep` widens the gradient contrast
  (top×1.4 / bottom×0.4).
- **Grid:** logo tiles repeat across the screen, anchored so one cell center sits at the
  accent/fingerprint center. Cell step = `tileSize × spacing` (`spacing_mult` default 1.6).
  `chicTessellate` offsets odd rows by half a step. `chicWeave` rotates tiles by alternating
  `±chicWeaveDeg` (default 3°) in a checker (`(i+j)%2`). The cell at the accent center is
  skipped (the accent tile replaces it).
- **Fills** (port of `_build_fill`): `flat` (single `flat` color), `gradient` (vertical
  `gradTop→gradBottom` via one shared `<linearGradient>`), `duotone` (warm/cool
  complementary pair from `complementary_pair`, alternating by row). Tiles reference the
  shared paint, so the grid stays compact.
- **Glow** (`chicEffect="glow"`, port of `_apply_effect` glow): applied as a single SVG
  filter (`feGaussianBlur`) on the grid group — a collective halo. Approximation of
  GOS-Chic's per-tile halo; far cheaper and visually close.
- **Accent tile:** drawn last at the fingerprint center, scaled by `fp_scale` (≈2.25× a grid
  tile, derived from `fingerprintRadiusPct`), tinted `chicAccentColor`. When
  `chicCenterFill` is on (FP mode), a gray hexagon (`#1f1f1f`) is drawn behind the mark to
  fill its inner hole — SVG approximation of `flood_fill_inner_hole`.

### Chic presets

A small dedicated set (separate from the 41 lattice palettes), each setting
`{chicTileColor, chicAccentColor, chicTheme}`, faithful to GOS-Chic's accent presets and
seasonal palettes: **Gold**, **Steel**, **Red**, **Spring**, **Summer**, **Autumn**,
**Winter** (accent RGBs from `ACCENT_PRESETS`; tile color a complementary/neutral partner).
Editing a tile/accent color switches the selector to **Custom**.

## UI integration

- A **Style** segmented toggle (`Lattice | Chic`) at the top of the **Setup** panel sets
  `params.style` and a `style-lattice` / `style-chic` class on `<body>`.
- Control groups are tagged `.lattice-only` / `.chic-only`; CSS shows the active style's
  groups and hides the other. The four tabs (Setup/Form/Color/Export) and their chrome stay.
- **Chic controls** (new inputs, all with stable ids):
  - Setup: Style toggle; Chic preset selector; Theme (dark/light) toggle; reused Sensor
    position/size; chips for FP center fill + Weave.
  - Form (`.chic-only`): Tile size, Spacing, Weave angle, Fill (flat/gradient/duotone),
    Effect (none/glow), Deep.
  - Color (`.chic-only`): Tile color, Accent color.
  - Export: shared.
- Grain is **off / hidden** for Chic (OLED-flat by nature).

## Params (new)

`style`, `chicTheme`, `chicPreset`, `chicTileColor`, `chicAccentColor`, `chicFill`,
`chicEffect`, `chicDeep`, `chicWeave`, `chicWeaveDeg`, `chicSpacing`, `chicTileScale`,
`chicCenterFill`. Added to `DEFAULT_PARAMS`, `INPUT_IDS` (the ones with controls),
`decode`/read/set helpers, and the style-aware show/hide. Reuse `fingerprint*`, `deviceId`,
`width`/`height`, and export params.

## Testing

- `generateWallpaperSvg({style:"chic"})` output contains the Chic grid group, more than one
  tile, and an accent group positioned at the fingerprint center; `{style:"lattice"}` output
  is unchanged (still has `id="geometry"`).
- Switching the Style toggle swaps `body` class and which control groups are visible, and
  changes the generated output.
- Existing lattice tests, grain×fingerprint matrix, and the lossy-export guard stay green on
  Brave + WebKit.

## Out of scope

Chrome/glossmix fills; emboss/specular/etched/frosted/shape effects; scalevar; batch/config/
CLI (irrelevant in-browser); URL state; new runtime dependencies.
