/* styles/modulation.js — "Modulation": a precision dot-matrix equalizer field.
 * A regular column grid of dots whose size + color are MODULATED by a smooth
 * value-noise field blended with a radial focus term that crests toward the
 * composition center (the sensor focal point). The result reads like pin-art /
 * halftone / a frozen equalizer: a calm sparse field at the edges that blooms
 * into dense, bright, large dots around the focus, then a faint ghost-grid
 * underlay keeps the matrix legible everywhere for engineered depth.
 * Pure SVG, OLED-dark, deterministic (randomness only via mulberry32(p.seed) /
 * valueNoise2D(p.seed); never Math.random / Date). Same params => byte-identical
 * output. Depends on core.js. */
"use strict";

function generateModulationSvg(p) {
  const W = p.width;
  const H = p.height;
  const unit = Math.min(W, H);
  const k = unit / 1080; // px scale relative to the reference 1080-wide canvas

  // ---- resolved params (each clamped to a safe, bounded range) ----
  let cols = Math.max(10, Math.min(40, Math.round(p.modCols ?? 22)));
  const dotMin = Math.max(0.5, Math.min(6, p.modDotMin ?? 1.2));
  let dotMax = Math.max(4, Math.min(26, p.modDotMax ?? 12));
  if (dotMax < dotMin) dotMax = dotMin; // guard so the lerp never inverts
  const field = Math.max(0.4, Math.min(6, p.modField ?? 2.2));
  const centerBias = Math.max(0, Math.min(1, p.modCenterBias ?? 0.6));
  const opacity = Math.max(0.2, Math.min(1, p.modOpacity ?? 0.85));

  const bgTop = p.modBgTop || p.backgroundTop || "#05070a";
  const bgBottom = p.modBgBottom || p.backgroundBottom || "#0d1318";
  const low = p.modLow || "#77b69e";  // dim end of the modulation ramp (accent)
  const high = p.modHigh || "#9ad4c2"; // bright end of the ramp (accent2)

  // ---- art / sensor focal geometry ----
  const cx = W * ((p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
  const cy = H * ((p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);
  const r = unit * ((p.fingerprintRadiusPct ?? 10) / 100); // sensor disc radius

  // ---- grid geometry: square cells, spacing fixed by columns ----
  const spacing = W / cols || 1e-6;
  let rows = Math.max(1, Math.round(H / spacing) + 1);
  // Hard element cap: keep cols*rows under ~2800 by trimming columns first
  // (preserves vertical resolution / the equalizer read), then rows.
  const CELL_CAP = 2800;
  while (cols * rows > CELL_CAP && cols > 10) {
    cols -= 1;
    rows = Math.max(1, Math.round(H / (W / cols)) + 1);
  }
  while (cols * rows > CELL_CAP && rows > 1) rows -= 1;
  const sp = W / cols || 1e-6; // final spacing after any column trim

  // Focus falloff radius: amplitude bloom reaches this far from the focal point.
  const focusR = Math.max(unit * 0.18, r * 4.2);
  // Immediate sensor disc kept visually calm: dots there shrink toward dotMin.
  const calmR = r * 1.15;

  const rand = mulberry32((p.seed | 0) ^ 0x70d0d5);
  const noise = valueNoise2D((p.seed | 0) ^ 0x70d135);

  // Per-render deterministic phase offsets so seed 7 vs 8 visibly differ even
  // when the grid is identical (shifts the noise sampling + wave phase).
  const phx = rand() * 64;
  const phy = rand() * 64;
  const wavePh = rand() * Math.PI * 2;

  // Noise sampling scale: larger `field` => finer modulation cells.
  const fdiv = (unit / field) || 1e-6;

  function amplitudeAt(x, y) {
    // Smooth noise term in [0,1).
    const n = noise(x / fdiv + phx, y / fdiv + phy);
    // Radial focus term: 1 at the focal point, easing to 0 at focusR.
    const d = Math.hypot(x - cx, y - cy);
    let f = 1 - d / focusR;
    f = f < 0 ? 0 : f;
    f = f * f * (3 - 2 * f); // smoothstep falloff for a soft bloom
    // Blend noise with the focus term weighted by centerBias.
    let a = n * (1 - centerBias) + f * centerBias;
    // Subtle multiplicative coupling so the focus also gates the noise energy,
    // deepening contrast between calm field and bright core.
    a *= 0.55 + 0.45 * (0.35 + 0.65 * f);
    return clamp01(a);
  }

  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
  parts.push("<defs>");
  parts.push(`<linearGradient id="modulationBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgTop}"/><stop offset="58%" stop-color="${mix(bgTop, bgBottom, 0.5)}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`);
  // Focal bloom: a faint radial wash of the bright accent under the dots so the
  // modulation core reads as emitting light, not just bigger circles.
  parts.push(`<radialGradient id="modulationBloom" gradientUnits="userSpaceOnUse" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${focusR.toFixed(1)}"><stop offset="0%" stop-color="${high}" stop-opacity="0.12"/><stop offset="42%" stop-color="${low}" stop-opacity="0.05"/><stop offset="100%" stop-color="${low}" stop-opacity="0"/></radialGradient>`);
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");
  parts.push(`<rect width="100%" height="100%" fill="url(#modulationBg)"/>`);
  parts.push(`<rect width="100%" height="100%" fill="url(#modulationBloom)"/>`);

  // x-offset to center the grid; first/last column hug the canvas edges.
  const x0 = sp * 0.5;
  const yTop = sp * 0.5;
  const ghostR = Math.max(0.45, dotMin * 0.55 * k); // faint underlay dot radius
  const ghostCol = mix(bgBottom, low, 0.35); // barely-there grid tint

  // ---- ghost underlay: the full lattice, dim, so the matrix is always present
  const ghost = [];
  for (let gy = 0; gy < rows; gy += 1) {
    const cyp = yTop + gy * sp;
    if (cyp > H + sp) break;
    for (let gx = 0; gx < cols; gx += 1) {
      const cxp = x0 + gx * sp;
      ghost.push(`<circle cx="${cxp.toFixed(2)}" cy="${cyp.toFixed(2)}" r="${ghostR.toFixed(2)}"/>`);
    }
  }
  parts.push(`<g id="modulation-ghost" fill="${ghostCol}" fill-opacity="${(opacity * 0.22).toFixed(3)}"${sensorMaskAttr(p)}>`);
  parts.push(ghost.join(""));
  parts.push("</g>");

  // ---- modulated dots: size + color driven by amplitude, with a wave nudge ----
  parts.push(`<g id="modulation-dots"${sensorMaskAttr(p)}>`);
  const dots = [];
  for (let gy = 0; gy < rows; gy += 1) {
    const baseY = yTop + gy * sp;
    if (baseY > H + sp) break;
    for (let gx = 0; gx < cols; gx += 1) {
      const px = x0 + gx * sp;

      // Sample amplitude at the un-nudged grid point so columns stay aligned.
      let a = amplitudeAt(px, baseY);

      // Calm the immediate sensor disc: collapse amplitude toward the floor.
      const ds = Math.hypot(px - cx, baseY - cy);
      if (ds < calmR) {
        const t = ds / (calmR || 1e-6); // 0 at center -> 1 at rim
        a *= 0.18 + 0.82 * clamp01(t);
      }

      // Vertical wave nudge for an equalizer feel; columns stay aligned in x.
      const ny = baseY + (a - 0.5) * sp * 0.3 * Math.sin(gx * 0.9 + wavePh + a * 2.4);

      const rad = (dotMin + (dotMax - dotMin) * a) * 0.5 * k; // diameter -> radius
      if (rad < 0.25) continue; // skip invisible dots (keeps the field crisp)

      const col = mix(low, high, a);
      // Brighter dots carry slightly more opacity for luminous depth.
      const op = clamp01(opacity * (0.5 + 0.5 * a));

      dots.push(
        `<circle cx="${px.toFixed(2)}" cy="${ny.toFixed(2)}" r="${rad.toFixed(2)}" fill="${col}" fill-opacity="${op.toFixed(3)}"/>`
      );
    }
  }
  parts.push(dots.join(""));
  parts.push("</g>");

  // ---- sensor focal framing + brand ----
  parts.push(sensorRing(p, high, low, "circle"));
  parts.push(cornerBrand(p, high));
  parts.push("</svg>");
  return parts.join("\n");
}

registerStyle({
  id: "modulation",
  label: "Modulation",
  generate: generateModulationSvg,
  defaults: {
    modCols: 22,
    modDotMin: 1.2,
    modDotMax: 12,
    modField: 2.2,
    modCenterBias: 0.6,
    modOpacity: 0.85,
    modLow: "#77b69e",
    modHigh: "#9ad4c2",
    modBgTop: "#05070a",
    modBgBottom: "#0d1318",
    modulationPreset: "graphene-default"
  },
  colorIds: ["modLow", "modHigh", "modBgTop", "modBgBottom"],
  presets: projectPalettes((p) => ({
    modLow: p.accent,
    modHigh: p.accent2,
    modBgTop: p.backgroundTop,
    modBgBottom: p.backgroundBottom
  })),
  inputIds: [
    "modCols",
    "modDotMin",
    "modDotMax",
    "modField",
    "modCenterBias",
    "modOpacity",
    "modLow",
    "modHigh",
    "modBgTop",
    "modBgBottom"
  ],
  controlsHtml: {
    setup: '<label class="field"><span class="field-label">Palette</span><select id="modulationPreset"></select></label>',
    form: `
      <div class="group-label">Modulation matrix</div>
      <label class="field range"><span class="field-label">Columns</span><input id="modCols" type="range" min="10" max="40" step="1"></label>
      <label class="field range"><span class="field-label">Dot min</span><input id="modDotMin" type="range" min="0.5" max="6" step="0.1"></label>
      <label class="field range"><span class="field-label">Dot max</span><input id="modDotMax" type="range" min="4" max="26" step="0.5"></label>
      <label class="field range"><span class="field-label">Field scale</span><input id="modField" type="range" min="0.4" max="6" step="0.1"></label>
      <label class="field range"><span class="field-label">Center bias</span><input id="modCenterBias" type="range" min="0" max="1" step="0.05"></label>
      <label class="field range"><span class="field-label">Opacity</span><input id="modOpacity" type="range" min="0.2" max="1" step="0.02"></label>
    `,
    color: `
      <div class="group-label">Modulation colors</div>
      <label class="field color"><span class="field-label">Low (dim)</span><input id="modLow" type="color"></label>
      <label class="field color"><span class="field-label">High (bright)</span><input id="modHigh" type="color"></label>
      <label class="field color"><span class="field-label">Background top</span><input id="modBgTop" type="color"></label>
      <label class="field color"><span class="field-label">Background bottom</span><input id="modBgBottom" type="color"></label>
    `
  }
});