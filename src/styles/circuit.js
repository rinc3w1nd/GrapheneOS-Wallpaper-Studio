"use strict";

/* styles/circuit.js — "Circuit": PCB traces routed on a grid with H/V runs and
 * 45-degree elbows, round pads/vias, and a central chip pad framing the
 * fingerprint sensor. Depends on core.js. Deterministic: randomness only via
 * mulberry32(p.seed). OLED-dark background; thin accent-tinted strokes. */

function generateCircuitSvg(p) {
  const W = p.width;
  const H = p.height;

  const bgTop = p.circuitBgTop || "#04070a";
  const bgBottom = p.circuitBgBottom || "#010305";
  const traceColor = p.circuitTraceColor || "#4fb8c9";
  const traceColor2 = p.circuitTraceColor2 || "#b6f2ff";
  const padColor = p.circuitPadColor || "#f0c860";

  const traceOpacity = clamp01(p.circuitTraceOpacity ?? 0.55);
  const padOpacity = clamp01(p.circuitPadOpacity ?? 0.8);
  const pitch = Math.max(22, Number(p.circuitGridPitch) || 52);
  const density = clamp01(p.circuitTraceDensity ?? 0.55);
  const viaFreq = clamp01(p.circuitViaFrequency ?? 0.4);

  const g = sensorGeom(p);
  const cx = g.cx;
  const cy = g.cy;
  const r = g.r;

  const rand = mulberry32((p.seed >>> 0) ^ 0x9e3779b9);

  const cols = Math.max(3, Math.floor(W / pitch));
  const rows = Math.max(3, Math.floor(H / pitch));
  const ox = (W - cols * pitch) / 2 + pitch / 2;
  const oy = (H - rows * pitch) / 2 + pitch / 2;
  const gx = (c) => ox + c * pitch;
  const gy = (rw) => oy + rw * pitch;

  const sw = Math.max(1.1, pitch * 0.045);
  const swBus = Math.max(1.7, pitch * 0.072);
  const viaR = Math.max(2.4, pitch * 0.12);
  const elbow = pitch * 0.34;

  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
  parts.push("<defs>");
  parts.push(`<linearGradient id="circuitBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`);
  parts.push(`<radialGradient id="circuitGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${traceColor2}" stop-opacity="0.22"/><stop offset="100%" stop-color="${traceColor2}" stop-opacity="0"/></radialGradient>`);
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");
  parts.push(`<rect width="100%" height="100%" fill="url(#circuitBg)"/>`);
  parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 3.2).toFixed(1)}" fill="url(#circuitGlow)"/>`);

  // Everything structural is masked so the sensor disc stays clean.
  parts.push(`<g id="circuit-board"${sensorMaskAttr(p)}>`);

  // Faint substrate dot grid.
  parts.push('<g id="circuit-grid">');
  for (let rw = 0; rw < rows; rw += 1) {
    for (let c = 0; c < cols; c += 1) {
      parts.push(`<circle cx="${gx(c).toFixed(1)}" cy="${gy(rw).toFixed(1)}" r="${(viaR * 0.18).toFixed(1)}" fill="${padColor}" fill-opacity="0.10"/>`);
    }
  }
  parts.push("</g>");

  // One straight run (H or V) with at most one 45-degree jog, ending in pads.
  // Orderly, PCB-like — no chaotic walks.
  function busTrace(c0, rw0) {
    const horiz = rand() < 0.5;
    const dir = rand() < 0.5 ? 1 : -1;
    const run = 3 + Math.floor(rand() * 7); // 3..9 cells
    const jogAt = 1 + Math.floor(rand() * Math.max(1, run - 1));
    const jogDir = rand() < 0.5 ? 1 : -1;
    const pts = [[c0, rw0]];
    let c = c0;
    let rw = rw0;
    let jogged = false;
    for (let s = 1; s <= run; s += 1) {
      if (horiz) c += dir; else rw += dir;
      if (!jogged && s === jogAt && rand() < 0.7) {
        if (horiz) rw += jogDir; else c += jogDir;
        jogged = true;
      }
      c = Math.max(0, Math.min(cols - 1, c));
      rw = Math.max(0, Math.min(rows - 1, rw));
      const last = pts[pts.length - 1];
      if (c !== last[0] || rw !== last[1]) pts.push([c, rw]);
    }
    return pts.length >= 2 ? pts : null;
  }

  function elbowPath(cells) {
    const pix = cells.map(([c, rw]) => [gx(c), gy(rw)]);
    let d = `M${pix[0][0].toFixed(1)} ${pix[0][1].toFixed(1)}`;
    for (let i = 1; i < pix.length - 1; i += 1) {
      const cur = pix[i];
      const inDx = Math.sign(cur[0] - pix[i - 1][0]);
      const inDy = Math.sign(cur[1] - pix[i - 1][1]);
      const outDx = Math.sign(pix[i + 1][0] - cur[0]);
      const outDy = Math.sign(pix[i + 1][1] - cur[1]);
      d += ` L${(cur[0] - inDx * elbow).toFixed(1)} ${(cur[1] - inDy * elbow).toFixed(1)}`;
      d += ` L${(cur[0] + outDx * elbow).toFixed(1)} ${(cur[1] + outDy * elbow).toFixed(1)}`;
    }
    const e = pix[pix.length - 1];
    d += ` L${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
    return { d, start: pix[0], end: e };
  }

  parts.push('<g id="circuit-traces" fill="none" stroke-linecap="round" stroke-linejoin="round">');
  // Dense PCB: trace count scales hard with the density slider (default high).
  const traceCount = Math.min(1500, Math.floor((cols + rows) * density * 8));
  const padPts = [];
  for (let i = 0; i < traceCount; i += 1) {
    const cells = busTrace(Math.floor(rand() * cols), Math.floor(rand() * rows));
    if (!cells) continue;
    const path = elbowPath(cells);
    const bus = rand() < 0.22;
    parts.push(`<path d="${path.d}" stroke="${bus ? traceColor2 : traceColor}" stroke-opacity="${(traceOpacity * (bus ? 1 : 0.8)).toFixed(3)}" stroke-width="${(bus ? swBus : sw).toFixed(2)}"/>`);
    if (rand() < viaFreq) padPts.push(path.end);
    if (rand() < viaFreq * 0.6) padPts.push(path.start);
  }
  parts.push("</g>");

  // Pads / vias at trace ends.
  parts.push('<g id="circuit-pads">');
  const seen = new Set();
  for (let i = 0; i < padPts.length; i += 1) {
    const x = padPts[i][0];
    const y = padPts[i][1];
    const key = x.toFixed(0) + "," + y.toFixed(0);
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${viaR.toFixed(1)}" fill="none" stroke="${padColor}" stroke-opacity="${padOpacity.toFixed(3)}" stroke-width="${Math.max(1, viaR * 0.34).toFixed(2)}"/>`);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(viaR * 0.34).toFixed(1)}" fill="${padColor}" fill-opacity="${padOpacity.toFixed(3)}"/>`);
  }
  parts.push("</g>");

  // Chip fan-out: short pins radiating from the sensor ring to nearby pads.
  if (g.on) {
    parts.push('<g id="circuit-chip" fill="none" stroke-linecap="round">');
    const pins = 12;
    for (let i = 0; i < pins; i += 1) {
      const a = (Math.PI * 2 * i) / pins + Math.PI / pins;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const x1 = cx + ca * r * 1.04;
      const y1 = cy + sa * r * 1.04;
      const x2 = cx + ca * (r * 1.04 + pitch * (0.7 + rand() * 0.8));
      const y2 = cy + sa * (r * 1.04 + pitch * (0.7 + rand() * 0.8));
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${traceColor2}" stroke-opacity="${(traceOpacity * 0.9).toFixed(3)}" stroke-width="${sw.toFixed(2)}"/>`);
      parts.push(`<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${(viaR * 0.6).toFixed(1)}" fill="${padColor}" fill-opacity="${padOpacity.toFixed(3)}"/>`);
    }
    parts.push("</g>");
  }

  parts.push("</g>"); // circuit-board

  parts.push(sensorRing(p, padColor, traceColor2, "hex"));
  parts.push(cornerBrand(p, padColor));
  parts.push("</svg>");
  return parts.join("\n");
}

registerStyle({
  id: "circuit",
  label: "Circuit",
  generate: generateCircuitSvg,
  defaults: {
    circuitGridPitch: 44,
    circuitTraceDensity: 0.85,
    circuitViaFrequency: 0.35,
    circuitTraceOpacity: 0.5,
    circuitPadOpacity: 0.7,
    circuitBgTop: "#04070a",
    circuitBgBottom: "#010305",
    circuitTraceColor: "#4fb8c9",
    circuitTraceColor2: "#b6f2ff",
    circuitPadColor: "#f0c860",
    circuitPreset: "cyan",
  },
  colorIds: ["circuitTraceColor", "circuitTraceColor2", "circuitPadColor", "circuitBgTop", "circuitBgBottom"],
  presets: [
    { id: "graphene", name: "Graphene", set: { circuitTraceColor: "#61b8a9", circuitTraceColor2: "#c4dfda", circuitPadColor: "#f0c860", circuitBgTop: "#060c0b", circuitBgBottom: "#030606" } },
    { id: "emerald", name: "Emerald", set: { circuitTraceColor: "#53c58c", circuitTraceColor2: "#bfe3d1", circuitPadColor: "#f0c860", circuitBgTop: "#050c09", circuitBgBottom: "#030605" } },
    { id: "lime", name: "Lime", set: { circuitTraceColor: "#89c059", circuitTraceColor2: "#d0e1c1", circuitPadColor: "#f0c860", circuitBgTop: "#090c06", circuitBgBottom: "#040603" } },
    { id: "amber", name: "Amber", set: { circuitTraceColor: "#ce994a", circuitTraceColor2: "#e6d5bd", circuitPadColor: "#5fd0e0", circuitBgTop: "#0d0a05", circuitBgBottom: "#070502" } },
    { id: "gold", name: "Gold", set: { circuitTraceColor: "#cab14e", circuitTraceColor2: "#e4ddbe", circuitPadColor: "#5fd0e0", circuitBgTop: "#0d0b05", circuitBgBottom: "#070603" } },
    { id: "ember", name: "Ember", set: { circuitTraceColor: "#cc6e4c", circuitTraceColor2: "#e5c8bd", circuitPadColor: "#5fd0e0", circuitBgTop: "#0d0705", circuitBgBottom: "#070402" } },
    { id: "crimson", name: "Crimson", set: { circuitTraceColor: "#c55363", circuitTraceColor2: "#e3bfc4", circuitPadColor: "#5fd0e0", circuitBgTop: "#0c0506", circuitBgBottom: "#060303" } },
    { id: "rose", name: "Rose", set: { circuitTraceColor: "#bc5d86", circuitTraceColor2: "#e0c2cf", circuitPadColor: "#5fd0e0", circuitBgTop: "#0c0609", circuitBgBottom: "#060304" } },
    { id: "magenta", name: "Magenta", set: { circuitTraceColor: "#c059ab", circuitTraceColor2: "#e1c1db", circuitPadColor: "#f0c860", circuitBgTop: "#0c060b", circuitBgBottom: "#060306" } },
    { id: "amethyst", name: "Amethyst", set: { circuitTraceColor: "#a55ebb", circuitTraceColor2: "#d9c3e0", circuitPadColor: "#f0c860", circuitBgTop: "#0a060c", circuitBgBottom: "#050306" } },
    { id: "violet", name: "Violet", set: { circuitTraceColor: "#7f5bbe", circuitTraceColor2: "#cdc2e1", circuitPadColor: "#f0c860", circuitBgTop: "#08060c", circuitBgBottom: "#040306" } },
    { id: "indigo", name: "Indigo", set: { circuitTraceColor: "#595fc0", circuitTraceColor2: "#c1c3e1", circuitPadColor: "#f0c860", circuitBgTop: "#06060c", circuitBgBottom: "#030306" } },
    { id: "cobalt", name: "Cobalt", set: { circuitTraceColor: "#4c77cc", circuitTraceColor2: "#bdcae5", circuitPadColor: "#f0c860", circuitBgTop: "#05080d", circuitBgBottom: "#020407" } },
    { id: "azure", name: "Azure", set: { circuitTraceColor: "#4c9dcc", circuitTraceColor2: "#bdd6e5", circuitPadColor: "#f0c860", circuitBgTop: "#050a0d", circuitBgBottom: "#020507" } },
    { id: "cyan", name: "Cyan", set: { circuitTraceColor: "#4fb8c9", circuitTraceColor2: "#b6f2ff", circuitPadColor: "#f0c860", circuitBgTop: "#04070a", circuitBgBottom: "#010305" } },
    { id: "ice", name: "Ice", set: { circuitTraceColor: "#7695a3", circuitTraceColor2: "#cad4d8", circuitPadColor: "#f0c860", circuitBgTop: "#08090a", circuitBgBottom: "#040505" } },
    { id: "slate", name: "Slate", set: { circuitTraceColor: "#808b99", circuitTraceColor2: "#cdd1d5", circuitPadColor: "#f0c860", circuitBgTop: "#08090a", circuitBgBottom: "#040505" } },
    { id: "mono", name: "Monolith", set: { circuitTraceColor: "#8c8c8c", circuitTraceColor2: "#d1d1d1", circuitPadColor: "#5fd0e0", circuitBgTop: "#090909", circuitBgBottom: "#050505" } },
  ],
  inputIds: [
    "circuitGridPitch",
    "circuitTraceDensity",
    "circuitViaFrequency",
    "circuitTraceOpacity",
    "circuitPadOpacity",
    "circuitBgTop",
    "circuitBgBottom",
    "circuitTraceColor",
    "circuitTraceColor2",
    "circuitPadColor",
  ],
  controlsHtml: {
    setup:
      '<label class="field"><span class="field-label">Palette</span><select id="circuitPreset"></select></label>',
    form:
      '<div class="group-label">Circuit</div>' +
      '<label class="field range"><span class="field-label">Grid pitch</span><input id="circuitGridPitch" type="range" min="24" max="80" step="1"></label>' +
      '<label class="field range"><span class="field-label">Trace density</span><input id="circuitTraceDensity" type="range" min="0" max="1" step="0.01"></label>' +
      '<label class="field range"><span class="field-label">Via frequency</span><input id="circuitViaFrequency" type="range" min="0" max="1" step="0.01"></label>' +
      '<label class="field range"><span class="field-label">Trace opacity</span><input id="circuitTraceOpacity" type="range" min="0" max="1" step="0.01"></label>' +
      '<label class="field range"><span class="field-label">Pad opacity</span><input id="circuitPadOpacity" type="range" min="0" max="1" step="0.01"></label>',
    color:
      '<div class="group-label">Circuit colors</div>' +
      '<label class="field color"><span class="field-label">Trace</span><input id="circuitTraceColor" type="color"></label>' +
      '<label class="field color"><span class="field-label">Trace highlight</span><input id="circuitTraceColor2" type="color"></label>' +
      '<label class="field color"><span class="field-label">Pad</span><input id="circuitPadColor" type="color"></label>' +
      '<label class="field color"><span class="field-label">Background top</span><input id="circuitBgTop" type="color"></label>' +
      '<label class="field color"><span class="field-label">Background bottom</span><input id="circuitBgBottom" type="color"></label>',
  },
});
