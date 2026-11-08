import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The E2E rules of docs/10 「E2Eの段」 that a reader of the specs could break without
// noticing: a test without a tier runs in no CI job, the real-flow specs must not take
// shortcuts, tests that also run against the production build cannot use the
// development server's modules, and the sample journey's playthrough runs only on its
// own server, the one built with the sample. The weekly exploration specs (tests/e2e/explore/,
// @explore) never join a gating tier, and their workflow never runs on every pull request.
const folder = path.join(import.meta.dirname, "../tests/e2e");
const specs = readdirSync(folder, { recursive: true }).map(String).map((name) => name.split(path.sep).join("/"))
  .filter((name) => name.endsWith(".spec.ts")).sort();
const source = (name: string) => readFileSync(path.join(folder, name), "utf8");
const tiers = ["gate", "debug", "prod", "sample", "smoke", "explore"];

/** Each `test(` call of a spec with the tiers named in its details argument. */
function specTests(text: string): { title: string; tiers: string[] }[] {
  return [...text.matchAll(/^\s*test\(\s*([`"])(.*?)\1\s*,([^]*?)async\s*\(/gmu)].map((match) => ({
    title: match[2],
    tiers: [...match[3].matchAll(/tier\.(\w+)|"@(\w+)"/gu)].map((tag) => tag[1] ?? tag[2]),
  }));
}

/** Helpers that need the development server's modules (Debug, scene builders, in-page imports). */
const devServerOnly = /placeSave|devModules|openDebugScene|debugShown|debugGame|import\(/u;
/** …and Debug URLs: shortcuts around the real flow. */
const shortcuts = new RegExp(`${devServerOnly.source}|\\?debug`, "u");

describe("E2E specs", () => {
  it("are found", () => {
    expect(specs).toEqual(expect.arrayContaining(["boot.spec.ts", "play.spec.ts", "save-load.spec.ts", "sample-journey.spec.ts", "explore/monkey.spec.ts"]));
  });

  it("keep the exploration (@explore) in tests/e2e/explore/ and out of every other tier", () => {
    for (const name of specs) for (const test of specTests(source(name))) {
      const explore = test.tiers.includes("explore");
      expect(explore, `「${test.title}」 in ${name}: @explore tests live in tests/e2e/explore/ and nothing else lives there`).toBe(name.startsWith("explore/"));
      if (explore) expect(test.tiers, `「${test.title}」`).toEqual(["explore"]);
    }
  });

  it("run the weekly exploration and WebKit smoke on a schedule and by hand, on a pull request only when their own files change", () => {
    const workflow = readFileSync(path.join(import.meta.dirname, "../.github/workflows/e2e-explore.yml"), "utf8");
    expect(workflow).toMatch(/^ {2}schedule:\n(?: {4}#.*\n)* {4}- cron: /mu);
    expect(workflow).toMatch(/^ {2}workflow_dispatch:/mu);
    const paths = workflow.match(/^ {2}pull_request:\n {4}paths:\n((?: {6}- .*\n)+)/mu);
    expect(paths, "pull_request runs only for the exploration's own files").not.toBeNull();
    expect(paths![1].split("\n").filter(Boolean).map((line) => line.trim().slice(2)).sort()).toEqual([
      ".github/workflows/e2e-explore.yml", "playwright.explore.config.ts", "playwright.webkit.config.ts", "scripts/dev/screen-gallery.ts",
      "src/dev/debug-query.ts", "tests/e2e/explore/**", "tests/e2e/helpers.ts", "tests/explore/**",
    ]);
    expect(workflow).toMatch(/run: npm run test:e2e:explore\n/u);
    expect(workflow).toMatch(/run: npm run test:e2e:webkit\n/u);
    expect(workflow).toMatch(/run: npx playwright install --with-deps webkit\n/u);
    // No other workflow waits for it, and only it installs WebKit.
    for (const name of readdirSync(path.join(import.meta.dirname, "../.github/workflows")).filter((file) => file !== "e2e-explore.yml")) {
      const other = readFileSync(path.join(import.meta.dirname, "../.github/workflows", name), "utf8");
      expect(other, name).not.toMatch(/e2e-explore|webkit|test:e2e:explore/u);
    }
  });

  it.each(specs)("%s: every test names at least one known tier, so a CI job runs it", (name) => {
    const tests = specTests(source(name));
    expect(tests.length, `${name} has no test( … ) call this check can read`).toBeGreaterThan(0);
    for (const test of tests) {
      expect(test.tiers.length, `「${test.title}」 has no tier tag (tier.gate, tier.debug, tier.prod …)`).toBeGreaterThan(0);
      for (const tier of test.tiers) expect(tiers, `「${test.title}」: unknown tier ${tier}`).toContain(tier);
    }
  });

  it("keep the real-flow specs free of Debug and state shortcuts (lane 1)", () => {
    for (const name of ["play.spec.ts", "save-load.spec.ts", "sample-journey.spec.ts"])
      expect(source(name), `${name} must play from the title screen only`).not.toMatch(shortcuts);
  });

  it("use development-server modules only in specs without production-build tests", () => {
    for (const name of specs.filter((spec) => specTests(source(spec)).some((test) => test.tiers.includes("prod"))))
      expect(source(name), `${name} has tier.prod tests, which run against the production build`).not.toMatch(devServerOnly);
  });

  it("keep Debug launchpad tests out of the gate and production tiers", () => {
    for (const name of specs) for (const test of specTests(source(name)))
      if (test.tiers.includes("debug"))
        expect(test.tiers.filter((tier) => tier === "gate" || tier === "prod"), `「${test.title}」`).toEqual([]);
  });

  it("run the sample journey's playthrough only in the sample tier (its server is the only one with the sample)", () => {
    for (const test of specTests(source("sample-journey.spec.ts")))
      expect(test.tiers, `「${test.title}」`).toEqual(["sample"]);
  });

  it("give each gating tier its own CI job, the sample job after making a journey with journey:new", () => {
    const workflow = readFileSync(path.join(import.meta.dirname, "../.github/workflows/e2e.yml"), "utf8");
    const jobs = Object.fromEntries([...workflow.matchAll(/^\s*- tier: (\w+)\n((?:\s+(?!- )\w+: .*\n)*)/gmu)]
      .map((match) => [match[1], match[2]]));
    // smoke (WebKit) and explore run weekly in e2e-explore.yml, never as a gate.
    expect(Object.keys(jobs)).toEqual(["gate", "debug", "prod", "sample"]);
    expect(jobs.sample).toMatch(/prepare: npm run journey:new -- \w+ --name \S+ --city \w+ --city-name \S+\n/u);
    expect(jobs.sample).toMatch(/command: npx playwright test -c playwright\.sample\.config\.ts\n/u);
  });

  it("reads tiers of plain, template and multi-line test calls", () => {
    expect(specTests([
      'test("a", { tag: tier.gate }, async ({ page }) => {});',
      "  test(`b ${x}`, { tag: [tier.debug, tier.smoke] },",
      "    async ({ page }) => {});",
      'test("c", async ({ page }) => {});',
    ].join("\n"))).toEqual([
      { title: "a", tiers: ["gate"] },
      { title: "b ${x}", tiers: ["debug", "smoke"] },
      { title: "c", tiers: [] },
    ]);
  });
});
