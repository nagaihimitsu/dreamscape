import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Content validation compiles every Ink branch and can take longer on CI.
    testTimeout: 30_000,
  },
});
