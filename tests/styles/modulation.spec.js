const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "modulation", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("modulation: renders marker + deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="modulation-');
  expect(a).toContain('id="modulation-dots"');
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).not.toMatch(/NaN|Infinity|undefined/);

  expect(await gen(page, { seed: 7 })).toBe(a); // deterministic
  expect(await gen(page, { seed: 8 })).not.toBe(a); // seed varies output
});

test("modulation: bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  const n = (svg.match(/<(path|circle|rect|line|polygon|polyline|use|ellipse)\b/g) || []).length;
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(4000);
});

test("modulation: balanced groups, no bad numbers at max columns", async ({ page }) => {
  const svg = await gen(page, { seed: 3, width: 1080, height: 2400, modCols: 40, modDotMax: 26 });
  expect(svg).not.toContain("NaN");
  expect(svg).not.toContain("undefined");
  expect(svg).not.toContain("Infinity");
  const gOpen = (svg.match(/<g\b/g) || []).length;
  const gClose = (svg.match(/<\/g>/g) || []).length;
  expect(gOpen).toBe(gClose);
});

test("modulation: params change the output", async ({ page }) => {
  const base = await gen(page, { seed: 7 });
  expect(await gen(page, { seed: 7, modCols: 30 })).not.toBe(base);
  expect(await gen(page, { seed: 7, modCenterBias: 0.1 })).not.toBe(base);
  expect(await gen(page, { seed: 7, modField: 5 })).not.toBe(base);
});

test("modulation: style switch shows it", async ({ page }) => {
  await page.locator("#open-style").click();
  await page.locator('[data-style="modulation"]').click();
  await expect(page.locator("body")).toHaveClass(/style-modulation/);
});