/* styles/constellation.js — seeded star-field node graph centered on the sensor.
 * Depends on core.js (mulberry32, hexToRgb/rgbToHex/mix, clamp01). Self-registers
 * via registerStyle. Deterministic: all randomness from mulberry32(p.seed). */
"use strict";

(function () {
  function generateConstellationSvg(p) {
    const W = Math.max(1, Math.round(p.width));
    const H = Math.max(1, Math.round(p.height));
    const unit = Math.min(W, H);

    // ----- params (with safe fallbacks) -----
    const density = clamp01(p.constellationDensity ?? 0.55);     // 0..1 node count
    const linkDistPct = p.constellationLinkDist ?? 9;            // % of unit
    const jitter = clamp01(p.constellationJitter ?? 0.6);        // cell jitter
    const falloff = clamp01(p.constellationFalloff ?? 0.65);     // radial density bias
    const nodeOpacity = clamp01(p.constellationNodeOpacity ?? 0.85);
    const linkOpacity = clamp01(p.constellationLinkOpacity ?? 0.32);
    const hubEmphasis = clamp01(p.constellationHubEmphasis ?? 0.8);
    const maxLinks = Math.max(1, Math.min(4, Math.round(p.constellationMaxLinks ?? 3)));

    const bgTop = p.constellationBgTop || "#02040a";
    const bgBottom = p.constellationBgBottom || "#04070d";
    const nodeColor = p.constellationNodeColor || "#9ad4c2";
    const linkColor = p.constellationLinkColor || "#5f7e8c";
    const hubColor = p.constellationHubColor || "#cdeede";

    // ----- sensor focal point -----
    const cx = W * ((p.fingerprintXPct ?? 50) / 100);
    const cy = H * ((p.fingerprintYPct ?? 72.5) / 100);
    const sensorR = unit * ((p.fingerprintRadiusPct ?? 10) / 100);
    const calmR = sensorR * 1.35; // keep nodes/links out of the immediate disc

    const rand = mulberry32((p.seed >>> 0) || 1);

    // ----- jittered grid -> node candidates (bounded count) -----
    // Cell size from density: smaller cells => more nodes. Clamp columns so the
    // element budget stays well under the cap for any canvas.
    const minCell = unit * 0.045;
    const maxCell = unit * 0.12;
    const cell = maxCell - (maxCell - minCell) * density;
    let cols = Math.max(3, Math.min(34, Math.ceil(W / cell) + 1));
    let rows = Math.max(3, Math.min(70, Math.ceil(H / cell) + 1));
    const stepX = W / (cols - 1);
    const stepY = H / (rows - 1);

    const linkDist = unit * (linkDistPct / 100);
    const maxDiag = Math.sqrt(W * W + H * H) || 1;

    const nodes = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const jx = (rand() - 0.5) * stepX * jitter;
        const jy = (rand() - 0.5) * stepY * jitter;
        let x = c * stepX + jx;
        let y = r * stepY + jy;
        x = Math.max(0, Math.min(W, x));
        y = Math.max(0, Math.min(H, y));

        // radial density: nodes near the hub kept more often.
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const near = 1 - clamp01(dist / (maxDiag * 0.6)); // 1 at hub -> 0 far
        const keepProb = 1 - falloff * (1 - near);
        const draw = rand(); // always consume to keep stream stable
        if (draw > keepProb) continue;
        if (dist < calmR) continue; // keep the sensor disc clear

        // brightness scales with proximity to the hub.
        const bright = clamp01(0.45 + near * 0.55);
        nodes.push({ x, y, b: bright });
      }
    }

    // ----- nearest-neighbor links (bounded by maxLinks per node) -----
    // O(n^2) but n is bounded (<~1200) so this stays fast.
    const linkSet = Object.create(null);
    const links = [];
    const n = nodes.length;
    for (let i = 0; i < n; i += 1) {
      const a = nodes[i];
      // collect candidate neighbours within linkDist
      const cand = [];
      for (let j = 0; j < n; j += 1) {
        if (j === i) continue;
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= linkDist * linkDist) cand.push({ j, d2 });
      }
      cand.sort((u, v) => u.d2 - v.d2);
      const lim = Math.min(maxLinks, cand.length);
      for (let k = 0; k < lim; k += 1) {
        const j = cand[k].j;
        const key = i < j ? i + "_" + j : j + "_" + i;
        if (linkSet[key]) continue;
        linkSet[key] = 1;
        const b = nodes[j];
        links.push({ a, b, d: Math.sqrt(cand[k].d2) });
      }
    }

    // ----- SVG assembly -----
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    ];
    parts.push("<defs>");
    parts.push(
      `<linearGradient id="constellation-bg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${bgTop}"/>` +
      `<stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
    );
    parts.push(
      `<radialGradient id="constellation-hubglow" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="${hubColor}" stop-opacity="${(0.22 * hubEmphasis).toFixed(3)}"/>` +
      `<stop offset="100%" stop-color="${hubColor}" stop-opacity="0"/></radialGradient>`
    );
    parts.push(sensorMaskDef(p));
    parts.push("</defs>");
    parts.push(`<rect width="${W}" height="${H}" fill="url(#constellation-bg)"/>`);

    // hub glow behind everything else (calm, soft, centered on sensor)
    const glowR = sensorR * 3.4;
    parts.push(
      `<circle id="constellation-glow" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" ` +
      `r="${glowR.toFixed(1)}" fill="url(#constellation-hubglow)"/>`
    );

    // field (links + nodes) is masked so the sensor disc clears cleanly.
    parts.push(`<g id="constellation-field"${sensorMaskAttr(p)}>`);

    // links group: opacity fades with link length so distant ties are faint.
    parts.push(`<g id="constellation-links" stroke="${linkColor}" fill="none">`);
    for (let i = 0; i < links.length; i += 1) {
      const l = links[i];
      const t = linkDist > 0 ? clamp01(1 - l.d / linkDist) : 1;
      // Keep links clearly visible (high floor) while still varying with length.
      const op = (linkOpacity * (0.6 + 0.4 * t)).toFixed(3);
      const sw = (0.8 + 0.8 * t).toFixed(2);
      parts.push(
        `<line x1="${l.a.x.toFixed(1)}" y1="${l.a.y.toFixed(1)}" ` +
        `x2="${l.b.x.toFixed(1)}" y2="${l.b.y.toFixed(1)}" ` +
        `stroke-opacity="${op}" stroke-width="${sw}"/>`
      );
    }
    parts.push("</g>");

    // nodes group: radius + opacity scale with hub proximity.
    parts.push(`<g id="constellation-nodes" fill="${nodeColor}">`);
    const baseR = unit * 0.0022;
    for (let i = 0; i < nodes.length; i += 1) {
      const nd = nodes[i];
      const r = (baseR * (0.7 + nd.b * 1.6)).toFixed(2);
      const op = (nodeOpacity * (0.45 + nd.b * 0.55)).toFixed(3);
      parts.push(
        `<circle cx="${nd.x.toFixed(1)}" cy="${nd.y.toFixed(1)}" r="${r}" fill-opacity="${op}"/>`
      );
    }
    parts.push("</g>"); // nodes
    parts.push("</g>"); // /constellation-field (masked)

    // Clean framing ring around the sensor (replaces the old satellite hub).
    parts.push(sensorRing(p, hubColor, nodeColor, "circle"));

    parts.push(cornerBrand(p, nodeColor));
    parts.push("</svg>");
    return parts.join("\n");
  }

  registerStyle({
    id: "constellation",
    label: "Constellation",
    generate: generateConstellationSvg,
    defaults: {
      constellationDensity: 0.55,
      constellationLinkDist: 9,
      constellationJitter: 0.6,
      constellationFalloff: 0.65,
      constellationMaxLinks: 3,
      constellationNodeOpacity: 0.85,
      constellationLinkOpacity: 0.6,
      constellationHubEmphasis: 0.8,
      constellationBgTop: "#02040a",
      constellationBgBottom: "#04070d",
      constellationNodeColor: "#9ad4c2",
      constellationLinkColor: "#5f7e8c",
      constellationHubColor: "#cdeede",
      constellationPreset: "graphene"
    },
    colorIds: ["constellationNodeColor", "constellationLinkColor", "constellationHubColor", "constellationBgTop", "constellationBgBottom"],
    presets: [
    { id: "graphene", name: "Graphene", set: { constellationNodeColor: "#9ad4c2", constellationLinkColor: "#5f7e8c", constellationHubColor: "#cdeede", constellationBgTop: "#02040a", constellationBgBottom: "#04070d" } },
    { id: "emerald", name: "Emerald", set: { constellationNodeColor: "#79d8a8", constellationLinkColor: "#769d8a", constellationHubColor: "#bfe3d1", constellationBgTop: "#050c09", constellationBgBottom: "#030605" } },
    { id: "lime", name: "Lime", set: { constellationNodeColor: "#a5d47d", constellationLinkColor: "#899b78", constellationHubColor: "#d0e1c1", constellationBgTop: "#090c06", constellationBgBottom: "#040603" } },
    { id: "amber", name: "Amber", set: { constellationNodeColor: "#e0b371", constellationLinkColor: "#a08e73", constellationHubColor: "#e6d5bd", constellationBgTop: "#0d0a05", constellationBgBottom: "#070502" } },
    { id: "gold", name: "Gold", set: { constellationNodeColor: "#dcc874", constellationLinkColor: "#9f9675", constellationHubColor: "#e4ddbe", constellationBgTop: "#0d0b05", constellationBgBottom: "#070603" } },
    { id: "ember", name: "Ember", set: { constellationNodeColor: "#de8f73", constellationLinkColor: "#a08074", constellationHubColor: "#e5c8bd", constellationBgTop: "#0d0705", constellationBgBottom: "#070402" } },
    { id: "crimson", name: "Crimson", set: { constellationNodeColor: "#d87985", constellationLinkColor: "#9d767c", constellationHubColor: "#e3bfc4", constellationBgTop: "#0c0506", constellationBgBottom: "#060303" } },
    { id: "rose", name: "Rose", set: { constellationNodeColor: "#d080a3", constellationLinkColor: "#9a7a88", constellationHubColor: "#e0c2cf", constellationBgTop: "#0c0609", constellationBgBottom: "#060304" } },
    { id: "magenta", name: "Magenta", set: { constellationNodeColor: "#d47dc2", constellationLinkColor: "#9b7894", constellationHubColor: "#e1c1db", constellationBgTop: "#0c060b", constellationBgBottom: "#060306" } },
    { id: "amethyst", name: "Amethyst", set: { constellationNodeColor: "#bd81cf", constellationLinkColor: "#927a9a", constellationHubColor: "#d9c3e0", constellationBgTop: "#0a060c", constellationBgBottom: "#050306" } },
    { id: "violet", name: "Violet", set: { constellationNodeColor: "#9d7fd2", constellationLinkColor: "#85799b", constellationHubColor: "#cdc2e1", constellationBgTop: "#08060c", constellationBgBottom: "#040306" } },
    { id: "indigo", name: "Indigo", set: { constellationNodeColor: "#7d83d4", constellationLinkColor: "#787a9b", constellationHubColor: "#c1c3e1", constellationBgTop: "#06060c", constellationBgBottom: "#030306" } },
    { id: "cobalt", name: "Cobalt", set: { constellationNodeColor: "#7396de", constellationLinkColor: "#7482a0", constellationHubColor: "#bdcae5", constellationBgTop: "#05080d", constellationBgBottom: "#020407" } },
    { id: "azure", name: "Azure", set: { constellationNodeColor: "#73b7de", constellationLinkColor: "#7490a0", constellationHubColor: "#bdd6e5", constellationBgTop: "#050a0d", constellationBgBottom: "#020507" } },
    { id: "cyan", name: "Cyan", set: { constellationNodeColor: "#76cadb", constellationLinkColor: "#75979e", constellationHubColor: "#bedee4", constellationBgTop: "#050b0d", constellationBgBottom: "#030607" } },
    { id: "ice", name: "Ice", set: { constellationNodeColor: "#95b0bb", constellationLinkColor: "#828d91", constellationHubColor: "#cad4d8", constellationBgTop: "#08090a", constellationBgBottom: "#040505" } },
    { id: "slate", name: "Slate", set: { constellationNodeColor: "#9ea7b3", constellationLinkColor: "#85898e", constellationHubColor: "#cdd1d5", constellationBgTop: "#08090a", constellationBgBottom: "#040505" } },
    { id: "mono", name: "Monolith", set: { constellationNodeColor: "#a8a8a8", constellationLinkColor: "#8a8a8a", constellationHubColor: "#d1d1d1", constellationBgTop: "#090909", constellationBgBottom: "#050505" } },
  ],
    inputIds: [
      "constellationDensity",
      "constellationLinkDist",
      "constellationJitter",
      "constellationFalloff",
      "constellationMaxLinks",
      "constellationNodeOpacity",
      "constellationLinkOpacity",
      "constellationHubEmphasis",
      "constellationBgTop",
      "constellationBgBottom",
      "constellationNodeColor",
      "constellationLinkColor",
      "constellationHubColor"
    ],
    controlsHtml: {
      setup:
        '<label class="field"><span class="field-label">Palette</span><select id="constellationPreset"></select></label>',
      form:
        '<div class="group-label">Field</div>' +
        '<label class="field range"><span class="field-label">Node density</span>' +
        '<input id="constellationDensity" type="range" min="0" max="1" step="0.01"></label>' +
        '<label class="field range"><span class="field-label">Link distance</span>' +
        '<input id="constellationLinkDist" type="range" min="3" max="18" step="0.5"></label>' +
        '<label class="field range"><span class="field-label">Jitter</span>' +
        '<input id="constellationJitter" type="range" min="0" max="1" step="0.01"></label>' +
        '<label class="field range"><span class="field-label">Radial falloff</span>' +
        '<input id="constellationFalloff" type="range" min="0" max="1" step="0.01"></label>' +
        '<label class="field range"><span class="field-label">Max links/node</span>' +
        '<input id="constellationMaxLinks" type="range" min="1" max="4" step="1"></label>' +
        '<label class="field range"><span class="field-label">Hub emphasis</span>' +
        '<input id="constellationHubEmphasis" type="range" min="0" max="1" step="0.01"></label>' +
        '<div class="group-label">Opacity</div>' +
        '<label class="field range"><span class="field-label">Nodes</span>' +
        '<input id="constellationNodeOpacity" type="range" min="0" max="1" step="0.01"></label>' +
        '<label class="field range"><span class="field-label">Links</span>' +
        '<input id="constellationLinkOpacity" type="range" min="0" max="1" step="0.01"></label>',
      color:
        '<div class="group-label">Constellation colors</div>' +
        '<label class="field color"><span class="field-label">Nodes</span>' +
        '<input id="constellationNodeColor" type="color"></label>' +
        '<label class="field color"><span class="field-label">Links</span>' +
        '<input id="constellationLinkColor" type="color"></label>' +
        '<label class="field color"><span class="field-label">Hub</span>' +
        '<input id="constellationHubColor" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background top</span>' +
        '<input id="constellationBgTop" type="color"></label>' +
        '<label class="field color"><span class="field-label">Background bottom</span>' +
        '<input id="constellationBgBottom" type="color"></label>'
    }
  });
})();
