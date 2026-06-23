const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "bokeh", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("bokeh: renders marker + deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="bokeh-');
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).not.toMatch(/NaN|Infinity|undefined/);

  expect(await gen(page, { seed: 7 })).toBe(a); // deterministic for identical params
  expect(await gen(page, { seed: 8 })).not.toBe(a); // seed varies output
});

test("bokeh: bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  const n = (svg.match(/<(path|circle|rect|line|polygon|use)\b/g) || []).length;
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(4000);
});

test("bokeh: masked disc group + bounded gradient defs", async ({ page }) => {
  const svg = await gen(page, { seed: 7 });
  expect(svg).toContain('id="bokeh-discs"');
  // Shared, bounded gradient set (not one per disc): a handful keyed by tint.
  const grads = (svg.match(/<radialGradient\b/g) || []).length;
  expect(grads).toBeLessThan(20);
});

test("bokeh: style switch shows it", async ({ page }) => {
  await page.locator("#open-style").click();
  await page.locator('[data-style="bokeh"]').click();
  await expect(page.locator("body")).toHaveClass(/style-bokeh/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("bokeh-"))
    .toBe(true);
});
