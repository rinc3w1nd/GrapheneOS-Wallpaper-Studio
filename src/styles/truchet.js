/* styles/truchet.js — "Truchet": a grid of Truchet quarter-circle arc tiles
 * woven into a flowing labyrinth. Each cell deterministically picks one of two
 * orientations (mulberry32); arcs connect across cells into continuous maze
 * loops. A radial opacity falloff keeps the sensor cell calm and lets density
 * build toward the edges (depth); a sparse set of cells light up in the accent
 * colour to trace glowing loops. The "curviness" param blends the arc toward a
 * straight diagonal. Framed with the shared hex sensor ring. Depends on core.js.
 * Deterministic: randomness only via mulberry32(p.seed); never Math.random/Date.
 * Same params => byte-identical output. */
"use strict";

function generateTruchetSvg(p) {
  const W = p.width;
  const H = p.height;
  const unit = Math.min(W, H);

  // ---- resolved params (clamped, bounded) ----
  let tiles = Math.max(8, Math.min(28, Math.round(p.truchetTiles ?? 16)));
  const lineWidthBase = Math.max(0.5, Math.min(6, p.truchetLineWidth ?? 2.2));
  const lineOpacity = Math.max(0.1, Math.min(1, p.truchetLineOpacity ?? 0.75));
  const accentFreq = Math.max(0, Math.min(0.4, p.truchetAccentFreq ?? 0.12));
  const curviness = Math.max(0, Math.min(1, p.truchetCurviness ?? 1));

  const bgTop = p.truchetBgTop || p.backgroundTop || "#05070a";
  const bgBottom = p.truchetBgBottom || p.backgroundBottom || "#0d1318";
  const col = p.truchetColor || "#77b69e";
  const accent = p.truchetAccent || "#9ad4c2";

  // ---- sensor focal geometry ----
  const cx = W * ((p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
  const cy = H * ((p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);
  const r = unit * ((p.fingerprintRadiusPct ?? 10) / 100);
  const calmR = r * 1.35;       // immediate sensor disc kept calm
  const haloR = r * 4.2;        // soft halo behind the ring

  const rand = mulberry32((p.seed | 0) ^ 0x712c4e);

  // ---- grid sizing: square cells across width, rows scaled to aspect, capped ----
  const s = W / tiles;                         // cell size (px)
  let rows = Math.max(4, Math.round(H / s));
  // Cap cols*rows*2 arcs under ~2800.
  const MAX_ARCS = 2800;
  while (tiles * rows * 2 > MAX_ARCS && rows > 4) rows -= 1;
  while (tiles * rows * 2 > MAX_ARCS && tiles > 8) tiles -= 1;
  const cols = tiles;
  const cell = W / cols;                        // recompute with final cols
  const half = cell / 2;
  const rad = half;                             // arc radius = s/2

  // Far-corner distance from sensor center -> normalises the depth falloff.
  const corners = [
    Math.hypot(cx, cy),
    Math.hypot(W - cx, cy),
    Math.hypot(cx, H - cy),
    Math.hypot(W - cx, H - cy)
  ];
  const maxD = Math.max.apply(null, corners) || 1e-6;

  // One arc: from edge-midpoint (ax,ay) to (bx,by), curving around corner (qx,qy).
  // curviness=1 => circular quarter arc (radius=rad); 0 => straight diagonal.
  function arcPath(ax, ay, bx, by) {
    if (curviness <= 0.001) {
      return `M${ax.toFixed(2)} ${ay.toFixed(2)} L${bx.toFixed(2)} ${by.toFixed(2)}`;
    }
    // Sweep so the arc bulges away from the corner the radius is centered on.
    // Both orientations use sweep-flag 1 with our point ordering below.
    const rr = (rad / curviness).toFixed(2); // larger radius => flatter (toward straight)
    return `M${ax.toFixed(2)} ${ay.toFixed(2)} A${rr} ${rr} 0 0 1 ${bx.toFixed(2)} ${by.toFixed(2)}`;
  }

  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
  parts.push("<defs>");
  parts.push(`<linearGradient id="truchetBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`);
  parts.push(`<radialGradient id="truchetHalo" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${accent}" stop-opacity="0.12"/><stop offset="55%" stop-color="${col}" stop-opacity="0.05"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></radialGradient>`);
  parts.push(`<radialGradient id="truchetVignette" cx="50%" cy="50%" r="72%"><stop offset="0%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#000000" stop-opacity="0.45"/></radialGradient>`);
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");
  parts.push(`<rect width="100%" height="100%" fill="url(#truchetBg)"/>`);

  // Soft halo behind the sensor (under the labyrinth) for atmosphere/depth.
  parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${haloR.toFixed(1)}" fill="url(#truchetHalo)"/>`);

  parts.push(`<g id="truchet-weave" fill="none" stroke-linecap="round"${sensorMaskAttr(p)}>`);

  // Buckets so we can layer base arcs first, accent (glowing) loops on top.
  const baseArcs = [];
  const accentArcs = [];

  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const x0 = gx * cell;
      const y0 = gy * cell;
      const cxCell = x0 + half;
      const cyCell = y0 + half;

      // Depth falloff: cells near the sensor fade out (calm), edges intensify.
      const d = Math.hypot(cxCell - cx, cyCell - cy);
      const tDepth = clamp01(d / maxD);              // 0 center -> 1 far
      // Drop arcs entirely inside the calm disc.
      if (d < calmR) { rand(); rand(); continue; }   // keep PRNG stream aligned

      // edge midpoints
      const topM = [cxCell, y0];
      const botM = [cxCell, y0 + cell];
      const leftM = [x0, cyCell];
      const rightM = [x0 + cell, cyCell];

      const orient = rand() < 0.5; // A or B
      let aA, aB; // two arcs as [start, end]
      if (orient) {
        // Orientation A: arcs hug top-left and bottom-right corners.
        // top-mid -> left-mid (around TL corner); bottom-mid -> right-mid (around BR).
        aA = [topM, leftM];
        aB = [botM, rightM];
      } else {
        // Orientation B (mirror): top-right and bottom-left corners.
        // top-mid -> right-mid (around TR); bottom-mid -> left-mid (around BL).
        aA = [topM, rightM];
        aB = [botM, leftM];
      }

      // Accent loop highlight: brighten with depth so glowing loops live at edges.
      const isAccent = rand() < accentFreq * (0.45 + 0.85 * tDepth);

      // Per-arc opacity: whole field populated, with a gentle lift toward the
      // edges (the immediate sensor disc is already dropped above).
      const op = (lineOpacity * (0.72 + 0.28 * tDepth)).toFixed(3);
      const sw = (lineWidthBase * (unit / 1080) * (isAccent ? 1.5 : 1)).toFixed(2);

      const d1 = arcPath(aA[0][0], aA[0][1], aA[1][0], aA[1][1]);
      const d2 = arcPath(aB[0][0], aB[0][1], aB[1][0], aB[1][1]);

      if (isAccent) {
        // Flip: sparse loops carry the saturated palette accent (the bright pops).
        const aop = (Math.min(1, lineOpacity + 0.15) * (0.45 + 0.55 * tDepth)).toFixed(3);
        accentArcs.push(`<path d="${d1}" stroke="${col}" stroke-opacity="${aop}" stroke-width="${sw}"/>`);
        accentArcs.push(`<path d="${d2}" stroke="${col}" stroke-opacity="${aop}" stroke-width="${sw}"/>`);
      } else {
        // the woven bulk recedes into the quieter secondary tone
        baseArcs.push(`<path d="${d1}" stroke="${accent}" stroke-opacity="${op}" stroke-width="${sw}"/>`);
        baseArcs.push(`<path d="${d2}" stroke="${accent}" stroke-opacity="${op}" stroke-width="${sw}"/>`);
      }
    }
  }

  for (let i = 0; i < baseArcs.length; i += 1) parts.push(baseArcs[i]);
  for (let i = 0; i < accentArcs.length; i += 1) parts.push(accentArcs[i]);
  parts.push("</g>");

  // Subtle vignette to deepen edges and pull focus inward.
  parts.push(`<rect width="100%" height="100%" fill="url(#truchetVignette)"/>`);

  // ---- sensor focal framing: shared hex ring + corner brand ----
  parts.push(sensorRing(p, col, accent, "hex"));
  parts.push(cornerBrand(p, accent));
  parts.push("</svg>");
  return parts.join("\n");
}
// No registerStyle: this module only defines its generator. Sonar/Truchet are
// selectable "forms" hosted by the Topographic style (see topographic.js),
// sharing its palette, sensor and composition.
