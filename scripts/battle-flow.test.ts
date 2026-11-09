import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { BattleDefinition } from "../src/content/schemas";
import { battlePlans, compareBattleForms, convertBattle } from "./battle-flow";
import { convertJourneyBattles } from "./battle-flow-cli";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";

// The battle converter (stage 5, battle-flow.ts): the one-flow form shows the same frames as the scene form for every
// combination of right and wrong answers, presses and wrong evidence; its check finds a changed line; the journeys whose
// battles are still in the scene form (Milan, the Golden Triangle; converted later) convert in memory with the same lines.

const scratch: string[] = [];
afterAll(() => { for (const folder of scratch) rmSync(folder, { recursive: true, force: true }); });
const compileFile = (source: string) => compileInk(source, "battle.ink", source.includes("INCLUDE modules.ink") ? { [MODULES_FILE]: MODULES_INK } : {});

/** A fictional special battle B in the scene form (a one-scene file), with its rebuttal. */
const battle = {
  id: "zz_test_b", titleJa: "試験", descriptionJa: "試験", landmarkId: "zz_place", enemyNameJa: "相手", enemyTitleJa: "試験", enemyDescriptionJa: "試験",
  storyId: "battles/zz_test_b", quizId: "zz_test_b_quiz", format: "B", backgroundId: "zz_bg",
  scenes: { intro: "intro", afterRounds: ["after_1", "after_2"], outro: "outro" },
  reasoning: { kind: "contradiction", roundIndex: 1, caseClueIds: ["a", "b", "c"], correctClueIds: ["b"],
    claimScene: "claim", pressScene: "press", successScene: "evidence_success", failureScene: "evidence_failure" },
} as unknown as BattleDefinition;
const scene = (name: string, lines: string) => `=== ${name} ===\n# background: zz_bg\n${lines}\n-> END\n`;
const SOURCE = `// 試験の特殊戦（架空）。\nVAR player_name = ""\nVAR heroine_name = ""\nVAR player_address = ""\nVAR battle_scene = "intro"\nVAR answer_correct = false\nVAR battle_score = 0\n\n` +
  ["intro", "after_1", "claim", "press", "evidence_failure", "evidence_success", "after_2", "outro"].map((name) => `{ battle_scene == "${name}": -> s_${name} }`).join("\n") +
  "\n-> END\n\n" + [
    scene("s_intro", "# speaker: enemy\n「はじめるよ」\n# speaker: heroine\n「はい」"),
    scene("s_after_1", "{ answer_correct:\n    # speaker: enemy\n    「正しい」\n- else:\n    # speaker: enemy\n    「違う」\n}"),
    scene("s_claim", "# speaker: narrator\n相手は胸を張った。\n# speaker: enemy\n「全部そうだ」"),
    scene("s_press", "# speaker: enemy\n「全部だとも」"),
    scene("s_evidence_failure", "# speaker: enemy\n「それでは崩れない」"),
    scene("s_evidence_success", "# speaker: enemy\n「……一つ違った」"),
    scene("s_after_2", "{ answer_correct:\n    # speaker: enemy\n    「二問目も」\n- else:\n    # speaker: heroine\n    「惜しい」\n}"),
    scene("s_outro", "{ battle_score >= 2:\n    # speaker: enemy\n    「参った」\n- else:\n    # speaker: enemy\n    「またね」\n}"),
  ].join("\n");
const REBUTTAL = { storyId: "battles/zz_test_b_rebuttal", source: "// 反論\nVAR player_name = \"\"\nVAR heroine_name = \"\"\n\n# background: zz_bg\n# speaker: heroine\n「待って」\n-> END\n" };

describe("the battle converter (stage 5)", () => {
  it("writes the flow in the order the game played the scenes: the claim helper, the rebuttal, the stop point and its returns", () => {
    const { source, battle: entry } = convertBattle({ battle, source: SOURCE, rebuttal: REBUTTAL }, 3);
    expect(entry).not.toHaveProperty("scenes");
    expect(entry.reasoning).toEqual({ kind: "contradiction", roundIndex: 1, caseClueIds: ["a", "b", "c"], correctClueIds: ["b"] });
    expect(source).toContain("// 試験の特殊戦（架空）。\nINCLUDE modules.ink\n# background: zz_bg\n");
    expect(source).toContain("-> quiz(1) ->\n# background: zz_bg\n{ quiz_correct:");
    expect(source).toContain("-> zz_test_b_claim ->\n# background: zz_bg\n# speaker: heroine\n「待って」\n- (stop)\n-> reasoning ->\n" +
      "{ reasoning_action == \"press\":\n    -> zz_test_b_press ->\n    -> stop\n}\n{ evidence_result == \"failure\":\n");
    expect(source).toContain("=== zz_test_b_claim ===\n# background: zz_bg\n# speaker: narrator\n相手は胸を張った。\n# speaker: enemy\n「全部そうだ」\n->->");
    expect(source).not.toMatch(/battle_scene|answer_correct|^VAR/mu);
  });

  it("shows the same frames in every way to play, and its check finds a changed line, a missing return or the rebuttal left out", () => {
    const old = { battle, compiled: compileFile(SOURCE), rebuttalCompiled: compileFile(REBUTTAL.source) };
    const converted = convertBattle({ battle, source: SOURCE, rebuttal: REBUTTAL }, 3);
    const flow = (source: string) => ({ battle: converted.battle, compiled: compileFile(source) });
    expect(battlePlans(battle, 3)).toHaveLength(8 * 15);
    expect(compareBattleForms(old, flow(converted.source), 3)).toEqual({ plans: 120, difference: null });
    expect(compareBattleForms(old, flow(converted.source.replace("「違う」", "「ちがう」")), 3).difference)
      .toMatch(/^answers ×.., frame 3: before .*「違う」.*after .*「ちがう」/u);
    expect(compareBattleForms(old, flow(converted.source.replace("    -> zz_test_b_press ->\n    -> stop\n", "    -> zz_test_b_press ->\n")), 3).difference)
      .toMatch(/before the right evidence press/u);
    expect(compareBattleForms(old, flow(converted.source.replace("# speaker: heroine\n「待って」\n", "")), 3).difference).toMatch(/「待って」/u);
    // A rebuttal that relied on the fresh frame of its own story (no speaker tag): the flow would show it as the claim's speaker.
    const bare = { ...REBUTTAL, source: REBUTTAL.source.replace("# speaker: heroine\n", "") };
    expect(compareBattleForms({ ...old, rebuttalCompiled: compileFile(bare.source) }, flow(convertBattle({ battle, source: SOURCE, rebuttal: bare }, 3).source), 3).difference)
      .toMatch(/"speaker":"narrator".*"speaker":"enemy"/u);
  });

  it("refuses a scene it cannot convert by itself (another knot, an end inside it)", () => {
    expect(() => convertBattle({ battle, source: SOURCE.replace("「はい」\n-> END", "「はい」\n-> s_claim\n-> END") }, 3)).toThrow(/diverts to another knot/u);
    expect(() => convertBattle({ battle, source: SOURCE.replace("    「正しい」\n", "    「正しい」\n    -> END\n") }, 3)).toThrow(/ends elsewhere than its last line/u);
  });

  it("converts every battle still in the scene form (Milan's and the Golden Triangle's) with the same lines, without writing", () => {
    const journeys = readdirSync("content/journeys").filter((id) => existsSync(`content/journeys/${id}/battles/catalog.json`));
    const results = journeys.flatMap((id) => convertJourneyBattles(`content/journeys/${id}`));
    expect(results.length).toBeGreaterThanOrEqual(24);
    expect(results.filter((result) => result.difference)).toEqual([]);
  });

  it("with --write, writes the converted stories and catalog and moves the rebuttals into the flow (a copy of Milan)", () => {
    const root = mkdtempSync(path.join(tmpdir(), "dreamscape-battle-flow-"));
    scratch.push(root);
    cpSync("content/journeys/milano", path.join(root, "milano"), { recursive: true });
    const results = convertJourneyBattles(path.join(root, "milano"), { write: true });
    expect(results.every((result) => !result.difference)).toBe(true);
    const catalog = JSON.parse(readFileSync(path.join(root, "milano/battles/catalog.json"), "utf8")) as { battles: BattleDefinition[] };
    expect(catalog.battles.filter((item) => item.scenes)).toEqual([]);
    expect(JSON.parse(readFileSync(path.join(root, "milano/presentation/reasoning-intros.json"), "utf8")).entries).toEqual([]);
    expect(existsSync(path.join(root, "milano/stories/battles/milano_special_b_last_supper_rebuttal.ink"))).toBe(false);
    const story = readFileSync(path.join(root, "milano/stories/battles/milano_special_b_last_supper.ink"), "utf8");
    expect(story).toContain("-> milano_special_b_last_supper_claim ->\n# background: milano_refectory\n# speaker: heroine\n# emotion: surprised\n「待って。本当に、全部が同じ理由なんですか？」");
    expect(() => compileFile(story)).not.toThrow();
  });
});
