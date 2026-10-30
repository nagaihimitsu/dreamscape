import { expect, type Page } from "@playwright/test";
import type { GameState } from "../../src/domain/game";
import phase4 from "../fixtures/phase4-saves.json" with { type: "json" };

export const SAVE_KEY = "dreamscape.save.v1";

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

export async function startNewGame(page: Page, names?: [string, string]) {
  await page.goto("/");
  if (names) {
    await page.getByLabel("主人公の名前").fill(names[0]);
    await page.getByLabel("ヒロインの名前").fill(names[1]);
  }
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
  await expect.poll(async () => (await saved(page)).ap).toBe(0);
}

/** Isolate existing romance regressions using a genuine pre-integration chapter save. */
export async function loadLegacyFreeTime(page: Page) {
  const current = await saved(page);
  const legacy = {
    ...phase4.legacyChapter,
    playerName: current.playerName,
    heroineName: current.heroineName,
  };
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: legacy },
  );
  await page.reload();
  await expect(page.getByTestId("event-milano_cafe_01")).toBeVisible();
  expect((await saved(page)).ap).toBe(4);
}

export async function openRevisits(page: Page) {
  const summary = page.getByText("旅先を再訪する", { exact: true });
  const details = summary.locator("..");
  if (!(await details.evaluate((element: HTMLDetailsElement) => element.open)))
    await summary.click();
}

export async function returnToMenu(page: Page) {
  const back = page.getByRole("button", {
    name: "自由時間に戻る",
    exact: true,
  });
  if (await back.isVisible()) await back.click();
}

export async function startEvent(
  page: Page,
  dateId: string,
  expectedCost: number,
) {
  await returnToMenu(page);
  const before = await saved(page);
  await page.getByTestId(`event-${dateId}`).getByRole("button").click();
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
  expect((await saved(page)).ap).toBe(before.ap - expectedCost);
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
    await page.getByRole("button", { name: "続きを読む", exact: true }).click();
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
  await page
    .getByRole("button", { name: "この言葉を伝える", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
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
