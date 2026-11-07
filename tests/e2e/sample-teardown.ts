import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * After the sample tier (playwright.sample.config.ts): build the generated content
 * again without the sample journey, as `npm run dev` and `npm run build` do, so a
 * development server left running does not keep showing it (docs/10「E2Eの段」).
 */
export default function rebuildWithoutSample() {
  execFileSync("npm", ["run", "content:build"], { cwd: fileURLToPath(new URL("../..", import.meta.url)), stdio: "inherit" });
}
