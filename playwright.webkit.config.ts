import { defineConfig, devices } from "@playwright/test";
import base, { shared } from "./playwright.config";

// WebKit smoke (docs/10「E2Eの段」): the @smoke tests (start and the first Milan flow)
// on an iPhone 13 with WebKit, Safari's engine, on the development server. Only this config
// uses WebKit, so `npm run test:e2e` and the pull request checks never need it; the runs
// by hand of .github/workflows/e2e-explore.yml install it (`npm run test:e2e:webkit`).
// Linux WebKit is not the iPhone's Safari: the device check before a release stays.
export default defineConfig({
  ...shared,
  use: base.use,
  projects: [{ name: "mobile-webkit", grep: /@smoke/, use: { ...devices["iPhone 13"], reducedMotion: "reduce" } }],
  webServer: base.webServer,
});
