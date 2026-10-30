import { expect, test } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { expectNoOverflow, loadSnapshot, saved } from "./helpers";
import {
  answerRound,
  battleDialogueUntilQuestionOrResult,
  reloadUnchanged,
  romanceProgress,
} from "./battle-helpers";
import {
  nonBattleProgress,
  setEvidence,
  specialBattle,
  submitEvidence,
} from "./reasoning-helpers";
import { openCluebook, skipTourismGuide } from "./tourism-helpers";
import { cityEpisodes } from "./city-helpers";

test.use({ reducedMotion: "reduce", viewport: { width: 360, height: 740 } });

for (const format of ["B", "C"] as const) {
  test(`published Phase 6 ${format} selected evidence survives migration, notebook and resumed scoring`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const old = phase6[`${format}_selected`];
    await loadSnapshot(page, old);
    await expect(page.getByTestId("reasoning-panel")).toBeVisible();
    expect(await saved(page)).toEqual(old);
    const protectedProgress = nonBattleProgress(
      old as unknown as Awaited<ReturnType<typeof saved>>,
    );
    await openCluebook(page);
    for (const id of old.activeBattle.reasoning.selectedClueIds)
      await expect(page.getByTestId(`select-evidence-${id}`)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    await page.getByTestId("cluebook-close").click();
    expect(await saved(page)).toEqual(old);
    const { quiz, reasoning } = specialBattle(format);
    await setEvidence(page, reasoning.correctClueIds);
    await submitEvidence(page, true, true);
    const migrated = await saved(page);
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.activeBattle!.answers).toEqual(old.activeBattle.answers);
    expect(migrated.activeBattle!.score).toBe(old.activeBattle.score);
    expect(migrated.activeBattle!.reasoning!.pressed).toBe(
      old.activeBattle.reasoning.pressed,
    );
    await reloadUnchanged(page);
    for (const question of quiz.questions.slice(old.activeBattle.roundIndex)) {
      await battleDialogueUntilQuestionOrResult(page);
      await answerRound(page, question, true, true);
      await reloadUnchanged(page);
      await page.getByTestId("battle-advance").click();
    }
    const result = await battleDialogueUntilQuestionOrResult(page);
    expect(result.activeBattle!.phase).toBe("result");
    expect(result.activeBattle!.answers).toHaveLength(3);
    expect(
      result.activeBattle!.answers.slice(0, old.activeBattle.answers.length),
    ).toEqual(old.activeBattle.answers);
    expect(nonBattleProgress(result)).toEqual(protectedProgress);
    expect(result.completedCityIds).toEqual([]);
    await expectNoOverflow(page);
  });
}

test("a published Phase 6 romance ending keeps its completed relationship while visiting the new city route", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.ending);
  await expect(page.getByTestId("romance-ending")).toBeVisible();
  expect(await saved(page)).toEqual(phase6.ending);
  const romance = romanceProgress(
    phase6.ending as unknown as Awaited<ReturnType<typeof saved>>,
  );
  await page.getByTestId(`next-episode-${cityEpisodes[0].id}`).click();
  expect((await saved(page)).schemaVersion).toBe(7);
  expect((await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
  expect((await saved(page)).completedCityIds).toEqual([]);
  await skipTourismGuide(page);
  await reloadUnchanged(page);
  await page
    .getByRole("button", { name: "自由時間へ戻る", exact: true })
    .click();
  await expect(page.getByTestId("romance-ending")).toBeVisible();
  expect(romanceProgress(await saved(page))).toEqual(romance);
  await expectNoOverflow(page);
});
