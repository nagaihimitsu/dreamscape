import { defineConfig, devices } from "@playwright/test";
import { chromiumLaunch, shared } from "./playwright.config";

// Screens for people checking by eye: `npm run screens` (scripts/dev/screens.ts)
// runs this config and builds artifacts/screens/index.html. Not a gate and not
// part of the E2E tiers; the same development server as the E2E (reused when running).
const phone = { defaultBrowserType: "chromium" as const, reducedMotion: "reduce" as const, ...chromiumLaunch };

export default defineConfig({
  ...shared,
  testDir: "./tests/screens",
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4173" },
  projects: [
    { name: "320px", use: { ...devices["iPhone SE"], ...phone } },
    { name: "390px", use: { ...devices["iPhone 13"], ...phone } },
  ],
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
