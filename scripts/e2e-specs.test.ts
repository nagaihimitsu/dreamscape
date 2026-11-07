import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The E2E rules of docs/10 「E2Eの段」 that a reader of the specs could break without
// noticing: a test without a tier runs in no CI job, the real-flow specs must not take
// shortcuts, tests that also run against the production build cannot use the
// development server's modules, and the sample journey's playthrough runs only on its
// own server, the one built with the sample.
const folder = path.join(import.meta.dirname, "../tests/e2e");
const specs = readdirSync(folder).filter((name) => name.endsWith(".spec.ts")).sort();
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
const devServerOnly = /placeSave|devModules|openDebugScene|debugGame|import\(/u;
/** …and Debug URLs: shortcuts around the real flow. */
const shortcuts = new RegExp(`${devServerOnly.source}|\\?debug`, "u");

describe("E2E specs", () => {
  it("are found", () => {
    expect(specs).toEqual(expect.arrayContaining(["boot.spec.ts", "play.spec.ts", "save-load.spec.ts", "sample-journey.spec.ts"]));
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
