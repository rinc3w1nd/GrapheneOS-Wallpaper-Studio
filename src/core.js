/* core.js — shared data, primitives, color, noise, and the inlined logo.
 * Loaded before the style generators and app.js. Classic script: these
 * top-level declarations are visible to the later scripts via the shared
 * global scope (no ES modules, so file:// keeps working). */
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
  sensorLogo: false,
  fingerprintXPct: 50,
  fingerprintYPct: 72.5,
  compositionXPct: 50,
  compositionYPct: 72.5,
  fingerprintRadiusPct: 10, // 10 without the sensor logo; toggle sets 16 when logo on
  fingerprintRingOpacity: 0.88,
  pngScale: 1.0,
  exportFormat: "image/webp",
  rasterQuality: 0.9,

  // Chic style (tessellated GOS-mark grid). style switches generators.
  style: "lattice",
  chicTheme: "dark",
  chicPreset: "summer",
  chicTileColor: "#c8642d",
  chicAccentColor: "#28a0b4",
  chicFill: "gradient",
  chicEffect: "none",
  chicDeep: false,
  chicWeave: true,
  chicWeaveDeg: 3,
  chicSpacing: 1.6,
  chicTileScale: 1.0,
  chicCenterFill: true,
};

const CHIC_PRESETS = [
  { id: "summer", name: "Summer", theme: "dark", tile: "#c8642d", accent: "#28a0b4" },
  { id: "autumn", name: "Autumn", theme: "dark", tile: "#3c645a", accent: "#a0501e" },
  { id: "spring", name: "Spring", theme: "dark", tile: "#7d8cb4", accent: "#b48c64" },
  { id: "winter", name: "Winter", theme: "dark", tile: "#a03c4b", accent: "#8ca0c8" },
  { id: "gold", name: "Gold", theme: "dark", tile: "#2a2a2a", accent: "#a08c3c" },
  { id: "steel", name: "Steel", theme: "dark", tile: "#2a2a2a", accent: "#9aa3ad" },
  { id: "red", name: "Red", theme: "dark", tile: "#2a2a2a", accent: "#8c2828" },
  { id: "porcelain", name: "Porcelain", theme: "light", tile: "#8a8a8a", accent: "#3a6f64" },
];

function findChicPreset(id) {
  return CHIC_PRESETS.find((c) => c.id === id) || CHIC_PRESETS[0];
}

function paramsForChicPreset(presetId, current) {
  const c = findChicPreset(presetId);
  return { ...current, chicPreset: presetId, chicTheme: c.theme, chicTileColor: c.tile, chicAccentColor: c.accent };
}

// Note: the device/palette <select>s are NOT in this list — they are keyed by
// deviceId/paletteId and set explicitly in setInputsFromParams. Including them
// here would make the generic loop overwrite the selection with String(p.device)
// = "undefined", blanking the dropdown.
const INPUT_IDS = [
  "showBrand",
  "showWordmark",
  "grain",
  "fingerprintEnabled",
  "useOfficialLogo",
  "sensorLogo",
  "fingerprintXPct",
  "fingerprintYPct",
  "compositionXPct",
  "compositionYPct",
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
  "pngScale",
  // Chic style controls (style + chicPreset are handled separately, like
  // device/palette).
  "chicTheme",
  "chicFill",
  "chicEffect",
  "chicTileColor",
  "chicAccentColor",
  "chicTileScale",
  "chicSpacing",
  "chicWeaveDeg",
  "chicWeave",
  "chicDeep",
  "chicCenterFill"
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

// Official GrapheneOS mark, inlined so it works under file:// (no fetch) and
// never taints the canvas on raster export. Source of truth: assets/grapheneos.svg.
// The path's own fill is intentionally dropped — officialGrapheneLogo() tints it
// with the accent so it reads on a dark background instead of black-on-black.
const OFFICIAL_LOGO_VIEWBOX = "0 0 2644.0798 2644";
const OFFICIAL_LOGO_PATH = "m771.67168 798 381.00032-217c-7.0001-21-12.0001-43-12.0001-67 0-92 67.0001-168 155.0001-184v-330h64v330c88 16 155 92 155 184 0 24-5 46-13 67l382 217c14-16 31-30 50-42 80-46 180-26 237 42l286-165 32 56-286 165c31 84-2 180-82 226-18 10-36 17-55 21v442c19 4 37 11 55 21 80 46 113 142 82 226l286 165-32 56-286-165c-57 68-157 88-237 42-19-12-36-26-50-42-127 72-254 145-382 217 8 21 13 43 13 67 0 92-67 168-155 184v330h-64v-330c-88-16-155.0001-92-155.0001-184 0-24 5-46 12.0001-67l-381.00032-217c-14 16-31 30-50 42-80 46-180 26-237-42l-285.99999 165-32-56 285.99999-165c-31-84 2-180 82-226 18-10 36-17 55-21v-442c-19-4-37-11-55-21-80-46-113-142-82-226l-285.99999-165 32-56 285.99999 165c57-68 157-88 237-42 19 12 36 26 50 42zm1080.00032 992c-18-50-15-108 14-157 30-52 81-84 136-92v-438c-55-8-106-40-136-92-29-49-32-107-14-157l-382-218c-35 40-85 65-142 65s-107-25-142-65l-382.00032 218c18 50 15 108-14 157-30 52-81 84-136 92v438c55 8 106 40 136 92 29 49 32 107 14 157l382.00032 218c35-40 85-65 142-65s107 25 142 65z";

function scaleColor(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * f, g * f, b * f);
}

function complementaryPair(hex) {
  const [r, g, b] = hexToRgb(hex);
  return [rgbToHex(r * 1.2, g * 0.9, b * 0.7), rgbToHex(r * 0.7, g * 0.9, b * 1.2)];
}

function flatHexPoints(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 180) * (i * 60);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// Deterministic 2D value noise in [0,1) with smooth (smoothstep) interpolation.
// Shared by the topographic and flow-field styles. Returns a sampler fn.
function valueNoise2D(seed) {
  function hash(ix, iy) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) ^ Math.imul(seed | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function smooth(t) { return t * t * (3 - 2 * t); }
  return function sample(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = hash(x0, y0);
    const b = hash(x0 + 1, y0);
    const c = hash(x0, y0 + 1);
    const d = hash(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

// ---- Style registry -------------------------------------------------------
// New wallpaper styles self-register from src/styles/<id>.js via:
//   registerStyle({ id, label, generate, defaults, inputIds, controlsHtml })
// - generate(p) -> SVG string
// - defaults: params merged into DEFAULT_PARAMS
// - inputIds: control element ids this style owns (for the inputs map + read)
// - controlsHtml: { setup?, form?, color? } HTML strings injected into the
//   matching control panel, wrapped in a [data-styles="<id>"] group.
// Built-in lattice/chic are NOT registered (they keep hand-written controls).
const STYLES = {};
function registerStyle(def) { STYLES[def.id] = def; }

const BUILTIN_STYLE_OPTIONS = [
  { id: "lattice", label: "Lattice" },
  { id: "chic", label: "Chic" },
];

function allStyleOptions() {
  return BUILTIN_STYLE_OPTIONS.concat(
    Object.values(STYLES).map((s) => ({ id: s.id, label: s.label }))
  );
}

function effectiveDefaults() {
  const out = { ...DEFAULT_PARAMS };
  Object.values(STYLES).forEach((s) => Object.assign(out, s.defaults || {}));
  return out;
}

function allInputIds() {
  const ids = INPUT_IDS.slice();
  Object.values(STYLES).forEach((s) => (s.inputIds || []).forEach((id) => ids.push(id)));
  return ids;
}

// ---- Shared sensor aperture --------------------------------------------------
// Every style treats the fingerprint sensor as a focal void. When enabled, wrap
// the style's content group in sensorMaskAttr(p) and add sensorMaskDef(p) to the
// SVG (clears a soft disc), then draw sensorRing(p, color) on top to frame it.
function sensorGeom(p) {
  const unit = Math.min(p.width, p.height);
  return {
    unit,
    cx: p.width * ((p.fingerprintXPct ?? 50) / 100),
    cy: p.height * ((p.fingerprintYPct ?? 72.5) / 100),
    r: unit * ((p.fingerprintRadiusPct ?? 10) / 100),
    on: p.fingerprintEnabled !== false,
  };
}

function sensorMaskDef(p, id) {
  const g = sensorGeom(p);
  if (!g.on) return "";
  id = id || "sensorMask";
  return (
    `<radialGradient id="${id}Fade" gradientUnits="userSpaceOnUse" cx="${g.cx.toFixed(1)}" cy="${g.cy.toFixed(1)}" r="${g.r.toFixed(1)}">` +
    `<stop offset="0%" stop-color="black"/><stop offset="72%" stop-color="black"/><stop offset="100%" stop-color="white"/></radialGradient>` +
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${p.width}" height="${p.height}">` +
    `<rect x="0" y="0" width="${p.width}" height="${p.height}" fill="white"/>` +
    `<circle cx="${g.cx.toFixed(1)}" cy="${g.cy.toFixed(1)}" r="${g.r.toFixed(1)}" fill="url(#${id}Fade)"/></mask>`
  );
}

function sensorMaskAttr(p, id) {
  return sensorGeom(p).on ? ` mask="url(#${id || "sensorMask"})"` : "";
}

// The sensor frame (drawn only when the Fingerprint toggle is on):
//  - Sensor logo on  -> the official GrapheneOS logo SVG around the sensor.
//  - Sensor logo off -> a hex or circle ring per the style's `shape`.
// `color` is a light accent; `shape` is "hex" or "circle" (default circle).
function sensorRing(p, color, accent2, shape) {
  const g = sensorGeom(p);
  if (!g.on) return "";
  if (p.sensorLogo) return sensorMark(p, color);
  const op = clamp01(p.fingerprintRingOpacity ?? 0.88);
  const sw = Math.max(2, g.unit * 0.0022);
  const glow = accent2 || color;
  if (shape === "hex") {
    return (
      `<g id="sensor-ring" fill="none">` +
      hexagon(g.cx, g.cy, g.r, p, { stroke: color, strokeOpacity: op, sw }) +
      hexagon(g.cx, g.cy, g.r * 1.12, p, { stroke: glow, strokeOpacity: op * 0.3, sw: sw * 0.6 }) +
      `</g>`
    );
  }
  return (
    `<g id="sensor-ring" fill="none">` +
    `<circle cx="${g.cx.toFixed(1)}" cy="${g.cy.toFixed(1)}" r="${g.r.toFixed(1)}" stroke="${color}" stroke-opacity="${op.toFixed(3)}" stroke-width="${sw.toFixed(2)}"/>` +
    `<circle cx="${g.cx.toFixed(1)}" cy="${g.cy.toFixed(1)}" r="${(g.r * 1.13).toFixed(1)}" stroke="${glow}" stroke-opacity="${(op * 0.28).toFixed(3)}" stroke-width="${(sw * 0.6).toFixed(2)}"/>` +
    `</g>`
  );
}

// The official GrapheneOS logo SVG, scaled so its central hexagon frames the
// sensor (sensor sits in the logo's open center; the arms radiate outward).
// Shown when the "Sensor logo" toggle is on. SENSOR_LOGO_SCALE = 3.3 matches the
// Chic accent-tile sizing (unit * radiusPct/100 * 3.3), which is correctly sized.
const SENSOR_LOGO_SCALE = 3.3;
function sensorMark(p, color) {
  const g = sensorGeom(p);
  if (!g.on || !p.sensorLogo) return "";
  const op = clamp01(p.fingerprintRingOpacity ?? 0.88);
  const size = g.r * SENSOR_LOGO_SCALE;
  const C = 2644.0798 / 2; // logo viewBox center
  const scale = size / (C * 2);
  return (
    `<g id="sensor-mark" opacity="${op.toFixed(3)}" transform="translate(${g.cx.toFixed(1)} ${g.cy.toFixed(1)}) scale(${scale.toFixed(5)}) translate(${(-C).toFixed(1)} ${(-C).toFixed(1)})">` +
    `<path d="${OFFICIAL_LOGO_PATH}" fill="${color}" fill-rule="nonzero"/></g>`
  );
}

// Shared GrapheneOS corner watermark (inlined mark + wordmark), bottom-right
// (10% in from the right, 12.5% up from the bottom). Styles call this to
// integrate branding consistently. `color` tints both the mark and wordmark.
function cornerBrand(p, color, opacity) {
  const unit = Math.min(p.width, p.height);
  const anchorX = p.width * 0.90;
  const anchorY = p.height * 0.875;
  const fontSize = Math.max(18, unit * 0.018);
  const letterSpacing = Math.max(5, unit * 0.006);
  const wordWidth = 10 * (fontSize * 0.64) + 9 * letterSpacing;
  const C = 2644.0798 / 2; // logo viewBox center
  const markSize = Math.max(44, unit * 0.052);
  const markCx = anchorX - wordWidth - markSize * 0.75;
  const markCy = anchorY - fontSize * 0.34;
  const scale = markSize / (C * 2);
  const op = opacity ?? 0.55;
  return (
    `<g id="corner-brand" opacity="${op}">` +
    `<g transform="translate(${markCx.toFixed(1)} ${markCy.toFixed(1)}) scale(${scale.toFixed(5)}) translate(${(-C).toFixed(1)} ${(-C).toFixed(1)})"><path d="${OFFICIAL_LOGO_PATH}" fill="${color}" fill-rule="nonzero"/></g>` +
    `<text x="${anchorX.toFixed(1)}" y="${anchorY.toFixed(1)}" text-anchor="end" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize.toFixed(1)}" letter-spacing="${letterSpacing.toFixed(1)}" fill="${color}" fill-opacity="0.85">GRAPHENEOS</text>` +
    `</g>`
  );
}
