import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
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
    const usage = "使い方: npm run journey:scaffold -- [--requirements] --journey 旅行編ID [--city 都市ID] | --fragments 脚本の情報.json --journey 旅行編ID [--city 都市ID]";
    // The option after --fragments is not taken as the file.
    expect(() => parseJourneyScaffoldArgs(["--fragments", "--journey", "kyoto"])).toThrow(usage);
    expect(() => parseJourneyScaffoldArgs(["--journey", "kyoto", "--fragments"])).toThrow(usage);
    expect(() => parseJourneyScaffoldArgs([])).toThrow(`--journey で旅行編IDを指定してください。${usage}`);
    expect(() => parseJourneyScaffoldArgs(["--journey", "kyoto", "--town", "gion"])).toThrow(`知らない指定です: --town。${usage}`);
    expect(() => parseJourneyScaffoldArgs(["--journey", "kyoto", "--journey", "nara"])).toThrow(`--journey と --city は1回ずつ、値を付けて指定します。${usage}`);
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

  // The commands read the content of their working directory (`cwd`, the repository unless a test gives a copy).
  const tsx = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
  const run = (script: string, args: string[], cwd = root) =>
    spawnSync(process.execPath, ["--import", tsx, path.join(root, "scripts", script), ...args], { cwd, encoding: "utf8" });
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

  // On a copy of content/ (photos left out) whose first journey has its cityPlan removed, so the check
  // does not depend on which registered journeys have one.
  it("journey:readiness on a journey without a city plan prints only the message and exits with 1", () => {
    const fixture = mkdtempSync(path.join(tmpdir(), "dreamscape-readiness-"));
    try {
      const content = path.join(root, "content");
      cpSync(content, path.join(fixture, "content"), { recursive: true,
        filter: (source) => !path.relative(content, source).split(path.sep).includes("public") });
      const file = path.join(fixture, "content/journeys", readdirSync(path.join(content, "journeys")).sort()[0], "manifest.json");
      const { cityPlan: _plan, ...unplanned } = JSON.parse(readFileSync(file, "utf8")) as Manifest;
      writeFileSync(file, `${JSON.stringify(unplanned, null, 2)}\n`);
      const result = run("inspect-journey-readiness.ts", ["--journey", unplanned.id], fixture);
      expect(result.status, result.stderr).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr.trim()).toBe(`旅行編「${unplanned.id}」の manifest.json に都市の計画（cityPlan）がないため、準備を確かめられません（journey:readiness は cityPlan を持つ旅行編を確かめます）。`);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  // The commands themselves, on errors that stop them before any content is read or built (each run takes well under a second).
  it.each([
    ["inspect-journey-readiness.ts", [], "--journey で旅行編IDを指定してください。使い方: npm run journey:readiness"],
    ["inspect-journey-readiness.ts", ["--journey", "no_such_journey"], "旅行編「no_such_journey」は登録されていません"],
    ["inspect-journey-scaffold.ts", ["--fragments", "--journey", "no_such_journey"], "使い方: npm run journey:scaffold -- [--requirements] --journey 旅行編ID"],
    ["inspect-journey-scaffold.ts", ["--journey", "no_such_journey"], "旅行編「no_such_journey」は登録されていないか、制作ツールの設定（manifest.json の authoring）がありません。制作ツールを使える旅行編: "],
    ["release-journey.ts", ["--journey", "no_such_journey"], "使い方: npm run journey:release -- --check|--apply"],
    ["release-journey.ts", ["--check", "--journey", "no_such_journey"], "旅行編「no_such_journey」は登録されていないか、制作ツールの設定（manifest.json の authoring）がありません。"],
    ["check-journey-scenario.ts", ["--journey", "no_such_journey"], "使い方: npm run journey:scenario"],
    ["check-journey-scenario.ts", ["--journey", "no_such_journey", "--directory", "nowhere"], "旅行編「no_such_journey」は登録されていないか、制作ツールの設定（manifest.json の authoring）がありません。"],
    ["inspect-journey-transit.ts", [], "使い方: npm run journey:transit -- --journey <旅行編ID> [--json]"],
    ["inspect-journey-transit.ts", ["--journey", "no_such_journey"], "旅行編「no_such_journey」は登録されていません"],
    ["city-bundle-cli.ts", ["check"], "使い方: npm run city:bundle -- export|new <都市ID> <編集ファイル> / check|apply <編集ファイル>"],
    ["city-bundle-cli.ts", ["check", "no_such_working_copy.json"], "作業コピーがありません: no_such_working_copy.json"],
    ["inspect-content.ts", [], "使い方: npm run content:inspect -- [--type 種類] ファイル名 または --all"],
  ])("%s %j prints only the message and exits with 1", (script, args, message) => {
    const result = run(script, args);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(message);
    // One message, no stack trace.
    expect(result.stderr.trim().split("\n")).toHaveLength(1);
    expect(result.stderr).not.toMatch(/^\s+at /mu);
  });

  // city:bundle check/apply take only the working copy that export and new write (version 2); an older or
  // broken file stops with its message before any content is read. content:inspect adds what caused a failure.
  it("city:bundle refuses an old or broken working copy, and content:inspect names the cause, without a stack trace", () => {
    const folder = mkdtempSync(path.join(tmpdir(), "dreamscape-cli-"));
    try {
      const file = (name: string, text: string) => {
        writeFileSync(path.join(folder, name), text);
        return path.join(folder, name);
      };
      const cases: [string, string[], string][] = [
        ["city-bundle-cli.ts", ["check", file("old.json", JSON.stringify({ schemaVersion: 1, cityId: "delhi" }))],
          `古い形式の作業コピーです（schemaVersion: 1）: ${path.join(folder, "old.json")}。export し直してください。`],
        ["city-bundle-cli.ts", ["apply", file("none.json", "{}")],
          `作業コピーの形式が違います: ${path.join(folder, "none.json")}。export か new で作った作業コピー（schemaVersion: 2）を使います。`],
        ["city-bundle-cli.ts", ["check", file("broken.json", "{")], `作業コピーを JSON として読めません: ${path.join(folder, "broken.json")}（`],
        ["inspect-content.ts", ["--type", "city", file("city.json", "{}")], `検証失敗: ${path.join(folder, "city.json")}\n[`],
      ];
      for (const [script, args, message] of cases) {
        const result = run(script, args);
        expect(result.status, script).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr.startsWith(message), result.stderr).toBe(true);
        expect(result.stderr).not.toMatch(/^\s+at /mu);
      }
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
