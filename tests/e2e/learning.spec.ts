import { test, expect } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved } from "./helpers";

test.use({ viewport: { width: 360, height: 780 } });
test("optional translations and post-answer study preserve battle progress", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const before = await saved(page);
  await expect(
    page.getByText("Which description matches the photo?"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "英文を確認する" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "問題文の訳を見る" }).click();
  await expect(
    page.getByText(
      "『最後の晩餐』のキリストの位置と形に合う説明はどれですか？",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "選択肢Aの訳を見る" }).click();
  expect(await saved(page)).toEqual(before);
  await page.reload();
  await expect(
    page.getByText(
      "『最後の晩餐』のキリストの位置と形に合う説明はどれですか？",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "すべての訳を見る" }).click();
  for (const id of ["A", "B", "C"])
    await expect(
      page.getByRole("button", { name: `選択肢${id}の訳を閉じる` }),
    ).toBeVisible();
  await page.getByRole("button", { name: "すべての訳を閉じる" }).click();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByLabel("常に日本語訳を表示する").check();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "選択肢Bの訳を閉じる" }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await page.getByTestId("answer-B").click();
  const after = await saved(page);
  await expect(page.getByTestId("answer-B")).toBeDisabled();
  await page.getByRole("button", { name: "英文を確認する" }).click();
  const dialog = page.getByRole("dialog");
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await expect(dialog.getByTestId("review-question")).toContainText(
    "選んだ答え",
  );
  await dialog.getByRole("button", { name: "あとで復習する" }).click();
  await dialog.getByText("なぜWhichの後にdoがない？", { exact: false }).click();
  await dialog.getByRole("button", { name: /と確認する/ }).click();
  await expect(
    dialog.getByText("Which descriptionが、この文では主語だね。", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("dialog").getByTestId("review-question"),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "復習の登録を解除" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "閉じる", exact: true })
    .click();
  expect(await saved(page)).toEqual(after);
  await expect(page.getByTestId("answer-B")).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("old scores do not invent answers, and invalid learning data is preserved", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.freeTime);
  await page.evaluate(() =>
    localStorage.setItem("dreamscape.learning.v1", "{broken"),
  );
  await page.reload();
  await expect(
    page.getByText(/英語ノートの保存データを確認できない/),
  ).toBeVisible();
  await page.getByRole("button", { name: "英語ノートを開く" }).click();
  await expect(
    page.getByRole("dialog").getByText(/以前の回答内容は未記録/),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.learning.v1")),
  ).toBe("{broken");
});

test("finished answers remain available in free time without changing rewards", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.result);
  await expect(page.getByTestId("battle-result")).toBeVisible();
  await page.getByRole("button", { name: "回答した問題を振り返る" }).click();
  await expect(
    page.getByRole("dialog").locator(".review-list button"),
  ).toHaveCount(3);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "閉じる", exact: true })
    .click();
  await page.getByRole("button", { name: "自由時間へ進む" }).click();
  const before = await saved(page);
  await page.getByRole("button", { name: "英語ノートを開く" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".review-list button")).toHaveCount(3);
  await dialog.locator(".review-list button").first().click();
  await dialog.getByRole("button", { name: "あとで復習する" }).click();
  await dialog.getByLabel("復習に登録した問題だけ見る").check();
  await expect(dialog.locator(".review-list button")).toHaveCount(1);
  await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "英語ノートを開く" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("復習に登録した問題だけ見る")
    .check();
  await expect(
    page.getByRole("dialog").locator(".review-list button"),
  ).toHaveCount(1);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "閉じる", exact: true })
    .click();
  expect(await saved(page)).toEqual(before);
});

test("a stale tab cannot overwrite learning settings", async ({
  page,
  context,
}) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const older = await context.newPage();
  await older.goto("/");
  const originalGame = await saved(page);
  await page.getByRole("button", { name: "問題文の訳を見る" }).click();
  const stored = await page.evaluate(() =>
    localStorage.getItem("dreamscape.learning.v1"),
  );
  await expect(
    older.getByText(/別の画面で英語ノートが更新されました/),
  ).toBeVisible();
  await older.getByRole("button", { name: "選択肢Aの訳を見る" }).click();
  expect(
    await older.evaluate(() => localStorage.getItem("dreamscape.learning.v1")),
  ).toBe(stored);
  expect(await saved(page)).toEqual(originalGame);
  await older.close();
});

test("semantically inconsistent learning records stay protected", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const state = await saved(page);
  const active = state.activeBattle!;
  const bad = JSON.stringify({
    schemaVersion: 1,
    revision: 1,
    alwaysTranslate: false,
    revealed: {},
    marks: {},
    records: {
      [active.battleId]: {
        runId: active.runId,
        contentHash: active.contentHash,
        answers: [
          {
            questionId: "wrong_question",
            optionId: "A",
            correct: true,
            hintUsed: false,
          },
        ],
      },
    },
    openQuestion: null,
    openTopic: null,
  });
  await page.evaluate(
    (v) => localStorage.setItem("dreamscape.learning.v1", v),
    bad,
  );
  await page.reload();
  await expect(
    page.getByText(/英語ノートの保存データを確認できない/),
  ).toBeVisible();
  await page.getByRole("button", { name: "問題文の訳を見る" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.learning.v1")),
  ).toBe(bad);
});

test("unknown learning versions are never overwritten", async ({ page }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const raw = JSON.stringify({ schemaVersion: 999, payload: "keep" });
  await page.evaluate(
    (value) => localStorage.setItem("dreamscape.learning.v1", value),
    raw,
  );
  await page.reload();
  await expect(
    page.getByText(/英語ノートの保存データを確認できない/),
  ).toBeVisible();
  await page.getByRole("button", { name: "問題文の訳を見る" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.learning.v1")),
  ).toBe(raw);
});

test("an old battle reaction remains playable and can review its actual answer", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.battleReaction);
  const before = await saved(page);
  await page.getByRole("button", { name: "回答した問題を振り返る" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".review-list button")).toHaveCount(
    before.activeBattle!.answers.length,
  );
  await dialog.locator(".review-list button").first().click();
  await expect(dialog.getByTestId("review-question")).toContainText(
    "選んだ答え",
  );
  await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
  expect(await saved(page)).toEqual(before);
  await page.getByTestId("battle-advance").click();
  await expect
    .poll(async () => (await saved(page)).revision)
    .toBeGreaterThan(before.revision);
});

test("special battles without detailed lessons still show translations and normal feedback", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.B_question);
  const before = await saved(page);
  await page.getByRole("button", { name: "すべての訳を見る" }).click();
  expect(await saved(page)).toEqual(before);
  await page.getByTestId("answer-C").click();
  await page.getByRole("button", { name: "英文を確認する" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("review-question")).toBeVisible();
  await expect(dialog.getByText(/この文法が気になる/)).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /と確認する/ })).toHaveCount(
    0,
  );
});

test("closing study returns focus and preserves scroll position", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.battleFeedback);
  const button = page.getByRole("button", { name: "英文を確認する" });
  await button.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await button.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "閉じる", exact: true }),
  ).toBeInViewport();
  await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(button).toBeFocused();
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - before),
  ).toBeLessThanOrEqual(2);
});
