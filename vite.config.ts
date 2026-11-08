import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { listTestFiles, splitTestFiles } from "./scripts/test-sets.ts";
import { THIRD_PARTY_LICENSES_PATH } from "./scripts/dist-guard.ts";

// `npm run content:build` assembles the served files (root public/ plus every
// content/journeys/<journeyId>/public/) into this generated folder.
// Run it before calling vite directly (npm run dev, build and test do it).

// Unit tests in two sets, decided by what each test file imports (see
// scripts/test-sets.ts): "content" runs the whole content build, "quick" the
// rest. `npm test` runs both, `npm run test:quick` only the quick set.
const testSets = splitTestFiles(import.meta.dirname, listTestFiles(import.meta.dirname));

export default defineConfig({
  base: "./",
  publicDir: "src/content/generated/public",
  plugins: [react()],
  // Production builds write the licence notices of the bundled libraries next to
  // index.html (MIT and BSD-2-Clause ask for them in every copy); the credits list
  // reads them and the dist check (scripts/check-dist.ts) requires them.
  build: { license: { fileName: THIRD_PARTY_LICENSES_PATH } },
  test: {
    // Content validation compiles every Ink branch, including relationship tones.
    testTimeout: 180_000,
    // One worker per core. The tests are CPU-bound and the main process mostly
    // waits; Vitest's default leaves a core idle (one worker on a 2-core runner).
    maxWorkers: "100%",
    // Fixtures link the journeys' images; fail the run if a test changed one.
    globalSetup: ["scripts/test-image-guard.ts"],
    projects: [
      { extends: true, test: { name: "quick", include: testSets.quick } },
      { extends: true, test: { name: "content", include: testSets.content } },
    ],
  },
});
