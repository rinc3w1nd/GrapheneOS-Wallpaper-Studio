/* styles/matrix.js — "Matrix": engineered digital rain, OLED-refined.
 * Vertical columns of falling monospace glyphs on a strict grid. Each active
 * column is a "stream": a bright HEAD glyph with a tail fading up/behind it from
 * the bright accent (accent2) toward the dim accent (accent) and then to
 * transparent. Glyphs are picked deterministically from a fixed half-width
 * katakana + digit + symbol set via mulberry32(p.seed); columns vary in head
 * position and tail length (the "speed" of a static frame), some left sparse for
 * rhythm. A faint per-column guide line and a barely-there radial core bloom give
 * it engineered depth. The sensor void parts the rain (sensorMaskAttr) and a
 * small brighter kernel cluster frames it; sensorRing + cornerBrand finish.
 * Pure SVG, OLED-dark, deterministic (randomness only via mulberry32(p.seed);
 * never Math.random / Date). Same params => byte-identical output. Depends on
 * core.js. */
"use strict";

// Fixed glyph set: half-width katakana (the canonical rain), digits, and a few
// latin/symbols. All renderable from system monospace fonts; none are
// XML-special (no <, >, &, ", ') so they need no escaping.
const MATRIX_GLYPHS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ" +
  "0123456789" +
  "ABCDEFZ:.=*+|";

function generateMatrixSvg(p) {
  const W = p.width;
  const H = p.height;
  const unit = Math.min(W, H);
  const k = unit / 1080; // px scale relative to the 1080-wide reference canvas

  // ---- resolved params (each clamped to a safe, bounded range) ----
  let cols = Math.max(12, Math.min(64, Math.round(p.matrixCols ?? 48)));
  const glyph = Math.max(10, Math.min(56, p.matrixGlyph ?? 40)); // glyph px @1080
  let trail = Math.max(4, Math.min(64, Math.round(p.matrixTrail ?? 48)));
  const variance = Math.max(0, Math.min(1, p.matrixVariance ?? 0.65));
  const density = Math.max(0.2, Math.min(1, p.matrixDensity ?? 1));
  const opacity = Math.max(0.2, Math.min(1, p.matrixOpacity ?? 0.92));

  const bgTop = p.matrixBgTop || p.backgroundTop || "#05070a";
  const bgBottom = p.matrixBgBottom || p.backgroundBottom || "#0d1318";
  const dim = p.matrixDim || "#77b69e";   // tail (accent)
  const bright = p.matrixBright || "#9ad4c2"; // head (accent2)

  // ---- sensor focal geometry (build the composition around it) ----
  const cx = W * ((p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
  const cy = H * ((p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);
  const r = unit * ((p.fingerprintRadiusPct ?? 10) / 100);

  // ---- grid geometry: monospace cells, column count fixes the pitch ----
  const colW = W / cols || 1e-6;
  const fontPx = glyph * k;            // actual glyph size
  const rowH = fontPx * 1.18;          // line advance (slightly looser than em)
  const rowsOnScreen = Math.ceil(H / rowH) + 2;

  // Hard element cap: total glyphs ~= cols * trail. Trim trail then columns so we
  // stay comfortably under the 4000-element budget at any device size.
  const GLYPH_CAP = 3600;
  while (cols * trail > GLYPH_CAP && trail > 4) trail -= 1;
  while (cols * trail > GLYPH_CAP && cols > 12) cols -= 1;

  const rand = mulberry32((p.seed | 0) ^ 0x4d4154); // "MAT"
  // Independent stream so seed changes shuffle glyphs, not just geometry.
  const grand = mulberry32((p.seed | 0) ^ 0x52041a);

  const G = MATRIX_GLYPHS.length;
  function pick(rng) {
    return MATRIX_GLYPHS[Math.floor(rng() * G) % G];
  }

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  ];

  // ---- defs: OLED background, head glow, faint core bloom, sensor mask ----
  parts.push("<defs>");
  parts.push(
    `<linearGradient id="matrixBg" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${bgTop}"/>` +
    `<stop offset="55%" stop-color="${mix(bgTop, bgBottom, 0.6)}"/>` +
    `<stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
  );
  // Soft glow for the brightest head glyphs so they read as emitting light.
  parts.push(
    `<filter id="matrixGlow" x="-60%" y="-60%" width="220%" height="220%">` +
    `<feGaussianBlur stdDeviation="${(fontPx * 0.16).toFixed(2)}"/></filter>`
  );
  // Barely-there radial bloom centered on the sensor: the calm eye of the storm.
  parts.push(
    `<radialGradient id="matrixCore" gradientUnits="userSpaceOnUse" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 3.2).toFixed(1)}">` +
    `<stop offset="0%" stop-color="${bright}" stop-opacity="0.10"/>` +
    `<stop offset="46%" stop-color="${dim}" stop-opacity="0.045"/>` +
    `<stop offset="100%" stop-color="${dim}" stop-opacity="0"/></radialGradient>`
  );
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");

  parts.push(`<rect width="100%" height="100%" fill="url(#matrixBg)"/>`);
  parts.push(`<rect width="100%" height="100%" fill="url(#matrixCore)"/>`);

  // ---- faint vertical column guides: engineered depth, drawn under the rain ----
  // One hairline per column, dim and clipped by the sensor mask too.
  const guideCol = mix(bgBottom, dim, 0.5);
  const guides = [];
  for (let c = 0; c < cols; c += 1) {
    const gx = (c + 0.5) * colW;
    guides.push(
      `<line x1="${gx.toFixed(2)}" y1="0" x2="${gx.toFixed(2)}" y2="${H}" stroke="${guideCol}" stroke-opacity="${(opacity * 0.05).toFixed(3)}" stroke-width="${Math.max(0.5, 0.6 * k).toFixed(2)}"/>`
    );
  }
  parts.push(`<g id="matrix-guides"${sensorMaskAttr(p)}>${guides.join("")}</g>`);

  // ---- the rain ----
  // For each column: decide activity (some sparse/empty for rhythm), a head row
  // (its static fall phase), and a tail length. Tail glyphs fade up from the head.
  parts.push(`<g id="matrix-rain" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${fontPx.toFixed(2)}" text-anchor="middle"${sensorMaskAttr(p)}>`);

  const glyphs = [];
  const heads = []; // brightest heads get a glow pass, collected separately
  const tailFloor = Math.max(3, Math.round(trail * (1 - variance * 0.6)));

  for (let c = 0; c < cols; c += 1) {
    const gx = (c + 0.5) * colW;

    // Column activity: density gate, biased so the band around the sensor column
    // stays a touch denser (frames the focal point) and edges stay sparse.
    const active = rand();
    const colDist = Math.abs(gx - cx) / (W * 0.5); // 0 at sensor column, ~1 at edge
    const localDensity = clamp01(density * (1.15 - 0.3 * colDist));
    if (active > localDensity) {
      // Inactive column: still advance the rng so other columns' draws are stable.
      rand(); rand(); rand();
      continue;
    }

    // Head fall phase: where the bright glyph sits this frame (0..rowsOnScreen).
    const phase = rand();
    const headRow = Math.floor(phase * rowsOnScreen);
    // Tail length varies per column (the "speed" of a frozen frame): faster
    // streams read as longer trails. variance widens the spread.
    const tlen = Math.max(
      2,
      Math.round(tailFloor + (trail - tailFloor) * (variance * rand() + (1 - variance)))
    );

    for (let t = 0; t < tlen; t += 1) {
      const row = headRow - t; // tail extends UPWARD (behind the falling head)
      if (row < -1) break;
      const gy = row * rowH + fontPx * 0.5;
      if (gy < -rowH || gy > H + rowH) continue;

      // Brightness ramp: 1 at the head, easing to 0 up the tail (quadratic so
      // heads pop hard on pure black, tails sink quickly into the field).
      const tn = t / Math.max(1, tlen - 1); // 0 head -> 1 tail end
      const ramp = (1 - tn) * (1 - tn);     // quadratic falloff
      // Per-glyph subtle flicker so identical rows don't look stamped.
      const flick = 0.85 + 0.15 * grand();
      const ch = pick(grand);

      if (t === 0) {
        // Head: full bright, the near-white-green leading glyph.
        const headOp = clamp01(opacity * flick);
        heads.push(
          `<text x="${gx.toFixed(2)}" y="${gy.toFixed(2)}" fill="${bright}" fill-opacity="${headOp.toFixed(3)}">${ch}</text>`
        );
      } else {
        const col = mix(dim, bright, ramp);
        const op = clamp01(opacity * ramp * flick);
        if (op < 0.03) continue; // skip invisible tail tips, keep it crisp
        glyphs.push(
          `<text x="${gx.toFixed(2)}" y="${gy.toFixed(2)}" fill="${col}" fill-opacity="${op.toFixed(3)}">${ch}</text>`
        );
      }
    }
  }

  // Tails first (under), then heads (glow pass, then a sharp pass on top).
  parts.push(glyphs.join(""));
  parts.push(`<g filter="url(#matrixGlow)">${heads.join("")}</g>`);
  // Re-emit the heads sharp over their own glow so the glyph stays legible.
  parts.push(heads.join(""));
  parts.push("</g>");

  // ---- kernel: a small, brighter cluster of glyphs framing the sensor ----
  // Sits just outside the calm disc, NOT inside it (Android paints the sensor UI
  // there). Reads as the rain condensing around the focal point.
  if (sensorGeomOn(p)) {
    const krand = mulberry32((p.seed | 0) ^ 0x6b65726e); // "kern"
    const ring = [];
    const kCount = 10;
    const kR = r * 1.42; // just beyond the sensor rim
    const kFont = fontPx * 0.92;
    for (let i = 0; i < kCount; i += 1) {
      const a = (i / kCount) * Math.PI * 2 + krand() * 0.4;
      const rr = kR * (0.96 + 0.14 * krand());
      const kx = cx + Math.cos(a) * rr;
      const ky = cy + Math.sin(a) * rr + kFont * 0.34; // baseline nudge
      const op = clamp01(opacity * (0.45 + 0.4 * krand()));
      ring.push(
        `<text x="${kx.toFixed(2)}" y="${ky.toFixed(2)}" fill="${mix(dim, bright, 0.7 + 0.3 * krand())}" fill-opacity="${op.toFixed(3)}">${pick(krand)}</text>`
      );
    }
    parts.push(
      `<g id="matrix-kernel" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${kFont.toFixed(2)}" text-anchor="middle">${ring.join("")}</g>`
    );
  }

  // ---- sensor focal framing + brand ----
  parts.push(sensorRing(p, bright, dim, "hex"));
  parts.push(cornerBrand(p, bright));
  parts.push("</svg>");
  return parts.join("\n");
}

// Local helper: is the sensor aperture enabled? (mirrors core's sensorGeom.on)
function sensorGeomOn(p) {
  return p.fingerprintEnabled !== false;
}

registerStyle({
  id: "matrix",
  label: "Matrix",
  generate: generateMatrixSvg,
  defaults: {
    matrixCols: 48,
    matrixGlyph: 40,
    matrixTrail: 48,
    matrixVariance: 0.65,
    matrixDensity: 1,
    matrixOpacity: 0.92,
    matrixDim: "#77b69e",
    matrixBright: "#9ad4c2",
    matrixBgTop: "#05070a",
    matrixBgBottom: "#0d1318",
    matrixPreset: "graphene-default"
  },
  colorIds: ["matrixDim", "matrixBright", "matrixBgTop", "matrixBgBottom"],
  presets: projectPalettes((pal) => ({
    matrixDim: pal.accent,
    matrixBright: pal.accent2,
    matrixBgTop: pal.backgroundTop,
    matrixBgBottom: pal.backgroundBottom
  })),
  inputIds: [
    "matrixCols",
    "matrixGlyph",
    "matrixTrail",
    "matrixVariance",
    "matrixDensity",
    "matrixOpacity",
    "matrixDim",
    "matrixBright",
    "matrixBgTop",
    "matrixBgBottom"
  ],
  controlsHtml: {
    setup: '<label class="field"><span class="field-label">Palette</span><select id="matrixPreset"></select></label>',
    form: `
      <div class="group-label">Digital rain</div>
      <label class="field range"><span class="field-label">Columns</span><input id="matrixCols" type="range" min="12" max="64" step="1"></label>
      <label class="field range"><span class="field-label">Glyph size</span><input id="matrixGlyph" type="range" min="10" max="56" step="1"></label>
      <label class="field range"><span class="field-label">Trail length</span><input id="matrixTrail" type="range" min="4" max="64" step="1"></label>
      <label class="field range"><span class="field-label">Fall variance</span><input id="matrixVariance" type="range" min="0" max="1" step="0.05"></label>
      <label class="field range"><span class="field-label">Density</span><input id="matrixDensity" type="range" min="0.2" max="1" step="0.02"></label>
      <label class="field range"><span class="field-label">Opacity</span><input id="matrixOpacity" type="range" min="0.2" max="1" step="0.02"></label>
    `,
    color: `
      <div class="group-label">Rain colors</div>
      <label class="field color"><span class="field-label">Tail (dim)</span><input id="matrixDim" type="color"></label>
      <label class="field color"><span class="field-label">Head (bright)</span><input id="matrixBright" type="color"></label>
      <label class="field color"><span class="field-label">Background top</span><input id="matrixBgTop" type="color"></label>
      <label class="field color"><span class="field-label">Background bottom</span><input id="matrixBgBottom" type="color"></label>
    `
  }
});
