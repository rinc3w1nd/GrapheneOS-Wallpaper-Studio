/* styles/sonar.js — "Sonar": concentric radial interference waves. Two sets of
 * warped concentric rings — one centered on the composition center, one on an
 * offset point — overlap to produce a moiré interference field, like two stones
 * dropped in still water. Each ring is a single closed <path> sampled over a
 * fixed set of angles, its radius perturbed by smooth value noise so the rings
 * read as organic, warped wavefronts rather than perfect circles. Opacity fades
 * with radius (a glow nearest the sensor, dissolving toward the edges); every
 * Nth ring is an accent ring, slightly brighter and thicker. Rings smaller than
 * the sensor disc are skipped so the sensor stays calm. Depends on core.js.
 * Deterministic: all wobble comes from valueNoise2D(p.seed); never Math.random /
 * Date. Output is byte-identical for identical params. */
"use strict";

// Salt for the wobble noise. (The design's "0x50na12" mnemonic isn't a valid
// hex literal — 'n' is not a hex digit — so we use a fixed valid salt here.)
const SONAR_NOISE_SALT = 0x50a12;
const SONAR_OFFSET_SALT = 0x50bb71;

function generateSonarSvg(p) {
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const W = num(p.width, 1080);
  const H = num(p.height, 2400);
  const unit = Math.min(W, H) || 1;

  const rings = Math.max(20, Math.min(150, Math.round(num(p.sonarRings, 80))));
  const wobble = Math.max(0, Math.min(1, num(p.sonarWobble, 0.4)));
  const offsetF = Math.max(0, Math.min(1, num(p.sonarOffset, 0.5)));
  const accentEvery = Math.max(2, Math.min(14, Math.round(num(p.sonarAccentEvery, 6))));
  const lineOpacity = clamp01(num(p.sonarLineOpacity, 0.5));
  const lineWidth = Math.max(0.3, Math.min(3, num(p.sonarLineWidth, 1))) * (unit / 1080);

  const col = p.sonarColor || p.accent || "#77b69e";
  const accent = p.sonarAccent || p.accent2 || "#9ad4c2";
  const bgTop = p.sonarBgTop || p.backgroundTop || "#05070a";
  const bgBottom = p.sonarBgBottom || p.backgroundBottom || "#0d1318";

  // ART center = composition (decoupled from the sensor); fall back to sensor.
  const cx = W * (num(p.compositionXPct ?? p.fingerprintXPct ?? 50, 50) / 100);
  const cy = H * (num(p.compositionYPct ?? p.fingerprintYPct ?? 72.5, 72.5) / 100);
  const r = unit * (num(p.fingerprintRadiusPct ?? 10, 10) / 100);

  const noise = valueNoise2D((p.seed | 0) ^ SONAR_NOISE_SALT);

  // Two source points: the composition center, and an offset companion. The
  // offset direction is itself seeded so seed changes shift the interference.
  const dirRng = mulberry32((p.seed | 0) ^ SONAR_OFFSET_SALT);
  const ang = dirRng() * Math.PI * 2;
  const offDist = offsetF * unit * 0.18;
  const ox = cx + Math.cos(ang) * offDist;
  const oy = cy + Math.sin(ang) * offDist;

  // Reach to the farthest corner from a center, so rings always span the whole
  // canvas. spacing = maxReach / rings.
  function reach(px, py) {
    return Math.max(
      Math.hypot(px - 0, py - 0),
      Math.hypot(px - W, py - 0),
      Math.hypot(px - 0, py - H),
      Math.hypot(px - W, py - H)
    );
  }

  // Angular sampling: more samples for larger canvases, fixed & bounded.
  const SAMPLES = Math.max(64, Math.min(120, Math.round(unit / 12)));
  const TWO_PI = Math.PI * 2;

  const minR = r * 1.15; // keep the sensor disc calm — skip rings inside this

  // Build one warped, closed ring path centered at (sx,sy) at base radius rad.
  // setId offsets the noise sampling so the two sets warp independently.
  function ringPath(sx, sy, rad, spacing, setId) {
    const amp = wobble * spacing;
    const k = rad / Math.max(spacing, 1e-6); // ring index, drives noise phase
    let d = "";
    for (let s = 0; s <= SAMPLES; s += 1) {
      const a = (s % SAMPLES) * (TWO_PI / SAMPLES);
      // noise coords: around the circle (cos/sin) + the ring index + a per-set
      // shift, scaled so neighbouring rings differ -> organic interference.
      const nx = Math.cos(a) * 1.7 + k * 0.18 + setId * 31.7;
      const ny = Math.sin(a) * 1.7 + k * 0.18 + setId * 53.3;
      const warp = (noise(nx, ny) - 0.5) * 2; // [-1,1)
      const rr = rad + warp * amp;
      const px = sx + Math.cos(a) * rr;
      const py = sy + Math.sin(a) * rr;
      d += (s === 0 ? "M" : "L") + px.toFixed(1) + " " + py.toFixed(1);
    }
    return d + "Z";
  }

  function buildSet(sx, sy, setId) {
    const maxReach = reach(sx, sy) || unit;
    const spacing = maxReach / rings;
    const out = [];
    for (let i = 1; i <= rings; i += 1) {
      const rad = i * spacing;
      if (rad < minR) continue; // sensor disc stays calm
      const d = ringPath(sx, sy, rad, spacing, setId);
      if (d.indexOf("NaN") !== -1) continue; // guard, should never trigger
      // Opacity falls off toward the edges; brightest near the focal center.
      const t = i / rings; // 0..1 outward
      const isAccent = (i % accentEvery) === 0;
      const fade = 0.25 + 0.75 * Math.pow(1 - t, 1.6);
      const op = isAccent
        ? clamp01(lineOpacity * (0.55 + 0.65 * fade) * 1.35)
        : clamp01(lineOpacity * fade);
      if (op < 0.012) continue; // drop invisibles -> keeps element count lean
      const sw = (isAccent ? lineWidth * 1.7 : lineWidth);
      const stroke = isAccent ? accent : col;
      out.push(
        `<path d="${d}" stroke="${stroke}" stroke-opacity="${op.toFixed(3)}" stroke-width="${sw.toFixed(2)}"/>`
      );
    }
    return out;
  }

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  ];
  parts.push("<defs>");
  parts.push(
    `<linearGradient id="sonar-bg" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
  );
  // Focal glow at the composition center: atmosphere + depth under the rings.
  parts.push(
    `<radialGradient id="sonar-glow" gradientUnits="userSpaceOnUse" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(unit * 0.6).toFixed(1)}">` +
    `<stop offset="0%" stop-color="${accent}" stop-opacity="0.16"/>` +
    `<stop offset="42%" stop-color="${col}" stop-opacity="0.06"/>` +
    `<stop offset="100%" stop-color="${col}" stop-opacity="0"/></radialGradient>`
  );
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#sonar-bg)"/>`);
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#sonar-glow)"/>`);

  parts.push(`<g id="sonar-waves" fill="none" stroke-linejoin="round" stroke-linecap="round"${sensorMaskAttr(p)}>`);
  // Two overlapping ring sets -> moiré interference.
  const setA = buildSet(cx, cy, 0);
  const setB = buildSet(ox, oy, 1);
  for (let i = 0; i < setA.length; i += 1) parts.push(setA[i]);
  for (let i = 0; i < setB.length; i += 1) parts.push(setB[i]);
  parts.push("</g>");

  parts.push(sensorRing(p, col, accent, "circle"));
  parts.push(cornerBrand(p, col));
  parts.push("</svg>");
  return parts.join("\n");
}
// No registerStyle: this module only defines its generator. Sonar/Truchet are
// selectable "forms" hosted by the Topographic style (see topographic.js),
// sharing its palette, sensor and composition.
