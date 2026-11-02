import { describe, expect, it } from "vitest";
import { battles, battleQuizzes, reasoningIntroductions, stories } from ".";
import { compileInk } from "../../scripts/content-pipeline";
import { reasoningIntroCatalogSchema } from "./reasoning-intros";
import { beginStory, continueStory } from "../story/runtime";
import { advanceBattle, answerBattle, battleFingerprint, getReasoningContext, selectReasoningClue, startBattle } from "../domain/battle";
import { createGame, validateGameState } from "../domain/game";

describe("reasoning introductions", () => {
  it("rejects duplicate battle entries and invalid story identifiers", () => {
    expect(() => reasoningIntroCatalogSchema.parse({ schemaVersion: 1, entries: [
      { battleId: "milano_last_supper_b01", storyId: "battles/rebuttal" },
      { battleId: "milano_last_supper_b01", storyId: "battles/other" },
    ] })).toThrow(/Duplicate reasoning introduction/);
    expect(() => reasoningIntroCatalogSchema.parse({ schemaVersion: 1, entries: [
      { battleId: "milano_last_supper_b01", storyId: "../missing" },
    ] })).toThrow();
  });

  it.each(["milano_la_scala_b01", "milano_brera_c01"])(
    "%s has a separate, short heroine response", (battleId) => {
      const storyId = reasoningIntroductions[battleId];
      const battle = battles.find((entry) => entry.id === battleId)!;
      expect(storyId).toBeTruthy();
      expect(storyId).not.toBe(battle.storyId);
      let step = beginStory(storyId, "たいち", "あゆみ");
      const frames = [];
      for (let i = 0; i < 20; i++) {
        frames.push(step.frame);
        expect(step.effects).toEqual([]);
        if (step.frame.ended) break;
        step = continueStory(storyId, step.storyState, step.frame);
      }
      expect(frames.length).toBeGreaterThanOrEqual(1);
      expect(frames.length).toBeLessThanOrEqual(3);
      expect(frames.every((frame) => frame.speaker === "heroine" && frame.choices.length === 0)).toBe(true);
      expect(frames.at(-1)!.ended).toBe(true);
      const dialogue = frames.map((frame) => frame.text).join("\n");
      expect(dialogue).not.toMatch(/出入口|十七世紀|使徒|キリスト|頭部|1943|空襲|徴発|サン・ドメニコ/);
    },
  );

  it.each(["milano_la_scala_b01", "milano_brera_c01"])("reopens %s with selected evidence and rejects a different content hash", (battleId) => {
    let state = startBattle(createGame(), battleId);
    const battle = battles.find((entry) => entry.id === battleId)!;
    for (let i = 0; state.activeBattle?.phase !== "reasoning"; i++) {
      expect(i).toBeLessThan(200);
      const active = state.activeBattle!;
      state = active.phase === "question"
        ? answerBattle(state, battleQuizzes[battle.quizId].questions[active.roundIndex].correctOptionId, state.revision)
        : advanceBattle(state, state.revision);
    }
    state = selectReasoningClue(state, battle.reasoning!.caseClueIds[0], state.revision);
    const restored = validateGameState(JSON.parse(JSON.stringify(state)));
    expect(restored.activeBattle!.reasoning).toEqual(state.activeBattle!.reasoning);
    expect(restored.activeBattle!.storyState).toEqual(state.activeBattle!.storyState);
    expect(() => validateGameState({ ...restored, activeBattle: { ...restored.activeBattle!, contentHash: "mismatched" } })).toThrow();
  });

  it("keeps heroine dialogue out of the claim but retains the press dialogue", () => {
    const state = startBattle(createGame(), "milano_la_scala_b01");
    const battle = battles.find((entry) => entry.id === state.activeBattle!.battleId)!;
    const original = stories[battle.storyId];
    stories[battle.storyId] = compileInk(`VAR player_name = ""
VAR heroine_name = ""
VAR battle_scene = ""
VAR answer_correct = false
VAR battle_score = 0
{ battle_scene == "claim": -> claim }
{ battle_scene == "press": -> press }
-> END
=== claim ===
# speaker: enemy
敵だけの主張。
# speaker: heroine
それは疑問です。
-> END
=== press ===
# speaker: enemy
追及の答え。
# speaker: heroine
もっと調べましょう。
-> END
`);
    try {
      // Updating the in-memory script changes its fingerprint. Match the
      // synthetic run to its current script.
      state.activeBattle!.contentHash = battleFingerprint(battle.id);
      state.activeBattle!.reasoning = { statementId: battle.reasoning!.claimScene, status: "selecting", selectedClueIds: [], pressed: true, submittedClueIds: [] };
      const result = getReasoningContext(state)!;
      expect(result.claimText).toBe("敵だけの主張。");
      expect(result.pressedText).toContain("追及の答え。");
      expect(result.pressedText).toContain("もっと調べましょう。");
    } finally {
      stories[battle.storyId] = original;
    }
  });
});
