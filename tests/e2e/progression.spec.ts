import { expect, test } from "@playwright/test";
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import {
  SAVE_KEY,
  saved,
  expectNoOverflow,
  startNewGame,
  clearChapter,
  returnToMenu,
  startEvent,
  advanceToChoiceOrEnd,
  choose,
  finishEvent,
  playEvent,
  claimMilestone,
} from "./helpers";

test.use({ reducedMotion: "reduce" });

const CAFE = "milano_cafe_01";
const WALK = "milano_walk_01";
const INVITATION = "milano_invitation_01";
const NIGHT = "milano_night_01";
const CONFESSION = "milano_confession_01";
const REASSURANCE = "milano_reassurance_01";

test("lowest-affection choices can recover from a deferred confession and reach the saved ending", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startNewGame(page);
  expect((await saved(page)).romanceStage).toBe(1);
  await clearChapter(page);
  await expect(page.getByTestId(`event-${CONFESSION}`)).toHaveCount(0);
  await playEvent(page, CAFE, 2, [0, 0]);
  expect((await saved(page)).romanceStage).toBe(2);
  await claimMilestone(page, "trial_after_cafe");
  await playEvent(page, WALK, 3, [0, 1]);
  expect((await saved(page)).romanceStage).toBe(3);
  await returnToMenu(page);
  const unlocked = await saved(page);
  expect(unlocked.unlockedEventIds).toContain(INVITATION);
  await page.reload();
  expect(await saved(page)).toEqual(unlocked);
  await expect(page.getByTestId(`event-${INVITATION}`)).toContainText(
    "今日は、私についてきて",
  );
  await claimMilestone(page, "trial_after_walk");
  await startEvent(page, INVITATION, 0);
  const beforeChoice = await advanceToChoiceOrEnd(page);
  await page.reload();
  expect(await saved(page)).toEqual(beforeChoice);
  await choose(page, 0);
  const afterChoice = await saved(page);
  await page.reload();
  expect(await saved(page)).toEqual(afterChoice);
  await finishEvent(page, 1);
  await returnToMenu(page);
  await expect(page.getByTestId(`event-${INVITATION}`)).toHaveCount(0);
  await playEvent(page, NIGHT, 3, [0, 1]);
  expect((await saved(page)).romanceStage).toBe(4);
  expect((await saved(page)).affection).toBe(7);
  const apBeforeConfession = (await saved(page)).ap;
  const confessionText = await playEvent(page, CONFESSION, 0, [0]);
  expect(confessionText).toContain("迷子を予約する約束");
  expect((await saved(page)).confessionStatus).toBe("deferred");
  expect((await saved(page)).endingReached).toBe(false);
  expect((await saved(page)).ap).toBe(apBeforeConfession);
  const deferred = await saved(page);
  await page.reload();
  expect(await saved(page)).toEqual(deferred);
  await playEvent(page, REASSURANCE, 0, [1]);
  expect((await saved(page)).affection).toBe(8);
  await playEvent(page, CONFESSION, 0, [0]);
  const ending = await saved(page);
  expect(ending.endingReached).toBe(true);
  expect(ending.confessionStatus).toBe("accepted");
  expect(ending.ap).toBe(apBeforeConfession);
  expect(
    ending.memories.filter((id) => id === "milano_confession_promise"),
  ).toHaveLength(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "旅の続きに、きみと。",
  );
  await expect(page.getByText(/好感度[：:]?\s*\d|Stage\s*[1-4]/)).toHaveCount(
    0,
  );
  await expectNoOverflow(page);
  await page.screenshot({
    path: "artifacts/phase2-mobile-ending.png",
    fullPage: true,
  });
  await page.reload();
  expect(await saved(page)).toEqual(ending);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "旅の続きに、きみと。",
  );
  expect(errors).toEqual([]);
});

test("warm choices and renamed characters reach a successful first confession with a different remembered line", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await startNewGame(page, ["航", "澪"]);
  await clearChapter(page);
  await playEvent(page, CAFE, 2, [2, 1]);
  await returnToMenu(page);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByLabel("主人公の名前").fill("悠");
  await page.getByLabel("ヒロインの名前").fill("紬");
  await page.getByRole("button", { name: "名前を保存", exact: true }).click();
  await claimMilestone(page, "trial_after_cafe");
  const walk = await playEvent(page, WALK, 3, [1, 0]);
  expect(walk).toContain("悠さん");
  await claimMilestone(page, "trial_after_walk");
  await playEvent(page, INVITATION, 0, [1]);
  const night = await playEvent(page, NIGHT, 3, [1, 0]);
  expect(night).toContain("悠");
  const confession = await playEvent(page, CONFESSION, 0, [0]);
  expect(confession).toContain("私の行きたい場所を聞いてくれたこと");
  const state = await saved(page);
  expect(state.endingReached).toBe(true);
  expect(state.confessionStatus).toBe("accepted");
  expect(state.playedDateIds).not.toContain(REASSURANCE);
  expect(state.playerName).toBe("悠");
  expect(state.heroineName).toBe("紬");
  await page.reload();
  expect(await saved(page)).toEqual(state);
});

for (const fixtureKey of ["beforeChoice", "afterChoice", "replay"] as const) {
  test(`Phase 1 ${fixtureKey} save resumes the same cafe branch without losing names or charging again`, async ({
    page,
  }) => {
    const old = phase1[fixtureKey];
    await page.goto("/");
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: SAVE_KEY, value: old },
    );
    await page.reload();
    await expect(page.locator(".dialogue-text")).toContainText(
      old.activeDate!.frame.text,
    );
    await expect(page.locator(".travelers")).toContainText(old.playerName);
    await expect(page.locator(".travelers")).toContainText(old.heroineName);
    expect((await saved(page)).ap).toBe(old.ap);
    for (let count = old.activeDate!.choiceCount; count < 2; count++)
      await choose(page, 1);
    await finishEvent(page, 2);
    const current = await saved(page);
    expect(current.schemaVersion).toBe(3);
    expect(current.ap).toBe(old.ap);
    expect(current.playerName).toBe(old.playerName);
    expect(current.heroineName).toBe(old.heroineName);
    expect(current.playedDateIds).toEqual([CAFE]);
    if (fixtureKey === "replay") {
      expect(current.affection).toBe(old.affection);
      expect(current.memories).toEqual(old.memories);
    } else {
      for (const memory of old.memories)
        expect(current.memories).toContain(memory);
    }
    await page.reload();
    expect(await saved(page)).toEqual(current);
  });
}
