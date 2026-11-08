import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { journeyReleaseSummary, namedJa, parseJourneyScaffoldArgs } from "./journey-cli";

const root = path.resolve(import.meta.dirname, "..");

describe("journey authoring commands", () => {
  it("name journeys and cities in Japanese with their IDs", () => {
    expect(namedJa({ id: "golden_triangle", nameJa: "インド・ゴールデントライアングル編" })).toBe("インド・ゴールデントライアングル編（golden_triangle）");
    expect(namedJa({ id: "delhi" })).toBe("delhi");
  });

  it("journey:scaffold prints the requirements without a mode, and --fragments needs its narrative file", () => {
    const requirements = { mode: "requirements", narrativePath: undefined, journeyId: "kyoto", selectedCities: ["gion"] };
    expect(parseJourneyScaffoldArgs(["--journey", "kyoto", "--city", "gion"])).toEqual(requirements);
    expect(parseJourneyScaffoldArgs(["--requirements", "--journey", "kyoto", "--city", "gion"])).toEqual(requirements);
    expect(parseJourneyScaffoldArgs(["--journey", "kyoto", "--requirements", "--city", "gion"])).toEqual(requirements);
    const fragments = { mode: "fragments", narrativePath: "narrative.json", journeyId: "kyoto", selectedCities: undefined };
    expect(parseJourneyScaffoldArgs(["--fragments", "narrative.json", "--journey", "kyoto"])).toEqual(fragments);
    expect(parseJourneyScaffoldArgs(["--journey", "kyoto", "--fragments", "narrative.json"])).toEqual(fragments);
    const usage = "Usage: [--requirements] --journey ID [--city ID] | --fragments NARRATIVE.json --journey ID [--city ID]";
    // The option after --fragments is not taken as the file.
    expect(() => parseJourneyScaffoldArgs(["--fragments", "--journey", "kyoto"])).toThrow(usage);
    expect(() => parseJourneyScaffoldArgs(["--journey", "kyoto", "--fragments"])).toThrow(usage);
    expect(() => parseJourneyScaffoldArgs([])).toThrow("--journey ID is required");
    expect(() => parseJourneyScaffoldArgs(["--journey", "kyoto", "--town", "gion"])).toThrow("Unknown option: --town");
    expect(() => parseJourneyScaffoldArgs(["--journey", "kyoto", "--journey", "nara"])).toThrow("Expected unique --journey ID and optional --city ID");
  });

  it("journey:release names the journey and the last city and lists the files", () => {
    const result = { journey: { id: "kyoto", nameJa: "京都編" }, lastCity: { id: "gion", nameJa: "祇園" },
      files: ["content/journeys/kyoto/manifest.json", "content/journeys/kyoto/cities/gion.json"] };
    expect(journeyReleaseSummary(result, true)).toEqual([
      "京都編（kyoto）の祇園（gion）までを公開しました（全体の内容の検証に合格）。書き込んだファイル: 2 件",
      "  content/journeys/kyoto/manifest.json", "  content/journeys/kyoto/cities/gion.json"]);
    expect(journeyReleaseSummary(result, false)).toEqual([
      "京都編（kyoto）の祇園（gion）までの公開の確認に合格しました（全体の内容の検証）。ファイルは変更していません。--apply で書き込むファイル: 2 件",
      "  content/journeys/kyoto/manifest.json", "  content/journeys/kyoto/cities/gion.json"]);
    expect(journeyReleaseSummary({ ...result, files: [] }, true))
      .toEqual(["京都編（kyoto）の祇園（gion）までは公開済みで、内容が変わらないため、書き込んだファイルはありません（全体の内容の検証に合格）。"]);
    expect(journeyReleaseSummary({ ...result, files: [] }, false))
      .toEqual(["京都編（kyoto）の祇園（gion）までの公開の確認に合格しました（全体の内容の検証）。ファイルは変更していません。--apply しても、内容が変わらないため書き込むファイルはありません。"]);
  });

  const run = (script: string, args: string[]) =>
    spawnSync(process.execPath, ["--import", "tsx", path.join("scripts", script), ...args], { cwd: root, encoding: "utf8" });
  type Manifest = { id: string; nameJa: string; cityPlan?: unknown; cities: { id: string; nameJa: string }[] };
  const manifests = readdirSync(path.join(root, "content/journeys")).sort()
    .map((id) => JSON.parse(readFileSync(path.join(root, "content/journeys", id, "manifest.json"), "utf8")) as Manifest);

  // journey:readiness on a registered journey (about a second each): the headings name the journey and
  // its cities in Japanese with their IDs, and a journey it cannot check gives only its message.
  it("journey:readiness heads its report with the journey's and the cities' Japanese names", () => {
    const planned = manifests.find((manifest) => manifest.cityPlan)!;
    const result = run("inspect-journey-readiness.ts", ["--journey", planned.id]);
    expect(result.status, result.stderr).toBe(0);
    const lines = result.stdout.split("\n");
    expect(lines[0]).toMatch(new RegExp(`^${planned.nameJa}（${planned.id}）: (?:参照の準備完了|準備中)$`, "u"));
    for (const city of planned.cities) expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^${city.nameJa}（${city.id}）: \\d+ 候補$`, "u")));
  });

  it("journey:readiness on a journey without a city plan prints only the message and exits with 1", () => {
    const unplanned = manifests.find((manifest) => !manifest.cityPlan);
    expect(unplanned, "a registered journey without cityPlan (today Milan)").toBeDefined();
    const result = run("inspect-journey-readiness.ts", ["--journey", unplanned!.id]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr.trim()).toBe(`旅行編「${unplanned!.id}」の manifest.json に都市の計画（cityPlan）がないため、準備を確かめられません（journey:readiness は cityPlan を持つ旅行編を確かめます）。`);
  });

  // The commands themselves, on errors that stop them before any content is read or built (each run takes well under a second).
  it.each([
    ["inspect-journey-readiness.ts", [], "--journey ID is required"],
    ["inspect-journey-readiness.ts", ["--journey", "no_such_journey"], "旅行編「no_such_journey」は登録されていません"],
    ["inspect-journey-scaffold.ts", ["--fragments", "--journey", "no_such_journey"], "Usage: [--requirements] --journey ID"],
    ["inspect-journey-scaffold.ts", ["--journey", "no_such_journey"], "Unknown authoring journey: no_such_journey"],
    ["release-journey.ts", ["--journey", "no_such_journey"], "Usage: npx tsx scripts/release-journey.ts --check|--apply"],
    ["release-journey.ts", ["--check", "--journey", "no_such_journey"], "Unknown authoring journey: no_such_journey"],
    ["check-journey-scenario.ts", ["--journey", "no_such_journey"], "Usage: npm run journey:scenario"],
    ["check-journey-scenario.ts", ["--journey", "no_such_journey", "--directory", "nowhere"], "Unknown authoring journey: no_such_journey"],
  ])("%s %j prints only the message and exits with 1", (script, args, message) => {
    const result = run(script, args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(message);
    // One message, no stack trace.
    expect(result.stderr.trim().split("\n")).toHaveLength(1);
    expect(result.stderr).not.toMatch(/^\s+at /mu);
  });
});
