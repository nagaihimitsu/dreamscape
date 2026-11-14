import { defineConfig, devices } from "@playwright/test";

// GitHub Actions sets CI. There a leftover test.only fails the run, failures
// are annotated on the pull request and kept as an HTML report, and a failing
// test is never retried, so an unstable test shows up instead of passing.
const ci = !!process.env.CI;

/**
 * The Chromium executable to launch instead of the one this Playwright version
 * installs (DREAMSCAPE_CHROMIUM, an absolute path), for a machine whose installed
 * browsers belong to another Playwright version, e.g.
 * `DREAMSCAPE_CHROMIUM=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell npx playwright test`.
 * Unset (CI), Playwright's own browser. Every Chromium config spreads it into its devices.
 */
export const chromiumLaunch = process.env.DREAMSCAPE_CHROMIUM ? { launchOptions: { executablePath: process.env.DREAMSCAPE_CHROMIUM } } : {};

/** The phone every tier emulates. Lines show at once and decorative motion is
 * short (prefers-reduced-motion); a test that checks the typewriter turns it off. */
export const phone = { ...devices["iPhone 13"], defaultBrowserType: "chromium" as const, reducedMotion: "reduce" as const, ...chromiumLaunch };

/** Settings shared with playwright.prod.config.ts. */
export const shared = {
  testDir: "./tests/e2e",
  // Every test opens its own browser context (separate storage and tabs), so
  // tests of the same file may run in different workers.
  fullyParallel: true,
  forbidOnly: ci,
  retries: 0,
  workers: ci ? 2 : undefined,
  // In CI a run that hangs stops itself after 12 minutes and still writes its
  // report and traces, before the job limits of e2e.yml would cut it off.
  globalTimeout: ci ? 12 * 60_000 : undefined,
  reporter: ci ? [["github"], ["html", { open: "never" }], ["list"]] : "list",
} satisfies Parameters<typeof defineConfig>[0];

// Development server tiers (docs/10「E2Eの段」). `npm run test:e2e` runs both on
// one server; CI runs each project as its own job (--project=gate, --project=debug).
export default defineConfig({
  ...shared,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "gate", grep: /@gate/, use: phone },
    { name: "debug", grep: /@debug/, use: phone },
  ],
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !ci,
    // `predev` builds the content first (about half a minute on a slow runner).
    timeout: 180_000,
  },
});
