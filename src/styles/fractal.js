/* styles/fractal.js — "Fractal": an escape-time fractal (z = z^2 + c) centered
 * on the sensor. Default is a Julia set whose constant c is chosen from the
 * seed (so each seed is a different organic figure); a Mandelbrot mode samples
 * c across the plane instead. The exterior near the set boundary is rendered as
 * a field of accent-tinted cells whose color/opacity/size track the smooth
 * escape count (bright near the set -> fading outward), giving the characteristic
 * fractal filigree as bounded vector tiles over OLED black. Depends on core.js.
 * Self-registers via registerStyle. Deterministic: the only randomness is the
 * seed-driven choice of c / view (mulberry32(p.seed)); never Math.random/Date. */
"use strict";

(function () {
  // Hand-picked Julia constants that produce attractive, connected figures.
  const JULIA_CS = [
    [-0.70176, -0.3842],
    [-0.8, 0.156],
    [0.285, 0.01],
    [-0.4, 0.6],
    [0.355, 0.355],
    [-0.74543, 0.11301],
    [-0.123, 0.745],
    [-0.391, -0.587],
    [0.37, 0.1],
    [-0.54, 0.54],
    [0.355534, -0.337292],
    [-0.79, 0.15],
  ];
  // Interesting Mandelbrot views (re, im, span) for the Mandelbrot mode.
  const MANDEL_VIEWS = [
    [-0.5, 0.0, 1.6],
    [-0.745, 0.113, 0.22],
    [-0.16, 1.038, 0.18],
    [0.2515, 0.0, 0.12],
    [-1.25066, 0.02012, 0.06],
    [-0.7463, 0.1102, 0.05],
  ];
  // Phoenix: z_{n+1} = z_n^2 + c + p*z_{n-1}. [cRe, cIm, pRe, pIm], z0 from plane.
  const PHOENIX_CS = [
    [0.5667, 0, -0.5, 0],
    [0.56, -0.5, -0.5, 0],
    [-0.5, 0.5, 0.3, 0],
    [0.4, 0, -0.25, 0],
    [0.5667, 0, -0.45, 0.05],
    [-0.2, 0.35, 0.27, 0],
  ];
  const SHIP_VIEWS = [
    [-0.5, -0.5, 1.7],
    [-1.755, -0.03, 0.06],
    [-1.62, -0.02, 0.12],
    [-0.42, -0.6, 0.45],
  ];
  const TRICORN_VIEWS = [
    [-0.25, 0, 1.9],
    [-0.2, 0.85, 0.5],
    [0.45, 0.6, 0.4],
    [-0.95, 0.55, 0.35],
  ];
  const CELTIC_VIEWS = [
    [-0.8, 0, 1.7],
    [-1.25, 0.02, 0.2],
    [-0.42, 0.66, 0.4],
    [-1.7, 0, 0.18],
  ];

  function generateFractalSvg(p) {
    const W = Math.max(1, Math.round(p.width));
    const H = Math.max(1, Math.round(p.height));
    const unit = Math.min(W, H);

    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const SET_IDS = ["julia", "mandelbrot", "phoenix", "burningship", "tricorn", "celtic"];
    const set = SET_IDS.indexOf(p.fractalSet) >= 0 ? p.fractalSet : "julia";
    const maxIter = Math.max(24, Math.min(160, Math.round(num(p.fractalIterations, 72))));
    const zoom = Math.max(0.4, Math.min(4, num(p.fractalZoom, 1.15)));
    const detail = clamp01(num(p.fractalDetail, 0.7));
    const opacity = clamp01(num(p.fractalOpacity, 0.85));

    const colorInner = p.fractalColorInner || "#bde7d6";
    const colorOuter = p.fractalColorOuter || "#3c6f7f";
    const colorAccent = p.fractalAccent || "#ffd23a";
    const bgTop = p.fractalBgTop || "#02040a";
    const bgBottom = p.fractalBgBottom || "#070b12";

    const cx = W * ((p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
    const cy = H * ((p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);

    const rand = mulberry32((p.seed >>> 0) || 1);

    // ---- complex-plane mapping + recurrence selection (centered on sensor) ----
    // kind: how the iteration is seeded — "julia"/"phoenix" start at the pixel
    // with a fixed c; "map" starts at 0 with c = pixel + view center.
    // iterType: which recurrence step to apply (mandel/ship/tricorn/celtic).
    const half = unit * 0.5;
    const pick = (list) => list[Math.floor(rand() * list.length) % list.length];
    let kind, iterType, juliaRe = 0, juliaIm = 0, phPr = 0, phPi = 0;
    let cenRe = 0, cenIm = 0, viewScale;
    if (set === "julia") {
      kind = "julia"; iterType = "mandel";
      const jc = pick(JULIA_CS);
      juliaRe = jc[0] + (rand() - 0.5) * 0.04;
      juliaIm = jc[1] + (rand() - 0.5) * 0.04;
      viewScale = 1.6 / zoom;
    } else if (set === "phoenix") {
      kind = "phoenix"; iterType = "mandel";
      const pc = pick(PHOENIX_CS);
      juliaRe = pc[0]; juliaIm = pc[1]; phPr = pc[2]; phPi = pc[3];
      viewScale = 1.5 / zoom;
    } else {
      kind = "map";
      iterType = set === "burningship" ? "ship" : set === "tricorn" ? "tricorn" : set === "celtic" ? "celtic" : "mandel";
      const views = set === "burningship" ? SHIP_VIEWS : set === "tricorn" ? TRICORN_VIEWS : set === "celtic" ? CELTIC_VIEWS : MANDEL_VIEWS;
      const mv = pick(views);
      cenRe = mv[0] + (rand() - 0.5) * mv[2] * 0.15; // small seed pan so reseed varies
      cenIm = mv[1] + (rand() - 0.5) * mv[2] * 0.15;
      viewScale = mv[2] / zoom;
    }

    // Smooth escape iteration. step() applies the chosen recurrence; escapeStd
    // covers julia/mandel/ship/tricorn/celtic, escapePhoenix adds the z_{n-1} term.
    const LOG2 = Math.log(2);
    function step(zr, zi, cr, ci) {
      switch (iterType) {
        case "ship": { const a = Math.abs(zr), b = Math.abs(zi); return [a * a - b * b + cr, 2 * a * b + ci]; }
        case "tricorn": return [zr * zr - zi * zi + cr, -2 * zr * zi + ci];
        case "celtic": return [Math.abs(zr * zr - zi * zi) + cr, 2 * zr * zi + ci];
        default: return [zr * zr - zi * zi + cr, 2 * zr * zi + ci]; // mandel / julia
      }
    }
    function escapeStd(zr, zi, cr, ci) {
      let i = 0;
      while (i < maxIter && zr * zr + zi * zi <= 64) { const n = step(zr, zi, cr, ci); zr = n[0]; zi = n[1]; i += 1; }
      if (i >= maxIter) return maxIter;
      return i + 1 - Math.log(Math.log(Math.sqrt(zr * zr + zi * zi))) / LOG2;
    }
    function escapePhoenix(zr, zi, cr, ci) {
      let i = 0, pr = 0, pi = 0;
      while (i < maxIter && zr * zr + zi * zi <= 64) {
        const z2r = zr * zr - zi * zi, z2i = 2 * zr * zi;
        const ppr = phPr * pr - phPi * pi, ppi = phPr * pi + phPi * pr;
        const nr = z2r + cr + ppr, ni = z2i + ci + ppi;
        pr = zr; pi = zi; zr = nr; zi = ni; i += 1;
      }
      if (i >= maxIter) return maxIter;
      return i + 1 - Math.log(Math.log(Math.sqrt(zr * zr + zi * zi))) / LOG2;
    }

    // ---- rasterize the escape-time field as ONE <image> (full smooth detail) ----
    // SVG vector tiles can't capture fine fractal filigree under the element
    // budget, so the field is rendered on a canvas and inlined as a data URI.
    // Deterministic per browser for a given seed; the seed picks the figure.
    const rW = Math.max(96, Math.min(W, Math.round(250 + detail * 250))); // 325..500; upscaled, so smaller raster ~halves the per-pixel loop
    const rH = Math.max(96, Math.round((rW * H) / W));
    const sxx = W / rW, syy = H / rH;
    const innerRGB = hexToRgb(colorInner);
    const outerRGB = hexToRgb(colorOuter);
    const accentRGB = hexToRgb(colorAccent);
    const bgTopRGB = hexToRgb(bgTop);
    const bgBotRGB = hexToRgb(bgBottom);
    const lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

    const canvas = document.createElement("canvas");
    canvas.width = rW;
    canvas.height = rH;
    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(rW, rH);
    const data = imgData.data;
    for (let py = 0; py < rH; py += 1) {
      const vy = (((py + 0.5) * syy - cy) / half) * viewScale;
      const bgRow = lerpC(bgTopRGB, bgBotRGB, py / (rH - 1));
      for (let px = 0; px < rW; px += 1) {
        const vx = (((px + 0.5) * sxx - cx) / half) * viewScale;
        const m = kind === "julia" ? escapeStd(vx, vy, juliaRe, juliaIm)
          : kind === "phoenix" ? escapePhoenix(vx, vy, juliaRe, juliaIm)
          : escapeStd(0, 0, vx + cenRe, vy + cenIm);
        let R, G, B;
        if (m >= maxIter) {                       // inside the set: dark body
          R = bgRow[0] * 0.8; G = bgRow[1] * 0.8; B = bgRow[2] * 0.8;
        } else {
          const t = clamp01(m / maxIter);          // 0 far exterior -> ~1 near the set
          // outer -> inner -> bright accent toward the set, so the finest
          // boundary detail pops in high contrast instead of fading to oblivion.
          const tint = t < 0.5
            ? lerpC(outerRGB, innerRGB, t / 0.5)
            : lerpC(innerRGB, accentRGB, Math.pow((t - 0.5) / 0.5, 0.7));
          const band = 0.32 + 0.68 * (0.5 + 0.5 * Math.sin(m * 0.95)); // bold high-contrast bands
          const intensity = clamp01(Math.pow(t, 1.0) * 1.25);          // brighter; pattern pops
          const lit = [tint[0] * band, tint[1] * band, tint[2] * band];
          const out = lerpC(bgRow, lit, intensity);
          R = out[0]; G = out[1]; B = out[2];
        }
        const o = (py * rW + px) * 4;
        data[o] = R; data[o + 1] = G; data[o + 2] = B; data[o + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const href = canvas.toDataURL("image/png");

    // ---- SVG: bg gradient (shows through the masked sensor void) + the raster ----
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    ];
    parts.push("<defs>");
    parts.push(
      `<linearGradient id="fractal-bg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${bgTop}"/>` +
      `<stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
    );
    parts.push(sensorMaskDef(p));
    parts.push("</defs>");
    parts.push(`<rect width="${W}" height="${H}" fill="url(#fractal-bg)"/>`);
    parts.push(`<g id="fractal-field"${sensorMaskAttr(p)}>`);
    parts.push(
      `<image x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" ` +
      `opacity="${opacity.toFixed(3)}" href="${href}"/>`
    );
    parts.push("</g>");
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
      fractalSet: "julia",
      fractalIterations: 72,
      fractalZoom: 1.15,
      fractalDetail: 0.7,
      fractalOpacity: 0.85,
      fractalColorInner: "#bde7d6",
      fractalColorOuter: "#3c6f7f",
      fractalAccent: "#ffd23a",
      fractalBgTop: "#02040a",
      fractalBgBottom: "#070b12",
      fractalPreset: "graphene",
    },
    colorIds: ["fractalColorInner", "fractalColorOuter", "fractalAccent", "fractalBgTop", "fractalBgBottom"],
    presets: [
      { id: "graphene", name: "Graphene", set: { fractalColorInner: "#bde7d6", fractalColorOuter: "#3c6f7f", fractalAccent: "#ffd23a", fractalBgTop: "#02040a", fractalBgBottom: "#070b12" } },
      { id: "emerald", name: "Emerald", set: { fractalColorInner: "#bdf0cf", fractalColorOuter: "#357a55", fractalAccent: "#ffe24a", fractalBgTop: "#030906", fractalBgBottom: "#06110b" } },
      { id: "cyan", name: "Cyan", set: { fractalColorInner: "#c3f3f0", fractalColorOuter: "#2f7e88", fractalAccent: "#ff7e4a", fractalBgTop: "#02080a", fractalBgBottom: "#061115" } },
      { id: "azure", name: "Azure", set: { fractalColorInner: "#c6e6fb", fractalColorOuter: "#356a96", fractalAccent: "#ffd24a", fractalBgTop: "#02060c", fractalBgBottom: "#060f1a" } },
      { id: "indigo", name: "Indigo", set: { fractalColorInner: "#cdcffb", fractalColorOuter: "#414a93", fractalAccent: "#ffd24a", fractalBgTop: "#04050c", fractalBgBottom: "#0a0b1a" } },
      { id: "violet", name: "Violet", set: { fractalColorInner: "#dcc8f4", fractalColorOuter: "#5b3f8a", fractalAccent: "#ffe24a", fractalBgTop: "#06040c", fractalBgBottom: "#0d0a1a" } },
      { id: "amber", name: "Amber", set: { fractalColorInner: "#f0dcb3", fractalColorOuter: "#9a6f33", fractalAccent: "#4ad6ff", fractalBgTop: "#0a0703", fractalBgBottom: "#16100a" } },
      { id: "rose", name: "Rose", set: { fractalColorInner: "#f3cdd9", fractalColorOuter: "#9a4f5f", fractalAccent: "#4affc0", fractalBgTop: "#0a0405", fractalBgBottom: "#16090d" } },
      { id: "crimson", name: "Crimson", set: { fractalColorInner: "#f0c2c4", fractalColorOuter: "#963c3c", fractalAccent: "#4affd2", fractalBgTop: "#0a0303", fractalBgBottom: "#160808" } },
      { id: "ember", name: "Ember", set: { fractalColorInner: "#f1d3c2", fractalColorOuter: "#a05a30", fractalAccent: "#4ad6ff", fractalBgTop: "#0a0503", fractalBgBottom: "#160d08" } },
      { id: "lime", name: "Lime", set: { fractalColorInner: "#dbeec1", fractalColorOuter: "#6b8a3c", fractalAccent: "#ff4ad6", fractalBgTop: "#070903", fractalBgBottom: "#0e1207" } },
      { id: "ice", name: "Ice", set: { fractalColorInner: "#dbe7ec", fractalColorOuter: "#5a7d8e", fractalAccent: "#ffcf4a", fractalBgTop: "#05080a", fractalBgBottom: "#0b1115" } },
      { id: "mono", name: "Monolith", set: { fractalColorInner: "#d8d8d8", fractalColorOuter: "#5a5a5a", fractalAccent: "#ffffff", fractalBgTop: "#070707", fractalBgBottom: "#101010" } },
    ],
    inputIds: [
      "fractalSet",
      "fractalIterations",
      "fractalZoom",
      "fractalDetail",
      "fractalOpacity",
      "fractalColorInner",
      "fractalColorOuter",
      "fractalAccent",
      "fractalBgTop",
      "fractalBgBottom",
    ],
    controlsHtml: {
      setup:
        '<label class="field"><span class="field-label">Palette</span><select id="fractalPreset"></select></label>',
      form:
        '<div class="group-label">Fractal</div>' +
        '<label class="field"><span class="field-label">Set</span>' +
        '<select id="fractalSet">' +
        '<option value="julia">Julia</option>' +
        '<option value="mandelbrot">Mandelbrot</option>' +
        '<option value="phoenix">Phoenix</option>' +
        '<option value="burningship">Burning Ship</option>' +
        '<option value="tricorn">Tricorn</option>' +
        '<option value="celtic">Celtic</option></select></label>' +
        '<label class="field range"><span class="field-label">Iterations</span>' +
        '<input id="fractalIterations" type="range" min="24" max="160" step="2"></label>' +
        '<label class="field range"><span class="field-label">Zoom</span>' +
        '<input id="fractalZoom" type="range" min="0.4" max="4" step="0.05"></label>' +
        '<label class="field range"><span class="field-label">Detail</span>' +
        '<input id="fractalDetail" type="range" min="0.3" max="1" step="0.05"></label>' +
        '<label class="field range"><span class="field-label">Opacity</span>' +
        '<input id="fractalOpacity" type="range" min="0.2" max="1" step="0.01"></label>',
      color:
        '<div class="group-label">Fractal colors</div>' +
        '<label class="field color"><span class="field-label">Inner (near set)</span>' +
        '<input id="fractalColorInner" type="color"></label>' +
        '<label class="field color"><span class="field-label">Outer (exterior)</span>' +
        '<input id="fractalColorOuter" type="color"></label>' +
        '<label class="field color"><span class="field-label">Detail accent</span>' +
        '<input id="fractalAccent" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background top</span>' +
        '<input id="fractalBgTop" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background bottom</span>' +
        '<input id="fractalBgBottom" type="color"></label>',
    },
  });
})();
