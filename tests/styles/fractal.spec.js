const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "fractal", ...o }),
    ov || {}
  );
}

// Strip the embedded raster data URI before scanning for bad numbers — a long
// base64 blob can legitimately contain the substring "NaN", etc.
function clean(svg) {
  return svg.replace(/href="data:[^"]*"/g, 'href=""');
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("fractal: renders marker + raster + deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="fractal-');
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).toContain("<image"); // escape-time field is a rasterized image
  expect(clean(a)).not.toMatch(/NaN|Infinity|undefined/);

  expect(await gen(page, { seed: 7 })).toBe(a); // deterministic for identical params
  expect(await gen(page, { seed: 8 })).not.toBe(a); // seed picks a different figure
});

test("fractal: bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  const n = (svg.match(/<(path|circle|rect|line|polygon|use|image)\b/g) || []).length;
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(4000);
});

test("fractal: params change the output", async ({ page }) => {
  const base = await gen(page, { seed: 7 });
  expect(await gen(page, { seed: 7, fractalSet: "mandelbrot" })).not.toBe(base);
  expect(await gen(page, { seed: 7, fractalIterations: 120 })).not.toBe(base);
  expect(await gen(page, { seed: 7, fractalZoom: 2 })).not.toBe(base);
});

test("fractal: style switch shows it", async ({ page }) => {
  await page.locator("#open-style").click();
  await page.locator('[data-style="fractal"]').click();
  await expect(page.locator("body")).toHaveClass(/style-fractal/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("fractal-"))
    .toBe(true);
});
