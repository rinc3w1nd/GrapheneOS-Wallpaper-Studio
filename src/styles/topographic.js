/* styles/topographic.js — "Topographic": a contour map. A domain-warped
 * fractional-Brownian-motion noise field (plus a focal basin at the composition
 * center) is contoured with marching squares into evenly-spaced iso-lines, so
 * the whole canvas reads as an elevation map full of organic loops and swirls.
 * Each contour LEVEL is emitted as a single <path> (many M/L subpaths), so the
 * element count stays tiny regardless of detail. Colour ramps from inner (low)
 * to outer (high). Depends on core.js. Deterministic: the field is seeded by
 * valueNoise2D(p.seed); never Math.random / Date. */
"use strict";

function generateTopographicSvg(p) {
  // Topographic hosts three "forms": its own contour map (default) plus Sonar
  // (radial interference) and Truchet (woven labyrinth), which reuse its palette,
  // sensor and composition. The Form select in the Form panel switches between them.
  const form = p.topographicForm || "contour";
  if (form === "sonar" && typeof generateSonarSvg === "function") {
    return generateSonarSvg({
      ...p,
      sonarColor: p.topographicColorInner, sonarAccent: p.topographicAccent,
      sonarBgTop: p.topographicBgTop || "#05070a", sonarBgBottom: p.topographicBgBottom || "#0d1318",
    });
  }
  if (form === "truchet" && typeof generateTruchetSvg === "function") {
    return generateTruchetSvg({
      ...p,
      truchetColor: p.topographicColorInner, truchetAccent: p.topographicAccent,
      truchetBgTop: p.topographicBgTop || "#05070a", truchetBgBottom: p.topographicBgBottom || "#0d1318",
    });
  }

  const W = Number(p.width);
  const H = Number(p.height);
  const unit = Math.min(W, H);

  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const levels = Math.max(6, Math.min(60, Math.round(num(p.topographicLevels, 24))));
  const warpAmt = Math.max(0, Math.min(2.5, num(p.topographicWarp, 0.9)));
  const fScale = Math.max(0.5, Math.min(6, num(p.topographicScale, 2.2)));
  const lineOpacity = clamp01(num(p.topographicLineOpacity, 0.6));
  const lineWidth = Math.max(0.2, num(p.topographicLineWidth, 1.2)) * (unit / 1080);
  const accentOn = p.topographicAccentOn !== false; // highlight a few lines
  const accentCol = p.topographicAccent || "#e0894c";

  const accIn = p.topographicColorInner || "#9ad4c2";
  const accOut = p.topographicColorOuter || "#6d7882";
  const bgTop = p.topographicBgTop || "#05070a";
  const bgBot = p.topographicBgBottom || "#02040a";

  // Focal center (decoupled from the sensor) — a basin/peak nests loops here.
  const cx = W * (Number(p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
  const cy = H * (Number(p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);

  const noise = valueNoise2D((Number(p.seed) >>> 0) || 1);
  const arng = mulberry32(((((Number(p.seed) >>> 0) || 1) ^ 0x5eed) >>> 0)); // accent-line picks
  function fbm(x, y) {
    let v = 0, a = 0.5, f = 1;
    for (let o = 0; o < 4; o += 1) { v += a * noise(x * f, y * f); f *= 2; a *= 0.5; }
    return v / 0.9375; // ~[0,1)
  }
  const basinR = unit * 0.55;
  function field(px, py) {
    const nx = (px / unit) * fScale;
    const ny = (py / unit) * fScale;
    const wx = fbm(nx * 0.5 + 11.2, ny * 0.5 + 3.1) - 0.5;
    const wy = fbm(nx * 0.5 + 5.7, ny * 0.5 + 19.4) - 0.5;
    let v = fbm(nx + warpAmt * wx, ny + warpAmt * wy);
    const d = Math.hypot(px - cx, py - cy) / basinR;
    v += 0.55 * Math.exp(-d * d * 2.4); // focal peak -> nested loops at the center
    return v;
  }

  // ---- sample field on a grid ----
  const cols = Math.max(48, Math.min(104, Math.round(unit / 13)));
  const cellW = W / cols;
  const rows = Math.max(48, Math.round(H / cellW));
  const cellH = H / rows;
  const gw = cols + 1;
  const G = new Float64Array(gw * (rows + 1));
  let fmin = Infinity, fmax = -Infinity;
  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= cols; i += 1) {
      const v = field(i * cellW, j * cellH);
      G[j * gw + i] = v;
      if (v < fmin) fmin = v;
      if (v > fmax) fmax = v;
    }
  }
  const span = fmax - fmin || 1;

  // marching-squares case table: bits TL=8 TR=4 BR=2 BL=1; edges t/r/b/l.
  const CASES = [
    [], [["l", "b"]], [["b", "r"]], [["l", "r"]],
    [["t", "r"]], [["t", "r"], ["b", "l"]], [["t", "b"]], [["t", "l"]],
    [["t", "l"]], [["t", "b"]], [["t", "l"], ["b", "r"]], [["t", "r"]],
    [["l", "r"]], [["b", "r"]], [["l", "b"]], [],
  ];

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  ];
  parts.push("<defs>");
  parts.push(
    `<linearGradient id="topographic-bg" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBot}"/></linearGradient>`
  );
  parts.push(
    `<radialGradient id="topographic-basin" gradientUnits="userSpaceOnUse" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(basinR).toFixed(1)}">` +
    `<stop offset="0%" stop-color="${accIn}" stop-opacity="0.16"/>` +
    `<stop offset="100%" stop-color="${accIn}" stop-opacity="0"/></radialGradient>`
  );
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#topographic-bg)"/>`);
  parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${basinR.toFixed(1)}" fill="url(#topographic-basin)"/>`);

  parts.push(`<g id="topographic-contours" fill="none" stroke-linecap="round" stroke-linejoin="round"${sensorMaskAttr(p)}>`);
  for (let k = 1; k <= levels; k += 1) {
    const t = k / (levels + 1);
    const L = fmin + span * t;
    let d = "";
    for (let j = 0; j < rows; j += 1) {
      const y0 = j * cellH, y1 = y0 + cellH;
      for (let i = 0; i < cols; i += 1) {
        const x0 = i * cellW, x1 = x0 + cellW;
        const tl = G[j * gw + i], tr = G[j * gw + i + 1];
        const br = G[(j + 1) * gw + i + 1], bl = G[(j + 1) * gw + i];
        const ci = (tl > L ? 8 : 0) | (tr > L ? 4 : 0) | (br > L ? 2 : 0) | (bl > L ? 1 : 0);
        const segs = CASES[ci];
        if (!segs.length) continue;
        const ix = (a, b) => (Math.abs(b - a) < 1e-9 ? 0.5 : (L - a) / (b - a));
        const pt = (e) => {
          if (e === "t") return [x0 + ix(tl, tr) * cellW, y0];
          if (e === "r") return [x1, y0 + ix(tr, br) * cellH];
          if (e === "b") return [x0 + ix(bl, br) * cellW, y1];
          return [x0, y0 + ix(tl, bl) * cellH]; // "l"
        };
        for (let s = 0; s < segs.length; s += 1) {
          const a = pt(segs[s][0]), b = pt(segs[s][1]);
          d += "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + "L" + b[0].toFixed(1) + " " + b[1].toFixed(1);
        }
      }
    }
    if (!d) continue;
    const isAccent = accentOn && arng() < 0.18; // a select few highlighted lines
    const col = isAccent ? accentCol : mix(accIn, accOut, t);
    const op = isAccent ? clamp01(lineOpacity * 1.7) : lineOpacity * (0.55 + 0.45 * (1 - t));
    const sw = isAccent ? lineWidth * 1.7 : lineWidth;
    parts.push(`<path d="${d}" stroke="${col}" stroke-opacity="${op.toFixed(3)}" stroke-width="${sw.toFixed(2)}"/>`);
  }
  parts.push("</g>");

  parts.push(sensorRing(p, accIn, accOut, "circle"));
  parts.push(cornerBrand(p, accIn));
  parts.push("</svg>");
  return parts.join("\n");
}

registerStyle({
  id: "topographic",
  label: "Topographic",
  generate: generateTopographicSvg,
  defaults: {
    topographicLevels: 24,
    topographicWarp: 0.9,
    topographicScale: 2.2,
    topographicLineOpacity: 0.6,
    topographicLineWidth: 1.2,
    topographicAccentOn: true,
    topographicAccent: "#77b69e",
    topographicColorInner: "#9ad4c2",
    topographicColorOuter: "#6d7882",
    topographicPreset: "graphene-default",
    topographicForm: "contour",
  },
  colorIds: ["topographicColorInner", "topographicColorOuter", "topographicAccent"],
  presets: projectPalettes((p) => ({ topographicColorInner: p.accent2, topographicColorOuter: p.lineColor, topographicAccent: p.accent })),
  inputIds: [
    "topographicLevels",
    "topographicWarp",
    "topographicScale",
    "topographicLineOpacity",
    "topographicLineWidth",
    "topographicAccentOn",
    "topographicAccent",
    "topographicColorInner",
    "topographicColorOuter",
    "topographicForm",
  ],
  controlsHtml: {
    setup:
      '<label class="field"><span class="field-label">Palette</span><select id="topographicPreset"></select></label>' +
      '<div class="group-label">Display</div>' +
      '<div class="toggle-group"><label class="chip-toggle"><input id="topographicAccentOn" type="checkbox"><span>Accent<br />lines</span></label></div>',
    form:
      '<div class="group-label">Form</div>' +
      '<label class="field"><span class="field-label">Form</span><select id="topographicForm">' +
      '<option value="contour">Contours</option><option value="sonar">Sonar</option><option value="truchet">Truchet</option>' +
      '</select></label>' +
      '<div class="group-label">Contours</div>' +
      '<label class="field range"><span class="field-label">Levels</span>' +
      '<input id="topographicLevels" type="range" min="6" max="60" step="1"></label>' +
      '<label class="field range"><span class="field-label">Swirl (warp)</span>' +
      '<input id="topographicWarp" type="range" min="0" max="2.5" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Feature scale</span>' +
      '<input id="topographicScale" type="range" min="0.5" max="6" step="0.1"></label>' +
      '<label class="field range"><span class="field-label">Line opacity</span>' +
      '<input id="topographicLineOpacity" type="range" min="0.05" max="1" step="0.01"></label>' +
      '<label class="field range"><span class="field-label">Line width</span>' +
      '<input id="topographicLineWidth" type="range" min="0.4" max="4" step="0.1"></label>',
    color:
      '<div class="group-label">Topographic colors</div>' +
      '<label class="field color"><span class="field-label">Inner (low)</span>' +
      '<input id="topographicColorInner" type="color"></label>' +
      '<label class="field color"><span class="field-label">Outer (high)</span>' +
      '<input id="topographicColorOuter" type="color"></label>' +
      '<label class="field color"><span class="field-label">Accent lines</span>' +
      '<input id="topographicAccent" type="color"></label>',
  },
});
