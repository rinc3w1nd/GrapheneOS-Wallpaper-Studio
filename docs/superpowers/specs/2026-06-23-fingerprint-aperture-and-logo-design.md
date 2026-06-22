# Fingerprint Aperture Redesign + Official Logo Fix

Date: 2026-06-23
Status: Approved (brainstorm)
Scope: `src/app.js` (generation + export), `tests/wallpaper.spec.js`

## Problem

1. **Official Logo toggle does nothing useful.** `assets/grapheneos.svg` is a single
   `<path fill="#000000">`. Nothing recolors it, so it renders black-on-near-black
   (invisible). It is also loaded via `fetch("./assets/grapheneos.svg")`, which is blocked
   under `file://` — so double-clicking `index.html` (as the README instructs) never loads
   it at all.
2. **Fingerprint mask looks cluttered, not purposeful.** `fingerprintAperture()` draws a
   busy motif (dark ellipses, three hex rings, scan-rails, 18 dots, center marks) *on top
   of* the full geometry. The lattice bleeds through; it reads as clutter stacked on
   clutter instead of a deliberate sensor location.

## Decisions

- The fingerprint region should read as an **architectural aperture**: the geometry parts
  around a clean void framed by a ring. No literal fingerprint glyph.
- **Android draws the real sensor UI over that region at runtime**, so the interior must be
  **empty** — anything we put inside is wasted or clashes. "Just ring it out."
- Edge treatment: **Hybrid** — fine layers fade out approaching the void (via mask); major
  lattice lines get crisp **capped nodes** where they meet the ring (engineered look).
- Ring shape: **hexagon** (on-brand with the cube/hex geometry).

## Design

### A. Official logo

- **Inline the mark, drop the runtime fetch.** Carry the logo's path data + viewBox as a JS
  constant (sanitized: no `fill`, no `script`/`style`). `assets/grapheneos.svg` remains the
  source-of-truth on disk; the JS copy is what renders. This works on `file://` and never
  taints the canvas on raster export.
- **Recolor to accent.** `officialGrapheneLogo()` sets `fill="${p.accent2}"` on the wrapper
  so the path inherits it — matching the drawn `grapheneMark()` (light on dark).
- Remove now-dead runtime machinery: `loadOfficialLogo()`, `sanitizeInlineSvg()`,
  `officialLogoSvgMarkup`/`officialLogoChecked`, and the `await loadOfficialLogo()` in
  `render()` (render becomes synchronous again).
- `useOfficialLogo` toggle now switches between the inlined official mark and the drawn
  `grapheneMark()`. Default stays `true`.

### B. Fingerprint "ringed void"

The X/Y/size/visibility controls are unchanged in the UI; they now drive a void instead of
a motif:

- `fingerprintXPct` / `fingerprintYPct` → void center
- `fingerprintRadiusPct` → void + ring radius
- `fingerprintRingOpacity` → ring + rim-node opacity
- `fingerprintEnabled` → toggles the whole aperture (and the mask)

Generation changes in `generateWallpaperSvg()`:

1. **Clear the interior.** Wrap the structural geometry layers (top-scaffold,
   background-lattice, main-structure, facets, central-emblem, dot-matrix) in a single
   `<g mask="url(#apertureMask)">`. The background gradient rects, bottom fade, and corner
   brand stay outside the mask. When the fingerprint is disabled, the group is emitted with
   no mask attribute (no-op).
2. **Define the mask** (only when enabled): a `<mask>` of a full-canvas white rect minus a
   soft-edged disc at the void — a `radialGradient` (black core → black at ~70% → white at
   100%) in `userSpaceOnUse` units. Black hides; the soft ramp gives the rim fade.
3. **Capped rim nodes.** The background-lattice line segments are produced from a shared
   list (screen-space endpoint pairs). For each segment that intersects the void circle,
   compute the intersection point(s) and emit a small `accent2` node there. Nodes are drawn
   **unmasked**, so they sit crisply on the ring while the lines themselves fade into the
   void. Helper: `lineCircleIntersections(a, b, center, r)`.
4. **Ring it out.** Draw a hexagon ring at the void radius in `accent2`/sensorGlow, plus one
   faint concentric hairline for depth. Opacity from `fingerprintRingOpacity`.
5. **Empty interior** — remove the old ellipses, three rings, scan-rails, 18 dots, center
   marks. The new group id is `fingerprint-aperture`.

## Testing (`tests/wallpaper.spec.js`)

- Update `FINGERPRINT_MARKER` to the new group id `fingerprint-aperture`.
- Enabled ⇒ output contains the aperture group, a hexagon ring, and
  `mask="url(#apertureMask)"` on the geometry group. Disabled ⇒ none of these, and no mask
  attribute.
- Keep the grain × fingerprint matrix and the lossy-export guard, green on Brave + WebKit.

## Out of scope

URL state, new controls, palette/device changes. No new runtime dependencies.
