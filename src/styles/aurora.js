/* styles/aurora.js — "Aurora": a blooming, gaseous aurora. HYBRID render:
 *  - a volumetric GAS CLOUD is rendered on a canvas via domain-warped fractional
 *    Brownian motion (fBm of valueNoise2D), vertically elongated into curtains,
 *    tinted across a 5-colour ramp (low -> accent1 -> mid -> accent2 -> high) and
 *    screen-composited over the dark background for a real bloom; it is inlined
 *    as one <image> (per the "SVG default, canvas for per-pixel fields" rule).
 *  - bright, high-curl ENERGETIC WHISPS are drawn over it as crisp SVG strands.
 * The curtains drape around the sensor (the shared mask clears the void).
 * Depends on core.js. Deterministic: randomness only via mulberry32(p.seed) and
 * valueNoise2D(p.seed); the canvas is byte-identical per browser for a seed. */
"use strict";

function generateAuroraSvg(p) {
  const W = Math.max(1, Math.round(p.width));
  const H = Math.max(1, Math.round(p.height));
  const unit = Math.min(W, H);

  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const bands = Math.max(2, Math.min(14, Math.round(num(p.auroraBands, 7))));
  const warp = Math.max(0, Math.min(0.9, num(p.auroraWarp, 0.34)));
  const warpScale = Math.max(0.4, Math.min(8, num(p.auroraWarpScale, 2.2)));
  const widthFrac = Math.max(0.04, Math.min(0.6, num(p.auroraWidth, 0.18)));
  const glow = Math.max(0, Math.min(1, num(p.auroraGlow, 0.6)));
  const baseOpacity = Math.max(0.1, Math.min(1, num(p.auroraOpacity, 0.6)));
  const segments = 44;

  const ramp = [
    p.auroraLow || "#1fd03d",
    p.auroraAccent1 || "#31f0e0",
    p.auroraMid || "#5b8ff8",
    p.auroraAccent2 || "#ba8ef7",
    p.auroraHigh || "#f6c1ed",
  ];
  const bgTop = p.auroraBgTop || "#040d06";
  const bgBottom = p.auroraBgBottom || "#020703";

  const cx = W * ((p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
  const cy = H * ((p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);
  const r = unit * ((p.fingerprintRadiusPct ?? 10) / 100);
  const calmR = r * 1.6;

  const rand = mulberry32((p.seed | 0) ^ 0x4157);
  const noise = valueNoise2D((p.seed | 0) ^ 0x21a3);

  // ---------- canvas gas cloud (domain-warped fBm) ----------
  function fbm(x, y) {
    let v = 0, a = 0.5, f = 1;
    for (let o = 0; o < 4; o += 1) { v += a * noise(x * f, y * f); f *= 2; a *= 0.5; }
    return v / 0.9375; // normalize amp sum -> ~[0,1)
  }
  const fieldScale = 1.2 + warpScale * 0.45;
  const warpAmt = 0.4 + warp * 1.4;
  function density(nx, ny) {
    const wx = fbm(nx * 0.6 + 11.2, ny * 0.6 + 3.1) - 0.5;
    const wy = fbm(nx * 0.6 + 5.7, ny * 0.6 + 19.4) - 0.5;
    return fbm(nx + warpAmt * wx, ny + warpAmt * wy);
  }

  const rampRGB = ramp.map(hexToRgb);
  function colAt(t) {
    const seg = clamp01(t) * 4;
    const i = Math.min(3, Math.floor(seg));
    const f = seg - i;
    const a = rampRGB[i], b = rampRGB[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  const rW = Math.max(96, Math.min(W, 460));
  const rH = Math.max(96, Math.round((rW * H) / W));
  const bgTopRGB = hexToRgb(bgTop);
  const bgBotRGB = hexToRgb(bgBottom);
  const intensity = baseOpacity * (1.05 + 0.85 * glow);
  const scx = (cx / W) * rW, scy = (cy / H) * rH;
  const calmRc = (calmR / W) * rW * 1.7;

  const canvas = document.createElement("canvas");
  canvas.width = rW;
  canvas.height = rH;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(rW, rH);
  const data = imgData.data;
  for (let py = 0; py < rH; py += 1) {
    const ny = (py / rW) * fieldScale * 0.5;          // vertical elongation -> curtains
    const bg = [
      bgTopRGB[0] + (bgBotRGB[0] - bgTopRGB[0]) * (py / (rH - 1)),
      bgTopRGB[1] + (bgBotRGB[1] - bgTopRGB[1]) * (py / (rH - 1)),
      bgTopRGB[2] + (bgBotRGB[2] - bgTopRGB[2]) * (py / (rH - 1)),
    ];
    for (let px = 0; px < rW; px += 1) {
      const nx = (px / rW) * fieldScale;
      // sharper contrast -> dramatic bright tendrils over dark gaps
      let b = clamp01((density(nx, ny) - 0.5) / 0.4);
      b = Math.pow(b, 1.85) * intensity;
      const dd = Math.hypot(px - scx, py - scy);
      if (dd < calmRc) b *= clamp01(dd / calmRc);
      // hue across the ramp: wide horizontal sweep + strong noise wobble so the
      // full multi-colour range shows in one frame
      const ht = clamp01(px / rW * 0.95 + (noise(px / rW * 2.2 + 50, py / rH * 1.3 + 80) - 0.5) * 0.75 + (py / rH) * 0.18);
      const tint = colAt(ht);
      const o = (py * rW + px) * 4;
      // screen blend tint*b over the background row
      data[o] = 255 - ((255 - bg[0]) * (255 - tint[0] * b)) / 255;
      data[o + 1] = 255 - ((255 - bg[1]) * (255 - tint[1] * b)) / 255;
      data[o + 2] = 255 - ((255 - bg[2]) * (255 - tint[2] * b)) / 255;
      data[o + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const gasHref = canvas.toDataURL("image/png");

  // ---------- SVG energetic whisps over the gas ----------
  function bandColor(t) {
    const seg = clamp01(t) * (ramp.length - 1);
    const i = Math.min(ramp.length - 2, Math.floor(seg));
    return mix(ramp[i], ramp[i + 1], seg - i);
  }
  const bandDefs = [];
  for (let b = 0; b < bands; b += 1) {
    bandDefs.push({
      baseX: ((b + 0.5) / bands) * W + (rand() - 0.5) * (W / bands) * 0.6,
      phase: rand() * 1000,
      hue: clamp01(b / Math.max(1, bands - 1) + (rand() - 0.5) * 0.22),
      halfW: widthFrac * W * (0.7 + rand() * 0.7),
      drift: (rand() - 0.5) * 0.6,
      op: baseOpacity * (0.7 + rand() * 0.5),
    });
  }
  function centerX(band, y) {
    const n = noise(band.phase, (y / H) * warpScale) - 0.5;
    const lean = (y / H - 0.5) * band.drift * W;
    return band.baseX + n * warp * W + lean;
  }
  const stepY = H / segments;
  function strandPath(band, laneOffset, phase2, startY, endY, curlMul) {
    let d = "";
    let first = true;
    for (let y = startY; y <= endY + 0.001; y += stepY) {
      const yy = Math.min(endY, y);
      const lowF = (noise(phase2, (yy / H) * warpScale * 1.6) - 0.5) * warp * W * 0.85 * curlMul;
      const hiF = (noise(phase2 * 1.7 + 13, (yy / H) * warpScale * 3.6) - 0.5) * warp * W * 0.4 * curlMul;
      const x = centerX(band, yy) + laneOffset + lowF + hiF;
      d += (first ? "M" : "L") + x.toFixed(1) + " " + yy.toFixed(1);
      first = false;
    }
    return d;
  }

  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
  parts.push("<defs>");
  parts.push(`<linearGradient id="auroraBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`);
  const whispStd = unit * (0.003 + glow * 0.006);
  parts.push(`<filter id="auroraWhisp" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="${whispStd.toFixed(1)}"/></filter>`);
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");
  parts.push(`<rect width="100%" height="100%" fill="url(#auroraBg)"/>`);

  parts.push(`<g id="aurora-curtains"${sensorMaskAttr(p)}>`);
  // volumetric gas cloud (canvas raster)
  parts.push(`<image x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" href="${gasHref}"/>`);

  // energetic whisps, screen-blended + lightly blurred, over the gas
  const whispN = Math.max(6, Math.min(Math.floor(640 / bands), Math.round(12 + glow * 22)));
  parts.push(`<g id="aurora-whisps" filter="url(#auroraWhisp)" style="mix-blend-mode:screen">`);
  for (let b = 0; b < bands; b += 1) {
    const band = bandDefs[b];
    for (let s = 0; s < whispN; s += 1) {
      const laneOffset = (rand() - 0.5) * band.halfW * 2;
      const phase2 = rand() * 1000;
      const startY = rand() * H;
      const endY = Math.min(H, startY + (0.12 + rand() * 0.42) * H);
      const bright = rand() < 0.42;
      const sw = bright
        ? Math.max(1.6, unit * 0.004 * (0.7 + rand()))
        : Math.max(0.8, unit * 0.0015 * (0.6 + rand() * 1.8));
      const op = band.op * (bright ? 0.32 + rand() * 0.3 : 0.1 + rand() * 0.16) * (0.7 + 0.6 * glow);
      const col = bandColor(clamp01(band.hue + (rand() - 0.5) * 0.34));
      const d = strandPath(band, laneOffset, phase2, startY, endY, bright ? 1.7 : 1.3);
      parts.push(`<path d="${d}" fill="none" stroke="${col}" stroke-opacity="${op.toFixed(3)}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round"/>`);
    }
  }
  parts.push("</g>");
  parts.push("</g>"); // /aurora-curtains

  parts.push('<g id="aurora-sensor">');
  parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(calmR * 1.7).toFixed(1)}" fill="${ramp[2]}" fill-opacity="${(0.06 * baseOpacity).toFixed(3)}"/>`);
  parts.push("</g>");

  parts.push(sensorRing(p, ramp[2], ramp[4], "circle"));
  parts.push(cornerBrand(p, ramp[2]));
  parts.push("</svg>");
  return parts.join("\n");
}

registerStyle({
  id: "aurora",
  label: "Aurora",
  generate: generateAuroraSvg,
  defaults: {
    auroraBands: 7,
    auroraWarp: 0.34,
    auroraWarpScale: 2.2,
    auroraWidth: 0.18,
    auroraGlow: 0.6,
    auroraOpacity: 0.6,
    auroraLow: "#1fd03d",
    auroraAccent1: "#31f0e0",
    auroraMid: "#5b8ff8",
    auroraAccent2: "#ba8ef7",
    auroraHigh: "#f6c1ed",
    auroraBgTop: "#040d06",
    auroraBgBottom: "#020703",
    auroraPreset: "borealis",
  },
  colorIds: ["auroraLow", "auroraAccent1", "auroraMid", "auroraAccent2", "auroraHigh", "auroraBgTop", "auroraBgBottom"],
  presets: [
    { id: "borealis", name: "Borealis", set: { auroraLow: "#1fd03d", auroraAccent1: "#31f0e0", auroraMid: "#5b8ff8", auroraAccent2: "#ba8ef7", auroraHigh: "#f6c1ed", auroraBgTop: "#040d06", auroraBgBottom: "#020703" } },
    { id: "spectrum", name: "Spectrum", set: { auroraLow: "#69d41c", auroraAccent1: "#2ef49d", auroraMid: "#58a3fb", auroraAccent2: "#c58cf9", auroraHigh: "#f7c0db", auroraBgTop: "#080d04", auroraBgBottom: "#040702" } },
    { id: "emerald", name: "Emerald", set: { auroraLow: "#3dd01f", auroraAccent1: "#31f05d", auroraMid: "#5bf8bd", auroraAccent2: "#8ef5f7", auroraHigh: "#c1e0f6", auroraBgTop: "#060d04", auroraBgBottom: "#030702" } },
    { id: "cyan", name: "Cyan", set: { auroraLow: "#22cea3", auroraAccent1: "#34ccee", auroraMid: "#5d99f6", auroraAccent2: "#938ff6", auroraHigh: "#dac2f5", auroraBgTop: "#040d0b", auroraBgBottom: "#020706" } },
    { id: "azure", name: "Azure", set: { auroraLow: "#24a2cc", auroraAccent1: "#366bec", auroraMid: "#785ff4", auroraAccent2: "#cf91f4", auroraHigh: "#f4c2f0", auroraBgTop: "#040b0d", auroraBgBottom: "#020607" } },
    { id: "violet", name: "Violet", set: { auroraLow: "#3c26ca", auroraAccent1: "#a838e9", auroraMid: "#f261df", auroraAccent2: "#f392b5", auroraHigh: "#f4c9c3", auroraBgTop: "#06040d", auroraBgBottom: "#030207" } },
    { id: "magenta", name: "Magenta", set: { auroraLow: "#aa24cc", auroraAccent1: "#ec36b7", auroraMid: "#f45f81", auroraAccent2: "#f4ab91", auroraHigh: "#f4e8c2", auroraBgTop: "#0c040d", auroraBgBottom: "#060207" } },
    { id: "ember", name: "Ember", set: { auroraLow: "#d71939", auroraAccent1: "#f7592a", auroraMid: "#fbbe58", auroraAccent2: "#f8fb8a", auroraHigh: "#e0f8bf", auroraBgTop: "#0d0406", auroraBgBottom: "#070203" } },
    { id: "gold", name: "Gold", set: { auroraLow: "#d0721f", auroraAccent1: "#f0eb31", auroraMid: "#acf85b", auroraAccent2: "#8ff78e", auroraHigh: "#c1f6db", auroraBgTop: "#0d0904", auroraBgBottom: "#070402" } },
    { id: "rose", name: "Rose", set: { auroraLow: "#c828ba", auroraAccent1: "#e73b94", auroraMid: "#f06374", auroraAccent2: "#f2ad93", auroraHigh: "#f3e3c4", auroraBgTop: "#0d040d", auroraBgBottom: "#070207" } },
    { id: "teal-violet", name: "Teal Violet", set: { auroraLow: "#1fd087", auroraAccent1: "#31c3f0", auroraMid: "#5b6cf8", auroraAccent2: "#c78ef7", auroraHigh: "#f6c1eb", auroraBgTop: "#040d0a", auroraBgBottom: "#020705" } },
    { id: "ice", name: "Ice", set: { auroraLow: "#47a8a5", auroraAccent1: "#5ca6c5", auroraMid: "#7f9ed5", auroraAccent2: "#a6a8df", auroraHigh: "#d6cdea", auroraBgTop: "#060c0c", auroraBgBottom: "#030606" } },
    { id: "mono", name: "Monolith", set: { auroraLow: "#6d7a83", auroraAccent1: "#85919c", auroraMid: "#a0a8b3", auroraAccent2: "#bcc0c9", auroraHigh: "#d8dadf", auroraBgTop: "#08090a", auroraBgBottom: "#040505" } },
  ],
  inputIds: [
    "auroraBands",
    "auroraWarp",
    "auroraWarpScale",
    "auroraWidth",
    "auroraGlow",
    "auroraOpacity",
    "auroraLow",
    "auroraAccent1",
    "auroraMid",
    "auroraAccent2",
    "auroraHigh",
    "auroraBgTop",
    "auroraBgBottom",
  ],
  controlsHtml: {
    setup: '<label class="field"><span class="field-label">Palette</span><select id="auroraPreset"></select></label>',
    form: `
      <div class="group-label">Aurora</div>
      <label class="field range"><span class="field-label">Curtains</span><input id="auroraBands" type="range" min="2" max="14" step="1"></label>
      <label class="field range"><span class="field-label">Curl amount</span><input id="auroraWarp" type="range" min="0" max="0.8" step="0.01"></label>
      <label class="field range"><span class="field-label">Cloud scale</span><input id="auroraWarpScale" type="range" min="0.5" max="6" step="0.1"></label>
      <label class="field range"><span class="field-label">Whisp spread</span><input id="auroraWidth" type="range" min="0.05" max="0.45" step="0.01"></label>
      <label class="field range"><span class="field-label">Bloom / density</span><input id="auroraGlow" type="range" min="0" max="1" step="0.05"></label>
      <label class="field range"><span class="field-label">Opacity</span><input id="auroraOpacity" type="range" min="0.1" max="1" step="0.01"></label>
    `,
    color: `
      <div class="group-label">Aurora colors</div>
      <label class="field color"><span class="field-label">Low</span><input id="auroraLow" type="color"></label>
      <label class="field color"><span class="field-label">Accent 1</span><input id="auroraAccent1" type="color"></label>
      <label class="field color"><span class="field-label">Mid</span><input id="auroraMid" type="color"></label>
      <label class="field color"><span class="field-label">Accent 2</span><input id="auroraAccent2" type="color"></label>
      <label class="field color"><span class="field-label">High</span><input id="auroraHigh" type="color"></label>
      <label class="field color"><span class="field-label">Background top</span><input id="auroraBgTop" type="color"></label>
      <label class="field color"><span class="field-label">Background bottom</span><input id="auroraBgBottom" type="color"></label>
    `,
  },
});
