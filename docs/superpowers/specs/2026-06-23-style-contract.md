# Style Contract — adding a wallpaper style

A new style is a single self-registering file `src/styles/<id>.js` plus a test file
`tests/styles/<id>.spec.js`. It must NOT edit `core.js`, `app.js`, `style.css`, or the
built-in panels. The app's registry wires everything from the registration call.

## Registration API (defined in core.js)

```js
registerStyle({
  id: "<id>",                 // lowercase, matches file name
  label: "<Label>",           // shown on the Style selector
  generate: (p) => "<svg…>",  // returns a full SVG string
  defaults: { <id>Foo: 1 },   // params merged into DEFAULT_PARAMS
  inputIds: ["<id>Foo", …],   // every control element id this style owns
  controlsHtml: {             // injected into the matching panel, wrapped in [data-styles="<id>"]
    setup: "<…>", form: "<…>", color: "<…>",   // any subset
  },
});
```

## Hard requirements

- **Self-contained:** only create the two files. Reuse core globals; never edit shared files.
  Available core helpers: `hexToRgb`, `rgbToHex`, `mix`, `scaleColor`, `complementaryPair`,
  `mulberry32`, `valueNoise2D`, `flatHexPoints`, `hexPoints`, `clamp01`, `OFFICIAL_LOGO_PATH`,
  `OFFICIAL_LOGO_VIEWBOX`.
- **`generate(p)`** returns `<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}"
  height="${p.height}" viewBox="0 0 ${p.width} ${p.height}">…</svg>`. Wrap the style's content
  in a `<g id="<id>-…">` so tests + reviewers can find it.
- **Deterministic:** all randomness via `mulberry32(p.seed)` and/or `valueNoise2D(p.seed)`.
  Never use `Math.random`/`Date`. Same params ⇒ byte-identical output.
- **OLED-friendly:** dark background by default (`#000`–`#05070a`); thin, mostly accent-tinted
  strokes; avoid large bright fills. Support a `light` option only if natural.
- **Sensor is the focal element.** Compute
  `cx = p.width * p.fingerprintXPct/100`, `cy = p.height * p.fingerprintYPct/100`,
  and a radius from `p.fingerprintRadiusPct` (`unit = Math.min(p.width,p.height)`,
  `r = unit * p.fingerprintRadiusPct/100`). Build the composition around (cx,cy): the
  contour center / mesh hub / flow vortex / chip pad. Keep the immediate sensor disc visually
  calm (Android draws the real sensor UI there) — frame/ring it, don't clutter dead-center.
- **Params** are `<id>`-prefixed (e.g. `topoRings`, `meshDensity`) to avoid collisions; provide
  your own color params (don't depend on lattice/chic params). Include sensible `defaults`.
- **Controls** use the existing markup so they inherit styling + value-chips:
  - range: `<label class="field range"><span class="field-label">X</span><input id="<id>X" type="range" min max step></label>`
  - select: `<label class="field"><span class="field-label">X</span><select id="<id>X">…</select></label>`
  - color: `<label class="field color"><span class="field-label">X</span><input id="<id>X" type="color"></label>`
  - toggle: a `<div class="toggle-group">` of `<label class="chip-toggle"><input id="<id>X" type="checkbox"><span>X</span></label>`
  Group long lists under `<div class="group-label">Heading</div>`. Put structural sliders in
  `form`, colors in `color`, toggles/presets in `setup`.

## Test file (`tests/styles/<id>.spec.js`)

CommonJS Playwright. `generateWallpaperSvg`, `effectiveDefaults`, `DEFAULT_PARAMS` are page
globals (classic scripts). Pattern:

```js
const { test, expect } = require("@playwright/test");
async function gen(page, ov) {
  return page.evaluate((o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "<id>", ...o }), ov || {});
}
test.beforeEach(async ({ page }) => { await page.goto("/"); await page.waitForSelector("#preview > svg"); });
test("<id>: renders its marker + is deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="<id>-');           // marker group
  const b = await gen(page, { seed: 7 });
  expect(b).toBe(a);                            // deterministic
  const c = await gen(page, { seed: 8 });
  expect(c).not.toBe(a);                        // seed actually varies output (if seed-driven)
});
test("<id>: style switch shows it", async ({ page }) => {
  await page.locator('[data-style="<id>"]').click();
  await expect(page.locator("body")).toHaveClass(/style-<id>/);
  await expect.poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("<id>-")).toBe(true);
});
```

## Self-validation in your worktree

```bash
ln -s <MAIN_REPO>/node_modules node_modules          # reuse installed deps
# add your <script src="./src/styles/<id>.js"></script> before app.js in index.html (worktree only)
PORT=80<N> npx playwright test tests/styles/<id>.spec.js --project=brave
```
Then render a screenshot to `<MAIN_REPO>/tmp/style-shots/<id>.png` (default device, your
style active) so it survives worktree cleanup.

## Return (structured)

`styleJs` (full file content), `testJs` (full file content), `scriptTag`
(`<script src="./src/styles/<id>.js"></script>`), `shotPath`, and a short `report`.

---

## Briefs

- **topographic** — "Topographic": many thin concentric **contour rings** centered on the
  sensor, each ring's radius perturbed by `valueNoise2D` (amplitude grows outward) so they
  read as warped elevation lines. Accent gradient outward; sensor = focal basin. Params:
  ring count, spacing, warp amount, warp scale, line opacity + 1–2 colors.
- **constellation** — "Constellation": a seeded **node field** with **nearest-neighbor links**
  and a radial **density falloff**, the sensor a brighter, more-connected **hub**. Params:
  node density, link distance, jitter, node/link opacity, hub emphasis + colors.
- **flow** — "Flow Field": **streamlines** integrated step-by-step through the `valueNoise2D`
  vector field (angle = noise·2π), the sensor an **attractor/vortex** that bends nearby
  streams. Warm/cool tint across the field. Params: stream count, step length, line length,
  curl scale, opacity + 2 colors.
- **circuit** — "Circuit": **PCB traces** on a grid routed H/V with 45° elbows, plus round
  **pads/vias**, the sensor a central **chip pad**. Params: trace density, grid pitch, via
  frequency, trace/pad opacity + colors. Deterministic routing via `mulberry32`.
