import { defineConfig } from "@playwright/test";
import base, { phone, shared } from "./playwright.config";

// Weekly exploration (docs/10「探索テスト」): the monkey (tests/e2e/explore/, tagged @explore)
// clicks through the game on the development server with a seed (MONKEY_SEED) for a while
// (MONKEY_SECONDS per start point). Never a gate: `npm run test:e2e:explore`, and the weekly
// and manual runs of .github/workflows/e2e-explore.yml. The normal tiers never select @explore.
export default defineConfig({
  ...shared,
  use: base.use,
  projects: [{ name: "explore", grep: /@explore/, use: phone }],
  webServer: base.webServer,
});
