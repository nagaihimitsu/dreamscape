import { expect, test } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import bossQuiz from "../../content/quizzes/sound_finale_B1.json" with { type: "json" };
import { expectNoOverflow, loadSnapshot, openRevisits, saved } from "./helpers";
import { battleDialogueUntilQuestionOrResult } from "./battle-helpers";

// Check the saved result and transient visual beat separately: a reload must
// never replay or reapply a result, and learning controls remain usable.
test.use({ viewport: { width: 360, height: 740 }, reducedMotion: "no-preference" });

for (const [optionId, correct] of [["B", true], ["A", false]] as const) {
  test(`${correct ? "correct" : "incorrect"} answer has a distinct beat and stays locked after reload`, async ({ page }, testInfo) => {
    await loadSnapshot(page, phase6.battleQuestion);
    const before = await saved(page);
    await page.getByTestId(`answer-${optionId}`).evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    const effect = page.getByTestId("answer-effect");
    await expect(effect).toHaveAttribute("data-result", correct ? "correct" : "incorrect");
    await expect(effect).toHaveAttribute("aria-hidden", "true");
    await expect(effect).toHaveCSS("pointer-events", "none");
    await expect(page.getByTestId("answer-verdict")).toContainText(correct ? "正解" : "不正解");
    const answer = await saved(page);
    expect(answer.activeBattle?.answers).toHaveLength(1);
    expect(answer.activeBattle?.score).toBe(before.activeBattle!.score + Number(correct));
    expect(answer.activeBattle?.answers[0]).toMatchObject({ optionId, correct });
    await expectNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${correct ? "correct" : "incorrect"}-360.png`) });
    await page.setViewportSize({ width: 320, height: 568 });
    await expectNoOverflow(page);
    const bar = page.locator(".battle-roundbar");
    const label = bar.locator("span").first();
    const verdict = page.getByTestId("answer-verdict");
    const notebook = page.getByRole("button", { name: "手がかり帳", exact: true });
    await expect(verdict).toBeInViewport();
    await expect(notebook).toBeInViewport();
    const [a, b, c] = await Promise.all([label.boundingBox(), verdict.boundingBox(), notebook.boundingBox()]);
    expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x + 1);
    expect(b!.x + b!.width).toBeLessThanOrEqual(c!.x + 1);
    // The moving layer never intercepts the answer explanation or next step.
    await page.getByRole("button", { name: "英文を確認する" }).click();
    expect(await saved(page)).toEqual(answer);
    await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    await page.reload();
    expect(await saved(page)).toEqual(answer);
    await expect(page.getByTestId("answer-effect")).toHaveCount(0);
    await expect(page.getByTestId("answer-verdict")).toContainText(correct ? "正解" : "不正解");
    await expect(page.getByTestId(`answer-${optionId}`)).toBeDisabled();
    await page.getByTestId("battle-advance").click();
    const next = await saved(page);
    expect(next.activeBattle?.phase).toBe("dialogue");
    expect(next.activeBattle?.score).toBe(answer.activeBattle?.score);
    expect(next.activeBattle?.answers).toHaveLength(1);
  });
}

for (const method of ["setting", "device"] as const) {
  test(`answer remains clear when motion is reduced by ${method}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: method === "device" ? "reduce" : "no-preference" });
    await loadSnapshot(page, phase6.battleQuestion);
    if (method === "setting") {
      await page.getByRole("button", { name: "設定", exact: true }).click();
      await page.getByLabel("演出を短縮する").check();
      await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    }
    await page.getByTestId("answer-A").click();
    const after = await saved(page);
    expect(after.activeBattle?.answers).toHaveLength(1);
    await expect(page.getByTestId("answer-verdict")).toContainText("不正解");
    await expect(page.getByTestId("answer-effect")).toHaveCount(0);
    await expect(page.locator(".selected-panel")).toHaveCSS("animation-name", "none");
    await expect(page.getByTestId("battle-advance")).toBeVisible();
    if (method === "setting") {
      await page.getByRole("button", { name: "設定", exact: true }).click();
      await page.getByLabel("演出を短縮する").uncheck();
      await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    } else {
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    await expect(page.getByTestId("answer-effect")).toHaveCount(0);
    await expect(page.locator(".battle-screen")).not.toHaveAttribute("data-effect-active", "true");
    await expect(page.locator(".selected-panel")).toHaveCSS("animation-name", "none");
    expect(await saved(page)).toEqual(after);
    await page.reload();
    expect(await saved(page)).toEqual(after);
    await expect(page.getByTestId("answer-effect")).toHaveCount(0);
    await expectNoOverflow(page);
  });
}

test("the brief effect ends by itself and does not replay after the tab becomes hidden", async ({ page }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  await page.getByTestId("answer-B").click();
  const answered = await saved(page);
  await expect(page.getByTestId("answer-effect")).toHaveCount(0, { timeout: 4000 });
  await expect(page.getByTestId("answer-verdict")).toContainText("正解");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    Reflect.deleteProperty(document, "hidden");
  });
  await expect(page.getByTestId("answer-effect")).toHaveCount(0);
  expect(await saved(page)).toEqual(answered);
  await page.getByTestId("battle-advance").click();
  expect((await saved(page)).activeBattle?.phase).toBe("dialogue");
});

test("hiding a tab during the effect clears it without changing the saved answer", async ({ page }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  await page.getByTestId("answer-B").click();
  const answered = await saved(page);
  await expect(page.getByTestId("answer-effect")).toHaveAttribute("data-result", "correct");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("answer-effect")).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    Reflect.deleteProperty(document, "hidden");
  });
  await expect(page.getByTestId("answer-effect")).toHaveCount(0);
  expect(await saved(page)).toEqual(answered);
  await page.getByTestId("battle-advance").click();
  expect((await saved(page)).activeBattle?.phase).toBe("dialogue");
});

test("a stale tab cannot start an effect for an answer that failed to save", async ({ page, context }) => {
  await loadSnapshot(page, phase6.battleQuestion);
  const stale = await context.newPage();
  await stale.goto("/");
  await expect(stale.getByTestId("answer-A")).toBeEnabled();
  await page.getByTestId("answer-B").click();
  const winner = await saved(page);
  expect(winner.activeBattle?.answers).toHaveLength(1);
  await stale.getByTestId("answer-A").click();
  await expect(stale.locator(".notice[role=status]").filter({ hasText: "セーブ" })).toContainText("ロード");
  await expect(stale.getByTestId("answer-effect")).toHaveCount(0);
  expect(await saved(page)).toEqual(winner);
  await stale.close();
});

test("desktop answer effect and controls remain inside the scene", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loadSnapshot(page, phase6.battleQuestion);
  await page.getByTestId("answer-B").click();
  await expect(page.getByTestId("answer-effect")).toHaveAttribute("data-result", "correct");
  await expect(page.getByTestId("answer-verdict")).toBeInViewport();
  await expect(page.getByRole("button", { name: "手がかり帳", exact: true })).toBeInViewport();
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("correct-desktop.png") });
});

for (const [format, snapshot, correctOption] of [
  ["B", phase6.B_question, "C"],
  ["C", phase6.C_question, "A"],
] as const) {
  test(`${format} special battle uses the same saved-answer effect`, async ({ page }) => {
    await loadSnapshot(page, snapshot);
    const before = await saved(page);
    await page.getByTestId(`answer-${correctOption}`).click();
    await expect(page.getByTestId("answer-effect")).toHaveAttribute("data-result", "correct");
    await expect(page.getByTestId("answer-verdict")).toContainText("正解");
    const after = await saved(page);
    expect(after.activeBattle?.answers).toHaveLength(before.activeBattle!.answers.length + 1);
    expect(after.activeBattle?.score).toBe(before.activeBattle!.score + 1);
    await page.reload();
    expect(await saved(page)).toEqual(after);
    await expect(page.getByTestId("answer-effect")).toHaveCount(0);
    await expectNoOverflow(page);
  });
}

test("the five-question city boss keeps the effect on each round", async ({ page }) => {
  test.setTimeout(100_000);
  await loadSnapshot(page, phase7.cityClearViewed);
  await openRevisits(page);
  await page.getByTestId("revisit-battle-milano_city_boss_01").click();
  for (const [index, question] of bossQuiz.questions.entries()) {
    const ready = await battleDialogueUntilQuestionOrResult(page);
    expect(ready.activeBattle?.phase).toBe("question");
    await expect(page.locator(".battle-roundbar")).toContainText(`第${index + 1}問 / 全5問`);
    const correct = index !== 4;
    const option = question.options.find((item) => (item.id === question.correctOptionId) === correct)!;
    await page.getByTestId(`answer-${option.id}`).click();
    await expect(page.getByTestId("answer-effect")).toHaveAttribute("data-result", index !== 4 ? "correct" : "incorrect");
    await expect(page.getByTestId("answer-verdict")).toContainText(index !== 4 ? "正解" : "不正解");
    expect((await saved(page)).activeBattle?.answers).toHaveLength(index + 1);
    await page.getByTestId("battle-advance").click();
  }
  const result = await battleDialogueUntilQuestionOrResult(page);
  expect(result.activeBattle?.phase).toBe("result");
  expect(result.activeBattle?.answers).toHaveLength(5);
  expect(result.activeBattle?.score).toBe(4);
  await expectNoOverflow(page);
});
