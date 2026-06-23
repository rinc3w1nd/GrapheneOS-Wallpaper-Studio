/* styles/crashdump.js — "Crashdump": a kernel-panic memory dump composed for a
 * PHONE LOCK SCREEN. The previous version packed ~140 rows of micro-hex sized by
 * resolution, which read as unreadable noise at physical phone size. This one is
 * sized for the SCREEN: type is a fraction of canvas WIDTH (so glyphs are
 * physically large no matter the pixel resolution), with a bold panic headline as
 * the hero, a readable fault line + 64-bit fault address, a compact register
 * block, a SHORT hexdump BAND (a slice of memory — ~14 legible rows, not a wall),
 * a call-trace line, and a redaction callout framing the sensor as the fault
 * address. Generous OLED-black negative space.
 *
 * The human-readable strings swap per LANGUAGE select (english / russian /
 * chinese / korean / persian — the "major adversaries"); the hex / offset / ascii
 * columns stay universal and LTR, while Persian flips the human text to RTL.
 * System monospace only (CJK/Cyrillic/Arabic render from the device's own fonts —
 * zero network). Pure SVG, deterministic (mulberry32(p.seed); never Math.random /
 * Date). Same params => byte-identical output. Depends on core.js. */
"use strict";

// Per-language strings. `title` is the big 2–3 word headline; the rest are the
// detail/label lines. HEX COLUMNS are universal; only these swap. Persian (fa)
// renders RTL on the human-text lines.
const CRASHDUMP_LANGS = {
  english: {
    rtl: false,
    title: "KERNEL PANIC",
    panic: "not syncing: Fatal exception",
    fault: "Unable to handle kernel paging request",
    regs: "REGISTERS",
    trace: "CALL TRACE",
    faddr: "FAULT ADDRESS",
    status: "TAINTED G",
    sym: "die+0x1f4/0x210  __schedule+0x2e7  ret_from_fork+0x22",
    end: "---[ end Kernel panic — ATTACK PREVENTED ]---"
  },
  russian: {
    rtl: false,
    title: "ПАНИКА ЯДРА",
    panic: "сбой синхронизации: исключение",
    fault: "Невозможно обработать запрос подкачки",
    regs: "РЕГИСТРЫ",
    trace: "ТРАССИРОВКА",
    faddr: "АДРЕС СБОЯ",
    status: "ЗАГРЯЗНЕНО",
    sym: "die+0x1f4/0x210  __schedule+0x2e7  ret_from_fork+0x22",
    end: "---[ end Kernel panic — ATTACK PREVENTED ]---"
  },
  chinese: {
    rtl: false,
    title: "内核崩溃",
    panic: "无法同步：致命异常",
    fault: "无法处理内核分页请求",
    regs: "寄存器",
    trace: "调用栈",
    faddr: "故障地址",
    status: "已污染",
    sym: "die+0x1f4/0x210  __schedule+0x2e7  ret_from_fork+0x22",
    end: "---[ end Kernel panic — ATTACK PREVENTED ]---"
  },
  korean: {
    rtl: false,
    title: "커널 패닉",
    panic: "동기화 불가: 치명적 예외",
    fault: "커널 페이징 요청을 처리할 수 없음",
    regs: "레지스터",
    trace: "호출 추적",
    faddr: "결함 주소",
    status: "오염됨",
    sym: "die+0x1f4/0x210  __schedule+0x2e7  ret_from_fork+0x22",
    end: "---[ end Kernel panic — ATTACK PREVENTED ]---"
  },
  persian: {
    rtl: true,
    title: "وحشت هسته",
    panic: "همگام‌سازی ناممکن: استثنای مرگبار",
    fault: "ناتوان در پردازش درخواست صفحه‌بندی",
    regs: "ثبات‌ها",
    trace: "ردیابی فراخوانی",
    faddr: "نشانی خطا",
    status: "آلوده",
    sym: "die+0x1f4/0x210  __schedule+0x2e7  ret_from_fork+0x22",
    end: "---[ end Kernel panic — ATTACK PREVENTED ]---"
  }
};

// XML-escape for text that lands inside <text>/<tspan> bodies.
function crashEsc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generateCrashdumpSvg(p) {
  const W = p.width;
  const H = p.height;
  const unit = Math.min(W, H);

  // ---- language ----
  const lang = CRASHDUMP_LANGS[p.crashdumpLang] ? p.crashdumpLang : "english";
  const L = CRASHDUMP_LANGS[lang];
  const rtl = !!L.rtl;

  // ---- MOBILE-FIRST type scale: sized as a fraction of WIDTH so glyphs are
  //      physically large on a phone, regardless of pixel resolution. ----
  const scale = Math.max(0.7, Math.min(1.5, p.crashdumpScale ?? 1));
  const headFont = W * 0.062 * scale;  // big panic headline (the hero)
  const subFont = W * 0.030 * scale;   // detail / label / register lines
  const hexFont = W * 0.0295 * scale;  // hexdump rows
  const rowsReq = Math.max(6, Math.min(48, Math.round(p.crashdumpRows ?? 40)));
  const hlFreq = Math.max(0, Math.min(0.25, p.crashdumpHighlight ?? 0.06));
  const opacity = Math.max(0.2, Math.min(1, p.crashdumpOpacity ?? 0.9));

  const dim = p.crashdumpText || "#77b69e";       // phosphor hex/text (accent)
  const bright = p.crashdumpHighlight2 || "#9ad4c2"; // headline + fault bytes
  const bgTop = p.crashdumpBgTop || p.backgroundTop || "#04070a";
  const bgBottom = p.crashdumpBgBottom || p.backgroundBottom || "#080d12";

  // ---- sensor / fault-address focal geometry ----
  const cx = W * ((p.compositionXPct ?? p.fingerprintXPct ?? 50) / 100);
  const cy = H * ((p.compositionYPct ?? p.fingerprintYPct ?? 72.5) / 100);
  const r = unit * ((p.fingerprintRadiusPct ?? 10) / 100);
  const boxR = r * 1.9; // fault-address callout half-size = the sensor "cutout"

  const rand = mulberry32((p.seed | 0) ^ 0x0deada11);
  const noise = valueNoise2D((p.seed | 0) ^ 0x0c0ffee5);

  const FACE = `font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"`;
  const marginX = W * 0.075;
  const usableW = W - marginX * 2;

  // Human text right-aligns for RTL, left-aligns for LTR. RTL uses direction-
  // relative text-anchor="start" (= the RIGHT edge under direction:rtl) at the
  // right margin; anchoring "end" pushed Persian off the right side of the screen.
  const humX = rtl ? marginX + usableW : marginX;
  const humAnchor = "start";
  // Machine text (hex, registers, addresses) is ALWAYS left-anchored LTR.
  const machX = marginX;

  // A 32-bit, 16-byte-aligned fault address base so per-row offsets increment
  // within float precision. The kernel-space "ffff8000" high half is a fixed
  // string prefix on the human-facing addresses for authenticity.
  const baseAddr = (Math.floor(rand() * 0x0ffffff0) & 0xfffffff0) >>> 0;
  const HI = "0xffff8000";

  function hex8(v) {
    let s = (v >>> 0).toString(16);
    while (s.length < 8) s = "0" + s;
    return s.slice(-8);
  }
  function hex2(v) {
    const s = (v & 0xff).toString(16);
    return s.length < 2 ? "0" + s : s;
  }
  const ASCII =
    "................................ !\"#$%&'()*+,-./0123456789:;<=>?@" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~.";
  function printable(v) {
    return v >= 32 && v < 127 ? ASCII.charAt(v) : ".";
  }

  // A single text line. `fit` squeezes over-wide translated strings to the column
  // (monospace lengthAdjust) so nothing ever overflows on a narrow screen.
  function line(x, y, str, color, size, o) {
    o = o || {};
    const anchor = o.anchor || "start";
    const dir = o.rtl ? ` direction="rtl"` : "";
    const weight = o.bold ? ` font-weight="bold"` : "";
    const op = o.opacity == null ? opacity : o.opacity;
    const ls = o.spacing ? ` letter-spacing="${o.spacing.toFixed(2)}"` : "";
    let fit = "";
    if (o.fit) {
      // Rough natural width (mono ~0.6em; CJK ~1em — clamp is the safety net).
      const natural = str.length * size * 0.62;
      if (natural > usableW) {
        fit = ` textLength="${usableW.toFixed(1)}" lengthAdjust="spacingAndGlyphs"`;
      }
    }
    return (
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${FACE}${dir} ` +
      `text-anchor="${anchor}" font-size="${size.toFixed(1)}"${weight}${ls} ` +
      `fill="${color}" fill-opacity="${op.toFixed(3)}"${fit} ` +
      `xml:space="preserve">${crashEsc(str)}</text>`
    );
  }
  const hum = (y, str, color, size, o) =>
    line(humX, y, str, color, size, Object.assign({ anchor: humAnchor, rtl, fit: true }, o));
  const mach = (y, str, color, size, o) =>
    line(machX, y, str, color, size, Object.assign({ anchor: "start" }, o));

  // ====================================================================
  // assemble
  // ====================================================================
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  ];

  parts.push("<defs>");
  parts.push(
    `<linearGradient id="crashdumpBg" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${bgTop}"/>` +
      `<stop offset="62%" stop-color="${mix(bgTop, bgBottom, 0.5)}"/>` +
      `<stop offset="100%" stop-color="${bgBottom}"/></linearGradient>`
  );
  // Faint irradiated wash around the fault address (the redacted core).
  parts.push(
    `<radialGradient id="crashdumpFault" gradientUnits="userSpaceOnUse" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 3.6).toFixed(1)}">` +
      `<stop offset="0%" stop-color="${bright}" stop-opacity="0.12"/>` +
      `<stop offset="48%" stop-color="${dim}" stop-opacity="0.05"/>` +
      `<stop offset="100%" stop-color="${dim}" stop-opacity="0"/></radialGradient>`
  );
  parts.push(sensorMaskDef(p));
  parts.push("</defs>");

  parts.push(`<rect width="100%" height="100%" fill="url(#crashdumpBg)"/>`);
  parts.push(`<rect width="100%" height="100%" fill="url(#crashdumpFault)"/>`);

  // --------------------------------------------------------------------
  // TOP REPORT BLOCK — the legible diagnostic, anchored to the top margin.
  // --------------------------------------------------------------------
  const report = [];
  let y = H * 0.085 + headFont; // baseline of the headline
  const subLH = subFont * 1.55;

  // 1. Big panic headline (the hero) + detail line.
  report.push(hum(y, L.title, bright, headFont, { bold: true, opacity: 0.98 }));
  y += headFont * 0.95;
  report.push(hum(y, L.panic, dim, subFont, { opacity: 0.86 }));
  y += subLH * 1.05;

  // 2. Fault description (human) + the 64-bit fault address (machine, bright).
  report.push(hum(y, L.fault, dim, subFont, { opacity: 0.82 }));
  y += subLH;
  report.push(mach(y, "    → " + HI + hex8(baseAddr + 0xbad), bright, subFont, { bold: true, opacity: 0.95 }));
  y += subLH * 1.25;

  // 3. Register block: label + two compact lines (always LTR machine text).
  const reg = (name, i) => name + " " + HI + hex8(baseAddr ^ (0x51ab1e * (i + 1)));
  report.push(hum(y, "[ " + L.regs + " ]", dim, subFont, { bold: true, opacity: 0.8 }));
  y += subLH;
  report.push(mach(y, "  " + reg("RIP", 1) + "   " + reg("RSP", 2), dim, subFont, { opacity: 0.8 }));
  y += subLH;
  report.push(mach(y, "  " + reg("RAX", 3) + "   " + reg("RBX", 4), dim, subFont, { opacity: 0.8 }));
  y += subLH * 1.25;

  // 4. Call-trace label (+status) + a symbol line.
  report.push(hum(y, "[ " + L.trace + " ]  " + L.status, dim, subFont, { bold: true, opacity: 0.8 }));
  y += subLH;
  report.push(mach(y, "  " + L.sym, dim, subFont, { opacity: 0.72, fit: true }));
  y += subLH * 1.1;

  parts.push(`<g id="crashdump-report">${report.join("")}</g>`);
  const reportBottom = y;

  // --------------------------------------------------------------------
  // SECURITY SHIELD emblem — top corner opposite the headline (top-right for
  // LTR, top-left for RTL), bearing the GrapheneOS logo. Reinforces that the
  // panic IS the defense: the attack was prevented.
  // --------------------------------------------------------------------
  {
    const sw = unit * 0.135; // shield width
    const sh = sw * 1.18;    // rounded-shield height
    // top edge aligned with the cap-top of the headline (baseline H*0.085 + headFont)
    const sTop = H * 0.085 + headFont * 0.28;
    const sCx = rtl ? marginX + sw * 0.5 : W - marginX - sw * 0.5;
    const C = 2644.0798 / 2; // OFFICIAL_LOGO_VIEWBOX center
    // Rounded shield: rounded top corners, sides tapering to a soft point.
    const shieldAt = (ww, topY) => {
      const hw = ww / 2;
      const hh = ww * 1.18;
      const rad = ww * 0.16;
      return `M${(sCx - hw).toFixed(1)} ${(topY + rad).toFixed(1)} ` +
        `Q${(sCx - hw).toFixed(1)} ${topY.toFixed(1)} ${(sCx - hw + rad).toFixed(1)} ${topY.toFixed(1)} ` +
        `L${(sCx + hw - rad).toFixed(1)} ${topY.toFixed(1)} Q${(sCx + hw).toFixed(1)} ${topY.toFixed(1)} ${(sCx + hw).toFixed(1)} ${(topY + rad).toFixed(1)} ` +
        `L${(sCx + hw).toFixed(1)} ${(topY + hh * 0.5).toFixed(1)} Q${(sCx + hw).toFixed(1)} ${(topY + hh * 0.88).toFixed(1)} ${sCx.toFixed(1)} ${(topY + hh).toFixed(1)} ` +
        `Q${(sCx - hw).toFixed(1)} ${(topY + hh * 0.88).toFixed(1)} ${(sCx - hw).toFixed(1)} ${(topY + hh * 0.5).toFixed(1)} Z`;
    };
    // Concentric inset (shrink width, nudge down to stay roughly centered).
    const insetAt = (d) => shieldAt(sw - 2 * d, sTop + d * 0.85);
    const medLight = mix(bgBottom, bright, 0.18); // top-lit inner-plate tone
    const logoSize = sw * 0.56;
    const logoScale = logoSize / (C * 2);
    const logoCy = sTop + sh * 0.42;
    // Medallion: outer plate + raised gradient inner plate + hairline ring.
    parts.push(
      `<g id="crashdump-shield">` +
        `<linearGradient id="crashdumpMedallion" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${medLight}"/><stop offset="100%" stop-color="${bgBottom}"/></linearGradient>` +
        `<path d="${shieldAt(sw, sTop)}" fill="${bgBottom}" fill-opacity="0.9" stroke="${bright}" stroke-opacity="0.92" stroke-width="${(unit * 0.0026).toFixed(2)}" stroke-linejoin="round"/>` +
        `<path d="${insetAt(sw * 0.066)}" fill="url(#crashdumpMedallion)" fill-opacity="0.95" stroke="${dim}" stroke-opacity="0.6" stroke-width="${(unit * 0.0016).toFixed(2)}" stroke-linejoin="round"/>` +
        `<path d="${insetAt(sw * 0.143)}" fill="none" stroke="${bright}" stroke-opacity="0.3" stroke-width="${(unit * 0.0012).toFixed(2)}" stroke-linejoin="round"/>` +
        `<g transform="translate(${sCx.toFixed(1)} ${logoCy.toFixed(1)}) scale(${logoScale.toFixed(5)}) translate(${(-C).toFixed(1)} ${(-C).toFixed(1)})"><path d="${OFFICIAL_LOGO_PATH}" fill="${bright}" fill-rule="nonzero"/></g>` +
      `</g>`
    );
  }

  // --------------------------------------------------------------------
  // HEXDUMP BAND — a short, legible slice of memory (NOT a screen-filling wall).
  // Sized in big rows; capped to fit between the report block and the sensor
  // callout. Masked so it clears inside the sensor void.
  // --------------------------------------------------------------------
  const adv = hexFont * 0.6;
  const rowH = hexFont * 1.5;
  const bandTop = reportBottom + rowH * 0.4;
  // The dump fills down to the BOTTOM of the sensor cutout (rows over the sensor
  // are carved by the mask / hidden by the redaction box). Everything below the
  // cutout is left empty for the Android system UI (fingerprint, shortcuts).
  const bandBottomLimit = cy + boxR;
  const rowsFit = Math.floor((bandBottomLimit - bandTop) / rowH);
  const nRows = Math.max(4, Math.min(rowsReq, rowsFit));

  // Row layout: "OFFSET  HH HH HH HH  HH HH HH HH  |ascii|". Glyph columns:
  const BYTES = 8;
  const colHexStart = 8 + 2; // after "OFFSET  "
  const hexColForByte = (i) => colHexStart + i * 3 + (i >= 4 ? 1 : 0);
  const colAsciiStart = hexColForByte(BYTES - 1) + 2 + 3; // past last HH + "  |"
  const totalCols = colAsciiStart + BYTES + 1;
  // Fit the row to the usable width (shrink advance if the row is too wide).
  const rowPxWidth = totalCols * adv;
  const fitScale = rowPxWidth > usableW ? usableW / rowPxWidth : 1;
  const advF = adv * fitScale;
  const fszF = hexFont * fitScale;
  const colX = (c) => marginX + c * advF;

  const dumpRows = [];
  for (let i = 0; i < nRows; i += 1) {
    const ry = bandTop + i * rowH + fszF;
    const addr = (baseAddr + i * BYTES) >>> 0;
    const bytes = [];
    for (let b = 0; b < BYTES; b += 1) {
      const v = (Math.floor(noise(i * 1.7 + b * 0.31, i * 0.13 + b * 2.9) * 4096) + Math.floor(rand() * 256)) & 0xff;
      bytes.push(v);
    }
    const hl = [];
    for (let b = 0; b < BYTES; b += 1) if (rand() < hlFreq) hl.push(b);

    let str = hex8(addr) + "  ";
    for (let b = 0; b < BYTES; b += 1) {
      if (b === 4) str += " ";
      str += hex2(bytes[b]) + (b === BYTES - 1 ? "" : " ");
    }
    str += "  |";
    for (let b = 0; b < BYTES; b += 1) str += printable(bytes[b]);
    str += "|";

    const rowLen = (totalCols - 1) * advF;
    let rowSvg =
      `<text x="${marginX.toFixed(1)}" y="${ry.toFixed(1)}" ${FACE} ` +
      `font-size="${fszF.toFixed(2)}" fill="${dim}" ` +
      `textLength="${rowLen.toFixed(1)}" lengthAdjust="spacingAndGlyphs" ` +
      `xml:space="preserve">${crashEsc(str)}`;
    for (let h = 0; h < hl.length; h += 1) {
      const b = hl[h];
      rowSvg += `<tspan x="${colX(hexColForByte(b)).toFixed(1)}" fill="${bright}" font-weight="bold">${hex2(bytes[b])}</tspan>`;
      rowSvg += `<tspan x="${colX(colAsciiStart + b).toFixed(1)}" fill="${bright}">${crashEsc(printable(bytes[b]))}</tspan>`;
    }
    rowSvg += `</text>`;
    dumpRows.push(rowSvg);
  }

  parts.push(
    `<g id="crashdump-field" fill-opacity="${opacity.toFixed(3)}"${sensorMaskAttr(p)}>${dumpRows.join("")}</g>`
  );

  // --------------------------------------------------------------------
  // FAULT-ADDRESS CALLOUT — a redaction box framing the sensor void, with
  // forensic crop-mark ticks and a small universal address tag.
  // --------------------------------------------------------------------
  const callout = [];
  callout.push(
    `<rect x="${(cx - boxR).toFixed(1)}" y="${(cy - boxR).toFixed(1)}" ` +
      `width="${(boxR * 2).toFixed(1)}" height="${(boxR * 2).toFixed(1)}" ` +
      `rx="${(unit * 0.006).toFixed(1)}" fill="${bgBottom}" fill-opacity="0.92" ` +
      `stroke="${bright}" stroke-opacity="0.85" stroke-width="${(unit * 0.0016).toFixed(2)}" ` +
      `stroke-dasharray="${(unit * 0.008).toFixed(1)} ${(unit * 0.006).toFixed(1)}"/>`
  );
  const tick = boxR * 0.3;
  const corners = [
    [cx - boxR, cy - boxR, 1, 1],
    [cx + boxR, cy - boxR, -1, 1],
    [cx - boxR, cy + boxR, 1, -1],
    [cx + boxR, cy + boxR, -1, -1]
  ];
  let ticks = "";
  for (let i = 0; i < corners.length; i += 1) {
    const c = corners[i];
    ticks +=
      `<path d="M${c[0].toFixed(1)} ${(c[1] + c[3] * tick).toFixed(1)} L${c[0].toFixed(1)} ${c[1].toFixed(1)} L${(c[0] + c[2] * tick).toFixed(1)} ${c[1].toFixed(1)}" ` +
      `fill="none" stroke="${bright}" stroke-opacity="0.95" stroke-width="${(unit * 0.002).toFixed(2)}"/>`;
  }
  callout.push(ticks);
  const tagFont = subFont * 0.8;
  callout.push(
    `<text x="${(cx - boxR).toFixed(1)}" y="${(cy - boxR - tagFont * 0.55).toFixed(1)}" ${FACE} ` +
      `direction="ltr" text-anchor="start" font-size="${tagFont.toFixed(1)}" ` +
      `fill="${bright}" fill-opacity="0.9" font-weight="bold" ` +
      `xml:space="preserve">${HI}${crashEsc(hex8(baseAddr + 0xbad))} »</text>`
  );
  if (sensorGeom(p).on) parts.push(`<g id="crashdump-callout">${callout.join("")}</g>`);

  // Closing panic line sits right below the sensor cutout; the bottom of the
  // screen is intentionally left empty for the Android system UI.
  parts.push(
    `<g id="crashdump-end">` +
      mach(cy + boxR + subFont * 1.9, L.end, dim, subFont * 0.92, { bold: true, opacity: 0.66 }) +
      `</g>`
  );

  // ---- sensor focal ring + brand ----
  parts.push(sensorRing(p, bright, dim, "hex"));
  parts.push(cornerBrand(p, dim));
  parts.push("</svg>");
  return parts.join("\n");
}

registerStyle({
  id: "crashdump",
  label: "Crashdump",
  generate: generateCrashdumpSvg,
  defaults: {
    crashdumpLang: "english",
    crashdumpScale: 1,
    crashdumpRows: 40,
    crashdumpHighlight: 0.06,
    crashdumpOpacity: 0.9,
    crashdumpText: "#77b69e",
    crashdumpHighlight2: "#9ad4c2",
    crashdumpBgTop: "#04070a",
    crashdumpBgBottom: "#080d12",
    crashdumpPreset: "graphene-default"
  },
  colorIds: ["crashdumpText", "crashdumpHighlight2", "crashdumpBgTop", "crashdumpBgBottom"],
  presets: projectPalettes((pal) => ({
    crashdumpText: pal.accent,
    crashdumpHighlight2: pal.accent2,
    crashdumpBgTop: pal.backgroundTop,
    crashdumpBgBottom: pal.backgroundBottom
  })),
  inputIds: [
    "crashdumpLang",
    "crashdumpScale",
    "crashdumpRows",
    "crashdumpHighlight",
    "crashdumpOpacity",
    "crashdumpText",
    "crashdumpHighlight2",
    "crashdumpBgTop",
    "crashdumpBgBottom"
  ],
  controlsHtml: {
    setup: `
      <label class="field"><span class="field-label">Palette</span><select id="crashdumpPreset"></select></label>
      <label class="field"><span class="field-label">Language</span><select id="crashdumpLang">
        <option value="english">English</option>
        <option value="russian">Русский</option>
        <option value="chinese">中文</option>
        <option value="korean">한국어</option>
        <option value="persian">فارسی</option>
      </select></label>
    `,
    form: `
      <div class="group-label">Crash report</div>
      <label class="field range"><span class="field-label">Text scale</span><input id="crashdumpScale" type="range" min="0.7" max="1.5" step="0.02"></label>
      <label class="field range"><span class="field-label">Dump rows</span><input id="crashdumpRows" type="range" min="6" max="48" step="1"></label>
      <label class="field range"><span class="field-label">Fault freq</span><input id="crashdumpHighlight" type="range" min="0" max="0.25" step="0.005"></label>
      <label class="field range"><span class="field-label">Opacity</span><input id="crashdumpOpacity" type="range" min="0.2" max="1" step="0.02"></label>
    `,
    color: `
      <div class="group-label">Crashdump colors</div>
      <label class="field color"><span class="field-label">Hex text (dim)</span><input id="crashdumpText" type="color"></label>
      <label class="field color"><span class="field-label">Fault (bright)</span><input id="crashdumpHighlight2" type="color"></label>
      <label class="field color"><span class="field-label">Background top</span><input id="crashdumpBgTop" type="color"></label>
      <label class="field color"><span class="field-label">Background bottom</span><input id="crashdumpBgBottom" type="color"></label>
    `
  }
});
