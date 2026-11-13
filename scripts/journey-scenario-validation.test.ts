import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { splitStoryAddress, storyFileOf } from "../src/content/story-address";
import { journeyRequirements, loadJourneyScaffold } from "./journey-scaffold";
import { validateJourneyScenario } from "./journey-scenario-validation";
import { readJourneyManifests } from "./content-sources";

/** Every journey manifest of a project, by journey ID. */
const manifests = (root: string) => Object.fromEntries(readJourneyManifests(root).map((item) => [item.id, readFileSync(item.file, "utf8")]));

/** India's published Ink lives in its journey folder; story IDs are paths below `stories/`. */
const publishedStories = "content/journeys/golden_triangle/stories";
/** India's scenario drafts (its scenes are all published; the folder holds the narrative metadata). */
const indiaDrafts = "authoring/journeys/golden_triangle/drafts/scenario";
const names = 'VAR player_name = "検証主人公"\nVAR heroine_name = "検証ヒロイン"\nVAR player_address = "検証主人公さん"\n';
/** A place file of the given knots (its top: the game's include and -> DONE). */
const placeFile = (knots: readonly string[]) => `INCLUDE modules.ink\n-> DONE\n\n${knots.join("\n")}`;
const guideKnot = (knot: string) => `=== ${knot} ===\n# scene: guide\n# speaker: narrator\n案内の検証です。\n-> END\n`;
/** A battle (stage 5): -> quiz(1) -> … -> quiz(n) -> between its lines. */
const battleKnot = (count: number) => (knot: string) => `=== ${knot} ===\n# scene: battle\n${Array.from({ length: count + 1 }, (_, index) =>
  `# speaker: heroine\n「検証の場面です」\n${index < count ? `-> quiz(${index + 1}) ->` : "-> END"}`).join("\n")}\n`;
const epilogueKnot = (knot: string) => `=== ${knot} ===\n# scene: epilogue\n# speaker: narrator\n最後の検証です。\n-> END\n`;
/** A normal date with two romance choice points (# profile:; the second's choices keep its memory, # memory:). */
const dateKnot = (memoryId: string) => (knot: string) => {
  const choices = (round: "first" | "second", next: string) => ["attentive", "playful", "honest"].map((profile, index) =>
    `* [「検証の返答${index + 1}」 # option: ${round}_${profile}]\n    # profile: ${profile}\n${round === "second" ? `    # memory: ${memoryId}\n` : ""}` +
    `    { romance_result == "negative":\n        # speaker: heroine\n        「その返答は少し気になります」\n    - else:\n        # speaker: heroine\n        「その返答を聞けてよかった」\n    }\n    -> ${next}`).join("\n");
  return `=== ${knot} ===\n# scene: date\n# speaker: heroine\n「選択肢の検証です」\n${choices("first", "second")}\n= second\n# speaker: heroine\n「二回目の検証です」\n` +
    `${choices("second", "finish")}\n= finish\n# speaker: narrator\n検証が終わった。\n-> END\n`;
};

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-scenario-test-"));
  const directory = path.join(root, "scenario");
  const input = loadJourneyScaffold(process.cwd(), "golden_triangle");
  // The finale at the first landmark (the narrative's placeId below): its knot goes in that landmark's place file.
  const venue = journeyRequirements(input, ["delhi"])[0].main[0].landmarkId;
  const plan = journeyRequirements(input, ["delhi"], { delhi: venue })[0];
  cpSync(path.join(process.cwd(), "content"), path.join(root, "content"), { recursive: true });
  symlinkSync(path.join(process.cwd(), "public"), path.join(root, "public"));
  symlinkSync(path.join(process.cwd(), "authoring"), path.join(root, "authoring"));
  const write = (relative: string, content: string) => {
    const target = path.join(directory, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  };
  /** A draft story file of Delhi (its story ID: the path below the city's stories/). */
  const story = (id: string, source: string) => write(`delhi/stories/${id}.ink`, source);
  // The planned scenes, by the place file of their knots: Delhi unpublished (those place files removed from the content) and drafted.
  const knots = new Map<string, string[]>();
  const add = (address: string, text: (knot: string) => string) => {
    const { storyId, path: knot } = splitStoryAddress(address);
    knots.set(storyId, [...(knots.get(storyId) ?? []), text(knot!)]);
  };
  for (const main of plan.main) {
    add(main.guideStoryId, guideKnot);
    add(main.battleStoryId, battleKnot(3));
  }
  for (const date of plan.dates) add(date.storyId, dateKnot(date.memoryId));
  add(plan.finale.battleStoryId!, battleKnot(5));
  add(plan.finale.epilogueStoryId, epilogueKnot);
  for (const [storyId, texts] of knots) {
    rmSync(path.join(root, publishedStories, `${storyId}.ink`), { force: true });
    story(storyId, placeFile(texts));
  }
  const scene = { titleJa: "検証用場面", descriptionJa: "検証専用の物語", clearTitleJa: "検証完了", clearDescriptionJa: "検証用の記録",
    enemyNameJa: "検証人物", enemyTitleJa: "検証役", enemyDescriptionJa: "本番には含めない人物" };
  const narrative = { main: Object.fromEntries(plan.main.map((item) => [item.eventId, scene])),
    dates: Object.fromEntries(plan.dates.map((item) => [item.eventId, { titleJa: "検証デート", descriptionJa: "検証の会話", memoryTitleJa: "検証の記憶", memoryDescriptionJa: "検証記録" }])),
    finales: { delhi: { ...scene, placeId: venue, activityMinutes: 60 } } };
  write("narrative.json", JSON.stringify(narrative));
  write("delhi/narrative.json", JSON.stringify(narrative));
  /** The draft file of a planned scene's address. */
  const draftOf = (address: string) => path.join(directory, "delhi/stories", `${storyFileOf(address)}.ink`);
  return { root, directory, plan, write, story, draftOf };
}

describe("draft journey scenario contracts", () => {
  it("checks every authored place file and relationship/quiz input without making the journey playable", async () => {
    const { root, directory, plan, draftOf } = fixture();
    const before = { project: manifests(process.cwd()), fixture: manifests(root) };
    expect(Object.keys(before.project)).toEqual(expect.arrayContaining(["milano", "golden_triangle", "uzbekistan", "luang_prabang"]));
    const generated = readFileSync("src/content/generated/stories.json", "utf8");
    try {
      // 4 guides, 4 battles of 3 quizzes and the finale of 5 (7 and 16 states each), 6 dates and the epilogue (8 contexts).
      const all = await validateJourneyScenario(root, "golden_triangle", directory, "delhi");
      expect(all).toEqual({
        journeyId: "golden_triangle", cities: ["delhi"], stories: 16, placeKnots: 0, guides: 4,
        battleScenarios: 44, dateRoutes: expect.any(Number), epilogueScenarios: 8, warnings: [], readyForPublication: false,
      });
      expect(all.dateRoutes).toBeGreaterThan(0);
      // A draft place file moved into the journey has one canonical copy: its knots (the first landmark's guide and battle, and
      // the finale) count as published, and content:build walks them.
      const moved = storyFileOf(plan.main[0].guideStoryId);
      expect(storyFileOf(plan.finale.battleStoryId!)).toBe(moved);
      renameSync(draftOf(plan.main[0].guideStoryId), path.join(root, publishedStories, `${moved}.ink`));
      expect(await validateJourneyScenario(root, "golden_triangle", directory, "delhi")).toMatchObject({
        stories: 16, placeKnots: 3, guides: 4, battleScenarios: 21, epilogueScenarios: 8, dateRoutes: all.dateRoutes, warnings: [],
      });
      // No journey (not only the checked one) is registered or released by a scenario check.
      expect({ project: manifests(process.cwd()), fixture: manifests(root) }).toEqual(before);
      expect(readFileSync("src/content/generated/stories.json", "utf8")).toBe(generated);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 120_000);

  it("checks India's real drafts: a knot of a published place file counts as published, and a draft beside it is refused", async () => {
    // Every planned scene of Delhi is a knot of a published place file (content:build walks them).
    expect(await validateJourneyScenario(process.cwd(), "golden_triangle", indiaDrafts, "delhi")).toEqual({
      journeyId: "golden_triangle", cities: ["delhi"], stories: 16, placeKnots: 16, guides: 4,
      battleScenarios: 0, dateRoutes: 0, epilogueScenarios: 0, warnings: [], readyForPublication: false,
    });
    const directory = mkdtempSync(path.join(tmpdir(), "dreamscape-scenario-india-"));
    try {
      cpSync(indiaDrafts, directory, { recursive: true });
      const plan = journeyRequirements(loadJourneyScaffold(process.cwd(), "golden_triangle"), ["delhi"])[0];
      for (const [address, kind] of [[plan.main[0].guideStoryId, "guide"], [plan.dates[0].storyId, "date"], [plan.finale.epilogueStoryId, "epilogue"]] as const) {
        const { storyId, path: knot } = splitStoryAddress(address);
        const draft = path.join(directory, "delhi/stories", `${storyId}.ink`);
        mkdirSync(path.dirname(draft), { recursive: true });
        writeFileSync(draft, placeFile([`=== ${knot} ===\n# scene: ${kind}\n# speaker: narrator\n下書きの検証です。\n-> END\n`]));
        await expect(validateJourneyScenario(process.cwd(), "golden_triangle", directory, "delhi"))
          .rejects.toThrow(`下書きと公開済みの両方に同じ Ink があります: ${address}。どちらか1つにします。`);
        rmSync(draft);
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }, 120_000);

  it("rejects missing/extra scripts and knots; protagonist dialogue, also in unreachable branches, is one warning", async () => {
    const { root, directory, plan, story, draftOf } = fixture();
    const check = () => validateJourneyScenario(root, "golden_triangle", directory, "delhi");
    try {
      const file = draftOf(plan.main[0].guideStoryId);
      const original = readFileSync(file, "utf8");
      const published = path.join(root, publishedStories, `${storyFileOf(plan.main[0].guideStoryId)}.ink`);
      writeFileSync(published, original);
      await expect(check()).rejects.toThrow(/下書きと公開済みの両方に同じ Ink があります/u);
      rmSync(published);
      rmSync(file);
      await expect(check()).rejects.toThrow(/下書きの Ink ファイルが要るものと合いません。足りない: \[[^\]]+\]/u);
      // A draft place file without one of its planned knots.
      const guide = `=== ${splitStoryAddress(plan.main[0].guideStoryId).path} ===\n`;
      writeFileSync(file, original.replace(guide, "=== renamed_guide ===\n"));
      await expect(check()).rejects.toThrow(/下書きの場所のファイルに、場面の knot がありません: \S+\.ink の [a-z_]+_guide/u);
      writeFileSync(file, original);
      const extra = story("tourism/unregistered", `${names}# speaker: narrator\n検証です。\n-> END\n`);
      await expect(check()).rejects.toThrow(/余分: \[[^\]]*unregistered/u);
      rmSync(extra);
      writeFileSync(file, `${original}\n=== unused ===\n# speaker: player\n「勝手に話す主人公」\n-> END\n`);
      // Not stopped (decision 36): one warning names the file.
      const result = await check();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(new RegExp(`${storyFileOf(plan.main[0].guideStoryId)}\\.ink: the protagonist speaks outside the date choices`));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rejects a battle that calls its quizzes out of order, a draft without the place file's top, foreign backgrounds, a date's # effect: and an unknown memory", async () => {
    const { root, directory, plan, draftOf } = fixture();
    const check = () => validateJourneyScenario(root, "golden_triangle", directory, "delhi");
    try {
      // The first landmark's place file: its guide, its battle (3 quizzes) and the finale (5), in that order.
      const file = draftOf(plan.main[0].battleStoryId);
      const original = readFileSync(file, "utf8");
      writeFileSync(file, original.replace("-> quiz(2) ->\n", ""));
      await expect(check()).rejects.toThrow(/calls quiz\(3\) where quiz\(2\) comes next/);
      // A draft with its own VAR lines in place of the place file's top (INCLUDE modules.ink, -> DONE) is refused.
      writeFileSync(file, `${names}「検証の場面です」\n-> END\n`);
      await expect(check()).rejects.toThrow(/A place file starts with the two lines "INCLUDE modules\.ink" and "-> DONE"/);
      writeFileSync(file, original.replace("# speaker: narrator", "# background: milano_duomo\n# speaker: narrator"));
      await expect(check()).rejects.toThrow(/Unknown background: milano_duomo/);
      writeFileSync(file, original);
      // Any background of the journey's own romance/presentation.json is accepted, also one that is no place of the city (an Agra one in Delhi).
      const dateFile = draftOf(plan.dates[0].storyId);
      const dateOriginal = readFileSync(dateFile, "utf8");
      writeFileSync(dateFile, dateOriginal.replace("# speaker: heroine\n「選択肢の検証です」", "# background: gt_bg_agra_taj_mahal\n# speaker: heroine\n「選択肢の検証です」"));
      await expect(check()).resolves.toMatchObject({ warnings: [] });
      writeFileSync(dateFile, dateOriginal);
      // Lines in English only pass too (any language may be written: decision 28).
      writeFileSync(file, original.replace("案内の検証です。", "This guide line is in English only."));
      await expect(check()).resolves.toMatchObject({ warnings: [] });
      writeFileSync(file, original);
      // A place file's date writes # profile: (A14), and its # memory: names a known memory.
      writeFileSync(dateFile, dateOriginal.replace("    # profile: attentive\n", `    # effect: ${plan.dates[0].eventId}_first_attentive\n`));
      await expect(check()).rejects.toThrow(/instead of # effect: \(A14\)/);
      writeFileSync(dateFile, dateOriginal.replaceAll(plan.dates[0].memoryId, "gt_delhi_no_such_memory"));
      await expect(check()).rejects.toThrow(/Unknown memory in the choice second_attentive: gt_delhi_no_such_memory/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
