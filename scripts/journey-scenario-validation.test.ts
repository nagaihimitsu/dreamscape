import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { journeyRequirements, loadJourneyScaffold } from "./journey-scaffold";
import { validateJourneyScenario } from "./journey-scenario-validation";

const names = 'VAR player_name = "検証主人公"\nVAR heroine_name = "検証ヒロイン"\nVAR player_address = "検証主人公さん"\n';
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "dreamscape-scenario-test-"));
  const directory = path.join(root, "scenario");
  const plan = journeyRequirements(loadJourneyScaffold(process.cwd(), "golden_triangle"), ["delhi"])[0];
  cpSync(path.join(process.cwd(), "content"), path.join(root, "content"), { recursive: true });
  symlinkSync(path.join(process.cwd(), "public"), path.join(root, "public"));
  symlinkSync(path.join(process.cwd(), "authoring"), path.join(root, "authoring"));
  for (const storyId of [...plan.main.flatMap((main) => [main.guideStoryId, main.battleStoryId]), ...plan.dates.map((date) => date.storyId), plan.finale.battleStoryId, plan.finale.epilogueStoryId])
    rmSync(path.join(root, "content/stories", `${storyId}.ink`), { force: true });
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
  const battle = (count: number) => {
    const scenes = ["intro", ...Array.from({ length: count - 1 }, (_, index) => `after_${index + 1}`), "outro"];
    return `${names}VAR battle_scene = "intro"\nVAR answer_correct = false\nVAR battle_score = 0\n${scenes.map((scene, index) => `{ battle_scene == "${scene}": -> part_${index} }`).join("\n")}\n-> END\n${scenes.map((_, index) => `=== part_${index} ===\n# speaker: heroine\n「検証の場面です」\n-> END`).join("\n")}`;
  };
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
    const manifest = readFileSync("content/journeys/golden_triangle/manifest.json", "utf8");
    const generated = readFileSync("src/content/generated/stories.json", "utf8");
    try {
      // A promoted file has one canonical copy and still uses the same checker.
      const guide = `${plan.main[0].guideStoryId}.ink`;
      renameSync(path.join(directory, "delhi/stories", guide), path.join(root, "content/stories", guide));
      expect(await validateJourneyScenario(root, "golden_triangle", directory, "delhi")).toEqual({
        journeyId: "golden_triangle", cities: ["delhi"], stories: 16, guides: 4,
        battleScenarios: 83, dateRoutes: 10368, epilogueScenarios: 8, readyForPublication: false,
      });
      expect(readFileSync("content/journeys/golden_triangle/manifest.json", "utf8")).toBe(manifest);
      expect(readFileSync("src/content/generated/stories.json", "utf8")).toBe(generated);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 120_000);

  it("rejects missing/extra scripts and protagonist dialogue, including unreachable branches", async () => {
    const { root, directory, plan, story } = fixture();
    const check = () => validateJourneyScenario(root, "golden_triangle", directory, "delhi");
    try {
      const file = path.join(directory, "delhi/stories", `${plan.main[0].guideStoryId}.ink`);
      const original = readFileSync(file, "utf8");
      const published = path.join(root, "content/stories", `${plan.main[0].guideStoryId}.ink`);
      writeFileSync(published, original);
      await expect(check()).rejects.toThrow(/both draft and published Ink/);
      rmSync(published);
      rmSync(file);
      await expect(check()).rejects.toThrow(/Ink file mismatch: missing/);
      writeFileSync(file, original);
      const extra = story("tourism/unregistered", original);
      await expect(check()).rejects.toThrow(/extra.*unregistered/);
      rmSync(extra);
      writeFileSync(file, `${original}\n=== unused ===\n# speaker: player\n「勝手に話す主人公」\n-> END`);
      await expect(check()).rejects.toThrow(/protagonist speaks only/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rejects absent battle scenes, foreign backgrounds and effects from another date", async () => {
    const { root, directory, plan } = fixture();
    const check = () => validateJourneyScenario(root, "golden_triangle", directory, "delhi");
    try {
      const file = path.join(directory, "delhi/stories", `${plan.main[0].battleStoryId}.ink`);
      const original = readFileSync(file, "utf8");
      writeFileSync(file, original.replace('{ battle_scene == "after_2": -> part_2 }', ""));
      await expect(check()).rejects.toThrow(/Empty battle scene: after_2/);
      writeFileSync(file, original);
      const guide = path.join(directory, "delhi/stories", `${plan.main[0].guideStoryId}.ink`);
      const guideOriginal = readFileSync(guide, "utf8");
      writeFileSync(guide, guideOriginal.replace("# speaker: narrator", "# background: milano_duomo\n# speaker: narrator"));
      await expect(check()).rejects.toThrow(/Unknown background: milano_duomo/);
      writeFileSync(guide, guideOriginal);
      const date = path.join(directory, "delhi/stories", `${plan.dates[0].storyId}.ink`);
      writeFileSync(date, readFileSync(date, "utf8").replace(`${plan.dates[0].eventId}_first_attentive`, `${plan.dates[1].eventId}_first_attentive`));
      await expect(check()).rejects.toThrow(/Unknown effect/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
