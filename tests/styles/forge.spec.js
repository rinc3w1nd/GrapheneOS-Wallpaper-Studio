const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate((o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "forge", ...o }), ov || {});
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("forge: renders metal-logo field + deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="forgeMask"');
  expect(a).toContain('id="forgeFrost"'); // the frosted-static filter
  expect(a).toContain("<svg");
  expect(a).toContain("</svg>");
  expect(a).not.toMatch(/NaN|Infinity|undefined/);
  expect(await gen(page, { seed: 7 })).toBe(a);
  expect(await gen(page, { seed: 8 })).not.toBe(a);
});

test("forge: bounded element count", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  const n = (svg.match(/<(path|circle|rect|line|polygon|polyline|use|ellipse)\b/g) || []).length;
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(4000);
});

test("forge: SVG element ids never collide with control input ids", async ({ page }) => {
  // Regression: an SVG id equal to a control id (e.g. a gradient id="forgeMetal"
  // colliding with <input id="forgeMetal">) breaks the colour pickers.
  const svg = await gen(page, {});
  const inputIds = ["forgeMetal", "forgeSheen", "forgeAccent", "forgeBgTop", "forgeBgBottom",
    "forgeTileScale", "forgeSpacing", "forgeRelief", "forgeBrush", "forgeDistress",
    "forgeWeaveDeg", "forgeWeave", "forgeDeep", "forgePreset"];
  for (const id of inputIds) {
    expect(svg).not.toContain(`id="${id}"`);
  }
});

test("forge: sensor off removes the void mask + ring", async ({ page }) => {
  const off = await gen(page, { fingerprintEnabled: false });
  expect(off).not.toContain("sensor-ring");
  const on = await gen(page, { fingerprintEnabled: true, sensorLogo: false });
  expect(on).toContain("sensor-ring");
});

test("forge: colour params actually drive the output", async ({ page }) => {
  const a = await gen(page, { forgeMetal: "#ff0000" });
  const b = await gen(page, { forgeMetal: "#00ff00" });
  expect(a).not.toBe(b);
});

test("forge: style switch shows it + populates its palette select", async ({ page }) => {
  await page.locator("#open-style").click();
  await page.locator('[data-style="forge"]').click();
  await expect(page.locator("body")).toHaveClass(/style-forge/);
  await expect(page.locator("#forgePreset")).toBeVisible();
});
