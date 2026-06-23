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
const renderBadge = document.querySelector("#render-badge");

// Only the canvas-raster styles (see canvas-vs-SVG policy) take long enough to
// warrant a "Rendering…" badge; pure-SVG styles finish in a few ms and would
// just flash it. Badge shows during the deferred render and clears when done.
const HEAVY_STYLES = ["aurora", "fractal"];
function activeStyleIsHeavy() {
  return HEAVY_STYLES.some((s) => document.body.classList.contains(`style-${s}`));
}
function showRenderBadge() {
  if (renderBadge && activeStyleIsHeavy()) renderBadge.hidden = false;
}
function hideRenderBadge() {
  if (renderBadge) renderBadge.hidden = true;
}
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

// ── Tap-to-preview: open the current wallpaper full-screen in a <dialog> overlay
// (not the Fullscreen API, which iOS Safari refuses on non-video elements; a
// dialog works on every engine and under file:// / installed PWA).
function ensurePreviewModal() {
  let modal = document.querySelector("#preview-modal");
  if (modal) return modal;
  modal = document.createElement("dialog");
  modal.id = "preview-modal";
  modal.innerHTML =
    '<div class="preview-modal-body" aria-label="Full-screen wallpaper preview"></div>' +
    '<button type="button" class="preview-modal-close" aria-label="Close full-screen preview">✕</button>';
  document.body.appendChild(modal);
  // Tap anywhere (art, backdrop, or the ✕) dismisses, like a photo viewer.
  modal.addEventListener("click", () => { if (modal.open) modal.close(); });
  return modal;
}

function openPreviewFullscreen() {
  if (!currentSvg) return;
  const modal = ensurePreviewModal();
  // The SVG carries a viewBox + default preserveAspectRatio, so it self-
  // letterboxes to fit any screen with no distortion.
  modal.querySelector(".preview-modal-body").innerHTML = currentSvg;
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
}

function setupPreviewFullscreen() {
  if (!preview) return;
  preview.setAttribute("role", "button");
  preview.setAttribute("tabindex", "0");
  preview.setAttribute("aria-label", "Tap to preview full screen");
  preview.addEventListener("click", openPreviewFullscreen);
  preview.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPreviewFullscreen();
    }
  });
  // Discoverable affordance: a small expand glyph in the preview corner.
  if (previewShell && !previewShell.querySelector(".preview-expand")) {
    const hint = document.createElement("button");
    hint.type = "button";
    hint.className = "preview-expand";
    hint.setAttribute("aria-label", "Full screen preview");
    hint.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
    hint.addEventListener("click", (event) => { event.stopPropagation(); openPreviewFullscreen(); });
    previewShell.appendChild(hint);
  }
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

function styleLabel(id) {
  const opt = allStyleOptions().find((s) => s.id === id);
  return opt ? opt.label : id;
}

function applyStyle(style) {
  [...document.body.classList].forEach((c) => {
    if (c.startsWith("style-")) document.body.classList.remove(c);
  });
  document.body.classList.add(`style-${style}`);
  document.querySelectorAll(".style-opt").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.style === style);
  });
  // The header button reflects (and opens) the current style.
  const openBtn = document.querySelector("#open-style");
  if (openBtn) openBtn.textContent = styleLabel(style);
  // Show only the active style's control groups.
  document.querySelectorAll("[data-styles]").forEach((el) => {
    el.hidden = !el.dataset.styles.split(/\s+/).includes(style);
  });
}

function setupStyleToggle() {
  const modal = document.querySelector("#style-modal");
  const openBtn = document.querySelector("#open-style");
  if (openBtn && modal) {
    openBtn.addEventListener("click", () => modal.showModal());
  }
  document.querySelectorAll(".style-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      params = readParamsFromInputs();
      params.style = btn.dataset.style;
      applyStyle(params.style);                  // cheap DOM: active state, group show/hide, header label
      if (modal && modal.open) modal.close();    // dismiss immediately so the tap feels acknowledged
      // Defer the heavy per-pixel generate (aurora/fractal) so the closed modal
      // and highlighted button paint first; debounce also coalesces rapid taps.
      renderSoon();
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
      renderSoon();
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
  hideRenderBadge();   // generation done — clear the "Rendering…" badge
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
  setupPreviewFullscreen();
  params = { ...effectiveDefaults() };
  params.seed = randomSeed();   // fresh figure on each load/reload
  setInputsFromParams(params);
  syncFingerprintVisibility();
  render();
}

initApp();

const renderDebounced = debounce(render, 40);
// Show the badge synchronously, then let the debounce window hand the browser a
// frame to paint it before the heavy generate freezes the main thread.
function renderSoon() {
  showRenderBadge();
  renderDebounced();
}

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
  renderSoon();
});

paletteSelect.addEventListener("change", () => {
  if (paletteSelect.value === "custom") return;
  params = paramsForPalette(paletteSelect.value, readParamsFromInputs());
  setInputsFromParams(params);
  renderSoon();
});

chicPresetSelect.addEventListener("change", () => {
  if (chicPresetSelect.value === "custom") return;
  params = paramsForChicPreset(chicPresetSelect.value, readParamsFromInputs());
  setInputsFromParams(params);
  renderSoon();
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

// A fresh random seed (UI-only; the generators stay deterministic for a given
// seed). Drives every style's PRNG, so it rerolls the fractal figure, lattice
// dots, bokeh layout, aurora gas, etc.
function randomSeed() {
  return Math.floor(Math.random() * 4294967294) + 1;
}

document.querySelector("#reset-controls").addEventListener("click", () => {
  const keepStyle = params.style;          // reset everything EXCEPT the active style
  params = { ...effectiveDefaults() };
  params.style = keepStyle;
  params.seed = randomSeed();
  setInputsFromParams(params);             // calls applyStyle(keepStyle)
  syncFingerprintVisibility();
  setupToggleLabels();
  renderSoon();
});

// Seed control: a read-only seed field with three inline icon buttons —
// edit (pencil, unlocks the field), copy (stacked papers), randomize (recycle).
const seedField = document.querySelector("#seed");

// Recycle: reroll the seed and re-render (the input event bubbles to #controls).
const reseedBtn = document.querySelector("#reseed");
if (reseedBtn && seedField) {
  reseedBtn.addEventListener("click", () => {
    seedField.readOnly = true;
    document.querySelector("#seed-edit")?.classList.remove("is-active");
    seedField.value = String(randomSeed());
    seedField.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// Pencil: toggle the field editable so a precise seed can be typed in.
const seedEditBtn = document.querySelector("#seed-edit");
if (seedEditBtn && seedField) {
  seedEditBtn.addEventListener("click", () => {
    const editing = seedField.readOnly;        // about to unlock?
    seedField.readOnly = !editing;
    seedEditBtn.classList.toggle("is-active", editing);
    if (editing) {
      seedField.focus();
      seedField.select();
    }
  });
  // Leaving the field (blur / Enter) re-locks it.
  seedField.addEventListener("blur", () => {
    seedField.readOnly = true;
    seedEditBtn.classList.remove("is-active");
  });
  seedField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      seedField.blur();
    }
  });
}

// Copy: put the current seed on the clipboard, with a brief confirmation flash.
const seedCopyBtn = document.querySelector("#seed-copy");
if (seedCopyBtn && seedField) {
  seedCopyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(seedField.value);
      seedCopyBtn.classList.add("copied");
      setTimeout(() => seedCopyBtn.classList.remove("copied"), 900);
    } catch (_) {
      // Clipboard blocked (insecure context / denied) — select so the user can copy manually.
      seedField.readOnly = false;
      seedField.focus();
      seedField.select();
    }
  });
}
