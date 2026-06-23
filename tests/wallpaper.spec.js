// @ts-check
const fs = require("fs");
const { test, expect } = require("@playwright/test");

// Discriminators emitted by generateWallpaperSvg() in src/app.js.
// The grain <filter> is always defined in <defs>; only the rect that *uses*
// it carries this attribute, so it reliably reflects the grain toggle.
const GRAIN_MARKER = 'filter="url(#grain)"';
const FINGERPRINT_MARKER = 'id="fingerprint-aperture"';

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

// Structural assertions on the generator output. generateWallpaperSvg and
// DEFAULT_PARAMS are top-level in app.js (classic script), reachable lexically
// inside page.evaluate.
async function genSvg(page, overrides) {
  return page.evaluate(
    // @ts-ignore — globals provided by app.js
    (ov) => generateWallpaperSvg({ ...DEFAULT_PARAMS, ...ov }),
    overrides || {}
  );
}

test.describe("generation structure", () => {
  test("official logo renders inline and tinted, never black", async ({ page }) => {
    const svg = await genSvg(page, { useOfficialLogo: true });
    expect(svg).toContain("official-grapheneos-logo");
    // The asset's black path fill must be recolored to the accent.
    expect(svg).not.toContain('fill="#000000"');
  });

  test("official logo off falls back to the drawn mark", async ({ page }) => {
    const svg = await genSvg(page, { useOfficialLogo: false });
    expect(svg).not.toContain("official-grapheneos-logo");
  });

  test("fingerprint enabled rings the void and masks the geometry", async ({ page }) => {
    const svg = await genSvg(page, { fingerprintEnabled: true });
    expect(svg).toContain('id="fingerprint-aperture"');
    expect(svg).toContain('id="apertureMask"');
    expect(svg).toContain('mask="url(#apertureMask)"');
  });

  test("fingerprint disabled leaves geometry unmasked", async ({ page }) => {
    const svg = await genSvg(page, { fingerprintEnabled: false });
    expect(svg).not.toContain("fingerprint-aperture");
    expect(svg).not.toContain("apertureMask");
  });

  test("forge style produces a tessellated metal-logo field", async ({ page }) => {
    const svg = await genSvg(page, { style: "forge" });
    expect(svg).toContain('id="forgeMask"');
    expect(svg).toContain('id="forgeFrost"');
    const useCount = svg.split("<use ").length - 1;
    expect(useCount).toBeGreaterThan(10);
  });

  test("lattice style is unchanged by the dispatcher", async ({ page }) => {
    const svg = await genSvg(page, { style: "lattice" });
    expect(svg).toContain('id="geometry"');
    expect(svg).not.toContain("forgeMask");
  });
});

test.describe("controls UI", () => {
  test("segmented tabs swap panels", async ({ page }) => {
    await expect(page.locator('[data-panel="setup"]')).toBeVisible();
    await expect(page.locator('[data-panel="form"]')).toBeHidden();

    await page.locator('.tab[data-tab="form"]').click();

    await expect(page.locator('[data-panel="form"]')).toBeVisible();
    await expect(page.locator('[data-panel="setup"]')).toBeHidden();
    await expect(page.locator('.tab[data-tab="form"]')).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('.tab[data-tab="setup"]')).toHaveAttribute("aria-selected", "false");
  });

  test("style toggle swaps generator and control groups", async ({ page }) => {
    await expect(page.locator("body")).toHaveClass(/style-lattice/);
    await expect(page.locator("#forgePreset")).toBeHidden();

    await page.locator("#open-style").click();
    await page.locator('[data-style="forge"]').click();

    await expect(page.locator("body")).toHaveClass(/style-forge/);
    await expect(page.locator("#forgePreset")).toBeVisible();
    await expect.poll(async () => (await previewSvgHtml(page)).includes("forgeMask")).toBe(true);
  });

  test("palette + device persist across a style switch", async ({ page }) => {
    const lineColor = await page.evaluate(() => findPalette("vermilion-burn").lineColor);
    // pick a palette + a non-default device on lattice
    for (const [sel, v] of [["#palette", "vermilion-burn"], ["#device", "pixel-9"]]) {
      await page.locator(sel).selectOption(v);
    }
    // switch to forge — the palette identity + device carry over
    await page.locator("#open-style").click();
    await page.locator('[data-style="forge"]').click();
    await expect(page.locator("#forgePreset")).toHaveValue("vermilion-burn");
    await expect(page.locator("#forgeMetal")).toHaveValue(lineColor); // forge metal = palette lineColor
    await expect(page.locator("#device")).toHaveValue("pixel-9");
  });

  test("a slider drives a re-render", async ({ page }) => {
    const before = await previewSvgHtml(page);
    await page.locator('.tab[data-tab="form"]').click();
    await page.locator("#structureDensity").evaluate((el) => {
      el.value = el.min;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect.poll(async () => (await previewSvgHtml(page)) !== before).toBe(true);
    // The value chip reflects the new value.
    await expect(page.locator('.value-chip[data-for="structureDensity"]')).toHaveText("0.2");
  });
});

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
