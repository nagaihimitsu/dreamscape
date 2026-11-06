import { defineConfig, devices } from "@playwright/test";

// GitHub Actions sets CI. There a leftover test.only fails the run, failures
// are annotated on the pull request and kept as an HTML report, and a failing
// test is never retried, so an unstable test shows up instead of passing.
const ci = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  // Every test opens its own browser context (separate storage and tabs), so
  // tests of the same file may run in different workers.
  fullyParallel: true,
  forbidOnly: ci,
  retries: 0,
  workers: ci ? 2 : undefined,
  reporter: ci ? [["github"], ["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !ci,
    // `predev` builds the content first (about half a minute on a slow runner).
    timeout: 180_000,
  },
});
