/* styles/topographic.js — "Topographic": a synthesized fingerprint rendered as
 * evenly-spaced ridge lines that follow an orientation field with a loop/whorl
 * core and a delta singularity (Sherlock-Monro zero-pole model). Friction ridges
 * flow and branch around the core and fan out past the delta instead of nesting
 * as concentric rings, while keeping the thin topographic-contour aesthetic. The
 * core sits in the fingerprint sensor void. Depends on core.js helpers.
 * Self-registers via registerStyle(). Deterministic: randomness only from
 * mulberry32(p.seed) (a few seed-driven offsets); the ridge tracing itself uses
 * no randomness, so same params => byte-identical output. */
"use strict";

function generateTopographicSvg(p) {
  const W = Number(p.width);
  const H = Number(p.height);
  const unit = Math.min(W, H);

  // Sensor void = the fingerprint core.
  const cx = W * (Number(p.fingerprintXPct ?? 50) / 100);
  const cy = H * (Number(p.fingerprintYPct ?? 72.5) / 100);
  const r0 = unit * (Number(p.fingerprintRadiusPct ?? 10) / 100);

  const seed = (Number(p.seed) >>> 0) || 1;
  const rng = mulberry32(seed);

  // ---- params (with safe, bounded fallbacks) ----
  const pattern = p.topographicPattern || "loop"; // loop | whorl | arch
  const ridgeGap =
    Math.max(6, Math.min(40, Number(p.topographicRidgeGap) || 14)) * (unit / 1080);
  const deltaDist =
    Math.max(0.05, Math.min(0.6, Number(p.topographicDeltaDist ?? 0.18))) * unit;
  const flowDeg = Number(p.topographicFlowAngle ?? 8);
  const lineOpacity = clamp01(Number(p.topographicLineOpacity) || 0.55);
  const baseSw = Math.max(0.2, Number(p.topographicLineWidth) || 1.3) * (unit / 1080);

  const accIn = p.topographicColorInner || "#9ad4c2";
  const accOut = p.topographicColorOuter || "#6d7882";
  const bgTop = p.topographicBgTop || "#05070a";
  const bgBot = p.topographicBgBottom || "#02040a";

  // ---- singularity layout (deterministic offsets from the seed) ----
  const theta0 = (flowDeg * Math.PI) / 180 + (rng() - 0.5) * 0.5;
  const coreX = cx + (rng() - 0.5) * r0 * 0.5;
  const coreY = cy + (rng() - 0.5) * r0 * 0.5;
  // Delta sits roughly below the core (jittered), the classic single-loop layout.
  const dAng = Math.PI / 2 + (rng() - 0.5) * 0.9;
  const deltaX = coreX + Math.cos(dAng) * deltaDist;
  const deltaY = coreY + Math.sin(dAng) * deltaDist;

  let cores;
  let deltas;
  if (pattern === "whorl") {
    const sep = r0 * 0.55;
    cores = [
      [coreX, coreY - sep],
      [coreX, coreY + sep],
    ];
    deltas = [[deltaX, deltaY + sep]];
  } else if (pattern === "arch") {
    cores = [];
    deltas = [];
  } else {
    cores = [[coreX, coreY]];
    deltas = [[deltaX, deltaY]];
  }

  // ---- orientation field (line field, value mod PI) ----
  // Zero-pole model: each core adds +1/2 * arg, each delta -1/2 * arg over a
  // background flow angle. Arch: no singularities; ridges bow over the core.
  function orient(x, y) {
    if (pattern === "arch") {
      const gx = (x - coreX) / unit;
      const gy = (y - coreY) / unit;
      return theta0 + 0.9 * Math.tanh(gx * 4) * Math.exp(-Math.abs(gy) * 2.2);
    }
    let a = theta0;
    for (let i = 0; i < cores.length; i += 1) {
      a += 0.5 * Math.atan2(y - cores[i][1], x - cores[i][0]);
    }
    for (let i = 0; i < deltas.length; i += 1) {
      a -= 0.5 * Math.atan2(y - deltas[i][1], x - deltas[i][0]);
    }
    return a;
  }

  // Stop ridges before they reach the fast-rotating singular points.
  const coreStop = Math.max(r0 * 0.75, ridgeGap * 0.9);
  const deltaStop = Math.max(r0 * 0.32, ridgeGap * 0.6);
  function nearSingular(x, y) {
    for (let i = 0; i < cores.length; i += 1) {
      if (Math.hypot(x - cores[i][0], y - cores[i][1]) < coreStop) return true;
    }
    for (let i = 0; i < deltas.length; i += 1) {
      if (Math.hypot(x - deltas[i][0], y - deltas[i][1]) < deltaStop) return true;
    }
    return false;
  }

  // ---- spatial hash for even ridge spacing (Jobard-Lefer streamlines) ----
  const cell = ridgeGap;
  const gw = Math.max(1, Math.ceil(W / cell) + 3);
  const gh = Math.max(1, Math.ceil(H / cell) + 3);
  const grid = new Array(gw * gh);
  function gIndex(x, y) {
    let gx = Math.floor(x / cell) + 1;
    let gy = Math.floor(y / cell) + 1;
    if (gx < 0) gx = 0;
    else if (gx >= gw) gx = gw - 1;
    if (gy < 0) gy = 0;
    else if (gy >= gh) gy = gh - 1;
    return { gx, gy };
  }
  function addPt(x, y) {
    const { gx, gy } = gIndex(x, y);
    const k = gy * gw + gx;
    (grid[k] || (grid[k] = [])).push(x, y);
  }
  function tooClose(x, y, dmin) {
    const { gx, gy } = gIndex(x, y);
    const d2 = dmin * dmin;
    for (let oy = -1; oy <= 1; oy += 1) {
      const ry = gy + oy;
      if (ry < 0 || ry >= gh) continue;
      for (let ox = -1; ox <= 1; ox += 1) {
        const rx = gx + ox;
        if (rx < 0 || rx >= gw) continue;
        const arr = grid[ry * gw + rx];
        if (!arr) continue;
        for (let i = 0; i < arr.length; i += 2) {
          const ddx = arr[i] - x;
          const ddy = arr[i + 1] - y;
          if (ddx * ddx + ddy * ddy < d2) return true;
        }
      }
    }
    return false;
  }

  // ---- integration ----
  const stepLen = ridgeGap * 0.5;
  const dTest = ridgeGap * 0.6;
  const bound = unit * 0.04;
  const diag = Math.hypot(W, H);
  const maxStepsPerDir = Math.ceil((diag * 1.4) / stepLen);
  let stepBudget = 900000;

  function integrate(sx, sy, sign) {
    const out = [];
    let x = sx;
    let y = sy;
    let pvx = null;
    let pvy = null;
    for (let i = 0; i < maxStepsPerDir; i += 1) {
      if (stepBudget-- <= 0) break;
      let a = orient(x, y);
      let vx = Math.cos(a) * sign;
      let vy = Math.sin(a) * sign;
      if (pvx !== null && vx * pvx + vy * pvy < 0) { vx = -vx; vy = -vy; }
      const mx = x + vx * stepLen * 0.5;
      const my = y + vy * stepLen * 0.5;
      const a2 = orient(mx, my);
      let wx = Math.cos(a2);
      let wy = Math.sin(a2);
      if (wx * vx + wy * vy < 0) { wx = -wx; wy = -wy; }
      const nx = x + wx * stepLen;
      const ny = y + wy * stepLen;
      if (!Number.isFinite(nx) || !Number.isFinite(ny)) break;
      if (nx < -bound || nx > W + bound || ny < -bound || ny > H + bound) break;
      if (nearSingular(nx, ny)) break;
      if (tooClose(nx, ny, dTest)) break;
      out.push(nx, ny);
      pvx = wx;
      pvy = wy;
      x = nx;
      y = ny;
    }
    return out;
  }

  function makeRidge(sx, sy) {
    if (sx < -bound || sx > W + bound || sy < -bound || sy > H + bound) return null;
    if (nearSingular(sx, sy)) return null;
    if (tooClose(sx, sy, ridgeGap * 0.85)) return null;
    const fwd = integrate(sx, sy, 1);
    const bwd = integrate(sx, sy, -1);
    // assemble: reversed backward points, the seed, then forward points
    const pts = [];
    for (let i = bwd.length - 2; i >= 0; i -= 2) pts.push(bwd[i], bwd[i + 1]);
    pts.push(sx, sy);
    for (let i = 0; i < fwd.length; i += 2) pts.push(fwd[i], fwd[i + 1]);
    if (pts.length < 6) return null; // need >= 3 points to be a ridge
    return pts;
  }

  // ---- seed queue: core-relative seed first, then a coarse coverage grid ----
  const queue = [];
  queue.push(
    coreX + Math.cos(theta0 + Math.PI / 2) * coreStop * 1.35,
    coreY + Math.sin(theta0 + Math.PI / 2) * coreStop * 1.35
  );
  const sgap = ridgeGap * 2.3;
  for (let y = sgap * 0.5; y < H; y += sgap) {
    for (let x = sgap * 0.5; x < W; x += sgap) {
      queue.push(
        x + (rng() - 0.5) * sgap * 0.4,
        y + (rng() - 0.5) * sgap * 0.4
      );
    }
  }

  const ridges = [];
  const maxRidges = 1500;
  let qi = 0;
  let guard = 0;
  while (qi < queue.length && ridges.length < maxRidges && guard++ < 600000) {
    const sx = queue[qi];
    const sy = queue[qi + 1];
    qi += 2;
    const pts = makeRidge(sx, sy);
    if (!pts) continue;
    for (let i = 0; i < pts.length; i += 2) addPt(pts[i], pts[i + 1]);
    // spawn perpendicular candidate seeds along the new ridge
    for (let i = 0; i + 3 < pts.length; i += 4) {
      const x = pts[i];
      const y = pts[i + 1];
      const tx = pts[i + 2] - x;
      const ty = pts[i + 3] - y;
      const tl = Math.hypot(tx, ty) || 1;
      const nxv = -ty / tl;
      const nyv = tx / tl;
      queue.push(x + nxv * ridgeGap, y + nyv * ridgeGap);
      queue.push(x - nxv * ridgeGap, y - nyv * ridgeGap);
    }
    ridges.push(pts);
  }

  // ---- color/opacity by distance from core (topographic elevation feel) ----
  const corners = [[0, 0], [W, 0], [0, H], [W, H]];
  let maxD = 1;
  for (let i = 0; i < corners.length; i += 1) {
    const d = Math.hypot(corners[i][0] - coreX, corners[i][1] - coreY);
    if (d > maxD) maxD = d;
  }

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  ];

  parts.push("<defs>");
  parts.push(
    `<linearGradient id="topographic-bg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${bgTop}"/>` +
      `<stop offset="100%" stop-color="${bgBot}"/></linearGradient>`
  );
  parts.push(
    `<radialGradient id="topographic-basin" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${accIn}" stop-opacity="0.18"/>` +
      `<stop offset="60%" stop-color="${accIn}" stop-opacity="0.05"/>` +
      `<stop offset="100%" stop-color="${accIn}" stop-opacity="0"/></radialGradient>`
  );
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");

  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#topographic-bg)"/>`);
  const basinR = Math.max(r0 * 4.5, unit * 0.28);
  parts.push(
    `<circle cx="${coreX.toFixed(1)}" cy="${coreY.toFixed(1)}" r="${basinR.toFixed(1)}" fill="url(#topographic-basin)"/>`
  );

  parts.push(
    `<g id="topographic-ridges" fill="none" stroke-linecap="round" stroke-linejoin="round"${sensorMaskAttr(p)}>`
  );
  for (let r = 0; r < ridges.length; r += 1) {
    const pts = ridges[r];
    const mid = (Math.floor(pts.length / 4)) * 2;
    const dm = Math.hypot(pts[mid] - coreX, pts[mid + 1] - coreY);
    const t = clamp01(dm / maxD);
    const col = mix(accIn, accOut, t);
    const op = lineOpacity * (0.5 + 0.5 * (1 - t * 0.65));
    const sw = baseSw * (0.9 + 0.45 * (1 - t));
    let d = "M" + pts[0].toFixed(1) + " " + pts[1].toFixed(1);
    for (let i = 2; i < pts.length; i += 2) d += "L" + pts[i].toFixed(1) + " " + pts[i + 1].toFixed(1);
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
    topographicPattern: "loop",
    topographicRidgeGap: 10,
    topographicDeltaDist: 0.2,
    topographicFlowAngle: 8,
    topographicLineOpacity: 0.72,
    topographicLineWidth: 1.7,
    topographicColorInner: "#9ad4c2",
    topographicColorOuter: "#6d7882",
    topographicPreset: "graphene",
  },
  colorIds: ["topographicColorInner", "topographicColorOuter"],
  presets: [
    { id: "graphene", name: "Graphene", set: { topographicColorInner: "#9ad4c2", topographicColorOuter: "#6d7882" } },
    { id: "amber", name: "Amber", set: { topographicColorInner: "#d1a24c", topographicColorOuter: "#7c6a4a" } },
    { id: "cyan", name: "Cyan", set: { topographicColorInner: "#47b8c9", topographicColorOuter: "#5f7884" } },
    { id: "violet", name: "Violet", set: { topographicColorInner: "#8f7bdc", topographicColorOuter: "#6b6480" } },
    { id: "rose", name: "Rose", set: { topographicColorInner: "#c7798c", topographicColorOuter: "#806a72" } },
    { id: "mono", name: "Monolith", set: { topographicColorInner: "#cdd6da", topographicColorOuter: "#6b7378" } },
  ],
  inputIds: [
    "topographicPattern",
    "topographicRidgeGap",
    "topographicDeltaDist",
    "topographicFlowAngle",
    "topographicLineOpacity",
    "topographicLineWidth",
    "topographicColorInner",
    "topographicColorOuter",
  ],
  controlsHtml: {
    form:
      '<div class="group-label">Fingerprint</div>' +
      '<label class="field"><span class="field-label">Pattern</span>' +
      '<select id="topographicPattern">' +
      '<option value="loop">Loop</option>' +
      '<option value="whorl">Whorl</option>' +
      '<option value="arch">Arch</option></select></label>' +
      '<label class="field range"><span class="field-label">Ridge gap</span>' +
      '<input id="topographicRidgeGap" type="range" min="6" max="40" step="0.5"></label>' +
      '<label class="field range"><span class="field-label">Delta offset</span>' +
      '<input id="topographicDeltaDist" type="range" min="0.05" max="0.6" step="0.01"></label>' +
      '<label class="field range"><span class="field-label">Flow angle</span>' +
      '<input id="topographicFlowAngle" type="range" min="-90" max="90" step="1"></label>' +
      '<label class="field range"><span class="field-label">Line opacity</span>' +
      '<input id="topographicLineOpacity" type="range" min="0.05" max="1" step="0.01"></label>' +
      '<label class="field range"><span class="field-label">Line width</span>' +
      '<input id="topographicLineWidth" type="range" min="0.4" max="4" step="0.1"></label>',
    color:
      '<div class="group-label">Topographic colors</div>' +
      '<label class="field"><span class="field-label">Preset</span><select id="topographicPreset"></select></label>' +
      '<label class="field color"><span class="field-label">Inner (core)</span>' +
      '<input id="topographicColorInner" type="color"></label>' +
      '<label class="field color"><span class="field-label">Outer (ridges)</span>' +
      '<input id="topographicColorOuter" type="color"></label>',
  },
});
