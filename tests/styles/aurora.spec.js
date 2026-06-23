const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "aurora", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

// Strip the embedded gas-cloud data URI before scanning for bad numbers — a long
// base64 blob can legitimately contain the substring "NaN", etc.
function clean(svg) {
  return svg.replace(/href="data:[^"]*"/g, 'href=""');
}

test("aurora: renders marker + gas raster + deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="aurora-');
  expect(a).toContain('id="aurora-curtains"');
  expect(a).toContain("<image"); // volumetric gas cloud is a rasterized image
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(clean(a)).not.toMatch(/NaN|Infinity|undefined/);

  expect(await gen(page, { seed: 7 })).toBe(a); // deterministic
  expect(await gen(page, { seed: 8 })).not.toBe(a); // seed varies output
});

test("aurora: bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  const n = (svg.match(/<(path|circle|rect|line|polygon|use|image)\b/g) || []).length;
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(4000);
});

test("aurora: params change the output", async ({ page }) => {
  const base = await gen(page, { seed: 7 });
  expect(await gen(page, { seed: 7, auroraBands: 12 })).not.toBe(base);
  expect(await gen(page, { seed: 7, auroraWarp: 0.7 })).not.toBe(base);
  expect(await gen(page, { seed: 7, auroraWidth: 0.4 })).not.toBe(base);
});

test("aurora: balanced groups", async ({ page }) => {
  const svg = await gen(page, { seed: 7 });
  const gOpen = (svg.match(/<g\b/g) || []).length;
  const gClose = (svg.match(/<\/g>/g) || []).length;
  expect(gOpen).toBe(gClose);
});

test("aurora: style switch shows it", async ({ page }) => {
  await page.locator('[data-style="aurora"]').click();
  await expect(page.locator("body")).toHaveClass(/style-aurora/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("aurora-"))
    .toBe(true);
});
