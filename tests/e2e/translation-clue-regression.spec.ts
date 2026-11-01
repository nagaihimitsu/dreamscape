import { expect, test, type Locator, type Page } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved } from "./helpers";

test.use({ viewport: { width: 360, height: 780 }, reducedMotion: "reduce" });

/** A person's second tap lands in the same spot, even if the page reflows. */
async function tapSamePointTwice(page: Page, word: Locator, firstMeaning: Locator) {
  await word.scrollIntoViewIfNeeded();
  const box = await word.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await page.touchscreen.tap(x, y);
  await expect(firstMeaning).toBeVisible();
  // A deliberate double tap is not necessarily as fast as an OS double click.
  await page.waitForTimeout(400);
  await page.touchscreen.tap(x, y);
}

test("two actual taps translate the question and option without submitting an answer", async ({ page }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const before = await saved(page);
  const question = page.locator(".question-en");
  await tapSamePointTwice(page, question.getByRole("button", { name: "shapeの意味" }), question.locator(".word-meaning"));
  await expect(page.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  expect(await saved(page)).toEqual(before);

  const option = page.getByTestId("option-text-A");
  await tapSamePointTwice(page, option.getByRole("button", { name: "sitsの意味" }), option.locator(".word-meaning"));
  await expect(page.getByRole("button", { name: "選択肢Aの訳を閉じる" })).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await page.getByTestId("answer-B").tap();
  expect((await saved(page)).activeBattle?.answers).toHaveLength(1);
});


test("touch-style clicks with zero detail also open, and never close an already visible translation", async ({ page }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const before = await saved(page);
  const word = page.locator(".question-en").getByRole("button", { name: "shapeの意味" });
  // Safari may send click events whose detail is 0 for a touch activation.
  await word.dispatchEvent("click", { detail: 0 });
  await expect(page.locator(".question-en .word-meaning")).toBeVisible();
  await page.waitForTimeout(500);
  await word.dispatchEvent("click", { detail: 0 });
  await expect(page.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  await word.dispatchEvent("click", { detail: 0 });
  await word.dispatchEvent("click", { detail: 0 });
  await expect(page.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  expect(await saved(page)).toEqual(before);

  await page.getByRole("button", { name: "設定", exact: true }).tap();
  await page.getByLabel("常に日本語訳を表示する").check();
  await page.getByRole("button", { name: "閉じる", exact: true }).tap();
  await page.reload();
  await expect(page.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  const reloadedWord = page.locator(".question-en").getByRole("button", { name: "shapeの意味" });
  await reloadedWord.dispatchEvent("click", { detail: 0 });
  await reloadedWord.dispatchEvent("click", { detail: 0 });
  await expect(page.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

test("two taps in the answered-question review keep its translation visible", async ({ page }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  await page.getByTestId("answer-B").tap();
  const answered = await saved(page);
  await page.getByRole("button", { name: "英文を確認する" }).tap();
  const dialog = page.getByRole("dialog");
  const text = dialog.getByTestId("review-question");
  await expect(dialog.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  await tapSamePointTwice(page, text.getByRole("button", { name: "shapeの意味" }), text.locator(".word-meaning"));
  await expect(dialog.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  expect(await saved(page)).toEqual(answered);
});

for (const scenario of [
  { name: "通常戦", snapshot: phase6.battleQuestion, clue: "last_supper_perspective", selectable: false },
  { name: "矛盾追及", snapshot: phase6.B_reasoning, clue: "last_supper_doorway", selectable: true },
  { name: "証拠連結", snapshot: phase6.C_selected, clue: "last_supper_perspective", selectable: true },
] as const) {
  test(`${scenario.name}の手がかり帳は画像を説明より先に表示する`, async ({ page }) => {
    await loadSnapshot(page, scenario.snapshot);
    const before = await saved(page);
    const entry = page.getByTestId("reasoning-notebook");
    if (await entry.isVisible()) await entry.tap();
    else await page.getByRole("button", { name: "手がかり帳", exact: true }).tap();
    const dialog = page.getByRole("dialog", { name: "手がかり帳" });
    const picker = dialog.getByTestId("clue-picker");
    if (await picker.count()) await picker.selectOption(scenario.clue);
    const card = dialog.getByTestId(`notebook-${scenario.clue}`);
    const image = card.getByTestId(`clue-image-${scenario.clue}`);
    const description = card.locator(".clue-description");
    await expect(image).toBeVisible();
    await expect(description).toBeVisible();
    const positions = await card.evaluate((element) => {
      const image = element.querySelector("svg")!;
      const description = element.querySelector(".clue-description")!;
      return { image: image.getBoundingClientRect().top, description: description.getBoundingClientRect().top,
        order: !!(image.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    expect(positions.order).toBe(true);
    expect(positions.image).toBeLessThan(positions.description);
    expect(await saved(page)).toEqual(before);
    if (scenario.selectable) {
      const select = dialog.getByTestId(`select-evidence-${scenario.clue}`);
      await expect(select).toBeVisible();
      await select.tap();
      await expect(select).toHaveAttribute("aria-pressed", "true");
      const selected = await saved(page);
      await dialog.getByTestId("case-return").tap();
      await page.getByTestId("reasoning-notebook").tap();
      await page.getByTestId("clue-picker").selectOption(scenario.clue);
      await expect(page.getByTestId(`select-evidence-${scenario.clue}`)).toHaveAttribute("aria-pressed", "true");
      expect(await saved(page)).toEqual(selected);
    } else {
      await dialog.getByTestId("cluebook-close").tap();
      expect(await saved(page)).toEqual(before);
    }
  });
}

test("画像を読み込めなくても説明と証拠選択を利用できる", async ({ page }) => {
  await page.route("**/assets/tourism/last-supper.webp", (route) => route.abort());
  await loadSnapshot(page, phase6.B_reasoning);
  await page.getByTestId("reasoning-notebook").tap();
  await page.getByTestId("clue-picker").selectOption("last_supper_doorway");
  const card = page.getByTestId("notebook-last_supper_doorway");
  await expect(card.getByRole("status")).toContainText("画像を表示できません");
  await expect(card.locator(".clue-description")).toBeVisible();
  await page.getByTestId("select-evidence-last_supper_doorway").tap();
  await expect(page.getByTestId("select-evidence-last_supper_doorway")).toHaveAttribute("aria-pressed", "true");
});
