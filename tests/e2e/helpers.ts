import { expect, type Locator, type Page } from "@playwright/test";
import type { GameState } from "../../src/domain/game";

export const SAVE_KEY = "dreamscape.save.v1";

/** Secondary scene controls are in a compact menu on narrow screens. */
export async function revealDialogueControl(page: Page, control: Locator) {
  if (!(await control.isVisible())) {
    const menu = page.getByText("会話の操作", { exact: true });
    await expect(menu).toBeVisible();
    await menu.click();
  }
  await expect(control).toBeVisible();
}

export async function setDialogueSpeed(page: Page, value: string) {
  const settings = page.getByRole("dialog", { name: "設定" });
  const openedSettings = !(await settings.isVisible());
  if (openedSettings) await page.getByRole("button", { name: "設定", exact: true }).click();
  await settings.getByLabel("文字送り").selectOption(value);
  if (openedSettings) await settings.getByRole("button", { name: "閉じる", exact: true }).click();
}

export async function saved(page: Page): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
}

export async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

/** Leave the guide for observation before starting its battle. */
export async function startGuideBattle(page: Page) {
  const skip = page.getByTestId("tourism-skip");
  if (await skip.isVisible()) await skip.click();
  await page.getByRole("button", { name: "バトルを始める", exact: true }).click();
}

/** Advance a read line, or its explicit end-of-scene action. */
export async function advanceDialogue(page: Page, endTestId?: string) {
  const end = endTestId ? page.getByTestId(endTestId) : null;
  if (end && await end.isVisible()) {
    await end.click();
    return;
  }
  const text = page.locator('.dialogue-text[role="button"]').first();
  await expect(text).toHaveAttribute("data-ready", "true");
  await text.click();
}

export async function startNewGame(page: Page, names?: [string, string]) {
  await page.goto("/");
  if (names) {
    await page.getByLabel("主人公の名前").fill(names[0]);
    await page.getByLabel("ヒロインの名前").fill(names[1]);
  }
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
  await expect.poll(async () => (await saved(page)).ap).toBe(0);
}

/** Prepare a current-version state with real journey rules, not a migrated save. */
async function prepareCurrentJourney(page: Page, throughGalleria: boolean, startSupper = true) {
  const names = await saved(page);
  return page.evaluate(async ({ player, heroine, throughGalleria, startSupper }) => {
    const gamePath = "/src/domain/game.ts";
    const chapterPath = "/src/domain/chapter.ts";
    const tourismPath = "/src/domain/tourism.ts";
    const battlePath = "/src/domain/battle.ts";
    const game = await import(/* @vite-ignore */ gamePath);
    const chapter = await import(/* @vite-ignore */ chapterPath);
    const tourism = await import(/* @vite-ignore */ tourismPath);
    const battle = await import(/* @vite-ignore */ battlePath);
    let state = game.createGame(player, heroine);
    const episodes = throughGalleria
      ? ["milano_duomo_episode", "milano_galleria_episode"]
      : ["milano_duomo_episode"];
    for (const episode of episodes) {
      state = chapter.startEpisode(state, episode);
      if (throughGalleria) {
        state = tourism.skipTourismGuide(state, state.revision);
      } else {
        for (let i = 0; state.activeTourism?.phase === "guide"; i++) {
          if (i > 100) throw new Error("Could not complete current guide");
          state = tourism.advanceTourismGuide(state, state.revision);
        }
      }
      state = tourism.startTourismBattle(state, state.revision);
      for (let i = 0; state.activeBattle?.phase !== "result"; i++) {
        if (!state.activeBattle || i > 250) throw new Error("Could not complete current battle");
        const active = state.activeBattle;
        const { quiz } = battle.getActiveBattleContent(active);
        state = active.phase === "question"
          ? battle.answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision)
          : battle.advanceBattle(state, state.revision);
      }
      state = battle.leaveBattle(state, state.revision);
    }
    if (throughGalleria && startSupper) state = chapter.startEpisode(state, "milano_last_supper_episode");
    return game.validateGameState(state);
  }, { player: names.playerName, heroine: names.heroineName, throughGalleria, startSupper });
}

/** Reach Galleria free time through the current Duomo and Galleria battles. */
export async function loadCurrentGalleriaFreeTime(page: Page) {
  await loadSnapshot(page, await prepareCurrentJourney(page, true, false));
}

/** Reach the Last Supper guide through the current Duomo and Galleria route. */
export async function startCurrentSupperJourney(page: Page, names?: [string, string]) {
  await startNewGame(page, names ?? ["航", "澪"]);
  await loadSnapshot(page, await prepareCurrentJourney(page, true));
}

/** Reach the first current Last Supper question through its actual dialogue. */
export async function loadCurrentSupperQuestion(page: Page) {
  await startCurrentSupperJourney(page);
  await startGuideBattle(page);
  await setDialogueSpeed(page, "0");
  for (let i = 0; i < 100; i++) {
    const state = await saved(page);
    if (state.activeBattle?.phase === "question") return;
    if (state.activeBattle?.phase !== "dialogue") throw new Error("Expected current battle dialogue");
    await advanceDialogue(page, "battle-advance");
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  throw new Error("Current battle did not reach its first question");
}

export async function loadSnapshot(page: Page, snapshot: unknown) {
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: snapshot },
  );
  await page.reload();
}

export function availableAp(state: GameState) {
  return (
    state.ap +
    (state.pendingApRewards ?? []).reduce(
      (sum, reward) => sum + reward.remainingAp,
      0,
    )
  );
}

/** Reach free time using the current Duomo guide and battle rules. */
export async function loadCurrentFreeTime(page: Page) {
  await loadSnapshot(page, await prepareCurrentJourney(page, false));
  await expect(page.getByTestId("event-milano_cafe_01")).toBeVisible();
  expect((await saved(page)).ap).toBe(4);
}

/** Reach free time after the current city route for longer relationship tests. */
export async function loadCurrentCompletedFreeTime(page: Page) {
  const names = await saved(page);
  const state = await page.evaluate(async ({ player, heroine }) => {
    const debugPath = "/src/dev/debug-state.ts";
    const gamePath = "/src/domain/game.ts";
    const tourismPath = "/src/domain/tourism.ts";
    const { createDebugState } = await import(/* @vite-ignore */ debugPath);
    const game = await import(/* @vite-ignore */ gamePath);
    const tourism = await import(/* @vite-ignore */ tourismPath);
    let next = createDebugState({ scene: "tourism", id: "duomo_milano", progress: "completed", ap: 12,
      affection: 0, trust: 0, spark: 0, roll: "positive" });
    next = tourism.closeTourism(next, next.revision);
    next = game.setNames(next, player, heroine);
    return game.validateGameState(next);
  }, { player: names.playerName, heroine: names.heroineName });
  await loadSnapshot(page, state);
}

export async function openRevisits(page: Page) {
  const summary = page.getByText("旅先を再訪する", { exact: true });
  const details = summary.locator("..");
  if (!(await details.evaluate((element: HTMLDetailsElement) => element.open)))
    await summary.click();
}

export async function returnToMenu(page: Page) {
  // Ordinary dates now return directly; only the newly achieved ending has
  // a one-time screen to dismiss.
  const ending = page.getByTestId("romance-ending");
  if (await ending.isVisible())
    await ending.getByRole("button", { name: "自由時間へ", exact: true }).click();
}

/** Find a date in the paginated free-time pool without assuming its position. */
export async function findDateOption(page: Page, dateId: string) {
  const event = page.getByTestId(`event-${dateId}`);
  if (await event.count()) return event;
  const previous = page.getByRole("button", { name: "前の候補", exact: true });
  const next = page.getByRole("button", { name: "次の候補", exact: true });
  while (await previous.isVisible() && await previous.isEnabled()) await previous.click();
  for (let index = 0; index < 100; index++) {
    if (await event.count()) return event;
    if (!await next.isVisible() || !await next.isEnabled()) break;
    await next.click();
  }
  return event;
}

export async function startEvent(
  page: Page,
  dateId: string,
  expectedCost: number,
) {
  await returnToMenu(page);
  const before = await saved(page);
  await (await findDateOption(page, dateId)).getByRole("button").click();
  expect((await saved(page)).ap).toBe(before.ap);
  await page
    .getByRole("button", {
      name: expectedCost ? "APを使って始める" : "この時間を過ごす",
      exact: true,
    })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect
    .poll(async () => (await saved(page)).activeDate?.dateId)
    .toBe(dateId);
  const started = await saved(page);
  expect(availableAp(started)).toBe(availableAp(before) - expectedCost);
  expect(started.ap).toBeLessThanOrEqual(12);
}

export async function startCafe(page: Page) {
  await startEvent(page, "milano_cafe_01", 2);
}

export async function advanceToChoiceOrEnd(
  page: Page,
  observed: string[] = [],
) {
  for (let step = 0; step < 50; step++) {
    const state = await saved(page);
    if (!state.activeDate) throw new Error("Expected active event");
    observed.push(state.activeDate.frame.text);
    await expectNoOverflow(page);
    if (state.activeDate.frame.choices.length || state.activeDate.frame.ended)
      return state;
    await advanceDialogue(page);
    await expect
      .poll(async () => (await saved(page)).revision)
      .toBeGreaterThan(state.revision);
  }
  throw new Error("Story did not reach a choice or ending in 50 lines");
}

export async function choose(
  page: Page,
  index: number,
  observed: string[] = [],
) {
  const state = await advanceToChoiceOrEnd(page, observed);
  expect(state.activeDate?.frame.choices).toHaveLength(3);
  const text = state.activeDate!.frame.choices[index].text;
  await expect(page.locator(".choice").nth(index)).toContainText(text);
  await page.locator(".choice").nth(index).click();
  await expect
    .poll(async () => (await saved(page)).activeDate?.choiceCount)
    .toBe(state.activeDate!.choiceCount + 1);
}

export async function finishEvent(
  page: Page,
  expectedChoices: number,
  observed: string[] = [],
) {
  const state = await advanceToChoiceOrEnd(page, observed);
  expect(state.activeDate?.choiceCount).toBe(expectedChoices);
  expect(state.activeDate?.frame.ended).toBe(true);
  await page
    .getByRole("button", { name: /^(デートを終える|この時間を終える)$/ })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(async () => (await saved(page)).activeDate).toBeNull();
}

export async function finishCafe(page: Page) {
  await finishEvent(page, 2);
}

export async function playEvent(
  page: Page,
  id: string,
  cost: number,
  choices: number[],
) {
  const observed: string[] = [];
  await startEvent(page, id, cost);
  for (const index of choices) await choose(page, index, observed);
  await finishEvent(page, choices.length, observed);
  return observed.join("\n");
}

export async function claimMilestone(page: Page, id: string) {
  await returnToMenu(page);
  const before = await saved(page);
  await page
    .getByTestId(`milestone-${id}`)
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(async () => (await saved(page)).ap).toBe(before.ap + 4);
  await page.reload();
  expect((await saved(page)).ap).toBe(before.ap + 4);
  await expect(page.getByTestId(`milestone-${id}`)).toBeDisabled();
}
