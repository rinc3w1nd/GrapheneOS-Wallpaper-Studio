const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "topographic", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("topographic: renders its marker + is deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="topographic-');
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).not.toMatch(/NaN|Infinity|undefined/);

  const b = await gen(page, { seed: 7 });
  expect(b).toBe(a); // deterministic

  const c = await gen(page, { seed: 8 });
  expect(c).not.toBe(a); // seed varies output
});

test("topographic: bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  const elements = (svg.match(/<(path|circle|rect|line|polygon|use)\b/g) || []).length;
  expect(elements).toBeGreaterThan(0);
  expect(elements).toBeLessThan(4000);
});

test("topographic: style switch shows it", async ({ page }) => {
  await page.locator('[data-style="topographic"]').click();
  await expect(page.locator("body")).toHaveClass(/style-topographic/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("topographic-"))
    .toBe(true);
});