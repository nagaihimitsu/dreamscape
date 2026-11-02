import { expect, test } from "@playwright/test";
import { saved } from "./helpers";
import { answerRound, battleDialogueUntilQuestionOrResult, reloadUnchanged } from "./battle-helpers";
import { nonBattleProgress, setEvidence, specialBattle, submitEvidence } from "./reasoning-helpers";

test.use({ reducedMotion: "reduce", viewport: { width: 360, height: 740 } });

for (const format of ["B", "C"] as const) {
  test(`current ${format} evidence and answers survive a reload without duplicate rewards`, async ({ page }) => {
    test.setTimeout(120_000);
    const { battle, quiz, reasoning } = specialBattle(format, "story");
    await page.goto("/");
    await page.evaluate(async (id) => {
      const path = "/src/dev/debug-state.ts";
      const { createDebugState } = await import(/* @vite-ignore */ path);
      const state = createDebugState({ scene: "battle", id, progress: "completed", ap: 8,
        affection: 0, trust: 0, spark: 0, roll: "positive" });
      localStorage.setItem("dreamscape.save.v1", JSON.stringify(state));
    }, battle.id);
    await page.reload();
    const before = await saved(page);
    const protectedProgress = nonBattleProgress(before);
    for (const question of quiz.questions) {
      let state = await battleDialogueUntilQuestionOrResult(page);
      if (state.activeBattle!.phase === "reasoning") {
        await setEvidence(page, reasoning.correctClueIds);
        await reloadUnchanged(page);
        expect((await saved(page)).activeBattle!.reasoning!.selectedClueIds.slice().sort())
          .toEqual(reasoning.correctClueIds.slice().sort());
        await submitEvidence(page, true, true);
        state = await battleDialogueUntilQuestionOrResult(page);
      }
      expect(state.activeBattle!.phase).toBe("question");
      await answerRound(page, question, true, true);
      await reloadUnchanged(page);
      await page.getByTestId("battle-advance").click();
    }
    const result = await battleDialogueUntilQuestionOrResult(page);
    expect(result.activeBattle!.phase).toBe("result");
    expect(result.activeBattle!.answers).toHaveLength(quiz.questions.length);
    expect(nonBattleProgress(result)).toEqual(protectedProgress);
  });
}
