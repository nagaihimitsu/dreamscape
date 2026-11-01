import { test, expect } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved } from "./helpers";
import { battleDialogueUntilQuestionOrResult } from "./battle-helpers";

test.use({ viewport: { width: 360, height: 780 } });

test("touching words shows meanings and a double tap translates without answering", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const before = await saved(page);
  const question = page.locator(".question-en");
  const word = question.getByRole("button", { name: "shapeの意味" });
  await word.tap();
  await expect(question.locator(".word-meaning")).toContainText("形、輪郭");
  expect(await saved(page)).toEqual(before);
  await page.waitForTimeout(500);
  await word.tap();
  await expect(
    page.getByRole("button", { name: "問題文の訳を閉じる" }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
  const option = page.getByTestId("option-text-A");
  const sits = option.getByRole("button", { name: "sitsの意味" });
  await sits.tap();
  await expect(option.locator(".word-meaning")).toContainText("座っている");
  await page.waitForTimeout(500);
  await sits.tap();
  await expect(
    page.getByRole("button", { name: "選択肢Aの訳を閉じる" }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await page.getByTestId("answer-B").tap();
  const answered = await saved(page);
  expect(answered.activeBattle?.answers).toHaveLength(1);
  await page.getByRole("button", { name: "英文を確認する" }).tap();
  const dialog = page.getByRole("dialog");
  const reviewWord = dialog.getByRole("button", { name: "shapeの意味" });
  await reviewWord.tap();
  await expect(dialog.locator(".word-meaning")).toContainText("形、輪郭");
  await page.waitForTimeout(500);
  await reviewWord.tap();
  await expect(
    dialog.getByRole("button", { name: "問題文の訳を閉じる" }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(answered);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
});

test("another action ends the tap sequence without answering", async ({ page }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const before = await saved(page);
  const question = page.locator(".question-en");
  const word = question.getByRole("button", { name: "shapeの意味" });
  await word.tap();
  await page.getByTestId("option-text-A").getByRole("button", { name: "sitsの意味" }).tap();
  await word.tap();
  await expect(question.locator(".word-meaning")).toBeVisible();
  await expect(page.getByRole("button", { name: "問題文の訳を見る" })).toBeVisible();
  await word.tap();
  await expect(page.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

test("keyboard users can inspect a word and open the sentence translation", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const word = page
    .locator(".question-en")
    .getByRole("button", { name: "Whichの意味" });
  await word.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".question-en .word-meaning")).toContainText(
    "どれ",
  );
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "問題文の訳を閉じる" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "問題文の訳を閉じる" }).click();
  await expect(page.getByRole("button", { name: "問題文の訳を見る" })).toBeVisible();
  expect((await saved(page)).activeBattle?.answers).toHaveLength(0);
});

test("a word explanation does not carry over to the next question", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.battleQuestion);
  await page
    .locator(".question-en")
    .getByRole("button", { name: "shapeの意味" })
    .tap();
  await expect(page.locator(".question-en .word-meaning")).toBeVisible();
  await page.getByTestId("answer-B").tap();
  await page.getByTestId("battle-advance").tap();
  await battleDialogueUntilQuestionOrResult(page);
  await expect(page.locator(".question-en .word-meaning")).toHaveCount(0);
  await expect(page.locator(".question-en")).toContainText(
    "perspective lines meet",
  );
});
