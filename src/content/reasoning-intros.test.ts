import { describe, expect, it } from "vitest";
import { battles, reasoningIntroductions, stories } from ".";
import { compileInk } from "../../scripts/content-pipeline";
import { reasoningIntroCatalogSchema } from "./reasoning-intros";
import { beginStory, continueStory } from "../story/runtime";
import { battleFingerprint, getReasoningContext, startBattle } from "../domain/battle";
import { createGame, validateGameState } from "../domain/game";
import phase6 from "../../tests/fixtures/phase6-saves.json";

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

  it.each(["milano_last_supper_b01", "milano_last_supper_c01", "milano_la_scala_b01", "milano_brera_c01"])(
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
      expect(frames.length).toBeGreaterThanOrEqual(2);
      expect(frames.length).toBeLessThanOrEqual(3);
      expect(frames.every((frame) => frame.speaker === "heroine" && frame.choices.length === 0)).toBe(true);
      expect(frames.at(-1)!.ended).toBe(true);
      const dialogue = frames.map((frame) => frame.text).join("\n");
      expect(dialogue).not.toMatch(/出入口|十七世紀|使徒|キリスト|頭部|1943|空襲|徴発|サン・ドメニコ/);
    },
  );

  it("keeps published special battle hashes and in-progress evidence", () => {
    for (const fixture of [phase6.B_reasoning, phase6.B_press, phase6.B_selected, phase6.B_accepted,
      phase6.C_reasoning, phase6.C_selected, phase6.C_accepted]) {
      expect(battleFingerprint(fixture.activeBattle!.battleId)).toBe(fixture.activeBattle!.contentHash);
      const restored = validateGameState(fixture);
      expect(restored.activeBattle!.reasoning).toEqual(fixture.activeBattle!.reasoning);
      expect(restored.activeBattle!.storyState).toEqual(fixture.activeBattle!.storyState);
    }
  });

  it.each(["milano_last_supper_b01", "milano_la_scala_b01"])("keeps heroine dialogue out of the %s claim but retains the press dialogue", (battleId) => {
    const state = battleId === "milano_last_supper_b01"
      ? validateGameState(phase6.B_reasoning)
      : startBattle(createGame(), battleId);
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
      // Updating the in-memory script changes its fingerprint. Match it in
      // this synthetic run, while the separate fixture test protects old saves.
      state.activeBattle!.contentHash = battleFingerprint(battle.id);
      state.activeBattle!.reasoning = { ...phase6.B_reasoning.activeBattle!.reasoning, status: "selecting", pressed: true };
      const result = getReasoningContext(state)!;
      expect(result.claimText).toBe("敵だけの主張。");
      expect(result.pressedText).toContain("追及の答え。");
      expect(result.pressedText).toContain("もっと調べましょう。");
    } finally {
      stories[battle.storyId] = original;
    }
  });
});
