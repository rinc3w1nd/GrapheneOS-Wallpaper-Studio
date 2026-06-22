const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "circuit", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("circuit: renders its marker + is deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="circuit-');           // marker group
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).not.toMatch(/NaN|undefined|Infinity/); // finite numbers only

  const b = await gen(page, { seed: 7 });
  expect(b).toBe(a);                              // deterministic

  const c = await gen(page, { seed: 8 });
  expect(c).not.toBe(a);                          // seed actually varies output
});

test("circuit: respects width/height", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  expect(svg).toContain('width="1080"');
  expect(svg).toContain('height="2400"');
  expect(svg).toContain('viewBox="0 0 1080 2400"');
});

test("circuit: style switch shows it", async ({ page }) => {
  await page.locator('[data-style="circuit"]').click();
  await expect(page.locator("body")).toHaveClass(/style-circuit/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("circuit-"))
    .toBe(true);
});
