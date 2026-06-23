const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "fractal", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("fractal: renders marker + deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="fractal-');
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).not.toMatch(/NaN|Infinity|undefined/);

  expect(await gen(page, { seed: 7 })).toBe(a); // deterministic for identical params
  expect(await gen(page, { seed: 8 })).not.toBe(a); // seed varies output
});

test("fractal: bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  const n = (svg.match(/<(path|circle|rect|line|polygon|use)\b/g) || []).length;
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(4000);
});

test("fractal: depth cap keeps budget even at max depth", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400, fractalDepth: 7 });
  expect(svg).not.toMatch(/NaN|Infinity|undefined/);
  const n = (svg.match(/<(path|circle|rect|line|polygon|use)\b/g) || []).length;
  expect(n).toBeLessThan(4000);
});

test("fractal: style switch shows it", async ({ page }) => {
  await page.locator('[data-style="fractal"]').click();
  await expect(page.locator("body")).toHaveClass(/style-fractal/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("fractal-"))
    .toBe(true);
});
