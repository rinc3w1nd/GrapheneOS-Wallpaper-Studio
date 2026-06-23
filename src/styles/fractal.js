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

  function generateFractalSvg(p) {
    const W = Math.max(1, Math.round(p.width));
    const H = Math.max(1, Math.round(p.height));
    const unit = Math.min(W, H);

    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const set = p.fractalSet === "mandelbrot" ? "mandelbrot" : "julia";
    const maxIter = Math.max(24, Math.min(160, Math.round(num(p.fractalIterations, 72))));
    const zoom = Math.max(0.4, Math.min(4, num(p.fractalZoom, 1.15)));
    const detail = clamp01(num(p.fractalDetail, 0.7));
    const opacity = clamp01(num(p.fractalOpacity, 0.85));

    const colorInner = p.fractalColorInner || "#bde7d6";
    const colorOuter = p.fractalColorOuter || "#3c6f7f";
    const bgTop = p.fractalBgTop || "#02040a";
    const bgBottom = p.fractalBgBottom || "#070b12";

    const cx = W * ((p.fingerprintXPct ?? 50) / 100);
    const cy = H * ((p.fingerprintYPct ?? 72.5) / 100);

    const rand = mulberry32((p.seed >>> 0) || 1);

    // ---- complex-plane mapping centered on the sensor ----
    const half = unit * 0.5;
    let juliaRe = 0, juliaIm = 0;
    let mCenRe = -0.5, mCenIm = 0, viewScale;
    if (set === "julia") {
      const jc = JULIA_CS[Math.floor(rand() * JULIA_CS.length) % JULIA_CS.length];
      juliaRe = jc[0] + (rand() - 0.5) * 0.04;
      juliaIm = jc[1] + (rand() - 0.5) * 0.04;
      viewScale = 1.6 / zoom; // central `half` px -> ~1.6 complex units
    } else {
      const mv = MANDEL_VIEWS[Math.floor(rand() * MANDEL_VIEWS.length) % MANDEL_VIEWS.length];
      mCenRe = mv[0];
      mCenIm = mv[1];
      viewScale = mv[2] / zoom;
    }
    // Smooth escape iteration; returns maxIter for points inside the set.
    const LOG2 = Math.log(2);
    function escape(z0re, z0im, cre, cim) {
      let zr = z0re, zi = z0im;
      let i = 0;
      let zr2 = zr * zr, zi2 = zi * zi;
      while (i < maxIter && zr2 + zi2 <= 64) {
        zi = 2 * zr * zi + cim;
        zr = zr2 - zi2 + cre;
        zr2 = zr * zr;
        zi2 = zi * zi;
        i += 1;
      }
      if (i >= maxIter) return maxIter;
      const mag = Math.sqrt(zr2 + zi2);
      return i + 1 - Math.log(Math.log(mag)) / LOG2; // smooth
    }

    // ---- rasterize the escape-time field as ONE <image> (full smooth detail) ----
    // SVG vector tiles can't capture fine fractal filigree under the element
    // budget, so the field is rendered on a canvas and inlined as a data URI.
    // Deterministic per browser for a given seed; the seed picks the figure.
    const rW = Math.max(96, Math.min(W, Math.round(360 + detail * 340))); // 360..700
    const rH = Math.max(96, Math.round((rW * H) / W));
    const sxx = W / rW, syy = H / rH;
    const innerRGB = hexToRgb(colorInner);
    const outerRGB = hexToRgb(colorOuter);
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
        const m = set === "julia"
          ? escape(vx, vy, juliaRe, juliaIm)
          : escape(0, 0, vx + mCenRe, vy + mCenIm);
        let R, G, B;
        if (m >= maxIter) {                       // inside the set: dark body
          R = bgRow[0] * 0.8; G = bgRow[1] * 0.8; B = bgRow[2] * 0.8;
        } else {
          const t = clamp01(m / maxIter);          // 0 far exterior -> ~1 near the set
          const tint = lerpC(outerRGB, innerRGB, t * t);
          const band = 0.68 + 0.32 * Math.sin(m * 0.7);   // contour shimmer
          const intensity = Math.pow(t, 1.5);             // fade in from far field
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
      fractalBgTop: "#02040a",
      fractalBgBottom: "#070b12",
      fractalPreset: "graphene",
    },
    colorIds: ["fractalColorInner", "fractalColorOuter", "fractalBgTop", "fractalBgBottom"],
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
      { id: "mono", name: "Monolith", set: { fractalColorInner: "#d8d8d8", fractalColorOuter: "#5a5a5a", fractalBgTop: "#070707", fractalBgBottom: "#101010" } },
    ],
    inputIds: [
      "fractalSet",
      "fractalIterations",
      "fractalZoom",
      "fractalDetail",
      "fractalOpacity",
      "fractalColorInner",
      "fractalColorOuter",
      "fractalBgTop",
      "fractalBgBottom",
    ],
    controlsHtml: {
      setup:
        '<label class="field"><span class="field-label">Palette</span><select id="fractalPreset"></select></label>',
      form:
        '<div class="group-label">Fractal</div>' +
        '<label class="field"><span class="field-label">Set</span>' +
        '<select id="fractalSet"><option value="julia">Julia</option><option value="mandelbrot">Mandelbrot</option></select></label>' +
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
        '<label class="field color"><span class="field-label">Background top</span>' +
        '<input id="fractalBgTop" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background bottom</span>' +
        '<input id="fractalBgBottom" type="color"></label>',
    },
  });
})();
