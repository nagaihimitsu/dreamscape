import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// `npm run content:build` assembles the served files (root public/ plus every
// content/journeys/<journeyId>/public/) into this generated folder.
// Run it before calling vite directly (npm run dev, build and test do it).
export default defineConfig({
  base: "./",
  publicDir: "src/content/generated/public",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Content validation compiles every Ink branch, including relationship tones.
    testTimeout: 180_000,
  },
});
