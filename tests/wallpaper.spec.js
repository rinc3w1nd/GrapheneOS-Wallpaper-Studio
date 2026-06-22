// @ts-check
const fs = require("fs");
const { test, expect } = require("@playwright/test");

// Discriminators emitted by generateWallpaperSvg() in src/app.js.
// The grain <filter> is always defined in <defs>; only the rect that *uses*
// it carries this attribute, so it reliably reflects the grain toggle.
const GRAIN_MARKER = 'filter="url(#grain)"';
const FINGERPRINT_MARKER = 'id="fingerprint-structural-aperture"';

/**
 * Checkboxes are styled as chips with the native input visually hidden, so we
 * toggle by clicking the wrapping label. Idempotent: only clicks when the
 * current state differs from the desired one.
 */
async function setToggle(page, id, desired) {
  // Scope to <input>: the generated SVG also contains an element id="grain"
  // (the grain <filter>), so a bare `#grain` selector is ambiguous.
  const input = page.locator(`input#${id}`);
  if ((await input.isChecked()) !== desired) {
    await page.locator(`label.chip-toggle:has(input#${id})`).click();
  }
  await expect(input).toBeChecked({ checked: desired });
}

async function previewSvgHtml(page) {
  return page.locator("#preview > svg").first().evaluate((el) => el.outerHTML);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#preview > svg")).toBeVisible();
});

const combos = [
  { grain: true, fingerprint: true },
  { grain: true, fingerprint: false },
  { grain: false, fingerprint: true },
  { grain: false, fingerprint: false },
];

for (const { grain, fingerprint } of combos) {
  test(`renders with grain=${grain}, fingerprint=${fingerprint}`, async ({ page }, testInfo) => {
    await setToggle(page, "grain", grain);
    await setToggle(page, "fingerprintEnabled", fingerprint);

    // Poll past the 40ms render debounce; assert the SVG reflects both toggles.
    await expect
      .poll(async () => {
        const svg = await previewSvgHtml(page);
        return {
          grain: svg.includes(GRAIN_MARKER),
          fingerprint: svg.includes(FINGERPRINT_MARKER),
        };
      })
      .toEqual({ grain, fingerprint });

    // The app also flags the disabled fingerprint on <body>.
    const body = page.locator("body");
    if (fingerprint) {
      await expect(body).not.toHaveClass(/fingerprint-off/);
    } else {
      await expect(body).toHaveClass(/fingerprint-off/);
    }

    await testInfo.attach("preview.png", {
      body: await page.locator("#preview").screenshot(),
      contentType: "image/png",
    });
  });
}

test("default raster export is small and lossy on every engine", async ({ page }, testInfo) => {
  const downloadPromise = page.waitForEvent("download");
  await page.click("#download-png");
  const download = await downloadPromise;
  const name = download.suggestedFilename();

  // Defaults are full scale / quality 90.
  expect(name).toMatch(/@100pct-q90\./);

  // The extension must reflect the bytes actually produced. Chromium emits
  // WebP; WebKit (Safari) has no canvas WebP encoder, so the app falls back to
  // JPEG. Either way it must be lossy — NOT the multi-MB lossless PNG the old
  // code silently produced and mislabeled ".webp".
  const isWebkit = testInfo.project.name === "webkit";
  expect(name).toMatch(isWebkit ? /\.jpg$/ : /\.webp$/);

  const size = fs.statSync(await download.path()).size;
  expect(size).toBeGreaterThan(0);
  // The PNG bug produced ~5.3 MB here; lossy output is well under 1 MB.
  expect(size).toBeLessThan(1024 * 1024);
  console.log(`[${testInfo.project.name}] default export: ${(size / 1024).toFixed(0)} KB (${name})`);
});
