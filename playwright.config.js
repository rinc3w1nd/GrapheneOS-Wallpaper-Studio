// @ts-check
const { defineConfig } = require("@playwright/test");

/**
 * The suite drives Brave specifically. Brave is Chromium-based, so we launch
 * it via `executablePath` with the chromium engine rather than a Playwright
 * channel. Override the binary location with the BRAVE_PATH env var.
 */
function resolveBravePath() {
  if (process.env.BRAVE_PATH) return process.env.BRAVE_PATH;
  switch (process.platform) {
    case "darwin":
      return "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
    case "linux":
      return "/usr/bin/brave-browser";
    case "win32":
      return "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
    default:
      return undefined;
  }
}

const PORT = Number(process.env.PORT || 8000);
const BASE_URL = `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  // Serve the static site exactly as it is shipped — no build step.
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  projects: [
    {
      name: "brave",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 900 },
        launchOptions: {
          executablePath: resolveBravePath(),
        },
      },
    },
    // WebKit ≈ Safari's engine. Covers the Safari-specific raster path (no
    // canvas WebP encoder → JPEG fallback). Requires: npx playwright install webkit
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
});
