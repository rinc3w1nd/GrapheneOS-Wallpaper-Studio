/* GrapheneOS Wallpaper Studio
 * Dependency-free browser implementation.
 * No npm. No build step. No backend. Just geometry and consequences.
 */

"use strict";

const DEVICE_PRESETS = [
  { id: "pixel-10a", label: "Pixel 10a", codename: "stallion", width: 1080, height: 2424, category: "phone", notes: "Practical A-series preset until replaced with confirmed official display value." },
  { id: "pixel-10", label: "Pixel 10", codename: "frankel", width: 1080, height: 2424, category: "phone" },
  { id: "pixel-10-pro", label: "Pixel 10 Pro", codename: "blazer", width: 1280, height: 2856, category: "phone" },
  { id: "pixel-10-pro-xl", label: "Pixel 10 Pro XL", codename: "mustang", width: 1344, height: 2992, category: "phone" },
  { id: "pixel-10-pro-fold-cover", label: "Pixel 10 Pro Fold cover", codename: "rango", width: 1080, height: 2364, category: "fold-outer" },
  { id: "pixel-10-pro-fold-inner", label: "Pixel 10 Pro Fold inner", codename: "rango", width: 2076, height: 2152, category: "fold-inner" },

  { id: "pixel-9a", label: "Pixel 9a", codename: "tegu", width: 1080, height: 2424, category: "phone" },
  { id: "pixel-9", label: "Pixel 9", codename: "tokay", width: 1080, height: 2424, category: "phone" },
  { id: "pixel-9-pro", label: "Pixel 9 Pro", codename: "caiman", width: 1280, height: 2856, category: "phone" },
  { id: "pixel-9-pro-xl", label: "Pixel 9 Pro XL", codename: "komodo", width: 1344, height: 2992, category: "phone" },
  { id: "pixel-9-pro-fold-cover", label: "Pixel 9 Pro Fold cover", codename: "comet", width: 1080, height: 2424, category: "fold-outer" },
  { id: "pixel-9-pro-fold-inner", label: "Pixel 9 Pro Fold inner", codename: "comet", width: 2076, height: 2152, category: "fold-inner" },

  { id: "pixel-8a", label: "Pixel 8a", codename: "akita", width: 1080, height: 2400, category: "phone" },
  { id: "pixel-8", label: "Pixel 8", codename: "shiba", width: 1080, height: 2400, category: "phone" },
  { id: "pixel-8-pro", label: "Pixel 8 Pro", codename: "husky", width: 1344, height: 2992, category: "phone" },

  { id: "pixel-fold-cover", label: "Pixel Fold cover", codename: "felix", width: 1080, height: 2092, category: "fold-outer" },
  { id: "pixel-fold-inner", label: "Pixel Fold inner", codename: "felix", width: 1840, height: 2208, category: "fold-inner" },
  { id: "pixel-tablet-landscape", label: "Pixel Tablet landscape", codename: "tangorpro", width: 2560, height: 1600, category: "tablet" },
  { id: "pixel-tablet-portrait", label: "Pixel Tablet portrait", codename: "tangorpro", width: 1600, height: 2560, category: "tablet" },

  { id: "pixel-7a", label: "Pixel 7a", codename: "lynx", width: 1080, height: 2400, category: "phone" },
  { id: "pixel-7", label: "Pixel 7", codename: "panther", width: 1080, height: 2400, category: "phone" },
  { id: "pixel-7-pro", label: "Pixel 7 Pro", codename: "cheetah", width: 1440, height: 3120, category: "phone" },

  { id: "pixel-6a", label: "Pixel 6a", codename: "bluejay", width: 1080, height: 2400, category: "phone" },
  { id: "pixel-6", label: "Pixel 6", codename: "oriole", width: 1080, height: 2400, category: "phone" },
  { id: "pixel-6-pro", label: "Pixel 6 Pro", codename: "raven", width: 1440, height: 3120, category: "phone" },

  { id: "custom", label: "Custom", width: 1344, height: 2992, category: "phone", notes: "Manual size." }
];

const PALETTE_PRESETS = [
  {
    id: "graphene-default",
    name: "Graphene Default",
    accent: "#77b69e",
    accent2: "#9ad4c2",
    lineColor: "#6d7882",
    backgroundTop: "#05070a",
    backgroundMid: "#090d12",
    backgroundBottom: "#0d1318"
  },
  {
    id: "auditor-green",
    name: "Auditor Green",
    accent: "#4fb477",
    accent2: "#a7f3c4",
    lineColor: "#6b7f76",
    backgroundTop: "#040806",
    backgroundMid: "#07110c",
    backgroundBottom: "#030604"
  },
  {
    id: "vanadium-cyan",
    name: "Vanadium Cyan",
    accent: "#47b8c9",
    accent2: "#b6f2ff",
    lineColor: "#657b84",
    backgroundTop: "#04080b",
    backgroundMid: "#071118",
    backgroundBottom: "#030609"
  },
  {
    id: "hardened-teal",
    name: "Hardened Teal",
    accent: "#2fb7a3",
    accent2: "#9ff3df",
    lineColor: "#667f7a",
    backgroundTop: "#040808",
    backgroundMid: "#071314",
    backgroundBottom: "#030606"
  },
  {
    id: "permission-amber",
    name: "Permission Amber",
    accent: "#d1a24c",
    accent2: "#ffe2a3",
    lineColor: "#827964",
    backgroundTop: "#090705",
    backgroundMid: "#130f08",
    backgroundBottom: "#050403"
  },
  {
    id: "sandbox-violet",
    name: "Sandbox Violet",
    accent: "#8f7bdc",
    accent2: "#d7cbff",
    lineColor: "#716d84",
    backgroundTop: "#07060c",
    backgroundMid: "#0f0d19",
    backgroundBottom: "#040307"
  },
  {
    id: "memory-slate",
    name: "Memory Slate",
    accent: "#8fa4b8",
    accent2: "#d8e7f4",
    lineColor: "#6e7b86",
    backgroundTop: "#06080a",
    backgroundMid: "#0c1116",
    backgroundBottom: "#040506"
  },
  {
    id: "monolith",
    name: "Monolith",
    accent: "#a8b0b5",
    accent2: "#eef3f5",
    lineColor: "#747b80",
    backgroundTop: "#050505",
    backgroundMid: "#0c0d0d",
    backgroundBottom: "#030303"
  },
  {
    id: "terminal-mint",
    name: "Terminal Mint",
    accent: "#59d98e",
    accent2: "#c1ffd7",
    lineColor: "#687c70",
    backgroundTop: "#030806",
    backgroundMid: "#07130d",
    backgroundBottom: "#020403"
  },
  {
    id: "oceanic-depth",
    name: "Oceanic Depth",
    accent: "#3aa7c8",
    accent2: "#98e8ff",
    lineColor: "#5f7883",
    backgroundTop: "#03070b",
    backgroundMid: "#06101a",
    backgroundBottom: "#020408"
  },
  {
    id: "aurora-low",
    name: "Aurora Low",
    accent: "#57c99b",
    accent2: "#a9c7ff",
    lineColor: "#677b82",
    backgroundTop: "#05070d",
    backgroundMid: "#0a1119",
    backgroundBottom: "#030407"
  },
  {
    id: "oxidized-copper",
    name: "Oxidized Copper",
    accent: "#4fb5a0",
    accent2: "#d89f6a",
    lineColor: "#7c7668",
    backgroundTop: "#070604",
    backgroundMid: "#10100b",
    backgroundBottom: "#030302"
  },
  {
    id: "cold-graphite",
    name: "Cold Graphite",
    accent: "#6aa6d8",
    accent2: "#c4e5ff",
    lineColor: "#687987",
    backgroundTop: "#05070a",
    backgroundMid: "#0a1016",
    backgroundBottom: "#030508"
  },
  {
    id: "jade-noir",
    name: "Jade Noir",
    accent: "#58b987",
    accent2: "#b9f6d0",
    lineColor: "#637b6f",
    backgroundTop: "#030705",
    backgroundMid: "#08120d",
    backgroundBottom: "#020403"
  },
  {
    id: "porcelain-night",
    name: "Porcelain Night",
    accent: "#bfc9c3",
    accent2: "#fff3df",
    lineColor: "#818680",
    backgroundTop: "#070707",
    backgroundMid: "#10100e",
    backgroundBottom: "#030303"
  },
  {
    id: "obsidian-ice",
    name: "Obsidian Ice",
    accent: "#7db7ff",
    accent2: "#d6ecff",
    lineColor: "#65778b",
    backgroundTop: "#03050a",
    backgroundMid: "#090f18",
    backgroundBottom: "#020307"
  },
  {
    id: "moonstone",
    name: "Moonstone",
    accent: "#9baec7",
    accent2: "#d8e5ff",
    lineColor: "#6d7788",
    backgroundTop: "#06070a",
    backgroundMid: "#0d1018",
    backgroundBottom: "#030407"
  },
  {
    id: "jade-pixel",
    name: "Jade Pixel",
    accent: "#89b58a",
    accent2: "#dbf5cf",
    lineColor: "#707d68",
    backgroundTop: "#060806",
    backgroundMid: "#0e130b",
    backgroundBottom: "#030403"
  },
  {
    id: "porcelain-pixel",
    name: "Porcelain Pixel",
    accent: "#d2c2a3",
    accent2: "#fff0cf",
    lineColor: "#857b68",
    backgroundTop: "#080704",
    backgroundMid: "#12100b",
    backgroundBottom: "#040302"
  },
  {
    id: "night-vision",
    name: "Night Vision",
    accent: "#7be06e",
    accent2: "#d3ffc9",
    lineColor: "#72806d",
    backgroundTop: "#030702",
    backgroundMid: "#091207",
    backgroundBottom: "#020401"
  },
  {
    id: "blueprint",
    name: "Blueprint",
    accent: "#5c9de6",
    accent2: "#b7d9ff",
    lineColor: "#607893",
    backgroundTop: "#030712",
    backgroundMid: "#081227",
    backgroundBottom: "#02040b"
  },
  {
    id: "infrared-muted",
    name: "Infrared Muted",
    accent: "#c46a64",
    accent2: "#ffc7bd",
    lineColor: "#816d68",
    backgroundTop: "#090504",
    backgroundMid: "#130b09",
    backgroundBottom: "#040202"
  },
  {
    id: "magnesium",
    name: "Magnesium",
    accent: "#b5b9a7",
    accent2: "#eff2dd",
    lineColor: "#7d8275",
    backgroundTop: "#060706",
    backgroundMid: "#0f100d",
    backgroundBottom: "#030403"
  },
  {
    id: "plasma-dim",
    name: "Plasma Dim",
    accent: "#b979d4",
    accent2: "#f0c9ff",
    lineColor: "#796982",
    backgroundTop: "#07050a",
    backgroundMid: "#100a16",
    backgroundBottom: "#030204"
  },
  {
    id: "cobalt-ash",
    name: "Cobalt Ash",
    accent: "#5d78cf",
    accent2: "#c3ceff",
    lineColor: "#666f86",
    backgroundTop: "#05060b",
    backgroundMid: "#0b0e18",
    backgroundBottom: "#020306"
  },
  {
    id: "sea-glass",
    name: "Sea Glass",
    accent: "#69c3b3",
    accent2: "#c7fff2",
    lineColor: "#69807b",
    backgroundTop: "#040807",
    backgroundMid: "#081412",
    backgroundBottom: "#020504"
  },
  {
    id: "desert-night",
    name: "Desert Night",
    accent: "#c99b63",
    accent2: "#ffe0ad",
    lineColor: "#83725f",
    backgroundTop: "#080604",
    backgroundMid: "#120d08",
    backgroundBottom: "#040302"
  },
  {
    id: "electric-lichen",
    name: "Electric Lichen",
    accent: "#a8d957",
    accent2: "#ecffbd",
    lineColor: "#7c8366",
    backgroundTop: "#050702",
    backgroundMid: "#0e1207",
    backgroundBottom: "#020301"
  },
  {
    id: "deep-space",
    name: "Deep Space",
    accent: "#6e83ff",
    accent2: "#d3d9ff",
    lineColor: "#666d8d",
    backgroundTop: "#03030a",
    backgroundMid: "#080a18",
    backgroundBottom: "#020207"
  },
  {
    id: "quiet-rose",
    name: "Quiet Rose",
    accent: "#c7798c",
    accent2: "#ffd0dc",
    lineColor: "#806a72",
    backgroundTop: "#080506",
    backgroundMid: "#110b0e",
    backgroundBottom: "#030203"
  },
  {
    id: "brass-patina",
    name: "Brass Patina",
    accent: "#b9a158",
    accent2: "#7fd1bd",
    lineColor: "#7d7866",
    backgroundTop: "#060604",
    backgroundMid: "#10100b",
    backgroundBottom: "#030302"
  },
  {
    id: "frosted-green",
    name: "Frosted Green",
    accent: "#9bd8b5",
    accent2: "#e1fff0",
    lineColor: "#728278",
    backgroundTop: "#040706",
    backgroundMid: "#0a110e",
    backgroundBottom: "#020403"
  },
  {
    id: "titanium-blue",
    name: "Titanium Blue",
    accent: "#7aa4bf",
    accent2: "#d5edfa",
    lineColor: "#6d7d86",
    backgroundTop: "#050708",
    backgroundMid: "#0c1114",
    backgroundBottom: "#030404"
  },
  {
    id: "warning-subtle",
    name: "Warning Subtle",
    accent: "#d7b84c",
    accent2: "#fff0a1",
    lineColor: "#857c5d",
    backgroundTop: "#080704",
    backgroundMid: "#111006",
    backgroundBottom: "#040302"
  },
  {
    id: "mint-and-lavender",
    name: "Mint and Lavender",
    accent: "#7fd7b2",
    accent2: "#c9bbff",
    lineColor: "#707887",
    backgroundTop: "#05070b",
    backgroundMid: "#0b1017",
    backgroundBottom: "#030407"
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    accent: "#2aa198",
    accent2: "#b58900",
    lineColor: "#586e75",
    backgroundTop: "#002b36",
    backgroundMid: "#073642",
    backgroundBottom: "#001f27"
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    accent: "#7aa2f7",
    accent2: "#9ece6a",
    lineColor: "#565f89",
    backgroundTop: "#11121d",
    backgroundMid: "#16161e",
    backgroundBottom: "#0b0c13"
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    accent: "#89b4fa",
    accent2: "#a6e3a1",
    lineColor: "#6c7086",
    backgroundTop: "#11111b",
    backgroundMid: "#181825",
    backgroundBottom: "#0b0b12"
  },
  {
    id: "nord-deep",
    name: "Nord Deep",
    accent: "#88c0d0",
    accent2: "#a3be8c",
    lineColor: "#4c566a",
    backgroundTop: "#242933",
    backgroundMid: "#2e3440",
    backgroundBottom: "#1b2029"
  },
  {
    id: "dracula-muted",
    name: "Dracula Muted",
    accent: "#8be9fd",
    accent2: "#bd93f9",
    lineColor: "#6272a4",
    backgroundTop: "#191a24",
    backgroundMid: "#282a36",
    backgroundBottom: "#101117"
  },
  {
    id: "gruvbox-dark",
    name: "Gruvbox Dark",
    accent: "#8ec07c",
    accent2: "#fabd2f",
    lineColor: "#928374",
    backgroundTop: "#1d2021",
    backgroundMid: "#282828",
    backgroundBottom: "#141617"
  }
];

function findPalette(id) {
  return PALETTE_PRESETS.find((p) => p.id === id) || PALETTE_PRESETS[0];
}

function paramsForPalette(paletteId, current) {
  const palette = findPalette(paletteId);
  return {
    ...current,
    paletteId,
    accent: palette.accent,
    accent2: palette.accent2,
    lineColor: palette.lineColor,
    backgroundTop: palette.backgroundTop,
    backgroundMid: palette.backgroundMid,
    backgroundBottom: palette.backgroundBottom
  };
}

const DEFAULT_PARAMS = {
  deviceId: "pixel-10-pro-xl",
  paletteId: "graphene-default",
  width: 1344,
  height: 2992,
  seed: 20260622,

  originXPct: 46,
  originYPct: 66,
  unitX: 106,
  unitY: 62,
  unitZ: 118,

  structureDensity: 0.72,
  topScaffoldOpacity: 0.065,
  latticeOpacity: 0.34,
  nodeOpacity: 0.45,
  accentOpacity: 0.18,

  backgroundTop: "#05070a",
  backgroundMid: "#090d12",
  backgroundBottom: "#0d1318",
  accent: "#77b69e",
  accent2: "#9ad4c2",
  lineColor: "#6d7882",

  showBrand: true,
  showWordmark: true,
  grain: true,
  fingerprintEnabled: true,
  useOfficialLogo: true,
  fingerprintXPct: 50,
  fingerprintYPct: 74.5,
  fingerprintRadiusPct: 15.5,
  fingerprintRingOpacity: 0.88,
  pngScale: 1.0,
  exportFormat: "image/webp",
  rasterQuality: 0.9,
};

const INPUT_IDS = [
  "device",
  "palette",
  "showBrand",
  "showWordmark",
  "grain",
  "fingerprintEnabled",
  "useOfficialLogo",
  "fingerprintXPct",
  "fingerprintYPct",
  "fingerprintRadiusPct",
  "fingerprintRingOpacity",
  "seed",
  "structureDensity",
  "unitX",
  "unitY",
  "unitZ",
  "geometryOffsetX",
  "geometryOffsetY",
  "geometryOffsetZ",
  "originXPct",
  "originYPct",
  "topScaffoldOpacity",
  "latticeOpacity",
  "nodeOpacity",
  "accent",
  "accent2",
  "lineColor",
  "backgroundTop",
  "backgroundMid",
  "backgroundBottom",
  "accentOpacity",
  "width",
  "height",
  "exportFormat",
  "rasterQuality",
  "pngScale"
];

function findDevice(id) {
  return DEVICE_PRESETS.find((d) => d.id === id) || DEVICE_PRESETS.find((d) => d.id === "pixel-10-pro-xl");
}

function paramsForDevice(deviceId, current) {
  const d = findDevice(deviceId);
  const ratio = Math.min(d.width / 1344, d.height / 2992);
  const isWide = d.category === "fold-inner" || d.category === "tablet";
  const scale = Math.max(0.85, Math.min(1.35, ratio));

  return {
    ...current,
    deviceId,
    width: d.width,
    height: d.height,
    originXPct: isWide ? 50 : 46,
    originYPct: isWide ? 64 : 66,
    unitX: Math.round((isWide ? 132 : 106) * scale),
    unitY: Math.round((isWide ? 78 : 62) * scale),
    unitZ: Math.round((isWide ? 135 : 118) * scale),
    topScaffoldOpacity: isWide ? 0.055 : 0.065,
    structureDensity: isWide ? 0.78 : 0.72
  };
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(hex) {
  const s = hex.replace("#", "").trim();
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
    .join("");
}

function mix(a, b, t) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  return rgbToHex(
    ar[0] + (br[0] - ar[0]) * t,
    ar[1] + (br[1] - ar[1]) * t,
    ar[2] + (br[2] - ar[2]) * t
  );
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(x, y, z, p) {
  const gx = x + (p.geometryOffsetX || 0);
  const gy = y + (p.geometryOffsetY || 0);
  const gz = z + (p.geometryOffsetZ || 0);
  const originX = p.width * (p.originXPct / 100);
  const originY = p.height * (p.originYPct / 100);
  return [
    (gx - gy) * p.unitX + originX,
    (gx + gy) * p.unitY - gz * p.unitZ + originY
  ];
}

function dashAttr(dash) {
  return dash ? ` stroke-dasharray="${dash}"` : "";
}

function poly(points, options = {}) {
  const pts = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = options.fill || "none";
  const stroke = options.stroke || "#6d7882";
  const strokeOpacity = options.strokeOpacity ?? 0.35;
  const fillOpacity = options.fillOpacity ?? 0;
  const sw = options.sw ?? 1.2;
  return `<polygon points="${pts}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}" stroke-width="${sw}"${dashAttr(options.dash)}/>`;
}

function line(a, b, options = {}) {
  const color = options.color || "#6d7882";
  const opacity = options.opacity ?? 0.35;
  const sw = options.sw ?? 1.1;
  return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${sw}"${dashAttr(options.dash)}/>`;
}

function circle(x, y, r, color, opacity) {
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" fill-opacity="${opacity}"/>`;
}

function hexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (30 + i * 60);
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return pts;
}

function hexagon(cx, cy, r, p, options = {}) {
  return poly(hexPoints(cx, cy, r), {
    stroke: options.stroke || p.lineColor,
    strokeOpacity: options.strokeOpacity ?? 0.25,
    fill: options.fill || "none",
    fillOpacity: options.fillOpacity ?? 0,
    sw: options.sw ?? 1.1,
    dash: options.dash
  });
}

function vertices(x, y, z, p) {
  return [
    iso(x, y, z, p),
    iso(x + 1, y, z, p),
    iso(x, y + 1, z, p),
    iso(x, y, z + 1, p),
    iso(x + 1, y + 1, z, p),
    iso(x + 1, y, z + 1, p),
    iso(x, y + 1, z + 1, p),
    iso(x + 1, y + 1, z + 1, p)
  ];
}

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


// Official GrapheneOS mark, inlined so it works under file:// (no fetch) and
// never taints the canvas on raster export. Source of truth: assets/grapheneos.svg.
// The path's own fill is intentionally dropped — officialGrapheneLogo() tints it
// with the accent so it reads on a dark background instead of black-on-black.
const OFFICIAL_LOGO_VIEWBOX = "0 0 2644.0798 2644";
const OFFICIAL_LOGO_PATH = "m771.67168 798 381.00032-217c-7.0001-21-12.0001-43-12.0001-67 0-92 67.0001-168 155.0001-184v-330h64v330c88 16 155 92 155 184 0 24-5 46-13 67l382 217c14-16 31-30 50-42 80-46 180-26 237 42l286-165 32 56-286 165c31 84-2 180-82 226-18 10-36 17-55 21v442c19 4 37 11 55 21 80 46 113 142 82 226l286 165-32 56-286-165c-57 68-157 88-237 42-19-12-36-26-50-42-127 72-254 145-382 217 8 21 13 43 13 67 0 92-67 168-155 184v330h-64v-330c-88-16-155.0001-92-155.0001-184 0-24 5-46 12.0001-67l-381.00032-217c-14 16-31 30-50 42-80 46-180 26-237-42l-285.99999 165-32-56 285.99999-165c-31-84 2-180 82-226 18-10 36-17 55-21v-442c-19-4-37-11-55-21-80-46-113-142-82-226l-285.99999-165 32-56 285.99999 165c57-68 157-88 237-42 19 12 36 26 50 42zm1080.00032 992c-18-50-15-108 14-157 30-52 81-84 136-92v-438c-55-8-106-40-136-92-29-49-32-107-14-157l-382-218c-35 40-85 65-142 65s-107-25-142-65l-382.00032 218c18 50 15 108-14 157-30 52-81 84-136 92v438c55 8 106 40 136 92 29 49 32 107 14 157l382.00032 218c35-40 85-65 142-65s107 25 142 65z";

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

  // Ring it out: precise hex frame at the boundary + a faint outer hairline.
  out.push(hexagon(cx, cy, voidR, p, { stroke: sensorGlow, strokeOpacity: ring * 0.9, sw: Math.max(2.0, unit * 0.0022) }));
  out.push(hexagon(cx, cy, voidR * 1.06, p, { stroke: mix(p.lineColor, p.accent2, 0.4), strokeOpacity: ring * 0.34, sw: Math.max(1.1, unit * 0.0013) }));

  out.push("</g>");
  return out.join("\n");
}

function generateWallpaperSvg(p) {
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
    const brand = iso(2.55, 2.7, 0.1, p);
    parts.push('<g id="brand" opacity="0.46">');
    parts.push(brandMark(brand[0] + 25, brand[1] + 20, Math.min(p.width, p.height) / 3900, 0.88, p));
    if (p.showWordmark) {
      parts.push(`<text x="${(brand[0] + 82).toFixed(1)}" y="${(brand[1] + 30).toFixed(1)}" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="${Math.max(18, Math.min(p.width, p.height) * 0.018).toFixed(1)}" letter-spacing="${Math.max(5, Math.min(p.width, p.height) * 0.006).toFixed(1)}" fill="${p.accent2}" fill-opacity="0.74">GRAPHENEOS</text>`);
    }
    parts.push("</g>");
  }

  parts.push(fingerprintAperture(p, latticeSegments));
  parts.push("</svg>");
  return parts.join("\n");
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function extForType(type) {
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg") return "jpg";
  return "png";
}

function encodeCanvas(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error("Raster export failed.")),
      mimeType,
      quality
    );
  });
}

// Some engines (notably Safari) have no WebP encoder in canvas.toBlob and
// silently fall back to lossless PNG, producing a multi-MB file that — because
// our filename used the requested extension — masquerades as a tiny ".webp".
// Encode, then if the engine ignored a *lossy* request, retry as JPEG (which
// every engine encodes, lossy and small). The caller names the file from the
// blob's actual type so it is never mislabeled.
async function encodeRaster(canvas, mimeType, quality) {
  let blob = await encodeCanvas(canvas, mimeType, quality);
  if (blob.type !== mimeType && mimeType === "image/webp") {
    try {
      const jpeg = await encodeCanvas(canvas, "image/jpeg", quality);
      if (jpeg.type === "image/jpeg") blob = jpeg;
    } catch {
      /* keep the original blob */
    }
  }
  return blob;
}

async function downloadSvgAsRaster(svg, baseName, width, height, mimeType = "image/png", quality) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not load generated SVG into browser image renderer."));
      image.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas rendering context is unavailable.");

    // Paint an opaque backdrop so a JPEG (or JPEG fallback) doesn't decode
    // transparent regions to black. Harmless for PNG/WebP — the opaque
    // wallpaper background covers it anyway.
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    // quality is honored only for lossy formats (image/webp, image/jpeg);
    // it is ignored for image/png.
    const rasterBlob = await encodeRaster(canvas, mimeType, quality);
    const filename = `${baseName}.${extForType(rasterBlob.type)}`;

    const rasterUrl = URL.createObjectURL(rasterBlob);
    const a = document.createElement("a");
    a.href = rasterUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(rasterUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}


function formatRangeValue(input) {
  const step = Number(input.step || 1);
  const value = Number(input.value || 0);
  if (!Number.isFinite(value)) return input.value;
  if (step < 0.01) return value.toFixed(3).replace(/\.?0+$/, "");
  if (step < 1) return value.toFixed(2).replace(/\.?0+$/, "");
  return String(Math.round(value));
}

function mobileNudgeAmount(input, direction) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = Number(input.step || 1);
  const span = max - min;

  // Use a meaningful tap increment instead of the tiny native slider step.
  // Humans do not want 170 taps to move a scanner target. Allegedly.
  let nudge = step;
  if (span <= 1) nudge = Math.max(step, 0.05);
  else if (span <= 6) nudge = Math.max(step, 0.25);
  else if (span <= 25) nudge = Math.max(step, 0.5);
  else if (span <= 100) nudge = Math.max(step, 1);
  else nudge = Math.max(step, Math.round(span / 100));

  return nudge * direction;
}

function setRangeValue(input, value) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const step = Number(input.step || 1);

  let next = Math.max(min, Math.min(max, value));
  if (Number.isFinite(step) && step > 0) {
    const snapped = Math.round((next - min) / step) * step + min;
    next = Math.max(min, Math.min(max, snapped));
  }

  input.value = String(Number(next.toFixed(4)));
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function syncMobileSteppers() {
  document.querySelectorAll(".mobile-stepper").forEach((stepper) => {
    const inputId = stepper.dataset.for;
    const input = document.getElementById(inputId);
    const value = stepper.querySelector(".stepper-value");
    if (input && value) value.textContent = formatRangeValue(input);
  });
}

function enhanceRangeControls() {
  document.querySelectorAll('input[type="range"]').forEach((input) => {
    if (input.dataset.stepperEnhanced === "true") return;
    input.dataset.stepperEnhanced = "true";

    const stepper = document.createElement("div");
    stepper.className = "mobile-stepper";
    stepper.dataset.for = input.id;
    stepper.innerHTML = `
      <button type="button" class="stepper-btn" data-dir="-1" aria-label="Decrease">−</button>
      <button type="button" class="stepper-value" data-open-picker="true" aria-label="Open precise control">${formatRangeValue(input)}</button>
      <button type="button" class="stepper-btn" data-dir="1" aria-label="Increase">+</button>
    `;

    input.insertAdjacentElement("afterend", stepper);
  });

  document.querySelectorAll(".mobile-stepper .stepper-btn").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const stepper = button.closest(".mobile-stepper");
      const input = document.getElementById(stepper.dataset.for);
      const dir = Number(button.dataset.dir || 1);
      setRangeValue(input, Number(input.value) + mobileNudgeAmount(input, dir));
    });
  });

  document.querySelectorAll(".mobile-stepper [data-open-picker]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      const stepper = button.closest(".mobile-stepper");
      const input = document.getElementById(stepper.dataset.for);
      openValuePicker(input);
    });
  });

  syncMobileSteppers();
}


function debounce(fn, ms) {
  let handle = 0;
  return (...args) => {
    window.clearTimeout(handle);
    handle = window.setTimeout(() => fn(...args), ms);
  };
}

const controls = document.querySelector("#controls");
const preview = document.querySelector("#preview");
const previewShell = document.querySelector("#preview-shell");
const deviceSelect = document.querySelector("#device");
const paletteSelect = document.querySelector("#palette");
const deviceName = document.querySelector("#device-name");
const deviceSize = document.querySelector("#device-size");

const inputs = Object.fromEntries(
  INPUT_IDS.map((id) => [id, document.querySelector(`#${id}`)])
);

let params = { ...DEFAULT_PARAMS };
let currentSvg = "";


function closeOtherAccordions(openDetails) {
  document.querySelectorAll("#controls details.control-card").forEach((details) => {
    if (details !== openDetails) details.open = false;
  });
}

function setupAccordions() {
  document.querySelectorAll("#controls details.control-card").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) closeOtherAccordions(details);
    });
  });
}

let activePickerInput = null;

function ensureValuePicker() {
  let picker = document.querySelector("#value-picker");
  if (picker) return picker;

  picker = document.createElement("dialog");
  picker.id = "value-picker";
  picker.innerHTML = `
    <form method="dialog" class="picker-card">
      <div class="picker-head">
        <strong id="picker-title">Adjust</strong>
        <button type="submit" value="close" class="secondary-action">Done</button>
      </div>
      <input id="picker-range" type="range">
      <div class="picker-row">
        <button type="button" id="picker-minus" class="stepper-btn">−</button>
        <input id="picker-number" type="number">
        <button type="button" id="picker-plus" class="stepper-btn">+</button>
      </div>
    </form>
  `;
  document.body.appendChild(picker);

  const range = picker.querySelector("#picker-range");
  const number = picker.querySelector("#picker-number");
  const minus = picker.querySelector("#picker-minus");
  const plus = picker.querySelector("#picker-plus");

  function apply(value) {
    if (!activePickerInput) return;
    setRangeValue(activePickerInput, Number(value));
    range.value = activePickerInput.value;
    number.value = activePickerInput.value;
    syncControlReadouts();
  }

  range.addEventListener("input", () => apply(range.value));
  number.addEventListener("input", () => apply(number.value));
  minus.addEventListener("click", () => {
    if (!activePickerInput) return;
    apply(Number(activePickerInput.value) - mobileNudgeAmount(activePickerInput, 1));
  });
  plus.addEventListener("click", () => {
    if (!activePickerInput) return;
    apply(Number(activePickerInput.value) + mobileNudgeAmount(activePickerInput, 1));
  });

  picker.addEventListener("close", () => {
    activePickerInput = null;
  });

  return picker;
}

function openValuePicker(input) {
  const picker = ensureValuePicker();
  const title = picker.querySelector("#picker-title");
  const range = picker.querySelector("#picker-range");
  const number = picker.querySelector("#picker-number");
  const label = input.closest("label")?.querySelector("span")?.textContent || input.id;

  activePickerInput = input;
  title.textContent = label;

  ["min", "max", "step"].forEach((attr) => {
    if (input.hasAttribute(attr)) {
      range.setAttribute(attr, input.getAttribute(attr));
      number.setAttribute(attr, input.getAttribute(attr));
    } else {
      range.removeAttribute(attr);
      number.removeAttribute(attr);
    }
  });

  range.value = input.value;
  number.value = input.value;

  if (typeof picker.showModal === "function") picker.showModal();
  else picker.setAttribute("open", "");
}

function setupToggleLabels() {
  document.querySelectorAll(".chip-toggle input").forEach((input) => {
    const sync = () => input.closest(".chip-toggle")?.classList.toggle("is-on", input.checked);
    input.addEventListener("change", sync);
    sync();
  });
}

function syncFingerprintVisibility() {
  const enabled = document.querySelector("#fingerprintEnabled")?.checked;
  document.body.classList.toggle("fingerprint-off", !enabled);
}


function syncControlReadouts() {
  document.querySelectorAll('input[type="range"]').forEach((input) => {
    const label = input.closest("label");
    if (label) {
      label.dataset.value = input.value;
    }
  });
  syncMobileSteppers();
}

function initDeviceSelect() {
  DEVICE_PRESETS.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.id;
    option.textContent = device.codename ? `${device.label} (${device.codename})` : device.label;
    deviceSelect.appendChild(option);
  });
}

function initPaletteSelect() {
  PALETTE_PRESETS.forEach((palette) => {
    const option = document.createElement("option");
    option.value = palette.id;
    option.textContent = palette.name;
    paletteSelect.appendChild(option);
  });
}

function setInputsFromParams(p) {
  deviceSelect.value = p.deviceId;
  paletteSelect.value = p.paletteId || "custom";
  INPUT_IDS.forEach((id) => {
    const el = inputs[id];
    const value = p[id];
    if (el.type === "checkbox") {
      el.checked = Boolean(value);
    } else {
      el.value = String(value);
    }
  });
}

function readParamsFromInputs() {
  return {
    ...params,
    width: Number(inputs.width.value),
    height: Number(inputs.height.value),
    seed: Number(inputs.seed.value),

    unitX: Number(inputs.unitX.value),
    unitY: Number(inputs.unitY.value),
    unitZ: Number(inputs.unitZ.value),

    originXPct: Number(inputs.originXPct.value),
    originYPct: Number(inputs.originYPct.value),

    structureDensity: Number(inputs.structureDensity.value),
    latticeOpacity: Number(inputs.latticeOpacity.value),
    nodeOpacity: Number(inputs.nodeOpacity.value),
    accentOpacity: Number(inputs.accentOpacity.value),
    topScaffoldOpacity: Number(inputs.topScaffoldOpacity.value),

    fingerprintEnabled: inputs.fingerprintEnabled.checked,
    useOfficialLogo: inputs.useOfficialLogo.checked,
    fingerprintXPct: Number(inputs.fingerprintXPct.value),
    fingerprintYPct: Number(inputs.fingerprintYPct.value),
    fingerprintRadiusPct: Number(inputs.fingerprintRadiusPct.value),
    fingerprintRingOpacity: Number(inputs.fingerprintRingOpacity.value),

    geometryOffsetX: Number(inputs.geometryOffsetX.value),
    geometryOffsetY: Number(inputs.geometryOffsetY.value),
    geometryOffsetZ: Number(inputs.geometryOffsetZ.value),

    pngScale: Number(inputs.pngScale.value),
    exportFormat: inputs.exportFormat.value,
    rasterQuality: Number(inputs.rasterQuality.value),

    accent: inputs.accent.value,
    accent2: inputs.accent2.value,
    lineColor: inputs.lineColor.value,
    backgroundTop: inputs.backgroundTop.value,
    backgroundMid: inputs.backgroundMid.value,
    backgroundBottom: inputs.backgroundBottom.value,

    showBrand: inputs.showBrand.checked,
    showWordmark: inputs.showWordmark.checked,
    grain: inputs.grain.checked
  };
}

function setPaletteCustom() {
  if (!PALETTE_PRESETS.some((palette) => palette.id === "custom")) {
    const option = document.createElement("option");
    option.value = "custom";
    option.textContent = "Custom";
    paletteSelect.appendChild(option);
  }
  paletteSelect.value = "custom";
}

function filenameBase(p) {
  return `grapheneos-wallpaper-${p.deviceId}-${p.width}x${p.height}`;
}

function render() {
  params = readParamsFromInputs();
  currentSvg = generateWallpaperSvg(params);
  preview.innerHTML = currentSvg;

  const svgEl = preview.querySelector("svg");
  if (svgEl) {
    svgEl.setAttribute("role", "img");
    svgEl.setAttribute("aria-label", "Generated GrapheneOS geometric wallpaper");
  }

  const d = findDevice(params.deviceId);
  deviceName.textContent = d.codename ? `${d.label} (${d.codename})` : d.label;
  deviceSize.textContent = `${params.width} × ${params.height}`;
  preview.style.aspectRatio = `${params.width} / ${params.height}`;
  if (previewShell) {
    previewShell.style.setProperty("--wallpaper-ratio", `${params.width} / ${params.height}`);
  }
  // State is intentionally not written to the URL. Reload resets controls.
  syncControlReadouts();
}

function initApp() {
  initDeviceSelect();
  initPaletteSelect();
  enhanceRangeControls();
  setupAccordions();
  setupToggleLabels();
  setInputsFromParams(params);
  syncFingerprintVisibility();
  render();
}

initApp();

const renderSoon = debounce(render, 40);

controls.addEventListener("input", (event) => {
  if (event.target && event.target.id === "device") return;
  if (event.target && ["accent", "accent2", "lineColor", "backgroundTop", "backgroundMid", "backgroundBottom"].includes(event.target.id)) {
    setPaletteCustom();
  }
  syncControlReadouts();
  syncFingerprintVisibility();
  setupToggleLabels();
  renderSoon();
});

controls.addEventListener("change", () => {
  syncFingerprintVisibility();
  setupToggleLabels();
  renderSoon();
});

deviceSelect.addEventListener("change", () => {
  params = paramsForDevice(deviceSelect.value, readParamsFromInputs());
  setInputsFromParams(params);
  render();
});

paletteSelect.addEventListener("change", () => {
  if (paletteSelect.value === "custom") return;
  params = paramsForPalette(paletteSelect.value, readParamsFromInputs());
  setInputsFromParams(params);
  render();
});

document.querySelector("#download-svg").addEventListener("click", () => {
  render();
  downloadText(`${filenameBase(params)}.svg`, currentSvg, "image/svg+xml;charset=utf-8");
});

document.querySelector("#download-png").addEventListener("click", async () => {
  render();
  const scale = Math.max(0.35, Math.min(1, params.pngScale || 1));
  const mimeType = params.exportFormat || "image/webp";
  const quality = Math.max(0.5, Math.min(0.95, params.rasterQuality || 0.82));

  // Pass a base name with no extension — downloadSvgAsRaster appends the
  // extension that matches the bytes actually produced (handles WebP→JPEG
  // fallback on engines without a WebP encoder).
  await downloadSvgAsRaster(
    currentSvg,
    `${filenameBase(params)}@${Math.round(scale * 100)}pct-q${Math.round(quality * 100)}`,
    Math.round(params.width * scale),
    Math.round(params.height * scale),
    mimeType,
    quality
  );
});

document.querySelector("#reset-controls").addEventListener("click", () => {
  params = { ...DEFAULT_PARAMS };
  setInputsFromParams(params);
  syncFingerprintVisibility();
  setupToggleLabels();
  render();
});
