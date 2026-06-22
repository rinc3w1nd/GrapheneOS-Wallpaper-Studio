# New Styles — Remaining Fixes (handoff)

Date: 2026-06-23
Status: WIP — committed/pushed mid-iteration. Use this as the resume checklist.

## Where things stand

- Codebase is modular classic scripts: `src/core.js` (data, helpers, registry,
  `sensorGeom`/`sensorMaskDef`/`sensorMaskAttr`/`sensorRing`/`sensorMark`, `cornerBrand`,
  `valueNoise2D`), `src/styles/<id>.js` (one generator each, self-registering via
  `registerStyle`), `src/app.js` (dispatcher + UI). Loaded in order in `index.html`.
- Styles: `lattice`, `chic` (built-in, hardcoded controls) + new `topographic`,
  `constellation`, `flow`, `circuit` (registry, drop-in files + `tests/styles/<id>.spec.js`).
- **Shared sensor model (DONE, the "0-set"):**
  - `fingerprintEnabled` is a shared toggle (Setup → Sensor), applies to all styles.
  - `sensorLogo` shared toggle (dims when fingerprint off). When ON → official GOS logo
    (`OFFICIAL_LOGO_PATH`) framing the sensor via `sensorMark`, sized `r * SENSOR_LOGO_SCALE`
    (3.3, matched to Chic's accent tile). When OFF → hex or circle ring per the style's
    `shape` arg to `sensorRing` (lattice/circuit = hex; topographic/constellation/flow =
    circle).
  - Sensor size default `fingerprintRadiusPct = 10` for all (no 16 bump).
  - Geometry is masked out of the sensor void (`sensorMaskDef`/`sensorMaskAttr`) when
    fingerprint on.
- Per-style **color preset dropdowns**: DONE for `topographic` + `constellation`
  (registry `presets` + `colorIds`, generic wiring in app.js: `initStylePresets`,
  `setStylePresetCustom`, `styleOwningColorId`). NOT done for `flow` + `circuit`.
- `cornerBrand` (GOS mark + wordmark, bottom-right) on all 4 new styles.
- 64/64 Playwright tests pass on Brave + WebKit. Nothing visually signed off yet.

## MUST FIX (user feedback, in priority order)

1. **Topographic — make it an actual FINGERPRINT.** Current output reads as a "blursed
   vortex" of swirling contour rings, not a fingerprint. Redo so it looks like a real
   fingerprint: ridge flow with a whorl/loop core + delta, ridges that don't just nest
   concentrically. Keep it deterministic (`mulberry32`/`valueNoise2D`). The user liked the
   *topographic contour aesthetic* as a base but wants genuine fingerprint loops/swirls — not
   a vortex, not uniform rings. This needs visual iteration.
2. **Circuit — a TON more traces (much denser).** Raise `traceCount` substantially and tune
   so it reads as a dense PCB. Verify overall look ("doesn't look great" originally).
3. **Finish color preset dropdowns for `flow` and `circuit`** (mirror topographic/
   constellation: add `presets`, `colorIds`, a `<select id="<id>Preset">` at the top of
   `controlsHtml.color`, and a `<id>Preset` default).

## VERIFY / POLISH

4. Visually confirm each style at the screenshot gate: constellation link visibility
   (should be ≥40% clearly visible — bumped but unverified), flow presence, masked sensor
   void cleanliness, corner brand placement.
5. Confirm the official-logo-around-sensor (`sensorMark`, 3.3×) is properly sized/framed
   across all styles (Chic is the reference). User was reviewing `topographic-logo` when we
   stopped — re-check.
6. **Chic + sensor model:** Chic's accent tile is always the GOS logo and it does NOT
   currently honor `fingerprintEnabled` or the `sensorLogo`/hex-or-circle rule. Decide and
   implement Chic's behavior under the shared sensor model (e.g., respect fingerprint toggle;
   show hex/circle when sensorLogo off).
7. Lattice: now shows official logo when `sensorLogo` on, else its hex frame — verify it
   doesn't double up and looks right.

## LOOSE ENDS

8. Clarify the user's cryptic "replacing the other trace" note (constellation traces?).
9. Consider exposing more sensor controls consistently; confirm `useOfficialLogo` (brand
   mark, lattice-only) vs `sensorLogo` (sensor) separation reads clearly in the UI.
10. Update README + CLAUDE.md for the new styles, the registry/contract, and the sensor
    model once the styles are signed off.
11. Full test run + per-style screenshots before declaring done.

## Notes

- Style contract: `docs/superpowers/specs/2026-06-23-style-contract.md`.
- Roadmap: `docs/superpowers/specs/2026-06-23-new-styles-roadmap.md`.
- `tmp/` (incl. `tmp/gos-chic` reference clone and `tmp/style-shots`) is gitignored.
- Tune knob: `SENSOR_LOGO_SCALE` in core.js (currently 3.3).
