/* styles/aurora.js — "Aurora" vertical aurora-borealis curtains.
 * Several tall, wavy vertical BANDS hang like curtains: each band's horizontal
 * centerline is displaced as a function of y by valueNoise2D(seed), so it ripples.
 * Each curtain is filled with a soft vertical gradient (transparent top ->
 * luminous middle -> transparent bottom) in a green/teal/violet family, layered
 * with screen-blend transparency for an additive glow. Optional faint vertical
 * streak lines run inside each curtain. The curtains drape around the sensor: a
 * calm gap is kept near (cx,cy) and the shared sensor ring frames it.
 * Depends on core.js. Deterministic: randomness only via mulberry32(p.seed) and
 * valueNoise2D(p.seed); never Math.random / Date. Same params => byte-identical. */
"use strict";

function generateAuroraSvg(p) {
  const W = p.width;
  const H = p.height;
  const unit = Math.min(W, H);

  // ---- resolved params (safe, bounded fallbacks) ----
  // num() keeps a legitimate 0 (only falls back when value is missing/NaN), so
  // setting e.g. auroraGlow:0 or auroraWarp:0 genuinely zeroes those layers.
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const bands = Math.max(2, Math.min(14, Math.round(num(p.auroraBands, 7))));
  const warp = Math.max(0, Math.min(1.2, num(p.auroraWarp, 0.34)));          // ripple amplitude (frac of W)
  const warpScale = Math.max(0.4, Math.min(8, num(p.auroraWarpScale, 2.2))); // vertical noise frequency
  const widthFrac = Math.max(0.04, Math.min(0.6, num(p.auroraWidth, 0.17))); // curtain half-width (frac of W)
  const glow = Math.max(0, Math.min(1, num(p.auroraGlow, 0.5)));             // streak density / blur feel
  const baseOpacity = Math.max(0.05, Math.min(1, num(p.auroraOpacity, 0.55)));
  const segments = 40; // vertical resolution of each ribbon (bounded)

  const low = p.auroraLow || "#1f9e6e";
  const mid = p.auroraMid || "#46d6c0";
  const high = p.auroraHigh || "#9a7be0";
  const bgTop = p.auroraBgTop || "#02040a";
  const bgBottom = p.auroraBgBottom || "#080b14";

  // ---- sensor focal geometry ----
  const cx = W * ((p.fingerprintXPct ?? 50) / 100);
  const cy = H * ((p.fingerprintYPct ?? 72.5) / 100);
  const r = unit * ((p.fingerprintRadiusPct ?? 10) / 100);
  const calmR = r * 1.6; // immediate sensor region pushed clear of curtain fills

  const rand = mulberry32((p.seed | 0) ^ 0x4157);
  const noise = valueNoise2D((p.seed | 0) ^ 0x21a3);

  // Per-band deterministic character: hue position, phase, drift, opacity.
  const bandDefs = [];
  for (let b = 0; b < bands; b += 1) {
    bandDefs.push({
      // even horizontal spread across the canvas with a little jitter
      baseX: ((b + 0.5) / bands) * W + (rand() - 0.5) * (W / bands) * 0.5,
      phase: rand() * 1000,                 // noise lane (separates each curtain)
      hue: clamp01(b / Math.max(1, bands - 1) + (rand() - 0.5) * 0.18),
      halfW: widthFrac * W * (0.7 + rand() * 0.7),
      drift: (rand() - 0.5) * 0.6,          // slow left/right lean over height
      op: baseOpacity * (0.6 + rand() * 0.5),
      streaks: Math.round(2 + rand() * 4),  // faint inner lines
    });
  }

  function bandColor(t) {
    // low -> mid -> high across the band's hue position
    return t < 0.5 ? mix(low, mid, t * 2) : mix(mid, high, (t - 0.5) * 2);
  }

  // centerline x at a given y for band b (rippled by value noise)
  function centerX(band, y) {
    const ny = (y / H) * warpScale;
    const n = noise(band.phase, ny) - 0.5;           // [-0.5, 0.5)
    const lean = (y / H - 0.5) * band.drift * W;     // gentle vertical lean
    return band.baseX + n * warp * W + lean;
  }

  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
  parts.push("<defs>");
  parts.push(`<linearGradient id="auroraBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`);
  // Gaussian blur diffuses the fine strands into soft billows (the milk-in-tea look).
  const blurStd = unit * (0.008 + glow * 0.013);
  parts.push(`<filter id="auroraBlur" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="${blurStd.toFixed(1)}"/></filter>`);
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");
  parts.push(`<rect width="100%" height="100%" fill="url(#auroraBg)"/>`);

  // Wispy curtains: each band is a swarm of thin, translucent, meandering
  // strands of varying length and width (a few wide soft washes, mostly fine
  // filaments), each billowing horizontally on its own value-noise lane. Screen-
  // blended and overlapping, they diffuse like milk curling into tea rather than
  // reading as solid sheets. The shared mask still clears the sensor void.
  parts.push(`<g id="aurora-curtains" filter="url(#auroraBlur)" style="mix-blend-mode:screen"${sensorMaskAttr(p)}>`);

  const strandsPerBand = Math.max(6, Math.min(Math.floor(680 / bands), Math.round(16 + glow * 34)));
  const stepY = H / segments;
  for (let b = 0; b < bands; b += 1) {
    const band = bandDefs[b];
    for (let s = 0; s < strandsPerBand; s += 1) {
      const laneOffset = (rand() - 0.5) * band.halfW * 2;
      const phase2 = rand() * 1000;            // this strand's own billow lane
      const wander = 0.3 + rand() * 0.9;       // billow scale
      const startY = rand() * H;
      const endY = Math.min(H, startY + (0.12 + rand() * 0.5) * H);
      const wide = rand() < 0.24;              // more soft body washes
      const sw = wide
        ? Math.max(3, unit * 0.018 * (0.6 + rand() * 1.0))
        : Math.max(1, unit * 0.0016 * (0.6 + rand() * 2.2));
      const sop = band.op * (wide ? 0.06 + rand() * 0.07 : 0.07 + rand() * 0.16) * (0.5 + 0.7 * glow);
      const col = bandColor(clamp01(band.hue + (rand() - 0.5) * 0.28));
      const seg = [];
      let first = true;
      for (let y = startY; y <= endY + 0.001; y += stepY) {
        const yy = Math.min(endY, y);
        const billow = (noise(phase2, (yy / H) * warpScale * 1.7) - 0.5) * warp * W * 0.7 * wander;
        const x = centerX(band, yy) + laneOffset + billow;
        seg.push(`${first ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)}`);
        first = false;
      }
      if (seg.length < 2) continue;
      parts.push(
        `<path d="${seg.join(" ")}" fill="none" stroke="${col}" ` +
        `stroke-opacity="${sop.toFixed(3)}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round"/>`
      );
    }
  }
  parts.push("</g>");

  // Soft luminous halo behind the sensor so the void feels lit, not empty.
  parts.push('<g id="aurora-sensor">');
  parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(calmR * 1.5).toFixed(1)}" fill="${mid}" fill-opacity="${(0.06 * baseOpacity).toFixed(3)}"/>`);
  parts.push("</g>");

  // Shared sensor framing (ring or official logo) + corner watermark.
  parts.push(sensorRing(p, mid, high, "circle"));
  parts.push(cornerBrand(p, mid));
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
    auroraWidth: 0.17,
    auroraGlow: 0.5,
    auroraOpacity: 0.55,
    auroraLow: "#1f9e6e",
    auroraMid: "#46d6c0",
    auroraHigh: "#9a7be0",
    auroraBgTop: "#02040a",
    auroraBgBottom: "#080b14",
    auroraPreset: "borealis"
  },
  colorIds: ["auroraLow", "auroraMid", "auroraHigh", "auroraBgTop", "auroraBgBottom"],
  presets: [
    { id: "borealis", name: "Borealis", set: { auroraLow: "#1f9e6e", auroraMid: "#46d6c0", auroraHigh: "#9a7be0", auroraBgTop: "#02040a", auroraBgBottom: "#080b14" } },
    { id: "graphene", name: "Graphene", set: { auroraLow: "#2f9e7a", auroraMid: "#77b69e", auroraHigh: "#9ad4c2", auroraBgTop: "#03060a", auroraBgBottom: "#0a0f14" } },
    { id: "emerald", name: "Emerald", set: { auroraLow: "#1d8a4f", auroraMid: "#4fd98e", auroraHigh: "#c1ffd7", auroraBgTop: "#020705", auroraBgBottom: "#06110c" } },
    { id: "cyan", name: "Cyan", set: { auroraLow: "#1789a0", auroraMid: "#47c9d6", auroraHigh: "#b6f2ff", auroraBgTop: "#02060b", auroraBgBottom: "#06111a" } },
    { id: "azure", name: "Azure", set: { auroraLow: "#2a6fd6", auroraMid: "#5aa6e0", auroraHigh: "#c4e5ff", auroraBgTop: "#02050d", auroraBgBottom: "#070d1a" } },
    { id: "indigo", name: "Indigo", set: { auroraLow: "#3a4fc4", auroraMid: "#6e83ff", auroraHigh: "#d3d9ff", auroraBgTop: "#03030c", auroraBgBottom: "#080a18" } },
    { id: "violet", name: "Violet", set: { auroraLow: "#6a3fc4", auroraMid: "#9a7be0", auroraHigh: "#e0c9ff", auroraBgTop: "#05030c", auroraBgBottom: "#0d0a18" } },
    { id: "magenta", name: "Magenta", set: { auroraLow: "#a03c9e", auroraMid: "#d175bf", auroraHigh: "#f0c9ff", auroraBgTop: "#06030a", auroraBgBottom: "#100a16" } },
    { id: "amber", name: "Amber", set: { auroraLow: "#b97a2f", auroraMid: "#d7b84c", auroraHigh: "#ffe2a3", auroraBgTop: "#080603", auroraBgBottom: "#13100a" } },
    { id: "ember", name: "Ember", set: { auroraLow: "#b04a3c", auroraMid: "#e0895a", auroraHigh: "#ffd0a3", auroraBgTop: "#080403", auroraBgBottom: "#130b08" } },
    { id: "rose", name: "Rose", set: { auroraLow: "#b03c63", auroraMid: "#d1759d", auroraHigh: "#ffd0dc", auroraBgTop: "#080306", auroraBgBottom: "#120a0e" } },
    { id: "teal-violet", name: "Teal Violet", set: { auroraLow: "#1f9e8e", auroraMid: "#46c9d6", auroraHigh: "#b97be0", auroraBgTop: "#02060a", auroraBgBottom: "#080d15" } },
    { id: "ice", name: "Ice", set: { auroraLow: "#4c7a9e", auroraMid: "#8fc4e0", auroraHigh: "#e1f4ff", auroraBgTop: "#03060a", auroraBgBottom: "#0a1018" } },
    { id: "mono", name: "Monolith", set: { auroraLow: "#5a6066", auroraMid: "#9aa3ad", auroraHigh: "#eef3f5", auroraBgTop: "#040506", auroraBgBottom: "#0c0e10" } },
  ],
  inputIds: [
    "auroraBands",
    "auroraWarp",
    "auroraWarpScale",
    "auroraWidth",
    "auroraGlow",
    "auroraOpacity",
    "auroraLow",
    "auroraMid",
    "auroraHigh",
    "auroraBgTop",
    "auroraBgBottom"
  ],
  controlsHtml: {
    setup: '<label class="field"><span class="field-label">Palette</span><select id="auroraPreset"></select></label>',
    form: `
      <div class="group-label">Aurora curtains</div>
      <label class="field range"><span class="field-label">Curtains</span><input id="auroraBands" type="range" min="2" max="14" step="1"></label>
      <label class="field range"><span class="field-label">Ripple amount</span><input id="auroraWarp" type="range" min="0" max="0.8" step="0.01"></label>
      <label class="field range"><span class="field-label">Ripple scale</span><input id="auroraWarpScale" type="range" min="0.5" max="6" step="0.1"></label>
      <label class="field range"><span class="field-label">Curtain width</span><input id="auroraWidth" type="range" min="0.05" max="0.45" step="0.01"></label>
      <label class="field range"><span class="field-label">Streak glow</span><input id="auroraGlow" type="range" min="0" max="1" step="0.05"></label>
      <label class="field range"><span class="field-label">Curtain opacity</span><input id="auroraOpacity" type="range" min="0.1" max="1" step="0.01"></label>
    `,
    color: `
      <div class="group-label">Aurora colors</div>
      <label class="field color"><span class="field-label">Low band</span><input id="auroraLow" type="color"></label>
      <label class="field color"><span class="field-label">Mid band</span><input id="auroraMid" type="color"></label>
      <label class="field color"><span class="field-label">High band</span><input id="auroraHigh" type="color"></label>
      <label class="field color"><span class="field-label">Background top</span><input id="auroraBgTop" type="color"></label>
      <label class="field color"><span class="field-label">Background bottom</span><input id="auroraBgBottom" type="color"></label>
    `
  }
});
