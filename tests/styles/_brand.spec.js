const { test, expect } = require("@playwright/test");
// All four new styles must integrate the GrapheneOS corner brand.
for (const id of ["topographic", "constellation", "flow", "circuit"]) {
  test(`${id}: includes GrapheneOS corner brand`, async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#preview > svg");
    const svg = await page.evaluate((s) =>
      generateWallpaperSvg({ ...effectiveDefaults(), style: s }), id);
    expect(svg).toContain('id="corner-brand"');
    expect(svg).toContain("GRAPHENEOS");
  });
}
