const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate((o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "facets", ...o }), ov || {});
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("facets: renders marker + deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="facets-');
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).not.toMatch(/NaN|Infinity|undefined/);
  expect(await gen(page, { seed: 7 })).toBe(a);
  expect(await gen(page, { seed: 8 })).not.toBe(a);
});

test("facets: bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  const n = (svg.match(/<(path|circle|rect|line|polygon|polyline|use|ellipse)\b/g) || []).length;
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(4000);
});

test("facets: bounded at max density too", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400, facetsDensity: 26 });
  const polys = (svg.match(/<polygon\b/g) || []).length;
  expect(polys).toBeGreaterThan(0);
  expect(polys).toBeLessThan(2900);
});

test("facets: style switch shows it", async ({ page }) => {
  await page.locator("#open-style").click();
  await page.locator('[data-style="facets"]').click();
  await expect(page.locator("body")).toHaveClass(/style-facets/);
});