import { expect, test } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved } from "./helpers";

test.use({ viewport: { width: 360, height: 780 }, reducedMotion: "reduce" });

test("letter controls answer independently of word and translation interactions", async ({ page }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const before = await saved(page);
  for (const letter of ["A", "B", "C"]) {
    const button = page.getByTestId(`answer-${letter}`);
    await expect(button).toHaveText(letter);
    await expect(button).toHaveAccessibleName(new RegExp(`選択肢${letter}.*を答える`));
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const first = page.getByTestId("option-text-A");
  await first.getByRole("button", { name: "sitsの意味" }).tap();
  await expect(first.locator(".word-meaning")).toBeVisible();
  await first.getByRole("button", { name: "選択肢Aの訳を見る" }).tap();
  await expect(first.getByRole("button", { name: "選択肢Aの訳を閉じる" })).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await page.getByTestId("answer-B").focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await saved(page)).activeBattle?.phase).toBe("feedback");
  const answered = await saved(page);
  expect(answered.activeBattle?.answers).toHaveLength(1);
  expect(answered.activeBattle?.answers[0].optionId).toBe("B");
  await expect(page.getByTestId("answer-B")).toBeDisabled();
  await page.reload();
  expect((await saved(page)).activeBattle?.answers).toEqual(answered.activeBattle?.answers);
  await expect(page.getByTestId("answer-B")).toBeDisabled();
});
