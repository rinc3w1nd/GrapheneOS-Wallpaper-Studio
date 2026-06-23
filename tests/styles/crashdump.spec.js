const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "crashdump", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("crashdump: markers + determinism", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="crashdump-report"'); // legible diagnostic block
  expect(a).toContain('id="crashdump-field"'); // hexdump band
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).not.toMatch(/NaN|Infinity|undefined/);

  expect(await gen(page, { seed: 7 })).toBe(a); // deterministic
  expect(await gen(page, { seed: 8 })).not.toBe(a); // seed varies output
});

test("crashdump: mobile-legible — big type, compact dump band, bounded", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  expect(svg).toContain("ui-monospace");
  // Headline is physically large: a fraction of width, not a fixed tiny px.
  const headMatch = svg.match(/id="crashdump-report"[\s\S]*?font-size="([\d.]+)"/);
  expect(headMatch).not.toBeNull();
  expect(Number(headMatch[1])).toBeGreaterThan(50); // ~0.062*1080 ≈ 67px

  // The dump fills the screen with LEGIBLE rows (sized to width, not micro-text).
  const rows = (svg.match(/<g id="crashdump-field"[^>]*>([\s\S]*?)<\/g>/)[1].match(/<text\b/g) || []).length;
  expect(rows).toBeGreaterThan(3);
  expect(rows).toBeLessThan(48);

  // Whole composition is light (mobile/OLED-friendly), well under the ceiling.
  const els = (svg.match(/<(path|circle|rect|line|polygon|polyline|use|ellipse|text|tspan|g)\b/g) || []).length;
  expect(els).toBeLessThan(4000);
  const gOpen = (svg.match(/<g\b/g) || []).length;
  const gClose = (svg.match(/<\/g>/g) || []).length;
  expect(gOpen).toBe(gClose); // balanced groups
});

test("crashdump: sensor framing + brand", async ({ page }) => {
  const svg = await gen(page, { seed: 7 });
  expect(svg).toContain('mask="url(#sensorMask)"'); // dump clears inside the void
  expect(svg).toContain('id="sensor-ring"');
  expect(svg).toContain('id="corner-brand"');
  expect(svg).toContain('id="crashdump-callout"'); // fault-address redaction box
});

test("crashdump: language swaps human text, keeps bytes universal", async ({ page }) => {
  const field = (svg) => {
    const m = svg.match(/<g id="crashdump-field"[^>]*>([\s\S]*?)<\/g>/);
    return m ? m[1] : "";
  };
  const en = await gen(page, { seed: 7, crashdumpLang: "english" });
  const ru = await gen(page, { seed: 7, crashdumpLang: "russian" });
  const zh = await gen(page, { seed: 7, crashdumpLang: "chinese" });
  const ko = await gen(page, { seed: 7, crashdumpLang: "korean" });
  const fa = await gen(page, { seed: 7, crashdumpLang: "persian" });

  // human text differs per language
  expect(en).not.toBe(ru);
  expect(en).not.toBe(fa);

  // each script renders its own unicode
  expect(/[Ѐ-ӿ]/.test(ru)).toBe(true); // Cyrillic
  expect(/[一-鿿]/.test(zh)).toBe(true); // Han
  expect(/[가-힣]/.test(ko)).toBe(true); // Hangul
  expect(/[؀-ۿ]/.test(fa)).toBe(true); // Arabic script

  // Persian is RTL on human lines; English is not
  expect(fa).toContain('direction="rtl"');
  expect(en).not.toContain('direction="rtl"');

  // hex byte data is identical across all languages (determinism)
  expect(field(en)).toBe(field(ru));
  expect(field(en)).toBe(field(fa));
  expect(field(en)).toBe(field(zh));
});

test("crashdump: params change the output", async ({ page }) => {
  const base = await gen(page, { seed: 7 });
  expect(await gen(page, { seed: 7, crashdumpScale: 1.4 })).not.toBe(base);
  expect(await gen(page, { seed: 7, crashdumpRows: 8 })).not.toBe(base);
  expect(await gen(page, { seed: 7, crashdumpHighlight: 0.2 })).not.toBe(base);
});

test("crashdump: style switch shows it", async ({ page }) => {
  await page.locator("#open-style").click(); // style picker lives in a drawer
  await page.locator('[data-style="crashdump"]').click();
  await expect(page.locator("body")).toHaveClass(/style-crashdump/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("crashdump-"))
    .toBe(true);
});
