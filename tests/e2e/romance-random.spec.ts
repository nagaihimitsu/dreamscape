import { expect, test } from "@playwright/test";
import {
  advanceToChoiceOrEnd, choose, finishEvent, loadCurrentFreeTime, loadSnapshot,
  saved, setDialogueSpeed, startCafe, startEvent, startNewGame,
  openStaleTab,
} from "./helpers";

test.use({ reducedMotion: "reduce" });

test("saved random tickets survive reload; double click applies a single choice", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  const firstFrame = await saved(page);
  expect(firstFrame.ap).toBe(2);
  expect(firstFrame.activeDate?.resolutionMode).toBe("random_v1");
  const plan = firstFrame.activeDate!.randomPlan;
  expect(plan).toHaveLength(2);
  for (const ticket of plan) {
    for (const value of Object.values(ticket)) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of Object.values(ticket)) expect(value).toBeLessThan(10000);
  }
  const ready = await advanceToChoiceOrEnd(page);
  await page.reload();
  expect((await saved(page)).activeDate?.randomPlan).toEqual(plan);
  await expect(page.locator(".choice").first()).toBeEnabled();
  await page.locator(".choice").first().evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(async () => (await saved(page)).activeDate?.choiceCount).toBe(1);
  const after = await saved(page);
  const resolution = after.activeDate!.resolvedChoices[0];
  expect(after.activeDate!.resolvedChoices).toHaveLength(1);
  expect(after.activeDate!.randomPlan).toEqual(plan);
  expect(after.affection).toBe(ready.affection + resolution.deltas.affection);
  expect(after.trust).toBe(ready.trust + resolution.deltas.trust);
  expect(after.spark).toBe(ready.spark + resolution.deltas.spark);
  expect(after.memories).toEqual(ready.memories); // Shared first-choice profiles carry no memory.
  expect(after.ap).toBe(2);
  await page.reload();
  expect(await saved(page)).toEqual(after);
  await setDialogueSpeed(page, "0");
  await choose(page, 1);
  const second = await saved(page);
  expect(second.activeDate!.resolvedChoices).toHaveLength(2);
  expect(second.activeDate!.resolvedChoices[1].before).toEqual({
    affection: after.affection, trust: after.trust, spark: after.spark,
  });
  expect(second.memories).toContain("sound_memory_cafe_01");
  expect(new Set(second.memories).size).toBe(second.memories.length);
  expect(second.ap).toBe(2);
  await page.reload();
  expect(await saved(page)).toEqual(second);
});

test("a stale tab cannot overwrite the first tab's saved random result", async ({ page, context }) => {
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  const ready = await advanceToChoiceOrEnd(page);
  const other = await openStaleTab(context);
  await other.goto("/");
  await expect(other.locator(".choice").first()).toBeVisible();
  await expect(other.locator(".choice").nth(1)).toBeEnabled();
  await choose(page, 0);
  const winner = await saved(page);
  expect(winner.activeDate?.resolvedChoices).toHaveLength(1);
  await other.locator(".choice").nth(1).click();
  await expect(other.locator(".notice[role=status]")).toContainText("ロード");
  expect(await saved(page)).toEqual(winner);
  expect(winner.activeDate?.randomPlan).toEqual(ready.activeDate?.randomPlan);
  await other.close();
});

test("zero-AP recovery can finish without producing rewards or duplicate memories", async ({ page }) => {
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  const stranded = await page.evaluate(async (fixture) => {
    const modulePath = "/src/domain/game.ts";
    const domain = await import(/* @vite-ignore */ modulePath);
    const base = domain.validateGameState(fixture);
    return domain.validateGameState({
      ...base, ap: 0, affection: -8, trust: -8, spark: -8,
      playedDateIds: ["milano_cafe_01"],
    });
  }, await saved(page));
  await loadSnapshot(page, stranded);
  await startEvent(page, "milano_recovery_01", 0);
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  expect(before.activeDate?.resolutionMode).toBe("random_v1");
  await choose(page, 0);
  const selected = await saved(page);
  expect(selected.activeDate?.resolvedChoices).toHaveLength(1);
  await page.reload();
  expect(await saved(page)).toEqual(selected);
  await setDialogueSpeed(page, "0");
  await finishEvent(page, 1);
  const finished = await saved(page);
  expect(finished.ap).toBe(0);
  expect(finished.memories).toEqual(stranded.memories);
  expect(finished.claimedRewardIds).toEqual(stranded.claimedRewardIds);
  expect(finished.completedRecoveryCount).toBe(1);
  expect(finished.playedDateIds.filter((id) => id === "milano_recovery_01")).toHaveLength(1);
});

test("confession outcome follows the relationship and never draws tickets", async ({ page }) => {
  test.setTimeout(90_000);
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  const current = await saved(page);
  for (const scenario of [
    { affection: 8, trust: 4, spark: 4, expected: "accepted" },
    { affection: 4, trust: 2, spark: 0, expected: "deferred" },
    { affection: 0, trust: 0, spark: 0, expected: "rejected" },
  ] as const) {
    const snapshot = await page.evaluate(async ({ fixture, values }) => {
      const modulePath = "/src/domain/game.ts";
      const domain = await import(/* @vite-ignore */ modulePath);
      const base = domain.validateGameState(fixture);
      return domain.validateGameState(domain.evaluateProgression({
        ...base, affection: values.affection, trust: values.trust, spark: values.spark,
        romanceStage: 4, playedDateIds: ["milano_cafe_01", "milano_walk_01", "milano_night_01"],
      }));
    }, { fixture: current, values: scenario });
    await loadSnapshot(page, snapshot);
    await startEvent(page, "milano_confession_01", 0);
    await setDialogueSpeed(page, "0");
    const started = await saved(page);
    expect(started.activeDate).toMatchObject({ resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [] });
    await choose(page, 0);
    await finishEvent(page, 1);
    const result = await saved(page);
    expect(result.confessionStatus).toBe(scenario.expected);
    expect(result.endingReached).toBe(scenario.expected === "accepted");
  }
});
