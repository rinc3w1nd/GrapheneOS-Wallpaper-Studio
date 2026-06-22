/* styles/lattice.js — isometric geometric structure + fingerprint aperture.
 * Depends on core.js. */
"use strict";

function cube(x, y, z, faceMode, strong, p, rnd) {
  const v = vertices(x, y, z, p);
  const out = [];
  const darkFace = mix(p.backgroundMid, p.lineColor, 0.20);
  const midFace = mix(p.backgroundMid, p.lineColor, 0.35);

  const faceOptions = [
    { points: [v[3], v[5], v[7], v[6]], fill: faceMode === 1 || faceMode === 4 ? p.accent : midFace, op: faceMode ? p.accentOpacity : 0 },
    { points: [v[1], v[4], v[7], v[5]], fill: faceMode === 2 || faceMode === 4 ? p.accent2 : darkFace, op: faceMode ? p.accentOpacity * 0.78 : 0 },
    { points: [v[2], v[4], v[7], v[6]], fill: faceMode === 3 ? p.accent : darkFace, op: faceMode ? p.accentOpacity * 0.72 : 0 }
  ];

  faceOptions.forEach((f) => {
    if (f.op > 0) {
      out.push(poly(f.points, {
        fill: f.fill,
        fillOpacity: f.op,
        stroke: p.lineColor,
        strokeOpacity: p.latticeOpacity * 0.88,
        sw: 1.05
      }));
    }
  });

  const edgeOpacity = strong ? p.latticeOpacity * 1.15 : p.latticeOpacity * 0.78;
  const edgeSw = strong ? 1.25 : 1.0;
  const edges = [
    [0, 1], [0, 2], [1, 4], [2, 4],
    [0, 3], [1, 5], [2, 6], [4, 7],
    [3, 5], [3, 6], [5, 7], [6, 7]
  ];

  edges.forEach(([a, b]) => {
    out.push(line(v[a], v[b], { color: p.lineColor, opacity: edgeOpacity, sw: edgeSw }));
  });

  v.forEach((point) => {
    if (rnd() < (strong ? 0.20 : 0.10) * p.structureDensity) {
      out.push(circle(point[0], point[1], [3.2, 4.2, 5.3][Math.floor(rnd() * 3)], rnd() < 0.65 ? p.accent : p.accent2, p.nodeOpacity));
    }
  });

  return out.join("\n");
}

function scaffoldLineIso(x1, y1, x2, y2, z, p, opacity, dash) {
  return line(iso(x1, y1, z, p), iso(x2, y2, z, p), { color: p.lineColor, opacity, sw: 1, dash });
}

function officialGrapheneLogo(cx, cy, scale, opacity, p) {
  const size = Math.max(90, 156 * scale);
  const x = cx - size / 2;
  const y = cy - size / 2;

  return `<g id="official-grapheneos-logo" opacity="${opacity}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
    <svg x="0" y="0" width="${size.toFixed(1)}" height="${size.toFixed(1)}" viewBox="${OFFICIAL_LOGO_VIEWBOX}" preserveAspectRatio="xMidYMid meet" fill="${p.accent2}">
      <path d="${OFFICIAL_LOGO_PATH}" fill-rule="nonzero"/>
    </svg>
  </g>`;
}

function brandMark(cx, cy, scale, opacity, p) {
  if (p.useOfficialLogo) {
    return officialGrapheneLogo(cx, cy, scale, opacity, p);
  }
  return grapheneMark(cx, cy, scale, opacity, p);
}

function grapheneMark(cx, cy, scale, opacity, p) {
  const out = [`<g opacity="${opacity}" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${scale.toFixed(3)})">`];
  out.push(hexagon(0, 0, 42, p, { stroke: p.accent2, strokeOpacity: 0.95, sw: 5 }));
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (30 + i * 60);
    const x1 = 42 * Math.cos(angle);
    const y1 = 42 * Math.sin(angle);
    const x2 = 77 * Math.cos(angle);
    const y2 = 77 * Math.sin(angle);
    out.push(line([x1, y1], [x2, y2], { color: p.accent2, opacity: 0.78, sw: 3 }));
    out.push(circle(x2, y2, 8, p.accent2, 0.92));
  }
  out.push("</g>");
  return out.join("\n");
}

function svgHeader(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}" height="${p.height}" viewBox="0 0 ${p.width} ${p.height}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${p.backgroundTop}"/>
    <stop offset="42%" stop-color="${p.backgroundMid}"/>
    <stop offset="100%" stop-color="${p.backgroundBottom}"/>
  </linearGradient>

  <radialGradient id="lowerGlow" cx="47%" cy="70%" r="58%">
    <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.15"/>
    <stop offset="45%" stop-color="${mix(p.backgroundMid, p.accent, 0.08)}" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>

  <radialGradient id="topHaze" cx="48%" cy="18%" r="65%">
    <stop offset="0%" stop-color="${mix(p.backgroundMid, p.lineColor, 0.22)}" stop-opacity="0.18"/>
    <stop offset="55%" stop-color="${p.backgroundMid}" stop-opacity="0.05"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
  </radialGradient>

  <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0.025"/></feComponentTransfer>
  </filter>
</defs>

<rect width="100%" height="100%" fill="url(#bg)"/>
<rect width="100%" height="100%" fill="url(#topHaze)"/>
<rect width="100%" height="100%" fill="url(#lowerGlow)"/>
${p.grain ? '<rect width="100%" height="100%" filter="url(#grain)" opacity="0.9"/>' : ""}`;
}

// Shared geometry for the fingerprint void: center + radius in screen pixels.

function apertureGeometry(p) {
  const cx = p.width * ((p.fingerprintXPct ?? 50) / 100);
  const cy = p.height * ((p.fingerprintYPct ?? 74.5) / 100);
  const unit = Math.min(p.width, p.height);
  const voidR = unit * ((p.fingerprintRadiusPct ?? 15.5) / 100);
  return { cx, cy, unit, voidR };
}

// Mask that clears the geometry inside the void with a soft rim fade. Black
// hides, white shows; the radial ramp gives the fade. Empty when disabled.
function apertureMaskDef(p) {
  if (!p.fingerprintEnabled) return "";
  const { cx, cy, voidR } = apertureGeometry(p);
  return `<radialGradient id="apertureFade" gradientUnits="userSpaceOnUse" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${voidR.toFixed(1)}">
  <stop offset="0%" stop-color="black"/>
  <stop offset="82%" stop-color="black"/>
  <stop offset="100%" stop-color="white"/>
</radialGradient>
<mask id="apertureMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${p.width}" height="${p.height}">
  <rect x="0" y="0" width="${p.width}" height="${p.height}" fill="white"/>
  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${voidR.toFixed(1)}" fill="url(#apertureFade)"/>
</mask>`;
}

// Intersection point(s) of segment a→b with the circle (center c, radius r),
// limited to the segment. Used to cap lattice lines at the aperture rim.
function lineCircleIntersections(a, b, c, r) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const fx = a[0] - c[0];
  const fy = a[1] - c[1];
  const A = dx * dx + dy * dy;
  if (A === 0) return [];
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - r * r;
  let disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  disc = Math.sqrt(disc);
  const out = [];
  [(-B - disc) / (2 * A), (-B + disc) / (2 * A)].forEach((t) => {
    if (t >= 0 && t <= 1) out.push([a[0] + t * dx, a[1] + t * dy]);
  });
  return out;
}

// The aperture itself: a ringed-out void. Interior stays empty (Android draws
// the real sensor UI there). Drawn over the masked geometry, so the ring and
// rim nodes sit crisply while the lattice fades into the void behind them.
function fingerprintAperture(p, latticeSegments) {
  if (!p.fingerprintEnabled) return "";

  const { cx, cy, unit, voidR } = apertureGeometry(p);
  const ring = Math.max(0, Math.min(1, p.fingerprintRingOpacity ?? 0.88));
  const sensorGlow = mix(p.accent2, "#ffffff", 0.30);
  const out = ['<g id="fingerprint-aperture">'];

  // Capped rim nodes where the lattice crosses the boundary — the "structure
  // deliberately terminated at the sensor" read.
  const nodeR = Math.max(2.6, unit * 0.0042);
  latticeSegments.forEach(([a, b]) => {
    lineCircleIntersections(a, b, [cx, cy], voidR).forEach((pt) => {
      out.push(circle(pt[0], pt[1], nodeR, p.accent2, ring * 0.85));
    });
  });

  // Sensor logo on → official GrapheneOS logo around the sensor; off → lattice's
  // native hex frame (precise hex + faint outer hairline).
  if (p.sensorLogo) {
    out.push(sensorMark(p, p.accent2));
  } else {
    out.push(hexagon(cx, cy, voidR, p, { stroke: sensorGlow, strokeOpacity: ring * 0.9, sw: Math.max(2.0, unit * 0.0022) }));
    out.push(hexagon(cx, cy, voidR * 1.06, p, { stroke: mix(p.lineColor, p.accent2, 0.4), strokeOpacity: ring * 0.34, sw: Math.max(1.1, unit * 0.0013) }));
  }

  out.push("</g>");
  return out.join("\n");
}

function generateLatticeSvg(p) {
  const rnd = mulberry32(p.seed);
  const parts = [svgHeader(p)];
  const latticeSegments = [];

  // Clear the fingerprint void out of the structural geometry: wrap it all in a
  // masked group. The background gradients, bottom fade, corner brand, and the
  // aperture ring itself stay outside the mask.
  parts.push(apertureMaskDef(p));
  parts.push(`<g id="geometry"${p.fingerprintEnabled ? ' mask="url(#apertureMask)"' : ""}>`);

  parts.push('<g id="top-scaffold">');
  const gridCount = Math.max(5, Math.round(9 * p.structureDensity));
  for (let offset = -gridCount; offset <= gridCount; offset += 2) {
    parts.push(scaffoldLineIso(offset, -14, offset + 7, -7, -3, p, p.topScaffoldOpacity * 0.70, "7 13"));
    parts.push(scaffoldLineIso(offset + 7, -14, offset, -7, -3, p, p.topScaffoldOpacity * 0.58, "7 13"));
  }

  const topHexes = [
    [p.width * 0.14, p.height * 0.26, Math.min(p.width, p.height) * 0.070],
    [p.width * 0.45, p.height * 0.34, Math.min(p.width, p.height) * 0.105],
    [p.width * 0.84, p.height * 0.30, Math.min(p.width, p.height) * 0.085],
    [p.width * 0.72, p.height * 0.43, Math.min(p.width, p.height) * 0.070]
  ];

  topHexes.forEach(([cx, cy, r]) => {
    parts.push(hexagon(cx, cy, r, p, { strokeOpacity: p.topScaffoldOpacity * 0.82, sw: 1.0 }));
  });
  parts.push("</g>");

  parts.push('<g id="background-lattice">');
  // Collect each lattice line's screen-space endpoints so the aperture can cap
  // them where they cross the void boundary.
  const addLattice = (x1, y1, x2, y2, z, opacity, dash) => {
    const a = iso(x1, y1, z, p);
    const b = iso(x2, y2, z, p);
    latticeSegments.push([a, b]);
    parts.push(line(a, b, { color: p.lineColor, opacity, sw: 1, dash }));
  };
  for (let gx = -9; gx < 9; gx += 1) {
    addLattice(gx, -5, gx + 8, 3, 0, p.latticeOpacity * 0.20, "5 11");
    addLattice(gx, 5, gx + 8, -3, 0, p.latticeOpacity * 0.16, "5 11");
  }
  for (let gy = -6; gy <= 6; gy += 1) {
    addLattice(-8, gy, 6, gy, 0, p.latticeOpacity * 0.13, "5 12");
  }
  parts.push("</g>");

  const baseCluster = [
    [-5, 1, 0], [-4, 1, 0], [-3, 1, 0],
    [-5, 2, 0], [-4, 2, 0], [-3, 2, 0], [-2, 2, 0],
    [-4, 3, 0], [-3, 3, 0], [-2, 3, 0], [-1, 3, 0],
    [-2, 0, 0], [-1, 0, 0], [0, 0, 0],
    [-1, 1, 0], [0, 1, 0], [1, 1, 0],
    [0, 2, 0], [1, 2, 0], [2, 2, 0],
    [2, -2, 0], [3, -2, 0], [4, -2, 0],
    [1, -1, 0], [2, -1, 0], [3, -1, 0], [4, -1, 0],
    [1, 0, 0], [2, 0, 0], [3, 0, 0],
    [3, 1, 0], [4, 1, 0], [2, 2, 0], [3, 2, 0]
  ];

  const accentMap = new Map([
    ["-4,2,0", 1], ["-2,2,0", 3], ["0,1,0", 4], ["2,-1,0", 2],
    ["3,-2,0", 1], ["3,1,0", 2], ["1,2,0", 4], ["-5,2,0", 3],
    ["2,2,0", 1], ["-1,0,0", 2]
  ]);

  parts.push('<g id="main-structure">');
  baseCluster.forEach((cell) => {
    if (rnd() > p.structureDensity && !accentMap.has(cell.join(","))) return;
    const key = cell.join(",");
    const elevated = ((cell[0] + cell[1]) % 5 === 0) ? 1 : 0;
    const faceMode = accentMap.get(key) || 0;
    const strong = faceMode > 0 || rnd() < 0.28;
    parts.push(cube(cell[0], cell[1], elevated, faceMode, strong, p, rnd));
  });
  parts.push("</g>");

  parts.push('<g id="integrated-triangular-facets">');
  const facets = [
    { cell: [-5, 2, 0], idx: [3, 5, 7], fill: p.accent, op: p.accentOpacity * 1.15 },
    { cell: [-4, 1, 0], idx: [1, 4, 7], fill: mix(p.lineColor, p.backgroundMid, 0.22), op: p.accentOpacity * 0.98 },
    { cell: [-1, 1, 0], idx: [0, 3, 5], fill: p.accent2, op: p.accentOpacity * 0.90 },
    { cell: [0, 2, 0], idx: [2, 4, 6], fill: p.accent, op: p.accentOpacity },
    { cell: [2, -1, 0], idx: [1, 5, 7], fill: p.accent2, op: p.accentOpacity * 1.15 },
    { cell: [3, 1, 0], idx: [2, 6, 7], fill: p.accent, op: p.accentOpacity },
    { cell: [1, 2, 0], idx: [0, 4, 6], fill: mix(p.lineColor, p.backgroundMid, 0.18), op: p.accentOpacity * 0.72 }
  ];

  facets.forEach((f) => {
    const v = vertices(f.cell[0], f.cell[1], f.cell[2], p);
    parts.push(poly(f.idx.map((i) => v[i]), {
      fill: f.fill,
      fillOpacity: clamp01(f.op),
      stroke: f.fill === p.accent || f.fill === p.accent2 ? p.accent2 : p.lineColor,
      strokeOpacity: p.latticeOpacity,
      sw: 1.05
    }));
  });
  parts.push("</g>");

  const emblemAnchor = iso(-1.2, 2.65, 1.1, p);
  parts.push('<g id="central-emblem">');
  parts.push(hexagon(emblemAnchor[0], emblemAnchor[1], Math.min(p.width, p.height) * 0.095, p, { strokeOpacity: p.latticeOpacity * 0.85, sw: 1.4 }));
  parts.push(brandMark(emblemAnchor[0], emblemAnchor[1], Math.min(p.width, p.height) / 1650, p.nodeOpacity * 1.2, p));
  parts.push("</g>");

  parts.push('<g id="subtle-dot-matrix">');
  const dotBaseX = p.width * 0.81;
  const dotBaseY = p.height * 0.61;
  const dotStep = Math.max(8, Math.round(Math.min(p.width, p.height) / 122));
  for (let row = 0; row < 16; row += 1) {
    for (let col = 0; col < 16; col += 1) {
      if (rnd() < 0.55 * p.structureDensity) {
        parts.push(circle(dotBaseX + col * dotStep, dotBaseY + row * dotStep, 1.05, mix(p.lineColor, p.backgroundMid, 0.18), p.nodeOpacity * 0.28));
      }
    }
  }
  parts.push("</g>");

  // Close the masked geometry group; everything below renders unmasked.
  parts.push("</g>");

  parts.push(`<linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0.42"/>
</linearGradient>
<rect x="0" y="${p.height - Math.round(p.height * 0.145)}" width="${p.width}" height="${Math.round(p.height * 0.145)}" fill="url(#bottomFade)"/>`);

  if (p.showBrand) {
    // Fixed bottom-right watermark — 10% in from the right, 10% up from the
    // bottom — so it never collides with the centered fingerprint aperture.
    const unit = Math.min(p.width, p.height);
    const anchorX = p.width * 0.90;
    const anchorY = p.height * 0.875;
    parts.push('<g id="brand" opacity="0.5">');
    if (p.showWordmark) {
      const fontSize = Math.max(18, unit * 0.018);
      const letterSpacing = Math.max(5, unit * 0.006);
      // Right-anchor the wordmark; place the mark just to its left.
      const wordWidth = 10 * (fontSize * 0.64) + 9 * letterSpacing;
      const markCx = anchorX - wordWidth - unit * 0.045;
      parts.push(brandMark(markCx, anchorY - fontSize * 0.33, unit / 3900, 0.9, p));
      parts.push(`<text x="${anchorX.toFixed(1)}" y="${anchorY.toFixed(1)}" text-anchor="end" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize.toFixed(1)}" letter-spacing="${letterSpacing.toFixed(1)}" fill="${p.accent2}" fill-opacity="0.78">GRAPHENEOS</text>`);
    } else {
      parts.push(brandMark(anchorX - unit * 0.02, anchorY - unit * 0.02, unit / 3900, 0.9, p));
    }
    parts.push("</g>");
  }

  parts.push(fingerprintAperture(p, latticeSegments));
  parts.push("</svg>");
  return parts.join("\n");
}
