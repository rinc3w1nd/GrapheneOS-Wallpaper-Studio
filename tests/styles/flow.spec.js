const { test, expect } = require("@playwright/test");

async function gen(page, ov) {
  return page.evaluate(
    (o) => generateWallpaperSvg({ ...effectiveDefaults(), style: "flow", ...o }),
    ov || {}
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#preview > svg");
});

test("flow: renders its marker + is deterministic", async ({ page }) => {
  const a = await gen(page, { seed: 7 });
  expect(a).toContain('id="flow-');        // marker group
  expect(a).toContain('id="flow-streams"');
  expect(a).toContain('id="flow-sensor"');
  expect(a.startsWith("<svg")).toBe(true);
  expect(a.trim().endsWith("</svg>")).toBe(true);

  const b = await gen(page, { seed: 7 });
  expect(b).toBe(a);                        // deterministic

  const c = await gen(page, { seed: 8 });
  expect(c).not.toBe(a);                    // seed actually varies output
});

test("flow: produces clean, finite, bounded SVG", async ({ page }) => {
  const svg = await gen(page, { seed: 7, width: 1080, height: 2400 });
  expect(svg).not.toContain("NaN");
  expect(svg).not.toContain("undefined");
  expect(svg).not.toContain("Infinity");

  const gOpen = (svg.match(/<g\b/g) || []).length;
  const gClose = (svg.match(/<\/g>/g) || []).length;
  expect(gOpen).toBe(gClose);

  const elems = (svg.match(/<(path|circle|rect|line|polygon|use|stop|linearGradient|radialGradient|g)\b/g) || []).length;
  expect(elems).toBeLessThan(4000);
});

test("flow: params change the output", async ({ page }) => {
  const base = await gen(page, { seed: 7 });
  expect(await gen(page, { seed: 7, flowLength: 30 })).not.toBe(base);
  expect(await gen(page, { seed: 7, flowCurlScale: 5 })).not.toBe(base);
  expect(await gen(page, { seed: 7, flowVortex: 0 })).not.toBe(base);
});

test("flow: style switch shows it", async ({ page }) => {
  await page.locator('[data-style="flow"]').click();
  await expect(page.locator("body")).toHaveClass(/style-flow/);
  await expect
    .poll(async () => (await page.locator("#preview > svg").innerHTML()).includes("flow-"))
    .toBe(true);
});