import { defineConfig } from "@playwright/test";
import { phone, shared } from "./playwright.config";

// Sample journey tier (docs/10「E2Eの段」): the tests tagged @sample play the sample
// journey (authoring/templates/sample_trip, development and tests only) on a
// development server of their own, built with the sample (`npm run dev:sample`), on
// a port no other tier uses. So this tier never reuses a server without the sample,
// and `npm run dev` and the other tiers' server never include it. Run it on its own
// (`npm run test:e2e:sample`): its build rewrites the generated content that a running
// development server or E2E run also uses; when the run ends, the content is built
// again without the sample (tests/e2e/sample-teardown.ts).
export default defineConfig({
  ...shared,
  use: {
    baseURL: "http://127.0.0.1:4175",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "sample", grep: /@sample/, use: phone }],
  globalTeardown: "./tests/e2e/sample-teardown.ts",
  webServer: {
    command: "npm run dev:sample -- --port 4175 --strictPort",
    url: "http://127.0.0.1:4175",
    // Always a server of this run with the sample, never one left running.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
