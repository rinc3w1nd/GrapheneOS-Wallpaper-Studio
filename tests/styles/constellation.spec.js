const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "constellation", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("constellation: renders its marker + is deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="constellation-');
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");

  const b = await gen(page, { seed: 7 });
  expect(b).toBe(a); // deterministic for identical params

  const c = await gen(page, { seed: 8 });
  expect(c).not.toBe(a); // seed varies output
});

test("constellation: valid numbers + bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  expect(svg).not.toContain("NaN");
  expect(svg).not.toContain("undefined");
  expect(svg).not.toContain("Infinity");

  // marker groups present
  expect(svg).toContain('id="constellation-nodes"');
  expect(svg).toContain('id="constellation-links"');
  expect(svg).toContain('id="constellation-field"');

  // balanced svg + bounded element budget
  const opens = (svg.match(/<svg/g) || []).length;
  const closes = (svg.match(/<\/svg>/g) || []).length;
  expect(opens).toBe(1);
  expect(closes).toBe(1);
  const elements = (svg.match(/<(circle|line|rect|g|path)\b/g) || []).length;
  expect(elements).toBeLessThan(4000);
});

test("constellation: respects sensor position params", async ({ page }) => {
  const svg = await gen(page, { seed: 7, fingerprintXPct: 30, fingerprintYPct: 40 });
  expect(svg).toContain('id="constellation-glow"');
});

test("constellation: style switch shows it", async ({ page }) => {
  await page.locator("#open-style").click();
  await page.locator('[data-style="constellation"]').click();
  await expect(page.locator("body")).toHaveClass(/style-constellation/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("constellation-"))
    .toBe(true);
});
