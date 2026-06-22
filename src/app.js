/* app.js — UI wiring, style dispatcher, and raster export.
 * Loaded last, after core.js and the style generators. */
"use strict";

function generateWallpaperSvg(p) {
  const reg = STYLES[p.style];
  if (reg && typeof reg.generate === "function") return reg.generate(p);
  return p.style === "chic" ? generateChicSvg(p) : generateLatticeSvg(p);
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

function syncValueChips() {
  document.querySelectorAll(".value-chip").forEach((chip) => {
    const input = document.getElementById(chip.dataset.for);
    if (input) chip.textContent = formatRangeValue(input);
  });
}

// Each range row gets a tappable value chip showing the current value; tapping
// it opens the precise dialog. The slider stays visible and drag-driven
// (touch-action:none in CSS keeps slider drags from scrolling the panel).
function enhanceRangeControls() {
  document.querySelectorAll('input[type="range"]').forEach((input) => {
    if (input.dataset.chipEnhanced === "true" || !input.id) return;
    input.dataset.chipEnhanced = "true";

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "value-chip";
    chip.dataset.for = input.id;
    chip.setAttribute("aria-label", "Open precise control");
    chip.textContent = formatRangeValue(input);
    chip.addEventListener("click", () => openValuePicker(input));

    input.insertAdjacentElement("afterend", chip);
  });

  syncValueChips();
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
const chicPresetSelect = document.querySelector("#chicPreset");
const deviceName = document.querySelector("#device-name");
const deviceSize = document.querySelector("#device-size");

// Populated in initApp() after style controls are injected (so registered
// styles' inputs exist before the map is built).
let inputs = {};

function buildInputsMap() {
  inputs = {};
  allInputIds().forEach((id) => {
    inputs[id] = document.querySelector(`#${id}`);
  });
}

// Inject each registered style's control HTML into the right panel, wrapped in
// a [data-styles="<id>"] group so style switching shows/hides it.
function injectStyleControls() {
  const containers = {
    setup: document.querySelector("#style-setup-controls"),
    form: document.querySelector("#style-form-controls"),
    color: document.querySelector("#style-color-controls"),
  };
  Object.values(STYLES).forEach((s) => {
    const html = s.controlsHtml || {};
    ["setup", "form", "color"].forEach((panel) => {
      if (!html[panel] || !containers[panel]) return;
      const wrap = document.createElement("div");
      wrap.dataset.styles = s.id;
      wrap.className = "style-group";
      wrap.innerHTML = html[panel];
      containers[panel].appendChild(wrap);
    });
  });
}

// Build the Style selector buttons from built-ins + registered styles.
function buildStyleToggle() {
  const toggle = document.querySelector(".style-toggle");
  if (!toggle) return;
  toggle.innerHTML = "";
  allStyleOptions().forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "style-opt";
    btn.dataset.style = opt.id;
    btn.textContent = opt.label;
    toggle.appendChild(btn);
  });
}

let params = {};
let currentSvg = "";


function setupTabs() {
  const tabbar = document.querySelector(".tabbar");
  if (!tabbar) return;
  const tabs = Array.from(tabbar.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".panel"));

  function activate(name, index) {
    tabbar.style.setProperty("--active", String(index));
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab.dataset.tab, index));
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
        <button type="submit" value="close" class="ghost-btn small">Done</button>
      </div>
      <input id="picker-range" type="range">
      <div class="picker-row">
        <button type="button" id="picker-minus" class="picker-btn">−</button>
        <input id="picker-number" type="number">
        <button type="button" id="picker-plus" class="picker-btn">+</button>
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
  syncValueChips();
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

function initChicPresetSelect() {
  CHIC_PRESETS.forEach((c) => {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = c.name;
    chicPresetSelect.appendChild(option);
  });
}

function applyStyle(style) {
  [...document.body.classList].forEach((c) => {
    if (c.startsWith("style-")) document.body.classList.remove(c);
  });
  document.body.classList.add(`style-${style}`);
  document.querySelectorAll(".style-opt").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.style === style);
  });
  // Show only the active style's control groups.
  document.querySelectorAll("[data-styles]").forEach((el) => {
    el.hidden = !el.dataset.styles.split(/\s+/).includes(style);
  });
}

function setupStyleToggle() {
  document.querySelectorAll(".style-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      params = readParamsFromInputs();
      params.style = btn.dataset.style;
      applyStyle(params.style);
      render();
    });
  });
}

function setChicPresetCustom() {
  if (!CHIC_PRESETS.some((c) => c.id === "custom")) {
    const option = document.createElement("option");
    option.value = "custom";
    option.textContent = "Custom";
    chicPresetSelect.appendChild(option);
  }
  chicPresetSelect.value = "custom";
}

// Generic per-style color presets: any registered style with a `presets` array
// and a <select id="<id>Preset"> gets a populated dropdown that applies a color
// set; editing one of its `colorIds` switches the dropdown to Custom.
function stylesWithPresets() {
  return Object.values(STYLES).filter((s) => Array.isArray(s.presets) && s.presets.length);
}

function initStylePresets() {
  stylesWithPresets().forEach((s) => {
    const sel = document.getElementById(`${s.id}Preset`);
    if (!sel) return;
    s.presets.forEach((pr) => {
      const o = document.createElement("option");
      o.value = pr.id;
      o.textContent = pr.name;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      if (sel.value === "custom") return;
      const pr = s.presets.find((x) => x.id === sel.value);
      if (!pr) return;
      params = { ...readParamsFromInputs(), ...pr.set };
      params[`${s.id}Preset`] = sel.value;
      setInputsFromParams(params);
      render();
    });
  });
}

function setStylePresetCustom(styleId) {
  const sel = document.getElementById(`${styleId}Preset`);
  if (!sel) return;
  if (!Array.from(sel.options).some((o) => o.value === "custom")) {
    const o = document.createElement("option");
    o.value = "custom";
    o.textContent = "Custom";
    sel.appendChild(o);
  }
  sel.value = "custom";
}

function styleOwningColorId(id) {
  return Object.values(STYLES).find((s) => (s.colorIds || []).includes(id));
}

function setInputsFromParams(p) {
  deviceSelect.value = p.deviceId;
  paletteSelect.value = p.paletteId || "custom";
  chicPresetSelect.value = p.chicPreset || "custom";
  stylesWithPresets().forEach((s) => {
    const sel = document.getElementById(`${s.id}Preset`);
    if (sel) sel.value = p[`${s.id}Preset`] || "custom";
  });
  applyStyle(p.style || "lattice");
  allInputIds().forEach((id) => {
    const el = inputs[id];
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = Boolean(p[id]);
    } else if (p[id] !== undefined) {
      el.value = String(p[id]);
    }
  });
}

// Generic read: coerce each registered input by its element type. Non-input
// state (style, deviceId, paletteId, chicPreset) is carried via the spread.
function readParamsFromInputs() {
  const out = { ...params };
  allInputIds().forEach((id) => {
    const el = inputs[id];
    if (!el) return;
    if (el.type === "checkbox") out[id] = el.checked;
    else if (el.type === "range" || el.type === "number") out[id] = Number(el.value);
    else out[id] = el.value;
  });
  return out;
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
  initChicPresetSelect();
  injectStyleControls();   // add registered styles' control DOM first
  buildStyleToggle();      // generate Style selector buttons
  initStylePresets();      // populate per-style color-preset dropdowns
  buildInputsMap();        // now every input (built-in + style) exists
  enhanceRangeControls();
  setupTabs();
  setupStyleToggle();
  setupToggleLabels();
  params = { ...effectiveDefaults() };
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
  if (event.target && ["chicTileColor", "chicAccentColor"].includes(event.target.id)) {
    setChicPresetCustom();
  }
  // Editing any style's color switches its preset dropdown to Custom.
  if (event.target) {
    const owner = styleOwningColorId(event.target.id);
    if (owner) setStylePresetCustom(owner.id);
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

chicPresetSelect.addEventListener("change", () => {
  if (chicPresetSelect.value === "custom") return;
  params = paramsForChicPreset(chicPresetSelect.value, readParamsFromInputs());
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
  params = { ...effectiveDefaults() };
  setInputsFromParams(params);
  syncFingerprintVisibility();
  setupToggleLabels();
  render();
});
