const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate((o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "keepcalm", ...o }), ov || {});
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("keepcalm: markers + determinism", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="keepcalm-');
  expect(a).not.toMatch(/NaN|Infinity|undefined/);
  expect(await gen(page, { seed: 7 })).toBe(a); // deterministic
  expect(await gen(page, { seed: 8 })).not.toBe(a); // the corrupt band varies by seed
});

test("keepcalm: poster tears to reveal the hidden terminal, clean crown", async ({ page }) => {
  const svg = await gen(page, { seed: 7 });
  expect(svg).toContain('id="keepcalm-terminal"'); // hidden crash log beneath
  expect(svg).toContain('id="keepcalm-poster"'); // poster surface on top
  expect(svg).toContain('mask="url(#kcTear)"'); // poster carved away by the tear
  expect(svg).toContain('id="keepcalm-crown"'); // clean crown (in the poster ink)
  expect(svg).toContain('id="keepcalm-wordmark"');
  expect(svg).toContain("ATTACK PREVENTED"); // the revealed verdict
  // bounded element count
  const els = (svg.match(/<(path|circle|rect|line|polygon|polyline|text|tspan|g|svg)\b/g) || []).length;
  expect(els).toBeLessThan(4000);
});

test("keepcalm: wordmark toggles off", async ({ page }) => {
  expect(await gen(page, { seed: 7, kcWordmark: false })).not.toContain('id="keepcalm-wordmark"');
});

test("keepcalm: style switch shows it", async ({ page }) => {
  await page.locator("#open-style").click(); // style picker lives in a drawer
  await page.locator('[data-style="keepcalm"]').click();
  await expect(page.locator("body")).toHaveClass(/style-keepcalm/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("keepcalm-"))
    .toBe(true);
});
