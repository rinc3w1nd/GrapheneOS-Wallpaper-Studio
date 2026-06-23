/* styles/facets.js — "Facets": a low-poly crystalline tessellation. A jittered
 * grid is triangulated (each quad split into 2 triangles) and every shard is
 * shaded per the Form param as MATERIAL (no key light, no specular): "gemstone"
 * (default) gives each facet a value of one stone from its own cut geometry,
 * while "mosaic" splits the two palette colours into interlocking mineral
 * domains/veins. Thin facetEdge strokes trace every shard. Element count is
 * bounded (columns capped so triangles stay well under ~2800). Deterministic:
 * vertex jitter and per-facet brightness come from mulberry32(p.seed) and the
 * shading field from valueNoise2D(p.seed) — never Math.random / Date.
 * Depends on core.js. */
"use strict";

function generateFacetsSvg(p) {
  const W = Number(p.width);
  const H = Number(p.height);
  const unit = Math.min(W, H);

  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

  // --- resolved, clamped params ---
  let density = Math.max(8, Math.min(26, Math.round(num(p.facetsDensity, 16))));
  const jitter = Math.max(0, Math.min(1, num(p.facetsJitter, 0.55)));
  const fillOpacity = clamp01(num(p.facetsFillOpacity, 0.85));
  const edgeOpacity = clamp01(num(p.facetsEdgeOpacity, 0.5));
  const glow = clamp01(num(p.facetsGlow, 0.7));
  const form = p.facetsForm || "gemstone"; // "gemstone" (default) | "mosaic" — both pure material

  // --- colors (mapped from palette accent / accent2 / lineColor / bg) ---
  const facetLow = p.facetsLow || p.accent || "#77b69e";
  const facetHigh = p.facetsHigh || p.accent2 || "#9ad4c2";
  const facetEdge = p.facetsEdge || p.lineColor || "#6d7882";
  const bgTop = p.facetsBgTop || p.backgroundTop || "#05070a";
  const bgBottom = p.facetsBgBottom || p.backgroundBottom || "#0d1318";

  // --- composition center (decoupled from the sensor) ---
  const cx = W * (num(p.compositionXPct ?? p.fingerprintXPct ?? 50, 50) / 100);
  const cy = H * (num(p.compositionYPct ?? p.fingerprintYPct ?? 72.5, 72.5) / 100);
  const r = unit * (num(p.fingerprintRadiusPct ?? 10, 10) / 100); // sensor disc radius

  const seed = (Number(p.seed) >>> 0) || 1;
  const rand = mulberry32((seed ^ 0x7ace75) >>> 0);   // vertex jitter + per-facet brightness
  const noise = valueNoise2D((seed ^ 0x3c4e7d) >>> 0); // smooth shading field

  // --- grid dimensions, capped so 2*cols*rows stays well under ~2800 ---
  let cols = density;
  let rows = Math.max(2, Math.round(cols * (H / (W || 1e-6))));
  // cap total triangles: 2 * cols * rows <= 2700  ->  cols*rows <= 1350
  const MAX_CELLS = 1350;
  while (cols * rows > MAX_CELLS && cols > 4) {
    cols -= 1;
    rows = Math.max(2, Math.round(cols * (H / (W || 1e-6))));
  }
  while (cols * rows > MAX_CELLS && rows > 2) rows -= 1;

  const cellW = W / cols;
  const cellH = H / rows;
  const gw = cols + 1;
  const gh = rows + 1;

  // --- build jittered vertex grid; interior vertices displaced, edges pinned
  //     to the canvas border so there are no gaps. ---
  const VX = new Float64Array(gw * gh);
  const VY = new Float64Array(gw * gh);
  for (let j = 0; j < gh; j += 1) {
    for (let i = 0; i < gw; i += 1) {
      const idx = j * gw + i;
      let x = i * cellW;
      let y = j * cellH;
      const interior = i > 0 && i < cols && j > 0 && j < rows;
      if (interior) {
        const n = noise(i * 0.6, j * 0.6); // smooth directional bias
        const jx = (rand() - 0.5) * 2 + (n - 0.5) * 1.2;
        const jy = (rand() - 0.5) * 2 + (noise(i * 0.6 + 7.3, j * 0.6 + 2.1) - 0.5) * 1.2;
        x += jx * jitter * cellW * 0.62;
        y += jy * jitter * cellH * 0.62;
      }
      // never let a vertex escape the canvas
      VX[idx] = Math.max(0, Math.min(W, x));
      VY[idx] = Math.max(0, Math.min(H, y));
    }
  }

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  ];
  parts.push("<defs>");
  parts.push(
    `<linearGradient id="facets-bg" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
  );
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");

  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#facets-bg)"/>`);

  parts.push(
    `<g id="facets-shards" stroke="${facetEdge}" stroke-opacity="${edgeOpacity.toFixed(3)}" ` +
    `stroke-width="${(Math.max(0.4, unit / 1400)).toFixed(2)}" stroke-linejoin="round"${sensorMaskAttr(p)}>`
  );

  // emit a single triangle <polygon>, shaded per the Form.
  function shard(ax, ay, bx, by, cxv, cyv) {
    const mx = (ax + bx + cxv) / 3;
    const my = (ay + by + cyv) / 3;
    let fcol, op;

    if (form === "gemstone") {
      // MATERIAL: a faux facet "normal" from the orientation of this triangle's
      // longest edge (cut geometry, not a light) maps to a value of the SAME
      // material; a tight grain adds even body variation. No cx/cy, no specular.
      const e = [[bx - ax, by - ay], [cxv - bx, cyv - by], [ax - cxv, ay - cyv]];
      let li = 0, lmax = -1;
      for (let k = 0; k < 3; k += 1) {
        const L = e[k][0] * e[k][0] + e[k][1] * e[k][1];
        if (L > lmax) { lmax = L; li = k; }
      }
      const ang = Math.atan2(e[li][1], e[li][0]);
      const facet = (ang / Math.PI + 1) % 1;
      const grain = noise(mx / (unit * 0.085 || 1e-6) + 11.3, my / (unit * 0.085 || 1e-6) + 4.1);
      let v = 0.6 * facet + 0.4 * grain;
      v = Math.pow(v, 1.7); // gamma toward the deep end (OLED-friendly)
      fcol = scaleColor(facetLow, 0.18 + 1.05 * v); // deep stone .. face catching colour
      const flash = rand();
      if (flash > 0.93) {
        // rare polished faces flash the brighter material tone
        fcol = scaleColor(mix(facetLow, facetHigh, 0.6 + 0.4 * v), 0.95 + 0.25 * v);
      } else if (flash > 0.84) {
        fcol = mix(fcol, facetHigh, 0.18 + 0.12 * v);
      }
      op = clamp01(fillOpacity * (0.6 + 0.4 * v) * (1 + 0.12 * glow));
    } else {
      // MOSAIC: the two palette colours as interlocking mineral domains/veins —
      // a smooth field thresholded (no gradient), each facet cut to a tonal
      // shade, with deep cleavage facets and rare opposite-mineral flecks.
      const ds = unit * 0.34 || 1e-6;
      const domain = noise(mx / ds + 11.3, my / ds + 4.1);
      const vein = (noise(mx / (ds * 0.32) + 2.7, my / (ds * 0.32) + 8.9) - 0.5) * 0.22;
      const isHigh = (domain + vein) >= 0.5;
      let base = isHigh ? facetHigh : facetLow;
      let f = 0.9 + rand() * 0.22;
      const roll = rand();
      if (roll < 0.14) {
        f *= 0.46 + rand() * 0.16;             // deep cleavage / inclusions
      } else if (roll < 0.20) {
        base = isHigh ? facetLow : facetHigh;  // rare opposite-mineral flecks
      }
      fcol = scaleColor(base, f);
      op = clamp01(fillOpacity * (0.94 + (noise(mx / ds + 30.0, my / ds + 17.0) - 0.5) * 0.12));
    }

    return (
      `<polygon points="${ax.toFixed(1)},${ay.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} ${cxv.toFixed(1)},${cyv.toFixed(1)}" ` +
      `fill="${fcol}" fill-opacity="${op.toFixed(3)}"/>`
    );
  }

  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const tl = j * gw + i;
      const tr = j * gw + i + 1;
      const bl = (j + 1) * gw + i;
      const br = (j + 1) * gw + i + 1;
      // alternate the diagonal so the tessellation reads as irregular crystal
      if ((i + j) & 1) {
        parts.push(shard(VX[tl], VY[tl], VX[tr], VY[tr], VX[br], VY[br]));
        parts.push(shard(VX[tl], VY[tl], VX[br], VY[br], VX[bl], VY[bl]));
      } else {
        parts.push(shard(VX[tl], VY[tl], VX[tr], VY[tr], VX[bl], VY[bl]));
        parts.push(shard(VX[tr], VY[tr], VX[br], VY[br], VX[bl], VY[bl]));
      }
    }
  }
  parts.push("</g>");

  // keep the immediate sensor disc calm: a faint settling vignette over the shards
  if (sensorGeom(p).on) {
    parts.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 1.05).toFixed(1)}" ` +
      `fill="${bgBottom}" fill-opacity="0.55"/>`
    );
  }

  parts.push(sensorRing(p, facetHigh, facetLow, "hex"));
  parts.push(cornerBrand(p, facetHigh));
  parts.push("</svg>");
  return parts.join("\n");
}

registerStyle({
  id: "facets",
  label: "Facets",
  generate: generateFacetsSvg,
  defaults: {
    facetsDensity: 16,
    facetsJitter: 0.55,
    facetsFillOpacity: 0.85,
    facetsEdgeOpacity: 0.5,
    facetsGlow: 0.7,
    facetsLow: "#77b69e",
    facetsHigh: "#9ad4c2",
    facetsEdge: "#6d7882",
    facetsBgTop: "#05070a",
    facetsBgBottom: "#0d1318",
    facetsPreset: "graphene-default",
    facetsForm: "gemstone",
  },
  colorIds: ["facetsLow", "facetsHigh", "facetsEdge", "facetsBgTop", "facetsBgBottom"],
  presets: projectPalettes((p) => ({
    facetsLow: p.accent,
    facetsHigh: p.accent2,
    facetsEdge: p.lineColor,
    facetsBgTop: p.backgroundTop,
    facetsBgBottom: p.backgroundBottom,
  })),
  inputIds: [
    "facetsDensity",
    "facetsJitter",
    "facetsFillOpacity",
    "facetsEdgeOpacity",
    "facetsGlow",
    "facetsLow",
    "facetsHigh",
    "facetsEdge",
    "facetsBgTop",
    "facetsBgBottom",
    "facetsForm",
  ],
  controlsHtml: {
    setup:
      '<label class="field"><span class="field-label">Palette</span><select id="facetsPreset"></select></label>',
    form:
      '<div class="group-label">Form</div>' +
      '<label class="field"><span class="field-label">Form</span><select id="facetsForm">' +
      '<option value="gemstone">Gemstone</option><option value="mosaic">Mosaic</option>' +
      '</select></label>' +
      '<div class="group-label">Crystal</div>' +
      '<label class="field range"><span class="field-label">Density</span>' +
      '<input id="facetsDensity" type="range" min="8" max="26" step="1"></label>' +
      '<label class="field range"><span class="field-label">Jitter</span>' +
      '<input id="facetsJitter" type="range" min="0" max="1" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Fill opacity</span>' +
      '<input id="facetsFillOpacity" type="range" min="0.2" max="1" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Edge opacity</span>' +
      '<input id="facetsEdgeOpacity" type="range" min="0" max="1" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Focal glow</span>' +
      '<input id="facetsGlow" type="range" min="0" max="1" step="0.05"></label>',
    color:
      '<div class="group-label">Facet colors</div>' +
      '<label class="field color"><span class="field-label">Low (dim)</span>' +
      '<input id="facetsLow" type="color"></label>' +
      '<label class="field color"><span class="field-label">High (bright)</span>' +
      '<input id="facetsHigh" type="color"></label>' +
      '<label class="field color"><span class="field-label">Edge</span>' +
      '<input id="facetsEdge" type="color"></label>' +
      '<label class="field color"><span class="field-label">Background top</span>' +
      '<input id="facetsBgTop" type="color"></label>' +
      '<label class="field color"><span class="field-label">Background bottom</span>' +
      '<input id="facetsBgBottom" type="color"></label>',
  },
});