/* styles/fractal.js — recursive Sierpinski-triangle subdivision centered on the
 * sensor. Depends on core.js (mulberry32, clamp01, mix, scaleColor, hexagon).
 * Self-registers via registerStyle. Deterministic: all randomness from
 * mulberry32(p.seed). A single up-pointing triangle is recursively divided into
 * three corner sub-triangles (the classic Sierpinski "hole" pattern); each leaf
 * is drawn as a thin accent-tinted stroked triangle whose color and opacity
 * interpolate from fractalColorInner (near the sensor) to fractalColorOuter
 * (toward the rim). Seed-driven jitter perturbs each subdivision's midpoints so
 * a different p.seed visibly changes the figure. Element count is hard-capped:
 * depth d yields 3^d leaf triangles, clamped to depth<=7 (3^7 = 2187 < 4000). */
"use strict";

(function () {
  // 3^d, the leaf-triangle count at recursion depth d.
  function leafCount(d) {
    let n = 1;
    for (let i = 0; i < d; i += 1) n *= 3;
    return n;
  }

  // Largest depth whose leaf count (plus a small fixed overhead) stays under the
  // element budget. 3^7 = 2187, 3^8 = 6561 — so 7 is the hard ceiling.
  function depthForBudget(requested) {
    let d = Math.max(1, Math.min(7, Math.round(requested)));
    while (d > 1 && leafCount(d) > 3600) d -= 1;
    return d;
  }

  function generateFractalSvg(p) {
    const W = Math.max(1, Math.round(p.width));
    const H = Math.max(1, Math.round(p.height));
    const unit = Math.min(W, H);

    // ----- params (bounded fallbacks). num() coerces and falls back when the
    // value is missing/NaN so a bad input never leaks NaN into the SVG. -----
    function num(v, d) {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    }
    const depth = depthForBudget(num(p.fractalDepth, 6));
    const scale = Math.max(0.3, Math.min(1.6, num(p.fractalScale, 0.82))); // 0.3..1.6
    const jitter = clamp01(num(p.fractalJitter, 0.35));
    const lineWidth = Math.max(0.3, num(p.fractalLineWidth, 1.1));
    const opacity = clamp01(num(p.fractalOpacity, 0.8));

    const colorInner = p.fractalColorInner || "#bde7d6";
    const colorOuter = p.fractalColorOuter || "#3c6f7f";
    const bgTop = p.fractalBgTop || "#02040a";
    const bgBottom = p.fractalBgBottom || "#070b12";

    // ----- sensor focal point (the figure is composed around this) -----
    const cx = W * ((p.fingerprintXPct ?? 50) / 100);
    const cy = H * ((p.fingerprintYPct ?? 72.5) / 100);

    const rand = mulberry32((p.seed >>> 0) || 1);

    // Overall figure size: an equilateral triangle inscribed roughly around the
    // sensor. `scale` (0..1.6) maps to a fraction of the smaller canvas dim.
    const side = unit * 0.78 * (scale / 1.6 + 0.25);
    const tHeight = (side * Math.sqrt(3)) / 2;

    // Up-pointing equilateral triangle centered on (cx, cy): apex above the
    // sensor, base below it, so the recursive structure radiates around the void.
    const apex = [cx, cy - tHeight * 0.62];
    const baseL = [cx - side / 2, cy + tHeight * 0.38];
    const baseR = [cx + side / 2, cy + tHeight * 0.38];

    // Distance scale for the inner->outer color/opacity gradient: a leaf at the
    // sensor reads "inner", a leaf at the figure's extent reads "outer".
    const maxRad = tHeight || 1;

    const tris = []; // collected leaf triangles: { pts:[[x,y]x3], t:0..1 }

    // Seeded jittered midpoint between a and b. `amt` is the max fractional
    // displacement (perpendicular-ish) applied via two rand() draws so the
    // stream stays stable across the whole recursion.
    function mid(a, b, seg) {
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const amt = jitter * seg * 0.18;
      const jx = (rand() - 0.5) * amt;
      const jy = (rand() - 0.5) * amt;
      return [mx + jx, my + jy];
    }

    // Recursive Sierpinski subdivision. At each level the triangle (a,b,c) is
    // split into three corner sub-triangles around the (removed) center one.
    // The current edge length `seg` shrinks each level, scaling the jitter.
    function subdivide(a, b, c, level, seg) {
      if (level <= 0) {
        const gx = (a[0] + b[0] + c[0]) / 3;
        const gy = (a[1] + b[1] + c[1]) / 3;
        const dx = gx - cx;
        const dy = gy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = clamp01(dist / maxRad); // 0 at sensor -> 1 at rim
        tris.push({ pts: [a, b, c], t });
        return;
      }
      const ab = mid(a, b, seg);
      const bc = mid(b, c, seg);
      const ca = mid(c, a, seg);
      const next = seg / 2;
      subdivide(a, ab, ca, level - 1, next);
      subdivide(ab, b, bc, level - 1, next);
      subdivide(ca, bc, c, level - 1, next);
    }

    subdivide(apex, baseL, baseR, depth, side);

    // ----- SVG assembly -----
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    ];
    parts.push("<defs>");
    parts.push(
      `<linearGradient id="fractal-bg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${bgTop}"/>` +
      `<stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
    );
    parts.push(
      `<radialGradient id="fractal-glow" gradientUnits="userSpaceOnUse" ` +
      `cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(maxRad * 1.2).toFixed(1)}">` +
      `<stop offset="0%" stop-color="${colorInner}" stop-opacity="${(0.16 * opacity).toFixed(3)}"/>` +
      `<stop offset="100%" stop-color="${colorInner}" stop-opacity="0"/></radialGradient>`
    );
    parts.push(sensorMaskDef(p));
    parts.push("</defs>");
    parts.push(`<rect width="${W}" height="${H}" fill="url(#fractal-bg)"/>`);

    // Soft inner glow behind the structure, centered on the sensor.
    parts.push(
      `<circle id="fractal-glow-disc" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" ` +
      `r="${(maxRad * 1.2).toFixed(1)}" fill="url(#fractal-glow)"/>`
    );

    // The recursive figure is masked so the sensor disc clears with a soft rim.
    parts.push(`<g id="fractal-tris" fill="none" stroke-linejoin="round"${sensorMaskAttr(p)}>`);
    for (let i = 0; i < tris.length; i += 1) {
      const tr = tris[i];
      // inner->outer gradient on color + opacity; leaves near the rim are fainter.
      const col = mix(colorInner, colorOuter, tr.t);
      const op = (opacity * (0.95 - 0.45 * tr.t)).toFixed(3);
      const sw = (lineWidth * (1.0 - 0.35 * tr.t)).toFixed(2);
      const pts = tr.pts
        .map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`)
        .join(" ");
      parts.push(
        `<polygon points="${pts}" stroke="${col}" stroke-opacity="${op}" stroke-width="${sw}"/>`
      );
    }
    parts.push("</g>"); // /fractal-tris (masked)

    // Sensor frame: a hex ring fits the triangular language.
    parts.push(sensorRing(p, colorInner, colorOuter, "hex"));

    parts.push(cornerBrand(p, colorInner));
    parts.push("</svg>");
    return parts.join("\n");
  }

  registerStyle({
    id: "fractal",
    label: "Fractal",
    generate: generateFractalSvg,
    defaults: {
      fractalDepth: 6,
      fractalScale: 0.82,
      fractalJitter: 0.35,
      fractalLineWidth: 1.1,
      fractalOpacity: 0.8,
      fractalColorInner: "#bde7d6",
      fractalColorOuter: "#3c6f7f",
      fractalBgTop: "#02040a",
      fractalBgBottom: "#070b12",
      fractalPreset: "graphene"
    },
    colorIds: [
      "fractalColorInner",
      "fractalColorOuter",
      "fractalBgTop",
      "fractalBgBottom"
    ],
    presets: [
      { id: "graphene", name: "Graphene", set: { fractalColorInner: "#bde7d6", fractalColorOuter: "#3c6f7f", fractalBgTop: "#02040a", fractalBgBottom: "#070b12" } },
      { id: "emerald", name: "Emerald", set: { fractalColorInner: "#bdf0cf", fractalColorOuter: "#357a55", fractalBgTop: "#030906", fractalBgBottom: "#06110b" } },
      { id: "cyan", name: "Cyan", set: { fractalColorInner: "#c3f3f0", fractalColorOuter: "#2f7e88", fractalBgTop: "#02080a", fractalBgBottom: "#061115" } },
      { id: "azure", name: "Azure", set: { fractalColorInner: "#c6e6fb", fractalColorOuter: "#356a96", fractalBgTop: "#02060c", fractalBgBottom: "#060f1a" } },
      { id: "indigo", name: "Indigo", set: { fractalColorInner: "#cdcffb", fractalColorOuter: "#414a93", fractalBgTop: "#04050c", fractalBgBottom: "#0a0b1a" } },
      { id: "violet", name: "Violet", set: { fractalColorInner: "#dcc8f4", fractalColorOuter: "#5b3f8a", fractalBgTop: "#06040c", fractalBgBottom: "#0d0a1a" } },
      { id: "amber", name: "Amber", set: { fractalColorInner: "#f0dcb3", fractalColorOuter: "#9a6f33", fractalBgTop: "#0a0703", fractalBgBottom: "#16100a" } },
      { id: "rose", name: "Rose", set: { fractalColorInner: "#f3cdd9", fractalColorOuter: "#9a4f5f", fractalBgTop: "#0a0405", fractalBgBottom: "#16090d" } },
      { id: "crimson", name: "Crimson", set: { fractalColorInner: "#f0c2c4", fractalColorOuter: "#963c3c", fractalBgTop: "#0a0303", fractalBgBottom: "#160808" } },
      { id: "ember", name: "Ember", set: { fractalColorInner: "#f1d3c2", fractalColorOuter: "#a05a30", fractalBgTop: "#0a0503", fractalBgBottom: "#160d08" } },
      { id: "lime", name: "Lime", set: { fractalColorInner: "#dbeec1", fractalColorOuter: "#6b8a3c", fractalBgTop: "#070903", fractalBgBottom: "#0e1207" } },
      { id: "ice", name: "Ice", set: { fractalColorInner: "#dbe7ec", fractalColorOuter: "#5a7d8e", fractalBgTop: "#05080a", fractalBgBottom: "#0b1115" } },
      { id: "mono", name: "Monolith", set: { fractalColorInner: "#d8d8d8", fractalColorOuter: "#5a5a5a", fractalBgTop: "#070707", fractalBgBottom: "#101010" } }
    ],
    inputIds: [
      "fractalDepth",
      "fractalScale",
      "fractalJitter",
      "fractalLineWidth",
      "fractalOpacity",
      "fractalColorInner",
      "fractalColorOuter",
      "fractalBgTop",
      "fractalBgBottom"
    ],
    controlsHtml: {
      setup:
        '<label class="field"><span class="field-label">Palette</span><select id="fractalPreset"></select></label>',
      form:
        '<div class="group-label">Recursion</div>' +
        '<label class="field range"><span class="field-label">Depth</span>' +
        '<input id="fractalDepth" type="range" min="2" max="7" step="1"></label>' +
        '<label class="field range"><span class="field-label">Scale</span>' +
        '<input id="fractalScale" type="range" min="0.3" max="1.6" step="0.01"></label>' +
        '<label class="field range"><span class="field-label">Jitter</span>' +
        '<input id="fractalJitter" type="range" min="0" max="1" step="0.01"></label>' +
        '<div class="group-label">Stroke</div>' +
        '<label class="field range"><span class="field-label">Line width</span>' +
        '<input id="fractalLineWidth" type="range" min="0.3" max="2.5" step="0.05"></label>' +
        '<label class="field range"><span class="field-label">Opacity</span>' +
        '<input id="fractalOpacity" type="range" min="0" max="1" step="0.01"></label>',
      color:
        '<div class="group-label">Fractal colors</div>' +
        '<label class="field color"><span class="field-label">Inner</span>' +
        '<input id="fractalColorInner" type="color"></label>' +
        '<label class="field color"><span class="field-label">Outer</span>' +
        '<input id="fractalColorOuter" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background top</span>' +
        '<input id="fractalBgTop" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background bottom</span>' +
        '<input id="fractalBgBottom" type="color"></label>'
    }
  });
})();
