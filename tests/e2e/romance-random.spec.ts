import { expect, test } from "@playwright/test";
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import castle from "../fixtures/castle-clear-unplayed.json" with { type: "json" };
import {
  advanceToChoiceOrEnd, choose, finishEvent, loadLegacyFreeTime, loadSnapshot,
  saved, setDialogueSpeed, startCafe, startEvent, startNewGame,
} from "./helpers";

test.use({ reducedMotion: "reduce" });

test("saved random tickets survive reload; double click applies a single choice", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await startNewGame(page);
  await loadLegacyFreeTime(page);
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

test("a version 8 in-progress date continues its saved Ink with fixed effects", async ({ page }) => {
  // Build an authentic v8 snapshot from a published Phase 1 in-progress save;
  // retain the legacy Ink hash, choices and exact story position.
  await page.goto("/");
  const current = await page.evaluate(async (fixture) => {
    const modulePath = "/src/domain/game.ts";
    const domain = await import(/* @vite-ignore */ modulePath);
    return domain.validateGameState(fixture);
  }, phase1.beforeChoice);
  const { recoveryAfterRejection: _recovery, completedRecoveryCount: _count,
    travelBudget: _budget, inventory: _inventory, completedEncounterIds: _encounters,
    encounterRewards: _encounterRewards, activeEncounter: _activeEncounter,
    updatedDateIds: _updatedDateIds, activeDate, ...base } = current;
  if (!activeDate) throw new Error("Expected a legacy in-progress date");
  const { resolutionMode: _mode, randomPlan: _plan, resolvedChoices: _resolved, responseSnapshot: _snapshot, ...oldDate } = activeDate;
  const version8 = { ...base, schemaVersion: 8, activeDate: oldDate };
  await loadSnapshot(page, version8);
  await setDialogueSpeed(page, "0");
  // Migration occurs when a transition is saved, without creating a new plan.
  await choose(page, 0);
  const chosen = await saved(page);
  expect(chosen.schemaVersion).toBe(11);
  expect(chosen.activeDate).toMatchObject({
    storyHash: oldDate.storyHash, resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [],
  });
  expect(chosen.activeDate?.frame.text).toBe("「……迷子を予約する人、初めて見た」");
  expect(chosen.ap).toBe(version8.ap);
  await page.reload();
  expect(await saved(page)).toEqual(chosen);
});

test("a stale tab cannot overwrite the first tab's saved random result", async ({ page, context }) => {
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  const ready = await advanceToChoiceOrEnd(page);
  const other = await context.newPage();
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
  await page.goto("/");
  const stranded = await page.evaluate(async (fixture) => {
    const modulePath = "/src/domain/game.ts";
    const domain = await import(/* @vite-ignore */ modulePath);
    const base = domain.validateGameState(fixture);
    return domain.validateGameState({
      ...base, ap: 0, affection: -8, trust: -8, spark: -8,
      playedDateIds: ["milano_love_date_01"],
    });
  }, castle);
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
  await page.goto("/");
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
    }, { fixture: castle, values: scenario });
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
