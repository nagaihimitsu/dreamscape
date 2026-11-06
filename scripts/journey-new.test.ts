import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { MIRROR_DIRECTORY, SAMPLE_JOURNEY_DIRECTORY, journeyDirectory, journeysDirectory } from "./content-layout";
import { buildContent } from "./content-pipeline";
import { listFiles } from "./content-sources";
import { inspectJourneyReadiness, loadJourneyReadiness } from "./journey-readiness";
import { CHECKLIST_FILE, CHECKLIST_TEMPLATE, checkNewJourneyOptions, createJourney, parseNewJourneyArgs, scaffoldJourney } from "./journey-new";
import { prepareJourneyRelease } from "./promote-journey";
import { readSampleJourney } from "./sample-journey";

// `npm run journey:new` copies the sample journey into a new preparing
// journey; journey:readiness and journey:release refuse it until the sample's
// sources, images and texts are replaced.

const repository = path.resolve(".");
const sample = readSampleJourney();
const checklist = readFileSync(path.join(repository, CHECKLIST_TEMPLATE), "utf8");
const reserved = { journeyId: "sample_trip", prefix: "smp", cityId: "mihon" };
const kyoto = { journeyId: "kyoto_trip", nameJa: "京都の旅", cityId: "kyoto", cityNameJa: "京都", prefix: "ky" };
const json = (files: ReadonlyMap<string, Buffer>, file: string) => JSON.parse(files.get(file)!.toString("utf8"));
const optionalFiles = sample.readme.optional.flatMap((part) => part.files);

describe("journey:new command line", () => {
  it("reads the journey ID, the names, the city, the prefix and --with-optional", () => {
    expect(parseNewJourneyArgs(["kyoto_trip", "--name", "京都の旅", "--city", "kyoto", "--city-name", "京都"]))
      .toEqual({ journeyId: "kyoto_trip", nameJa: "京都の旅", cityId: "kyoto", cityNameJa: "京都", withOptional: false });
    expect(parseNewJourneyArgs(["--with-optional", "--prefix", "ky", "--city-name", "京都", "--city", "kyoto", "--name", "京都の旅", "kyoto_trip"]))
      .toEqual({ journeyId: "kyoto_trip", nameJa: "京都の旅", cityId: "kyoto", cityNameJa: "京都", prefix: "ky", withOptional: true });
  });

  it("requires the Japanese names and refuses unknown, repeated or empty arguments", () => {
    const base = ["kyoto_trip", "--name", "京都の旅", "--city", "kyoto", "--city-name", "京都"];
    expect(() => parseNewJourneyArgs(base.filter((_, index) => index !== 1 && index !== 2))).toThrow("--name（旅行編の日本語名）を指定してください。");
    expect(() => parseNewJourneyArgs(base.slice(0, 5))).toThrow("--city-name（都市の日本語名）を指定してください。");
    expect(() => parseNewJourneyArgs(base.slice(1))).toThrow("旅行編IDを指定してください。");
    expect(() => parseNewJourneyArgs([...base, "--order", "5"])).toThrow("知らない指定です: --order");
    expect(() => parseNewJourneyArgs([...base, "--name", "別名"])).toThrow("--name が2回指定されています。");
    expect(() => parseNewJourneyArgs([...base, "osaka"])).toThrow("旅行編IDは1つだけ指定してください: kyoto_trip と osaka");
    expect(() => parseNewJourneyArgs(["kyoto_trip", "--name", "--city", "kyoto"])).toThrow("--name の値がありません。");
    expect(() => parseNewJourneyArgs(base.slice(1))).toThrow("使い方: npm run journey:new --");
  });

  it("checks the IDs, the reserved sample names and that the names are Japanese", () => {
    expect(checkNewJourneyOptions({ ...kyoto, prefix: undefined }, reserved)).toMatchObject({ prefix: "kyoto_trip", withOptional: false });
    expect(checkNewJourneyOptions({ ...kyoto, prefix: "ky_" }, reserved).prefix).toBe("ky");
    expect(() => checkNewJourneyOptions({ ...kyoto, journeyId: "Kyoto" }, reserved)).toThrow("旅行編ID「Kyoto」は使えません。");
    expect(() => checkNewJourneyOptions({ ...kyoto, cityId: "kyoto-city" }, reserved)).toThrow("都市ID「kyoto-city」は使えません。");
    expect(() => checkNewJourneyOptions({ ...kyoto, prefix: "9k" }, reserved)).toThrow("IDの接頭辞「9k」は使えません。");
    expect(() => checkNewJourneyOptions({ ...kyoto, journeyId: "sample_trip" }, reserved)).toThrow("旅行編ID「sample_trip」は見本の編のために予約されています。");
    expect(() => checkNewJourneyOptions({ ...kyoto, cityId: "mihon" }, reserved)).toThrow("都市ID「mihon」は見本の編のために予約されています。");
    expect(() => checkNewJourneyOptions({ ...kyoto, prefix: "smp_" }, reserved)).toThrow("IDの接頭辞「smp」は見本の編のために予約されています。");
    expect(() => checkNewJourneyOptions({ ...kyoto, nameJa: "Kyoto Trip" }, reserved)).toThrow("--name には日本語の名前を1行で指定してください");
    expect(() => checkNewJourneyOptions({ ...kyoto, cityNameJa: " 京都" }, reserved)).toThrow("--city-name には日本語の名前を1行で指定してください");
  });
});

describe("journey:new copy of the sample", () => {
  it("changes only the release state, the placeholders and the checklist when the sample's own names are given", () => {
    const files = scaffoldJourney(sample, { journeyId: "sample_trip", nameJa: "見本の旅", cityId: "mihon", cityNameJa: "見本の街", prefix: "smp", withOptional: true, order: 9000 }, checklist);
    expect([...files.keys()].sort()).toEqual([...sample.files.keys(), CHECKLIST_FILE].sort());
    const changed = [...sample.files].filter(([file, bytes]) => !files.get(file)!.equals(bytes)).map(([file]) => file);
    expect(changed.sort()).toEqual(["cities/mihon.json", "manifest.json", "tourism/catalog.json"]);
    expect(json(files, "manifest.json")).toEqual({ ...json(sample.files, "manifest.json"), status: "preparing" });
    expect(json(files, "cities/mihon.json")).toEqual({ ...json(sample.files, "cities/mihon.json"), productionStatus: "prototype" });
    const tourism = json(sample.files, "tourism/catalog.json");
    for (const asset of tourism.assets) asset.isPlaceholder = true;
    expect(json(files, "tourism/catalog.json")).toEqual(tourism);
  });

  it("replaces the sample's journey ID, prefix and city everywhere, without the optional parts unless asked", () => {
    const options = { ...kyoto, withOptional: false, order: 50 };
    const minimal = scaffoldJourney(sample, options, checklist);
    const full = scaffoldJourney(sample, { ...options, withOptional: true }, checklist);
    expect(minimal.size).toBe(sample.readme.core.length + 1);
    expect(full.size).toBe(sample.files.size + 1);
    expect([...minimal.keys()]).toContain("stories/battles/ky_kyoto_finale.ink");
    expect([...minimal.keys()]).toContain("public/assets/tourism/kyoto_trip/kyoto_clock_tower.png");
    expect([...full.keys()]).toContain("quizzes/ky_kyoto_market_b_quiz.json");
    // No name of the sample is left as an ID, a part of one or a path (English names such as "Mihon Inn" are text to rewrite).
    const left = /(?<![A-Za-z0-9])(sample_trip|smp|mihon)(?![A-Za-z0-9])/u;
    for (const [file, bytes] of full) {
      expect(file, file).not.toMatch(left);
      if (file !== CHECKLIST_FILE && !file.startsWith("public/")) expect(bytes.toString("utf8"), file).not.toMatch(left);
    }
    expect(json(minimal, "manifest.json")).toMatchObject({
      id: "kyoto_trip", nameJa: "京都の旅", order: 50, status: "preparing", cities: [{ id: "kyoto", nameJa: "京都" }],
      authoring: { eventPrefix: "ky", observationFile: "authoring/journeys/kyoto_trip/drafts/observation-cards.json", imageDirectory: "assets/tourism/kyoto_trip" },
    });
    expect(json(minimal, "cities/kyoto.json")).toMatchObject({ id: "kyoto", nameJa: "京都", productionStatus: "prototype", landmarkIdsPlanned: ["kyoto_clock_tower"] });
    expect(json(minimal, "tourism/catalog.json").assets.map((asset: { isPlaceholder: boolean }) => asset.isPlaceholder)).toEqual([true]);
    // The images are the sample's bytes (journey:readiness reports them until replaced).
    expect(minimal.get("public/assets/tourism/kyoto_trip/kyoto_clock_tower.png")!.equals(sample.files.get("public/assets/tourism/sample_trip/mihon_clock_tower.png")!)).toBe(true);
    const list = minimal.get(CHECKLIST_FILE)!.toString("utf8");
    expect(list).not.toContain("{{");
    expect(list).toContain("# 京都の旅（kyoto_trip）の置き換えチェックリスト");
    expect(list).toContain("- [ ] `stories/battles/ky_kyoto_finale.ink` — 都市フィナーレの会話");
    for (const file of minimal.keys()) if (file !== CHECKLIST_FILE) expect(list, file).toContain(`\`${file}\``);
    expect(full.get(CHECKLIST_FILE)!.toString("utf8")).toContain("- [ ] `quizzes/ky_kyoto_market_b_quiz.json` — 任意の部分「特殊戦B（矛盾追及）」");
    expect(optionalFiles.length).toBe(full.size - minimal.size);
  });
});

/** A rewrite that keeps the structure: a mark in every Japanese text, other source URLs, new images, no placeholders. */
async function replaceSampleContent(folder: string): Promise<void> {
  const mark = (text: string) => text.replace(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, "$&改").replaceAll("Mihon", "Kyoto");
  const rewrite = (value: unknown): unknown => {
    if (typeof value === "string") return value.startsWith("https://example.com/") ? "https://dreamscape-check.jp/source" : mark(value);
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === "isPlaceholder" ? false : rewrite(item)]));
    return value;
  };
  for (const file of listFiles(folder)) {
    const absolute = path.join(folder, file);
    if (file.startsWith("public/")) {
      const { width, height } = await sharp(absolute).metadata();
      writeFileSync(absolute, await sharp({ create: { width: width!, height: height!, channels: 3, background: "#2f6b5e" } }).png().toBuffer());
    } else if (file === "learning/word-meanings.json") {
      // Glosses are shared phrasing; a word other journeys define must keep their exact meaning.
    } else if (file.endsWith(".json")) writeFileSync(absolute, `${JSON.stringify(rewrite(JSON.parse(readFileSync(absolute, "utf8"))), null, 2)}\n`);
    else if (file.endsWith(".ink"))
      writeFileSync(absolute, readFileSync(absolute, "utf8").split("\n").map((line) => (line.trim().startsWith("//") ? line : mark(line))).join("\n"));
  }
}

describe("journey:new in a copy of the repository", () => {
  let root: string;
  const journeyFolders = () => readdirSync(journeysDirectory(root)).sort();
  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "dreamscape-journey-new-"));
    // A real copy (journey:release refuses the linked images of prepareContentFixture), with the sample and the checklist.
    for (const folder of ["content", "public", "authoring/templates"])
      cpSync(path.join(repository, folder), path.join(root, folder), { recursive: true });
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("creates preparing journeys that content:build accepts, the minimal one and one with the optional parts", async () => {
    const created = createJourney(root, kyoto);
    expect(created).toMatchObject({ journeyId: "kyoto_trip", prefix: "ky", cityId: "kyoto", order: 50, folder: "content/journeys/kyoto_trip" });
    expect(created.files).toHaveLength(sample.readme.core.length + 1);
    expect(createJourney(root, { journeyId: "nara", nameJa: "奈良の旅", cityId: "nara", cityNameJa: "奈良", withOptional: true }))
      .toMatchObject({ prefix: "nara", order: 60, files: expect.arrayContaining(["stories/encounters/nara_nara_bookmark_gift.ink"]) });
    expect(journeyFolders()).toEqual(["golden_triangle", "kyoto_trip", "luang_prabang", "milano", "nara", "uzbekistan"]);
    const result = await buildContent(root);
    const catalog = journeyCatalogSchema.parse(JSON.parse(readFileSync(path.join(root, MIRROR_DIRECTORY, "journeys/catalog.json"), "utf8")));
    expect(catalog.journeys.slice(-2).map((journey) => [journey.id, journey.status, journey.nameJa])).toEqual([["kyoto_trip", "preparing", "京都の旅"], ["nara", "preparing", "奈良の旅"]]);
    expect(result.journeyContents.find((journey) => journey.id === "nara")).toMatchObject({ status: "preparing" });
    // Every ID follows the new prefix and every file is used: no warning names the new journeys.
    expect(result.warnings.filter((warning) => /kyoto|nara/u.test(warning.message))).toEqual([]);
  });

  it("refuses an existing journey, city or prefix and content that would not build, writing nothing", () => {
    const before = journeyFolders();
    expect(() => createJourney(root, { ...kyoto, cityId: "kyoto2" })).toThrow("旅行編「kyoto_trip」はすでにあります: content/journeys/kyoto_trip");
    expect(() => createJourney(root, { ...kyoto, journeyId: "osaka", prefix: "os" })).toThrow("都市ID「kyoto」はすでに使われています: content/journeys/kyoto_trip/cities/kyoto.json");
    expect(() => createJourney(root, { ...kyoto, journeyId: "osaka", cityId: "osaka", prefix: "gt" })).toThrow("IDの接頭辞「gt」は旅行編「golden_triangle」が使っています");
    expect(() => createJourney(root, { ...kyoto, journeyId: "osaka", cityId: "osaka", prefix: "os", nameJa: "" })).toThrow("--name には日本語の名前を1行で指定してください");
    // A story ID of another journey that the copy would define again.
    const taken = path.join(journeyDirectory(root, "golden_triangle"), "stories/epilogues/osaka.ink");
    writeFileSync(taken, "// taken\n-> END\n");
    try {
      expect(() => createJourney(root, { ...kyoto, journeyId: "osaka", cityId: "osaka", prefix: "os" })).toThrow(/^作った旅行編が内容の検証を通らなかったため、何も書き込んでいません: .*epilogues\/osaka/u);
    } finally { rmSync(taken); }
    expect(journeyFolders()).toEqual(before);
  });

  it("is reported by journey:readiness and refused by journey:release until the sample content is replaced", async () => {
    const report = inspectJourneyReadiness(loadJourneyReadiness(root, "kyoto_trip"));
    const left = report.issues.filter((issue) => issue.code === "sample_content_left").map((issue) => issue.detail);
    expect(left).toEqual(expect.arrayContaining([
      "見本の出典（example.com）が残っています: content/journeys/kyoto_trip/quizzes/ky_kyoto_clock_tower_quiz.json（3件）",
      "見本の画像のままです: content/journeys/kyoto_trip/public/assets/tourism/kyoto_trip/kyoto_clock_tower.png",
      "見本の文章が残っています: content/journeys/kyoto_trip/stories/tourism/ky_kyoto_clock_tower_guide.ink（6か所）",
    ]));
    expect(report).toMatchObject({ ready: false, readyForPromotion: false });
    await expect(prepareJourneyRelease(root, "kyoto_trip", false)).rejects.toThrow(/^見本の内容が残っているため公開できません。[\s\S]*見本の画像のままです/u);

    await replaceSampleContent(journeyDirectory(root, "kyoto_trip"));
    const replaced = inspectJourneyReadiness(loadJourneyReadiness(root, "kyoto_trip"));
    expect(replaced.issues.map((issue) => issue.detail)).toEqual(["旅行編は準備中です。"]);
    expect(replaced.readyForPromotion).toBe(true);
    // The release preview validates the released state in a copy and changes nothing.
    const manifest = readFileSync(path.join(journeyDirectory(root, "kyoto_trip"), "manifest.json"), "utf8");
    await prepareJourneyRelease(root, "kyoto_trip", false);
    expect(readFileSync(path.join(journeyDirectory(root, "kyoto_trip"), "manifest.json"), "utf8")).toBe(manifest);
  }, 120_000);

  it("never reports the repository's journeys or the sample itself", () => {
    for (const id of ["milano", "golden_triangle", "uzbekistan", "luang_prabang"])
      expect(loadJourneyReadiness(repository, id).sampleLeftovers, id).toEqual([]);
    expect(existsSync(path.join(repository, SAMPLE_JOURNEY_DIRECTORY))).toBe(true);
  });
});
