import { defineConfig } from "@playwright/test";
import { phone, shared } from "./playwright.config";

// Production tier (docs/10「E2Eの段」): the tests tagged @prod, against what GitHub
// Pages publishes — `vite preview` of a fresh `npm run build` (content without the
// sample journey, typecheck, vite build and the dist check). Run it on its own
// (`npm run test:e2e:prod`): the build rewrites the generated content that a
// running development server or E2E run also uses.
export default defineConfig({
  ...shared,
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "prod", grep: /@prod/, use: phone }],
  webServer: {
    command: "npm run build && npx vite preview --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    // Always the build of this checkout, never a preview left running.
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
