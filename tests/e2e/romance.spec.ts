import { expect, test, type Page } from "@playwright/test";
import type { GameState } from "../../src/domain/game";

const SAVE_KEY = "dreamscape.save.v1";

test.use({ reducedMotion: "reduce" });

async function saved(page: Page): Promise<GameState> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
}

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function startNewGame(page: Page, names?: [string, string]) {
  await page.goto("/");
  if (names) {
    await page.getByLabel("主人公の名前").fill(names[0]);
    await page.getByLabel("ヒロインの名前").fill(names[1]);
  }
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
  await expect.poll(async () => (await saved(page)).ap).toBe(0);
}

async function clearChapter(page: Page) {
  await page
    .getByRole("button", { name: /ミラノ章初回クリア/ })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(async () => (await saved(page)).ap).toBe(4);
}

async function startCafe(page: Page) {
  const back = page.getByRole("button", {
    name: "自由時間に戻る",
    exact: true,
  });
  if (await back.isVisible()) await back.click();
  await page
    .getByRole("button", { name: /カフェデートに誘う|もう一度誘う/ })
    .click();
  // Opening a confirmation must not charge AP.
  const before = (await saved(page)).ap;
  await page
    .getByRole("button", { name: "APを使って始める", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(async () => (await saved(page)).ap).toBe(before - 2);
}

async function advanceToChoiceOrEnd(page: Page) {
  for (let step = 0; step < 40; step++) {
    const state = await saved(page);
    if (state.activeDate?.frame.choices.length || state.activeDate?.frame.ended)
      return state;
    await page.getByRole("button", { name: "続きを読む", exact: true }).click();
    await expect
      .poll(async () => (await saved(page)).revision)
      .toBeGreaterThan(state.revision);
  }
  throw new Error("Story did not reach a choice or ending in 40 lines");
}

async function choose(page: Page, index: number) {
  const state = await advanceToChoiceOrEnd(page);
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

async function finishCafe(page: Page) {
  const state = await advanceToChoiceOrEnd(page);
  expect(state.activeDate?.choiceCount).toBe(2);
  expect(state.activeDate?.frame.ended).toBe(true);
  await page
    .getByRole("button", { name: "デートを終える", exact: true })
    .click();
  await expect.poll(async () => (await saved(page)).activeDate).toBeNull();
}

test("default names, chapter reward, two choices, reload and replay keep AP and memories consistent", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByLabel("主人公の名前")).toHaveValue("なお");
  await expect(page.getByLabel("ヒロインの名前")).toHaveValue("りえ");
  await startNewGame(page);
  await clearChapter(page);
  await page.reload();
  expect((await saved(page)).ap).toBe(4);
  await startCafe(page);
  const initialLine = (await saved(page)).activeDate!.frame.text;
  await page.reload();
  expect((await saved(page)).activeDate!.frame.text).toBe(initialLine);
  expect((await saved(page)).ap).toBe(2);

  const beforeChoice = await advanceToChoiceOrEnd(page);
  await page.reload();
  expect((await saved(page)).activeDate!.frame.choices).toEqual(
    beforeChoice.activeDate!.frame.choices,
  );
  await choose(page, 0);
  const firstReaction = await saved(page);
  expect(firstReaction.affection).toBeGreaterThan(0);
  expect(firstReaction.memories).toHaveLength(1);
  await page.reload();
  expect(await saved(page)).toEqual(firstReaction);
  await choose(page, 1);
  await finishCafe(page);
  const completed = await saved(page);
  expect(completed.ap).toBe(2);
  expect(completed.memories).toHaveLength(2);
  expect(completed.playedDateIds).toEqual(["milano_cafe_01"]);
  expect(completed.claimedRewardIds).toEqual(["chapter_milano_first_clear"]);
  await expect(page.getByText(/^好感度[：: ]*[0-9]/)).toHaveCount(0);
  await expectNoOverflow(page);
  await page.reload();
  expect(await saved(page)).toEqual(completed);

  await startCafe(page);
  expect((await saved(page)).ap).toBe(0);
  await choose(page, 2);
  await choose(page, 2);
  await finishCafe(page);
  const replay = await saved(page);
  expect(replay.ap).toBe(0);
  expect(replay.affection).toBe(completed.affection);
  expect(replay.memories).toEqual(completed.memories);
  expect(replay.playedDateIds).toEqual(completed.playedDateIds);
  await page
    .getByRole("button", { name: "自由時間に戻る", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /もう一度誘う/ }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("custom names remain plain text and fit a 360px screen throughout the date", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const player = "<b>あいうえおかきくけこ</b>";
  const heroine = "あいうえおかきくけこさしすせそたちつてとなにぬね";
  await startNewGame(page, [player, heroine]);
  await clearChapter(page);
  await startCafe(page);
  const observed: string[] = [];
  for (let step = 0; step < 40; step++) {
    const state = await saved(page);
    const frame = state.activeDate!.frame;
    observed.push(frame.text);
    await expectNoOverflow(page);
    if (frame.choices.length) {
      for (const choice of frame.choices) {
        const button = page.locator(".choice").nth(choice.index);
        const size = await button.boundingBox();
        expect(size!.height).toBeGreaterThanOrEqual(44);
      }
      await choose(page, 1);
    } else if (frame.ended) {
      break;
    } else {
      await page
        .getByRole("button", { name: "続きを読む", exact: true })
        .click();
      await expect
        .poll(async () => (await saved(page)).revision)
        .toBeGreaterThan(state.revision);
    }
  }
  expect(observed.join("\n")).toContain(player);
  expect(observed.join("\n")).toContain(heroine);
  await expect(page.locator(".dialogue-text b")).toHaveCount(0);
  await finishCafe(page);
  await page.reload();
  expect((await saved(page)).playerName).toBe(player);
  expect((await saved(page)).heroineName).toBe(heroine);
  await expectNoOverflow(page);
});

test("corrupted save is preserved until explicit backup and fresh start", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => {
    localStorage.setItem(key, "{broken-save");
    localStorage.setItem("unrelated-app", "must-remain");
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByText(/セーブを読み込めませんでした/)).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe("{broken-save");
  await page
    .getByRole("button", { name: /元のデータを退避して新しく始める/ })
    .click();
  const entries = await page.evaluate(() => Object.entries(localStorage));
  expect(entries).toContainEqual(["unrelated-app", "must-remain"]);
  expect(
    entries.some(
      ([key, value]) =>
        key.startsWith(`${SAVE_KEY}.backup.`) && value === "{broken-save",
    ),
  ).toBe(true);
  expect((await saved(page)).schemaVersion).toBe(1);
  expect((await saved(page)).ap).toBe(0);
});

test("pause, manual save/load and keyboard confirmation preserve the current line", async ({
  page,
}) => {
  await startNewGame(page);
  await clearChapter(page);
  await startCafe(page);
  await expect(page.locator(".dialogue-text")).toMatchAriaSnapshot(`
    - paragraph: 運河沿いの小さなカフェ。
  `);
  const before = await saved(page);
  await page.getByRole("button", { name: "中断する", exact: true }).click();
  await page.getByRole("button", { name: "セーブ", exact: true }).click();
  await page.getByRole("button", { name: "ロード", exact: true }).click();
  expect(await saved(page)).toEqual(before);
  await advanceToChoiceOrEnd(page);
  await page.locator(".choice").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest("dialog")),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await saved(page)).activeDate!.choiceCount).toBe(0);
});

test("an older tab cannot overwrite a date started in another tab", async ({
  page,
  context,
}) => {
  await startNewGame(page);
  await clearChapter(page);
  const older = await context.newPage();
  await older.goto("/");
  await expect(
    older.getByRole("button", { name: /カフェデートに誘う/ }),
  ).toBeVisible();
  await startCafe(page);
  const current = await saved(page);
  await older.getByRole("button", { name: "セーブ", exact: true }).click();
  expect(await saved(page)).toEqual(current);
  await expect(older.getByRole("status")).toContainText("ロード");
  await older.getByRole("button", { name: "ロード", exact: true }).click();
  await expect(older.locator(".dialogue-text")).toContainText(
    current.activeDate!.frame.text,
  );
  expect((await saved(older)).ap).toBe(2);
  await older.close();
});
