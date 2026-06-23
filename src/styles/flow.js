/* styles/flow.js — "Flow Field" streamlines through a value-noise vector field.
 * Streamlines are integrated step-by-step (Euler) through valueNoise2D, with the
 * fingerprint sensor acting as an attractor/vortex that bends nearby streams.
 * A warm/cool tint sweeps across the field. Depends on core.js.
 * Deterministic: randomness only via mulberry32(p.seed) and valueNoise2D(p.seed);
 * never Math.random / Date. Same params => byte-identical output. */
"use strict";

function generateFlowSvg(p) {
  const W = p.width;
  const H = p.height;
  const unit = Math.min(W, H);

  // ---- resolved params (with safe, bounded fallbacks) ----
  const streams = Math.max(20, Math.min(2000, Math.round(p.flowStreams ?? 420)));
  const steps = Math.max(4, Math.min(160, Math.round(p.flowLength ?? 64)));
  const stepLen = Math.max(2, (p.flowStep ?? 14)) * (unit / 1080);
  const curlScale = Math.max(0.2, (p.flowCurlScale ?? 2.4));
  const turns = Math.max(0.25, (p.flowTurns ?? 1.5));
  const lineOpacity = Math.max(0.02, Math.min(1, p.flowOpacity ?? 0.32));
  const strokeW = Math.max(0.3, (p.flowStrokeWidth ?? 1.1)) * (unit / 1080);
  const vortex = Math.max(0, Math.min(1, p.flowVortex ?? 0.7));

  const bgTop = p.flowBgTop || p.backgroundTop || "#03050a";
  const bgBottom = p.flowBgBottom || p.backgroundBottom || "#02040a";
  const warm = p.flowWarm || "#d18a5a";
  const cool = p.flowCool || "#5aa6d1";

  // ---- sensor focal geometry ----
  const cx = W * ((p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
  const cy = H * ((p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);
  const r = unit * ((p.fingerprintRadiusPct ?? 10) / 100);
  const calmR = r * 1.25;     // immediate sensor disc kept clear of streamlines
  const influenceR = r * 4.5; // vortex influence radius

  const rand = mulberry32((p.seed | 0) ^ 0x5f0a3c);
  const noise = valueNoise2D((p.seed | 0) ^ 0x10ad);

  // Field cell size in noise-space; larger curlScale => more, tighter cells.
  const fieldDiv = unit / curlScale;

  function fieldAngle(x, y) {
    const n = noise(x / fieldDiv, y / fieldDiv); // [0,1)
    return n * Math.PI * 2 * turns;
  }

  // Per-stream colour: warm/cool blend by horizontal position + slight noise.
  function strokeColor(x0, y0) {
    let t = x0 / W;
    t = clamp01(t * 0.85 + noise(x0 / (fieldDiv * 2), y0 / (fieldDiv * 2)) * 0.3);
    return mix(cool, warm, t);
  }

  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
  parts.push("<defs>");
  parts.push(`<linearGradient id="flowBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`);
  parts.push(`<radialGradient id="flowSensorGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${warm}" stop-opacity="0.10"/><stop offset="70%" stop-color="${cool}" stop-opacity="0.05"/><stop offset="100%" stop-color="${cool}" stop-opacity="0"/></radialGradient>`);
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");
  parts.push(`<rect width="100%" height="100%" fill="url(#flowBg)"/>`);

  parts.push(`<g id="flow-streams" fill="none" stroke-linecap="round"${sensorMaskAttr(p)}>`);

  const margin = -unit * 0.08;
  for (let s = 0; s < streams; s += 1) {
    // Deterministic seed point inside the (slightly expanded) canvas.
    let x = margin + rand() * (W - 2 * margin);
    let y = margin + rand() * (H - 2 * margin);

    const col = strokeColor(x, y);
    // Slight per-stream opacity variation for depth (deterministic).
    const op = (lineOpacity * (0.6 + rand() * 0.6)).toFixed(3);

    const pts = [];
    let started = false;
    for (let i = 0; i < steps; i += 1) {
      const dxs = x - cx;
      const dys = y - cy;
      const dist = Math.hypot(dxs, dys) || 1e-6;
      const inCalm = dist < calmR;

      // Skip plotting inside the calm sensor disc, but keep integrating so the
      // stream resumes cleanly on the far side. Breaking the subpath leaves the
      // immediate disc uncluttered for the real Android sensor UI.
      if (!inCalm) {
        if (!started) { pts.push(`M${x.toFixed(1)} ${y.toFixed(1)}`); started = true; }
        else pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
      } else {
        started = false;
      }

      let ang = fieldAngle(x, y);
      let vx = Math.cos(ang);
      let vy = Math.sin(ang);

      // Vortex: bend the flow tangentially around the sensor near it.
      if (dist < influenceR && vortex > 0) {
        const falloff = 1 - dist / influenceR; // 1 at center -> 0 at edge
        const w = falloff * falloff * vortex;
        const tx = -dys / dist; // CCW tangent
        const ty = dxs / dist;
        vx = vx * (1 - w) + tx * w;
        vy = vy * (1 - w) + ty * w;
        const m = Math.hypot(vx, vy) || 1e-6;
        vx /= m; vy /= m;
      }

      x += vx * stepLen;
      y += vy * stepLen;

      // Stop if we wander far off-canvas (keeps paths bounded and short).
      if (x < margin * 2 || x > W - margin * 2 || y < margin * 2 || y > H - margin * 2) break;
    }

    if (pts.length >= 2) {
      parts.push(`<path d="${pts.join(" ")}" stroke="${col}" stroke-opacity="${op}" stroke-width="${strokeW.toFixed(2)}"/>`);
    }
  }
  parts.push("</g>");

  // ---- sensor focal framing: glow + shared ring/logo ----
  parts.push('<g id="flow-sensor">');
  parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${influenceR.toFixed(1)}" fill="url(#flowSensorGlow)"/>`);
  parts.push("</g>");
  parts.push(sensorRing(p, warm, cool, "circle"));

  parts.push(cornerBrand(p, cool));
  parts.push("</svg>");
  return parts.join("\n");
}

registerStyle({
  id: "flow",
  label: "Flow Field",
  generate: generateFlowSvg,
  defaults: {
    flowStreams: 420,
    flowLength: 64,
    flowStep: 14,
    flowCurlScale: 2.4,
    flowTurns: 1.5,
    flowVortex: 0.7,
    flowOpacity: 0.32,
    flowStrokeWidth: 1.1,
    flowBgTop: "#05070a",
    flowBgBottom: "#0d1318",
    flowWarm: "#77b69e",
    flowCool: "#9ad4c2",
    flowPreset: "graphene-default"
  },
  colorIds: ["flowWarm", "flowCool", "flowBgTop", "flowBgBottom"],
  presets: projectPalettes((p) => ({ flowWarm: p.accent, flowCool: p.accent2, flowBgTop: p.backgroundTop, flowBgBottom: p.backgroundBottom })),
  inputIds: [
    "flowStreams",
    "flowLength",
    "flowStep",
    "flowCurlScale",
    "flowTurns",
    "flowVortex",
    "flowOpacity",
    "flowStrokeWidth",
    "flowBgTop",
    "flowBgBottom",
    "flowWarm",
    "flowCool"
  ],
  controlsHtml: {
    setup: '<label class="field"><span class="field-label">Palette</span><select id="flowPreset"></select></label>',
    form: `
      <div class="group-label">Flow field</div>
      <label class="field range"><span class="field-label">Stream count</span><input id="flowStreams" type="range" min="60" max="900" step="10"></label>
      <label class="field range"><span class="field-label">Line length</span><input id="flowLength" type="range" min="8" max="140" step="2"></label>
      <label class="field range"><span class="field-label">Step length</span><input id="flowStep" type="range" min="4" max="40" step="1"></label>
      <label class="field range"><span class="field-label">Curl scale</span><input id="flowCurlScale" type="range" min="0.5" max="8" step="0.1"></label>
      <label class="field range"><span class="field-label">Field turns</span><input id="flowTurns" type="range" min="0.25" max="4" step="0.05"></label>
      <label class="field range"><span class="field-label">Vortex strength</span><input id="flowVortex" type="range" min="0" max="1" step="0.05"></label>
      <label class="field range"><span class="field-label">Line opacity</span><input id="flowOpacity" type="range" min="0.05" max="0.8" step="0.01"></label>
      <label class="field range"><span class="field-label">Stroke width</span><input id="flowStrokeWidth" type="range" min="0.4" max="3" step="0.1"></label>
    `,
    color: `
      <div class="group-label">Flow colors</div>
      <label class="field color"><span class="field-label">Warm tint</span><input id="flowWarm" type="color"></label>
      <label class="field color"><span class="field-label">Cool tint</span><input id="flowCool" type="color"></label>
      <label class="field color"><span class="field-label">Background top</span><input id="flowBgTop" type="color"></label>
      <label class="field color"><span class="field-label">Background bottom</span><input id="flowBgBottom" type="color"></label>
    `
  }
});