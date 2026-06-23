const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate((o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "matrix", ...o }), ov || {});
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("matrix: marker + determinism", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="matrix-');
  expect(await gen(page, { seed: 7 })).toBe(a);
  expect(await gen(page, { seed: 8 })).not.toBe(a);
});

test("matrix: digital rain glyphs + monospace, bounded", async ({ page }) => {
  const svg = await gen(page, { seed: 7 });
  // Falling glyphs are <text> in the system monospace stack (no web fonts).
  expect(svg).toContain("ui-monospace, SFMono-Regular, Menlo, Consolas, monospace");
  const glyphs = (svg.match(/<text\b/g) || []).length;
  expect(glyphs).toBeGreaterThan(40); // a real cascade, not empty
  // Total element budget stays well under the contract ceiling.
  const els = (svg.match(/<(text|line|rect|circle|g|stop|radialGradient|linearGradient|filter|feGaussianBlur|mask|path|polygon)\b/g) || []).length;
  expect(els).toBeLessThan(4000);
});

test("matrix: sensor is the focal point (mask + ring + kernel)", async ({ page }) => {
  const on = await gen(page, { seed: 7, fingerprintEnabled: true });
  expect(on).toContain('mask="url(#sensorMask)"'); // rain clears inside the void
  expect(on).toContain('id="sensor-ring"');         // hex frame
  expect(on).toContain('id="matrix-kernel"');        // glyph cluster framing it
  const off = await gen(page, { seed: 7, fingerprintEnabled: false });
  expect(off).not.toContain('mask="url(#sensorMask)"');
  expect(off).not.toContain('id="matrix-kernel"');
});

test("matrix: style switch shows it", async ({ page }) => {
  await page.locator("#open-style").click(); // style picker lives in a drawer
  await page.locator('[data-style="matrix"]').click();
  await expect(page.locator("body")).toHaveClass(/style-matrix/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("matrix-"))
    .toBe(true);
});
