import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
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
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-scenario-test-"));
  const directory = path.join(root, "scenario");
  const plan = journeyRequirements(loadJourneyScaffold(process.cwd(), "golden_triangle"), ["delhi"])[0];
  cpSync(path.join(process.cwd(), "content"), path.join(root, "content"), { recursive: true });
  symlinkSync(path.join(process.cwd(), "public"), path.join(root, "public"));
  symlinkSync(path.join(process.cwd(), "authoring"), path.join(root, "authoring"));
  // Delhi unpublished: its one-scene files (the battles) removed, and the catalogs that name a knot of a place file
  // (guides, dates, the epilogue) pointed back at the planned one-scene story IDs, which the drafts below provide.
  for (const storyId of [...plan.main.flatMap((main) => [main.guideStoryId, main.battleStoryId]), ...plan.dates.map((date) => date.storyId), plan.finale.battleStoryId, plan.finale.epilogueStoryId])
    rmSync(path.join(root, publishedStories, `${storyId}.ink`), { force: true });
  const catalog = (relative: string, change: (data: any) => void) => {
    const file = path.join(root, "content/journeys/golden_triangle", relative);
    const data = JSON.parse(readFileSync(file, "utf8"));
    change(data);
    writeFileSync(file, JSON.stringify(data));
  };
  catalog("tourism/catalog.json", (data) => {
    for (const main of plan.main) data.landmarks.find((item: { id: string }) => item.id === main.landmarkId).guideStoryId = main.guideStoryId;
  });
  catalog("romance/date_catalog.json", (data) => {
    for (const date of plan.dates) data.dates.find((item: { id: string }) => item.id === date.eventId).storyId = date.storyId;
  });
  catalog("progression/journey.json", (data) => {
    data.episodes.find((item: { id: string }) => item.id === plan.finale.eventId).epilogueStoryId = plan.finale.epilogueStoryId;
  });
  const write = (relative: string, content: string) => {
    const target = path.join(directory, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  };
  const story = (id: string, source: string) => write(`delhi/stories/${id}.ink`, source);
  const scene = { titleJa: "検証用場面", descriptionJa: "検証専用の物語", clearTitleJa: "検証完了", clearDescriptionJa: "検証用の記録",
    enemyNameJa: "検証人物", enemyTitleJa: "検証役", enemyDescriptionJa: "本番には含めない人物" };
  const narrative = { main: Object.fromEntries(plan.main.map((item) => [item.eventId, scene])),
    dates: Object.fromEntries(plan.dates.map((item) => [item.eventId, { titleJa: "検証デート", descriptionJa: "検証の会話", memoryTitleJa: "検証の記憶", memoryDescriptionJa: "検証記録" }])),
    finales: { delhi: { ...scene, placeId: plan.main[0].landmarkId, activityMinutes: 60 } } };
  write("narrative.json", JSON.stringify(narrative));
  write("delhi/narrative.json", JSON.stringify(narrative));
  // A battle (stage 5): -> quiz(1) -> … -> quiz(n) -> between its lines.
  const battle = (count: number) => `INCLUDE modules.ink\n${Array.from({ length: count + 1 }, (_, index) =>
    `# speaker: heroine\n「検証の場面です」\n${index < count ? `-> quiz(${index + 1}) ->` : "-> END"}`).join("\n")}\n`;
  for (const main of plan.main) {
    story(main.guideStoryId, `${names}# speaker: narrator\n案内の検証です。\n-> END`);
    story(main.battleStoryId, battle(3));
  }
  story(plan.finale.battleStoryId, battle(5));
  story(plan.finale.epilogueStoryId, `${names}VAR romance_stage = 1\nVAR ending_reached = false\n# speaker: narrator\n最後の検証です。\n-> END`);
  for (const date of plan.dates) {
    const choices = (round: "first" | "second", next: string) => ["attentive", "playful", "honest"].map((profile, index) => `* [「検証の返答${index + 1}」]\n    # effect: ${date.eventId}_${round}_${profile}\n    { romance_result == "negative":\n        # speaker: heroine\n        「その返答は少し気になります」\n    - else:\n        # speaker: heroine\n        「その返答を聞けてよかった」\n    }\n    -> ${next}`).join("\n");
    story(date.storyId, `${names}VAR romance_stage = 1\nVAR ending_reached = false\nVAR romance_result = "neutral"\nVAR affection_delta = 0\nVAR trust_delta = 0\nVAR spark_delta = 0\nVAR relationship_tone = "reserved"\nVAR relationship_tone_before = "reserved"\nVAR relationship_tone_after = "reserved"\n# speaker: heroine\n「選択肢の検証です」\n${choices("first", "second")}\n=== second ===\n# speaker: heroine\n「二回目の検証です」\n${choices("second", "finish")}\n=== finish ===\n# speaker: narrator\n検証が終わった。\n-> END`);
  }
  return { root, directory, plan, write, story };
}

describe("draft journey scenario contracts", () => {
  it("checks every authored file and relationship/quiz input without making the journey playable", async () => {
    const { root, directory, plan } = fixture();
    const before = { project: manifests(process.cwd()), fixture: manifests(root) };
    expect(Object.keys(before.project)).toEqual(expect.arrayContaining(["milano", "golden_triangle", "uzbekistan", "luang_prabang"]));
    const generated = readFileSync("src/content/generated/stories.json", "utf8");
    try {
      // A promoted file has one canonical copy and still uses the same checker.
      const guide = `${plan.main[0].guideStoryId}.ink`;
      // India publishes its guides as knots of place files: a promoted one-scene guide goes to its own folder.
      mkdirSync(path.dirname(path.join(root, publishedStories, guide)), { recursive: true });
      renameSync(path.join(directory, "delhi/stories", guide), path.join(root, publishedStories, guide));
      expect(await validateJourneyScenario(root, "golden_triangle", directory, "delhi")).toEqual({
        journeyId: "golden_triangle", cities: ["delhi"], stories: 16, placeKnots: 0, guides: 4,
        battleScenarios: 44, dateRoutes: 10368, epilogueScenarios: 8, warnings: [], readyForPublication: false,
      });
      // No journey (not only the checked one) is registered or released by a scenario check.
      expect({ project: manifests(process.cwd()), fixture: manifests(root) }).toEqual(before);
      expect(readFileSync("src/content/generated/stories.json", "utf8")).toBe(generated);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 120_000);

  it("checks India's real drafts: a knot of a published place file counts as published, and a draft beside it is refused", async () => {
    // Delhi's guides, dates and epilogue are knots of place files (content:build walks them); its battles are one-scene files,
    // walked here as content:build walks them.
    expect(await validateJourneyScenario(process.cwd(), "golden_triangle", indiaDrafts, "delhi")).toEqual({
      journeyId: "golden_triangle", cities: ["delhi"], stories: 16, placeKnots: 11, guides: 4,
      battleScenarios: 44, dateRoutes: 0, epilogueScenarios: 0, warnings: [], readyForPublication: false,
    });
    const directory = mkdtempSync(path.join(tmpdir(), "dreamscape-scenario-india-"));
    try {
      cpSync(indiaDrafts, directory, { recursive: true });
      const plan = journeyRequirements(loadJourneyScaffold(process.cwd(), "golden_triangle"), ["delhi"])[0];
      for (const storyId of [plan.main[0].guideStoryId, plan.dates[0].storyId, plan.finale.epilogueStoryId]) {
        const draft = path.join(directory, "delhi/stories", `${storyId}.ink`);
        mkdirSync(path.dirname(draft), { recursive: true });
        writeFileSync(draft, `${names}# speaker: narrator\n下書きの検証です。\n-> END`);
        await expect(validateJourneyScenario(process.cwd(), "golden_triangle", directory, "delhi"))
          .rejects.toThrow(`下書きと公開済みの両方に同じ Ink があります: ${storyId}。どちらか1つにします。`);
        rmSync(draft);
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }, 120_000);

  it("rejects missing/extra scripts; protagonist dialogue, also in unreachable branches, is one warning", async () => {
    const { root, directory, plan, story } = fixture();
    const check = () => validateJourneyScenario(root, "golden_triangle", directory, "delhi");
    try {
      const file = path.join(directory, "delhi/stories", `${plan.main[0].guideStoryId}.ink`);
      const original = readFileSync(file, "utf8");
      const published = path.join(root, publishedStories, `${plan.main[0].guideStoryId}.ink`);
      mkdirSync(path.dirname(published), { recursive: true });
      writeFileSync(published, original);
      await expect(check()).rejects.toThrow(/下書きと公開済みの両方に同じ Ink があります/u);
      rmSync(published);
      rmSync(file);
      await expect(check()).rejects.toThrow(/下書きの Ink ファイルが要るものと合いません。足りない: \[[^\]]+\]/u);
      writeFileSync(file, original);
      const extra = story("tourism/unregistered", original);
      await expect(check()).rejects.toThrow(/余分: \[[^\]]*unregistered/u);
      rmSync(extra);
      writeFileSync(file, `${original}\n=== unused ===\n# speaker: player\n「勝手に話す主人公」\n-> END`);
      // Not stopped (decision 36): one warning names the file.
      const result = await check();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(new RegExp(`${plan.main[0].guideStoryId}\\.ink: the protagonist speaks outside the date choices`));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rejects a battle that calls its quizzes out of order or does not include modules.ink, foreign backgrounds and effects from another date", async () => {
    const { root, directory, plan } = fixture();
    const check = () => validateJourneyScenario(root, "golden_triangle", directory, "delhi");
    try {
      const file = path.join(directory, "delhi/stories", `${plan.main[0].battleStoryId}.ink`);
      const original = readFileSync(file, "utf8");
      writeFileSync(file, original.replace("-> quiz(2) ->\n", ""));
      await expect(check()).rejects.toThrow(/calls quiz\(3\) where quiz\(2\) comes next/);
      // A battle's script with its own VAR lines in place of INCLUDE modules.ink is refused.
      writeFileSync(file, `${names}「検証の場面です」\n-> END\n`);
      await expect(check()).rejects.toThrow(/start .* with INCLUDE modules\.ink/);
      writeFileSync(file, original);
      const guide = path.join(directory, "delhi/stories", `${plan.main[0].guideStoryId}.ink`);
      const guideOriginal = readFileSync(guide, "utf8");
      writeFileSync(guide, guideOriginal.replace("# speaker: narrator", "# background: milano_duomo\n# speaker: narrator"));
      await expect(check()).rejects.toThrow(/Unknown background: milano_duomo/);
      writeFileSync(guide, guideOriginal);
      // Any background of the journey's own romance/presentation.json is accepted, also one that is no place of the city (an Agra one in Delhi).
      const dateFile = path.join(directory, "delhi/stories", `${plan.dates[0].storyId}.ink`);
      const dateOriginal = readFileSync(dateFile, "utf8");
      writeFileSync(dateFile, dateOriginal.replace("# speaker: heroine\n「選択肢の検証です」", "# background: gt_bg_agra_taj_mahal\n# speaker: heroine\n「選択肢の検証です」"));
      await expect(check()).resolves.toMatchObject({ warnings: [] });
      writeFileSync(dateFile, dateOriginal);
      // Lines in English only pass too (any language may be written: decision 28).
      writeFileSync(guide, guideOriginal.replace("案内の検証です。", "This guide line is in English only."));
      await expect(check()).resolves.toMatchObject({ warnings: [] });
      writeFileSync(guide, guideOriginal);
      const date = path.join(directory, "delhi/stories", `${plan.dates[0].storyId}.ink`);
      writeFileSync(date, readFileSync(date, "utf8").replace(`${plan.dates[0].eventId}_first_attentive`, `${plan.dates[1].eventId}_first_attentive`));
      await expect(check()).rejects.toThrow(/Unknown effect/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
