/* styles/forge.js — "Forge": the GrapheneOS logo tessellated + woven across a
 * plain palette field, every instance a FLAT metal tile with a frosted grain and
 * a specular glint — a faithful SVG port of the GOS-Chic
 * "--texture frosted --effect specular" look. Replaces "Chic".
 * Field is monochrome by default; the Duotone toggle alternates warm/cool tiles
 * by row, and the Accent-logo toggle strikes one accent-coloured logo top-right.
 *
 * Recipe (matches tmp/gos-chic/gos_chic.py):
 *   - DUOTONE fill: warm/cool variants of the metal colour, FLAT, alternated by
 *     row. `--deep` uses the dramatic split warm=(r·1.5,g·0.7,b·0.5),
 *     cool=(r·0.5,g·0.7,b·1.5); otherwise the gentle complementary pair.
 *   - FROSTED texture: a dense fine grayscale noise (the original multiplies a
 *     noise layer onto each tile), masked to the logo silhouettes.
 *   - SPECULAR effect: a soft radial highlight in the sheen colour, upper-right of
 *     each logo (the original's hot-spot).
 *   - background stays PLAIN (palette gradient) — texture lives only on the logos.
 * The fingerprint sensor is the only focal point (an accent hex ring, or the
 * official mark, frames it when enabled); one accent-struck logo sits top-right.
 * EXPORT-SAFE primitives only (feTurbulence / feColorMatrix / feComponentTransfer
 * / feGaussianBlur — never the lighting/displacement filters, which fail when the
 * SVG is rasterised through <img>→canvas). Deterministic via p.seed. Depends on core.js. */
"use strict";

function generateForgeSvg(p) {
  const W = Number(p.width);
  const H = Number(p.height);
  const unit = Math.min(W, H);
  const C = 2644.0798 / 2; // official logo viewBox centre

  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

  // --- resolved, clamped params ---
  const tileScale = Math.max(0.5, Math.min(2, num(p.forgeTileScale, 1)));
  const spacing = Math.max(1.05, Math.min(2.4, num(p.forgeSpacing, 1.5)));
  const relief = clamp01(num(p.forgeRelief, 0.5));     // drop-shadow depth
  const specular = clamp01(num(p.forgeBrush, 0.5));    // specular-glint strength
  const frost = clamp01(num(p.forgeDistress, 0.55));   // frosted-grain strength
  const weaveDeg = (p.forgeWeave === false) ? 0 : Math.max(0, Math.min(3, num(p.forgeWeaveDeg, 3)));
  const deepOn = p.forgeDeep === true;             // off → gentle complementary; on → stronger split
  const duotoneOn = p.forgeDuotone === true;       // off → monochrome (single tone) field
  const altToneOn = p.forgeAltTone === true;       // swap primary tone (warm↔cool) / swap duotone order
  const accentLogoOn = p.forgeAccentLogo === true; // off → no single accent-struck logo

  // --- colours (palette-driven). `metal` drives the duotone; `sheen` is the
  //     specular glint; `accent` is the struck logo + sensor frame; bg is plain. ---
  const metal = p.forgeMetal || p.lineColor || "#6d7882";
  const sheen = p.forgeSheen || p.accent2 || "#9ad4c2";
  const accent = p.forgeAccent || p.accent || "#77b69e";
  const bgTop = p.forgeBgTop || p.backgroundTop || "#05070a";
  const bgBottom = p.forgeBgBottom || p.backgroundBottom || "#0d1318";

  // duotone warm/cool tiles (FLAT). The samples read as the gentle complementary
  // pair (amber + teal); `--deep` is a stronger — but not garish — split.
  const duo = (base) => {
    if (deepOn) {
      const [r, g, b] = hexToRgb(base);
      return [rgbToHex(r * 1.35, g * 0.8, b * 0.55), rgbToHex(r * 0.6, g * 0.85, b * 1.3)];
    }
    return complementaryPair(base);
  };
  // Full-bright duotone tiles; the frosted MULTIPLY (below) does the dimming —
  // exactly like the original (no separate pre-darken).
  const [warmCol, coolCol] = duo(metal);
  // "Alternate tone" swaps which tone is primary: mono field flips warm↔cool, and
  // duotone rows swap order. toneA = even-row / monochrome tone; toneB = odd-row.
  const toneA = altToneOn ? coolCol : warmCol;
  const toneB = altToneOn ? warmCol : coolCol;
  const accentCol = accent;
  const specColor = mix(sheen, "#ffffff", 0.3); // faint specular glint

  // --- geometry ---
  const tileSize = unit * 0.15 * tileScale;
  const step = tileSize * spacing;
  const cx = W * (num(p.compositionXPct ?? p.fingerprintXPct ?? 50, 50) / 100);
  const cy = H * (num(p.compositionYPct ?? p.fingerprintYPct ?? 72.5, 72.5) / 100);
  const sg = sensorGeom(p);
  const sensorLogoOn = sg.on && p.sensorLogo;
  const sensorLogoSize = sg.r * 3.3; // matches core's SENSOR_LOGO_SCALE

  const seed = (Number(p.seed) >>> 0) || 1;
  const s2 = ((seed ^ 0x2c91af) >>> 0) % 9973;     // frost turbulence seed
  const shadowPx = relief * tileSize * 0.05 + 1.0; // drop-shadow offset

  // one logo instance as a <use>
  function logoUse(px, py, size, rot, fill) {
    const sc = (size / (C * 2)).toFixed(6);
    const f = fill ? ` fill="${fill}"` : "";
    return `<use href="#forgeLogo"${f} transform="translate(${px.toFixed(2)} ${py.toFixed(2)})${rot ? ` rotate(${rot.toFixed(2)})` : ""} scale(${sc}) translate(${(-C).toFixed(1)} ${(-C).toFixed(1)})"/>`;
  }

  // frosted texture = the original's NOISE MULTIPLY: one black overlay whose
  // per-pixel alpha comes from contrast-stretched noise, so each tile pixel is
  // darkened by a random 0..1 amount → harsh per-pixel salt-and-pepper static
  // (and ~50% mean dimming). Masked to the logos by the caller's <g mask>.
  function frostTexture() {
    if (frost <= 0) return "";
    return `<rect x="0" y="0" width="${W}" height="${H}" filter="url(#forgeFrost)" opacity="${frost.toFixed(3)}"/>`;
  }

  // --- build the uniform stamp grid ---
  const stamps = [];
  const cols = Math.ceil(W / step) + 2;
  const rows = Math.ceil(H / step) + 2;
  for (let j = -rows; j <= rows; j += 1) {
    for (let i = -cols; i <= cols; i += 1) {
      let x = cx + i * step;
      const y = cy + j * step;
      if (j & 1) x += step / 2; // tessellated brick offset on odd rows
      if (x < -tileSize || x > W + tileSize || y < -tileSize || y > H + tileSize) continue;
      const rot = weaveDeg ? (((i + j) & 1) ? -weaveDeg : weaveDeg) : 0;
      stamps.push({ x, y, size: tileSize, rot, row: j });
    }
  }
  // optionally strike one accent logo: first FULLY-VISIBLE logo from the right,
  // second FULLY-VISIBLE row from the top (edge-occluded logos don't count).
  let accentStamp = null;
  if (accentLogoOn) {
    const half = tileSize * 0.5;
    const fullVis = stamps.filter((s) => s.x >= half && s.x <= W - half && s.y >= half && s.y <= H - half);
    const fullRows = [...new Set(fullVis.map((s) => s.row))].sort((a, b) => a - b);
    const targetRow = fullRows.length >= 2 ? fullRows[1] : fullRows[0];
    let bestX = -Infinity;
    fullVis.forEach((s) => { if (s.row === targetRow && s.x > bestX) { bestX = s.x; accentStamp = s; } });
  }

  // silhouette mask (texture/specular only on the logos); accent + sensor masks
  const silhouetteMask =
    `<mask id="forgeMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="black"/>` +
    stamps.map((s) => logoUse(s.x, s.y, s.size, s.rot, "white")).join("") +
    `</mask>`;
  const accentMask = accentStamp
    ? `<mask id="forgeAccentMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">` +
      `<rect x="0" y="0" width="${W}" height="${H}" fill="black"/>` +
      logoUse(accentStamp.x, accentStamp.y, accentStamp.size, accentStamp.rot, "white") +
      `</mask>`
    : "";

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  ];

  parts.push("<defs>");
  parts.push(`<path id="forgeLogo" d="${OFFICIAL_LOGO_PATH}" fill-rule="nonzero"/>`);
  // plain palette background (NOT metal)
  parts.push(
    `<linearGradient id="forgeBg" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
  );
  // SPECULAR glint — a soft radial hot-spot upper-right of each logo (objectBoundingBox)
  parts.push(
    `<radialGradient id="forgeSpecular" cx="0.62" cy="0.3" r="0.6">` +
    `<stop offset="0%" stop-color="${specColor}" stop-opacity="1"/>` +
    `<stop offset="45%" stop-color="${specColor}" stop-opacity="0.4"/>` +
    `<stop offset="100%" stop-color="${specColor}" stop-opacity="0"/></radialGradient>`
  );
  // FROSTED static — high-freq noise → black overlay, per-pixel alpha = noise
  // luminance contrast-stretched toward the extremes (harsh salt-and-pepper, like
  // the original's per-pixel noise multiply). numOctaves 1 keeps it crisp.
  parts.push(
    `<filter id="forgeFrost" x="0" y="0" width="100%" height="100%">` +
    `<feTurbulence type="turbulence" baseFrequency="0.7" numOctaves="3" seed="${s2}" stitchTiles="stitch" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.7 0.7 0.7 0 0"/>` +
    `<feComponentTransfer><feFuncA type="discrete" tableValues="0 0 0 1 1 0 1 1 0 1"/></feComponentTransfer></filter>`
  );
  // soft drop-shadow for a little lift
  parts.push(
    `<filter id="forgeShadow" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${(shadowPx * 0.9).toFixed(2)}"/></filter>`
  );
  parts.push(sensorMaskDef(p)); // clears the sensor void from the logo layers
  parts.push(silhouetteMask);
  if (accentMask) parts.push(accentMask);
  if (sensorLogoOn) {
    parts.push(
      `<mask id="forgeSensorMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">` +
      `<rect x="0" y="0" width="${W}" height="${H}" fill="black"/>` +
      logoUse(sg.cx, sg.cy, sensorLogoSize, 0, "white") +
      `</mask>`
    );
  }
  parts.push("</defs>");

  // 1) plain palette field
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#forgeBg)"/>`);

  // 2-4) logo layers, wrapped so the sensor void is cleared from all of them
  parts.push(`<g${sensorMaskAttr(p)}>`);

  // 2) drop shadow
  parts.push(
    `<g mask="url(#forgeMask)"><rect x="0" y="0" width="${W}" height="${H}" fill="#000000" ` +
    `filter="url(#forgeShadow)" opacity="${(0.3 + relief * 0.4).toFixed(3)}" ` +
    `transform="translate(${shadowPx.toFixed(2)} ${shadowPx.toFixed(2)})"/></g>`
  );

  // 3) FLAT duotone tiles — warm/cool by row (accent logo painted separately)
  parts.push(
    `<g>` +
    stamps.map((s) => (s === accentStamp ? "" : logoUse(s.x, s.y, s.size, s.rot, duotoneOn ? ((s.row & 1) ? toneB : toneA) : toneA))).join("") +
    `</g>`
  );
  // 3b) frosted grain on the tiles
  parts.push(`<g mask="url(#forgeMask)">${frostTexture()}</g>`);

  // 4) accent-struck logo (top-right, second full row) — flat accent + frost
  if (accentStamp) {
    parts.push(logoUse(accentStamp.x, accentStamp.y, accentStamp.size, accentStamp.rot, accentCol));
    if (accentMask) parts.push(`<g mask="url(#forgeAccentMask)">${frostTexture()}</g>`);
  }
  // 4b) SPECULAR glint over every logo (faint radial hot-spot)
  if (specular > 0) {
    parts.push(
      `<g opacity="${(0.5 + specular * 0.5).toFixed(3)}">` +
      stamps.map((s) => logoUse(s.x, s.y, s.size, s.rot, "url(#forgeSpecular)")).join("") +
      `</g>`
    );
  }
  parts.push(`</g>`); // close sensor-void wrapper

  // 5) sensor frame — accent hex ring, or (Sensor logo on) the official mark with
  //    the SAME flat accent + frost + specular treatment as the logos
  if (sensorLogoOn) {
    parts.push(logoUse(sg.cx, sg.cy, sensorLogoSize, 0, accentCol));
    parts.push(`<g mask="url(#forgeSensorMask)">${frostTexture()}</g>`);
    if (specular > 0) {
      parts.push(`<g opacity="${(0.5 + specular * 0.5).toFixed(3)}">${logoUse(sg.cx, sg.cy, sensorLogoSize, 0, "url(#forgeSpecular)")}</g>`);
    }
  } else {
    parts.push(sensorRing(p, accent, sheen, "hex"));
  }
  parts.push(cornerBrand(p, sheen));
  parts.push("</svg>");
  return parts.join("\n");
}

registerStyle({
  id: "forge",
  label: "Forge",
  generate: generateForgeSvg,
  defaults: {
    forgeTileScale: 1.0,
    forgeSpacing: 1.5,
    forgeRelief: 0.5,
    forgeBrush: 0.5,
    forgeDistress: 0.55,
    forgeWeave: true,
    forgeWeaveDeg: 3,
    forgeDeep: false,
    forgeDuotone: false,
    forgeAltTone: false,
    forgeAccentLogo: false,
    forgeMetal: "#6d7882",
    forgeSheen: "#9ad4c2",
    forgeAccent: "#77b69e",
    forgeBgTop: "#05070a",
    forgeBgBottom: "#0d1318",
    forgePreset: "graphene-default",
  },
  colorIds: ["forgeMetal", "forgeSheen", "forgeAccent", "forgeBgTop", "forgeBgBottom"],
  presets: projectPalettes((p) => ({
    forgeMetal: p.lineColor,
    forgeSheen: p.accent2,
    forgeAccent: p.accent,
    forgeBgTop: p.backgroundTop,
    forgeBgBottom: p.backgroundBottom,
  })),
  inputIds: [
    "forgeTileScale",
    "forgeSpacing",
    "forgeRelief",
    "forgeBrush",
    "forgeDistress",
    "forgeWeaveDeg",
    "forgeWeave",
    "forgeDeep",
    "forgeDuotone",
    "forgeAltTone",
    "forgeAccentLogo",
    "forgeMetal",
    "forgeSheen",
    "forgeAccent",
    "forgeBgTop",
    "forgeBgBottom",
  ],
  controlsHtml: {
    setup:
      '<label class="field"><span class="field-label">Palette</span><select id="forgePreset"></select></label>' +
      '<div class="group-label">Display</div>' +
      '<div class="toggle-group" aria-label="Forge toggles">' +
      '<label class="chip-toggle"><input id="forgeWeave" type="checkbox"><span>Weave</span></label>' +
      '<label class="chip-toggle"><input id="forgeDuotone" type="checkbox"><span>Duotone</span></label>' +
      '<label class="chip-toggle"><input id="forgeAltTone" type="checkbox"><span>Alt<br />tone</span></label>' +
      '<label class="chip-toggle"><input id="forgeDeep" type="checkbox"><span>Deep</span></label>' +
      '<label class="chip-toggle"><input id="forgeAccentLogo" type="checkbox"><span>Accent<br />logo</span></label>' +
      '</div>',
    form:
      '<div class="group-label">Tessellation</div>' +
      '<label class="field range"><span class="field-label">Tile scale</span>' +
      '<input id="forgeTileScale" type="range" min="0.5" max="2" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Spacing</span>' +
      '<input id="forgeSpacing" type="range" min="1.05" max="2.4" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Weave angle</span>' +
      '<input id="forgeWeaveDeg" type="range" min="0" max="3" step="0.25"></label>' +
      '<div class="group-label">Metal finish</div>' +
      '<label class="field range"><span class="field-label">Specular</span>' +
      '<input id="forgeBrush" type="range" min="0" max="1" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Frost</span>' +
      '<input id="forgeDistress" type="range" min="0" max="1" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Shadow</span>' +
      '<input id="forgeRelief" type="range" min="0" max="1" step="0.05"></label>',
    color:
      '<div class="group-label">Metal colors</div>' +
      '<label class="field color"><span class="field-label">Metal</span>' +
      '<input id="forgeMetal" type="color"></label>' +
      '<label class="field color"><span class="field-label">Sheen</span>' +
      '<input id="forgeSheen" type="color"></label>' +
      '<label class="field color"><span class="field-label">Accent</span>' +
      '<input id="forgeAccent" type="color"></label>' +
      '<label class="field color"><span class="field-label">Background top</span>' +
      '<input id="forgeBgTop" type="color"></label>' +
      '<label class="field color"><span class="field-label">Background bottom</span>' +
      '<input id="forgeBgBottom" type="color"></label>',
  },
});
