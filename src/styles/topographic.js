/* styles/topographic.js — concentric contour rings (warped elevation lines)
 * centered on the fingerprint sensor. Depends on core.js helpers.
 * Self-registers via registerStyle(). Deterministic: randomness only from
 * mulberry32(p.seed) / valueNoise2D(p.seed). */
"use strict";

function generateTopographicSvg(p) {
  const W = Number(p.width);
  const H = Number(p.height);
  const unit = Math.min(W, H);

  // Sensor = focal basin center.
  const cx = W * (Number(p.fingerprintXPct) / 100);
  const cy = H * (Number(p.fingerprintYPct) / 100);
  const r0 = unit * (Number(p.fingerprintRadiusPct) / 100);

  const seed = (Number(p.seed) >>> 0) || 1;
  const rng = mulberry32(seed);

  const reqRings = Math.max(4, Math.round(Number(p.topographicRings) || 64));
  const spacing = Math.max(2, Number(p.topographicSpacing) || 30);
  const warp = Math.max(0, Number(p.topographicWarp));
  const warpScale = Math.max(0.05, Number(p.topographicWarpScale) || 1.6);
  const lineOpacity = clamp01(Number(p.topographicLineOpacity) || 0.5);
  const baseSw = Math.max(0.2, Number(p.topographicLineWidth) || 1.4);

  const accIn = p.topographicColorInner || "#9ad4c2";
  const accOut = p.topographicColorOuter || "#6d7882";
  const bgTop = p.backgroundTop || "#05070a";
  const bgMid = p.backgroundMid || "#090d12";
  const bgBot = p.backgroundBottom || "#0d1318";

  const clearance = r0 * 1.25;
  const corners = [[0, 0], [W, 0], [0, H], [W, H]];
  let maxD = 0;
  for (let i = 0; i < corners.length; i += 1) {
    const d = Math.hypot(corners[i][0] - cx, corners[i][1] - cy);
    if (d > maxD) maxD = d;
  }
  const needed = Math.max(4, Math.ceil((maxD - clearance) / spacing));
  const ringCount = Math.max(4, Math.min(160, reqRings, needed));
  const samples = Math.max(96, Math.min(260, Math.round(unit / 5)));

  // Fourier lobe warp with a coherent per-ring phase drift: the lobes rotate a
  // little on each successive ring, so the contours nest into organic loops and
  // swirls (fingerprint-like whorls) over the topographic-contour base.
  const modes = [2, 3, 5, 7];
  const mAmp = [1.0, 0.64, 0.36, 0.22];
  const phase = modes.map(() => rng() * Math.PI * 2);
  // Base swirl rotates every mode per ring (the whorl); plus per-mode wander.
  const swirl = 0.14 + 0.12 * warpScale;
  const drift = modes.map(() => swirl + (rng() - 0.5) * 0.45 * warpScale);

  function radiusAt(baseR, ang, k, t) {
    let off = 0;
    for (let i = 0; i < modes.length; i += 1) {
      off += mAmp[i] * Math.sin(modes[i] * ang + phase[i] + k * drift[i]);
    }
    const amp = warp * spacing * (0.5 + 1.6 * t);
    return baseR + off * amp;
  }

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  ];

  parts.push("<defs>");
  parts.push(
    `<linearGradient id="topographic-bg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${bgTop}"/>` +
      `<stop offset="55%" stop-color="${bgMid}"/>` +
      `<stop offset="100%" stop-color="${bgBot}"/></linearGradient>`
  );
  parts.push(
    `<radialGradient id="topographic-basin" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${accIn}" stop-opacity="0.16"/>` +
      `<stop offset="70%" stop-color="${accIn}" stop-opacity="0.04"/>` +
      `<stop offset="100%" stop-color="${accIn}" stop-opacity="0"/></radialGradient>`
  );
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");

  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#topographic-bg)"/>`);
  const basinR = Math.max(clearance * 3, r0 * 4);
  parts.push(
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${basinR.toFixed(1)}" fill="url(#topographic-basin)"/>`
  );

  parts.push(`<g id="topographic-contours" fill="none"${sensorMaskAttr(p)}>`);
  for (let k = 1; k <= ringCount; k += 1) {
    const baseR = clearance + k * spacing;
    const t = k / ringCount;
    const col = mix(accIn, accOut, clamp01(t));
    const op = lineOpacity * (0.5 + 0.5 * (1 - t * 0.5));
    const sw = baseSw * (0.7 + 0.6 * t);

    let d = "";
    let ok = true;
    for (let s = 0; s <= samples; s += 1) {
      const ang = (s / samples) * Math.PI * 2;
      const rr = radiusAt(baseR, ang, k, t);
      const px = cx + Math.cos(ang) * rr;
      const py = cy + Math.sin(ang) * rr;
      if (!Number.isFinite(px) || !Number.isFinite(py)) { ok = false; break; }
      d += (s === 0 ? "M" : "L") + px.toFixed(1) + " " + py.toFixed(1);
    }
    if (!ok) continue;
    d += "Z";
    parts.push(
      `<path d="${d}" stroke="${col}" stroke-opacity="${op.toFixed(3)}" stroke-width="${sw.toFixed(2)}"/>`
    );
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
    topographicRings: 72,
    topographicSpacing: 28,
    topographicWarp: 1.15,
    topographicWarpScale: 1.8,
    topographicLineOpacity: 0.5,
    topographicLineWidth: 1.4,
    topographicColorInner: "#9ad4c2",
    topographicColorOuter: "#6d7882",
    topographicPreset: "graphene"
  },
  colorIds: ["topographicColorInner", "topographicColorOuter"],
  presets: [
    { id: "graphene", name: "Graphene", set: { topographicColorInner: "#9ad4c2", topographicColorOuter: "#6d7882" } },
    { id: "amber", name: "Amber", set: { topographicColorInner: "#d1a24c", topographicColorOuter: "#7c6a4a" } },
    { id: "cyan", name: "Cyan", set: { topographicColorInner: "#47b8c9", topographicColorOuter: "#5f7884" } },
    { id: "violet", name: "Violet", set: { topographicColorInner: "#8f7bdc", topographicColorOuter: "#6b6480" } },
    { id: "rose", name: "Rose", set: { topographicColorInner: "#c7798c", topographicColorOuter: "#806a72" } },
    { id: "mono", name: "Monolith", set: { topographicColorInner: "#cdd6da", topographicColorOuter: "#6b7378" } }
  ],
  inputIds: [
    "topographicRings",
    "topographicSpacing",
    "topographicWarp",
    "topographicWarpScale",
    "topographicLineOpacity",
    "topographicLineWidth",
    "topographicColorInner",
    "topographicColorOuter"
  ],
  controlsHtml: {
    form:
      '<div class="group-label">Contours</div>' +
      '<label class="field range"><span class="field-label">Ring count</span>' +
      '<input id="topographicRings" type="range" min="8" max="140" step="1"></label>' +
      '<label class="field range"><span class="field-label">Spacing</span>' +
      '<input id="topographicSpacing" type="range" min="8" max="80" step="1"></label>' +
      '<label class="field range"><span class="field-label">Warp amount</span>' +
      '<input id="topographicWarp" type="range" min="0" max="3" step="0.05"></label>' +
      '<label class="field range"><span class="field-label">Warp scale</span>' +
      '<input id="topographicWarpScale" type="range" min="0.3" max="6" step="0.1"></label>' +
      '<label class="field range"><span class="field-label">Line opacity</span>' +
      '<input id="topographicLineOpacity" type="range" min="0.05" max="1" step="0.01"></label>' +
      '<label class="field range"><span class="field-label">Line width</span>' +
      '<input id="topographicLineWidth" type="range" min="0.4" max="4" step="0.1"></label>',
    color:
      '<div class="group-label">Topographic colors</div>' +
      '<label class="field"><span class="field-label">Preset</span><select id="topographicPreset"></select></label>' +
      '<label class="field color"><span class="field-label">Inner (basin)</span>' +
      '<input id="topographicColorInner" type="color"></label>' +
      '<label class="field color"><span class="field-label">Outer (elevation)</span>' +
      '<input id="topographicColorOuter" type="color"></label>'
  }
});
