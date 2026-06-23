/* styles/bokeh.js — "Bokeh": soft defocused photographic light over OLED black.
 * Translucent light discs are scattered deterministically with a depth model:
 * a few large very-soft low-opacity background discs, more mid discs, and small
 * crisp foreground sparkles, plus some hollow "lens ring" discs. Each disc is
 * filled by one of a SMALL set of shared radialGradients (bright center ->
 * transparent rim) keyed by tint family + softness — not one gradient per disc,
 * so the <defs> count stays bounded. Tint warms/cools by position. Density
 * falls off near the sensor so the focal void stays calm; the sensor is the only
 * crisp in-focus element. Depends on core.js (mulberry32, valueNoise2D, clamp01,
 * mix, scaleColor, sensor* + cornerBrand). Self-registers via registerStyle.
 * Deterministic: ALL randomness from mulberry32(p.seed) / valueNoise2D(p.seed);
 * never Math.random / Date. Same params => byte-identical output. */
"use strict";

(function () {
  function generateBokehSvg(p) {
    const W = Math.max(1, Math.round(p.width));
    const H = Math.max(1, Math.round(p.height));
    const unit = Math.min(W, H);

    // ---- resolved params (safe, bounded fallbacks) ----
    const discCount = Math.max(20, Math.min(600, Math.round(Number(p.bokehDiscCount) || 320)));
    const sizeMin = Math.max(0.4, Math.min(20, Number(p.bokehSizeMin) || 1.6));   // % of unit
    let sizeMax = Math.max(sizeMin + 0.2, Math.min(40, Number(p.bokehSizeMax) || 14)); // % of unit
    const softness = clamp01(Number(p.bokehSoftness) ?? 0.7);   // 0 crisp .. 1 very soft
    const opacity = clamp01(Number(p.bokehOpacity) ?? 0.5);     // global opacity scalar
    const depth = clamp01(Number(p.bokehDepth) ?? 0.7);         // background-vs-foreground bias

    const warm = p.bokehWarm || "#e0a26a";
    const accent = p.bokehAccent || "#c78ae0";
    const cool = p.bokehCool || "#6ab6e0";
    const bgTop = p.bokehBgTop || "#04060c";
    const bgBottom = p.bokehBgBottom || "#02040a";

    // ---- sensor focal geometry ----
    const cx = W * ((p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
    const cy = H * ((p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);
    const sensorR = unit * ((p.fingerprintRadiusPct ?? 10) / 100);
    const calmR = sensorR * 1.4;       // keep disc centers out of the immediate void
    const falloffR = sensorR * 4.5;    // density tapers within this radius of the sensor

    const rand = mulberry32((((p.seed | 0) ^ 0xb0ce5) >>> 0) || 1);
    const noise = valueNoise2D((p.seed | 0) ^ 0x70ce);

    // ---- shared gradients keyed by tint family x softness band (bounded) ----
    // Three tint families (warm / neutral / cool) x two softness bands
    // (soft rim-heavy, crisp tight core) = 6 fill gradients + 1 ring gradient.
    const tintHex = { warm, accent, cool };
    const tintKeys = ["warm", "accent", "cool"];
    const bands = ["soft", "crisp"];

    function fillGradId(tint, band) { return `bokeh-fill-${tint}-${band}`; }
    function ringGradId(tint) { return `bokeh-ring-${tint}`; }

    const defs = [];
    // Per softness band, the bright core fraction differs: "soft" discs have a
    // tiny bright core fading early (defocused); "crisp" discs hold the core out
    // to a larger radius (foreground sparkle). Global `softness` nudges both.
    tintKeys.forEach((tint) => {
      const base = tintHex[tint];
      const hot = scaleColor(base, 1.18); // slightly brighter center
      bands.forEach((band) => {
        const isSoft = band === "soft";
        // core hold + edge: blend the band's character with the global softness.
        const coreHold = isSoft ? clamp01(0.04 + (1 - softness) * 0.10)
                                : clamp01(0.28 + (1 - softness) * 0.28);
        const mid = clamp01(coreHold + (isSoft ? 0.30 : 0.40));
        const centerOp = isSoft ? 0.55 : 0.95;
        const midOp = isSoft ? 0.22 : 0.45;
        defs.push(
          `<radialGradient id="${fillGradId(tint, band)}" cx="50%" cy="50%" r="50%">` +
          `<stop offset="0%" stop-color="${hot}" stop-opacity="${centerOp.toFixed(3)}"/>` +
          `<stop offset="${(coreHold * 100).toFixed(1)}%" stop-color="${base}" stop-opacity="${centerOp.toFixed(3)}"/>` +
          `<stop offset="${(mid * 100).toFixed(1)}%" stop-color="${base}" stop-opacity="${midOp.toFixed(3)}"/>` +
          `<stop offset="100%" stop-color="${base}" stop-opacity="0"/></radialGradient>`
        );
      });
      // Hollow lens-ring gradient: transparent center, bright annulus, soft outer.
      defs.push(
        `<radialGradient id="${ringGradId(tint)}" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0%" stop-color="${base}" stop-opacity="0"/>` +
        `<stop offset="62%" stop-color="${base}" stop-opacity="0"/>` +
        `<stop offset="82%" stop-color="${scaleColor(base, 1.12)}" stop-opacity="0.5"/>` +
        `<stop offset="92%" stop-color="${base}" stop-opacity="0.22"/>` +
        `<stop offset="100%" stop-color="${base}" stop-opacity="0"/></radialGradient>`
      );
    });

    // Pick one of the three tints per disc: cool biased left, warm biased right,
    // the accent scattered throughout, with a gentle noise wobble. The per-disc
    // roll keeps all three colors mixed across the field (not banded).
    function pickTint(x, y, roll) {
      const pos = clamp01(x / W + (noise(x / (unit * 0.7), y / (unit * 0.7)) - 0.5) * 0.4);
      const wCool = (1 - pos) * 1.15;
      const wWarm = pos * 1.15;
      const wAcc = 0.7;
      const r = roll * (wCool + wWarm + wAcc);
      if (r < wCool) return "cool";
      if (r < wCool + wWarm) return "warm";
      return "accent";
    }

    // Density weighting near the sensor: 0 at the void, ramping to 1 by falloffR.
    function sensorKeep(x, y) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < calmR) return 0;
      if (d > falloffR) return 1;
      return clamp01((d - calmR) / (falloffR - calmR));
    }

    // ---- depth layers: counts split background / mid / foreground ----
    // `depth` biases toward more soft background discs (calmer) when high.
    // Fewer, dimmer, smaller large discs so the field doesn't blow out; most of
    // the count goes to mid + crisp foreground sparkles.
    const bgFrac = 0.04 + depth * 0.07;
    const fgFrac = 0.32 - depth * 0.12;
    const bgN = Math.round(discCount * bgFrac);
    const fgN = Math.round(discCount * fgFrac);
    const midN = Math.max(0, discCount - bgN - fgN);

    const sMin = unit * (sizeMin / 100);
    const sMax = unit * (sizeMax / 100);

    // layer descriptors: size range (of [sMin,sMax]), band, base opacity.
    const layers = [
      { n: bgN,  lo: 0.45, hi: 0.78, band: "soft",  op: 0.05 + 0.05 * (1 - depth), z: "bg" },
      { n: midN, lo: 0.18, hi: 0.5,  band: "soft",  op: 0.15, z: "mid" },
      { n: fgN,  lo: 0.05, hi: 0.22, band: "crisp", op: 0.40, z: "fg" },
    ];

    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    ];
    parts.push("<defs>");
    parts.push(
      `<linearGradient id="bokeh-bg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${bgTop}"/>` +
      `<stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
    );
    // A faint cool vignette glow centered behind the sensor adds depth.
    parts.push(
      `<radialGradient id="bokeh-aura" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${cool}" stop-opacity="0.06"/>` +
      `<stop offset="100%" stop-color="${cool}" stop-opacity="0"/></radialGradient>`
    );
    parts.push(defs.join(""));
    parts.push(sensorMaskDef(p));
    parts.push("</defs>");

    parts.push(`<rect width="${W}" height="${H}" fill="url(#bokeh-bg)"/>`);
    const auraR = sensorR * 5.5;
    parts.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${auraR.toFixed(1)}" fill="url(#bokeh-aura)"/>`
    );

    // All discs live in one masked group so the sensor void clears softly.
    parts.push(`<g id="bokeh-discs"${sensorMaskAttr(p)}>`);

    layers.forEach((layer) => {
      let drawn = 0;
      // Allow a bounded number of attempts so sensor-rejected discs don't starve
      // the layer; capped so the loop is always finite.
      const maxAttempts = layer.n * 4 + 8;
      let attempts = 0;
      while (drawn < layer.n && attempts < maxAttempts) {
        attempts += 1;
        const x = rand() * W;
        const y = rand() * H;
        const rRoll = rand();
        const tintRoll = rand();    // consumed for a stable stream regardless of keep
        const ringRoll = rand();
        const opRoll = rand();
        const keep = sensorKeep(x, y);
        if (rand() > keep) continue; // density falls off near the sensor

        const tint = pickTint(x, y, tintRoll);
        const sizeT = layer.lo + (layer.hi - layer.lo) * rRoll;
        const r = sMin + (sMax - sMin) * sizeT;
        // per-disc opacity jitter, scaled by global opacity + layer base.
        const op = clamp01(layer.op * opacity * (0.6 + 0.8 * opRoll) * 1.6);

        // Large/background discs are mostly hollow lens rings (defocused light
        // circles) instead of solid blobs; a few mid discs ring too.
        const isRing = layer.z === "bg" ? ringRoll < 0.5 : (layer.z === "mid" && ringRoll < 0.18);
        const fill = isRing ? `url(#${ringGradId(tint)})` : `url(#${fillGradId(tint, layer.band)})`;
        parts.push(
          `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" ` +
          `fill="${fill}" fill-opacity="${op.toFixed(3)}"/>`
        );
        drawn += 1;
      }
    });

    parts.push("</g>"); // /bokeh-discs

    // The sensor is the single crisp in-focus element.
    parts.push(sensorRing(p, p.accent2 || "#cdeede", warm, "circle"));
    parts.push(cornerBrand(p, p.accent2 || "#cdeede"));
    parts.push("</svg>");
    return parts.join("\n");
  }

  registerStyle({
    id: "bokeh",
    label: "Bokeh",
    generate: generateBokehSvg,
    defaults: {
      bokehDiscCount: 320,
      bokehSizeMin: 1.6,
      bokehSizeMax: 11,
      bokehSoftness: 0.7,
      bokehOpacity: 0.5,
      bokehDepth: 0.7,
      bokehWarm: "#e0a26a",
      bokehAccent: "#c78ae0",
      bokehCool: "#6ab6e0",
      bokehBgTop: "#04060c",
      bokehBgBottom: "#02040a",
      bokehPreset: "nightlights"
    },
    colorIds: ["bokehWarm", "bokehAccent", "bokehCool", "bokehBgTop", "bokehBgBottom"],
    presets: [
      { id: "nightlights", name: "Night Lights", set: { bokehWarm: "#e0a26a", bokehAccent: "#c78ae0", bokehCool: "#6ab6e0", bokehBgTop: "#04060c", bokehBgBottom: "#02040a" } },
      { id: "graphene", name: "Graphene", set: { bokehWarm: "#9ad4c2", bokehAccent: "#e0cf8a", bokehCool: "#4fb8c9", bokehBgTop: "#040808", bokehBgBottom: "#02050a" } },
      { id: "emerald", name: "Emerald", set: { bokehWarm: "#a7f3c4", bokehAccent: "#d7f0a0", bokehCool: "#3fae7c", bokehBgTop: "#040b08", bokehBgBottom: "#020604" } },
      { id: "cyan", name: "Cyan", set: { bokehWarm: "#8fe6f2", bokehAccent: "#b6f2ff", bokehCool: "#46b8e0", bokehBgTop: "#04090d", bokehBgBottom: "#020508" } },
      { id: "azure", name: "Azure", set: { bokehWarm: "#9ccdff", bokehAccent: "#c4b0ff", bokehCool: "#5a8fe0", bokehBgTop: "#04070e", bokehBgBottom: "#02040a" } },
      { id: "indigo", name: "Indigo", set: { bokehWarm: "#a9b6ff", bokehAccent: "#d0a0ff", bokehCool: "#6e6fe0", bokehBgTop: "#05060e", bokehBgBottom: "#020308" } },
      { id: "violet", name: "Violet", set: { bokehWarm: "#d7b0ff", bokehAccent: "#f0a0d0", bokehCool: "#9c6fe0", bokehBgTop: "#07050e", bokehBgBottom: "#040308" } },
      { id: "amber", name: "Amber", set: { bokehWarm: "#f0c074", bokehAccent: "#f0e08a", bokehCool: "#d68a4a", bokehBgTop: "#0a0704", bokehBgBottom: "#050302" } },
      { id: "ember", name: "Ember", set: { bokehWarm: "#f0a070", bokehAccent: "#f0d28a", bokehCool: "#c96a52", bokehBgTop: "#0a0604", bokehBgBottom: "#050202" } },
      { id: "rose", name: "Rose", set: { bokehWarm: "#f0a6c0", bokehAccent: "#f0c89a", bokehCool: "#d0709a", bokehBgTop: "#0a050a", bokehBgBottom: "#050207" } },
      { id: "crimson", name: "Crimson", set: { bokehWarm: "#f08a98", bokehAccent: "#f0b070", bokehCool: "#c95870", bokehBgTop: "#0a0507", bokehBgBottom: "#050203" } },
      { id: "sodium", name: "Sodium", set: { bokehWarm: "#ffcf8a", bokehAccent: "#fff0c0", bokehCool: "#e0a85a", bokehBgTop: "#080604", bokehBgBottom: "#040302" } },
      { id: "teal", name: "Teal", set: { bokehWarm: "#7fe0cf", bokehAccent: "#b6f0e0", bokehCool: "#37a89a", bokehBgTop: "#040a09", bokehBgBottom: "#020605" } },
      { id: "ice", name: "Ice", set: { bokehWarm: "#c7e2f0", bokehAccent: "#e0d0f0", bokehCool: "#8fb6cf", bokehBgTop: "#06090c", bokehBgBottom: "#030506" } },
      { id: "mono", name: "Monolith", set: { bokehWarm: "#d8d8d8", bokehAccent: "#b8c4c0", bokehCool: "#a0a0a0", bokehBgTop: "#080808", bokehBgBottom: "#040404" } },
      { id: "duotone", name: "Warm & Cool", set: { bokehWarm: "#f0b060", bokehAccent: "#c78ae0", bokehCool: "#5aa6f0", bokehBgTop: "#05060c", bokehBgBottom: "#020308" } }
    ],
    inputIds: [
      "bokehDiscCount",
      "bokehSizeMin",
      "bokehSizeMax",
      "bokehSoftness",
      "bokehOpacity",
      "bokehDepth",
      "bokehWarm",
      "bokehAccent",
      "bokehCool",
      "bokehBgTop",
      "bokehBgBottom"
    ],
    controlsHtml: {
      setup:
        '<label class="field"><span class="field-label">Palette</span><select id="bokehPreset"></select></label>',
      form:
        '<div class="group-label">Discs</div>' +
        '<label class="field range"><span class="field-label">Disc count</span>' +
        '<input id="bokehDiscCount" type="range" min="20" max="600" step="5"></label>' +
        '<label class="field range"><span class="field-label">Min size</span>' +
        '<input id="bokehSizeMin" type="range" min="0.4" max="8" step="0.1"></label>' +
        '<label class="field range"><span class="field-label">Max size</span>' +
        '<input id="bokehSizeMax" type="range" min="4" max="30" step="0.5"></label>' +
        '<div class="group-label">Defocus</div>' +
        '<label class="field range"><span class="field-label">Softness</span>' +
        '<input id="bokehSoftness" type="range" min="0" max="1" step="0.01"></label>' +
        '<label class="field range"><span class="field-label">Depth</span>' +
        '<input id="bokehDepth" type="range" min="0" max="1" step="0.01"></label>' +
        '<label class="field range"><span class="field-label">Opacity</span>' +
        '<input id="bokehOpacity" type="range" min="0" max="1" step="0.01"></label>',
      color:
        '<div class="group-label">Bokeh colors</div>' +
        '<label class="field color"><span class="field-label">Warm light</span>' +
        '<input id="bokehWarm" type="color"></label>' +
        '<label class="field color"><span class="field-label">Accent light</span>' +
        '<input id="bokehAccent" type="color"></label>' +
        '<label class="field color"><span class="field-label">Cool light</span>' +
        '<input id="bokehCool" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background top</span>' +
        '<input id="bokehBgTop" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background bottom</span>' +
        '<input id="bokehBgBottom" type="color"></label>'
    }
  });
})();
