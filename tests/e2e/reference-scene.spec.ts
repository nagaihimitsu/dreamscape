import { expect, test } from "@playwright/test";
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { advanceToChoiceOrEnd, choose, loadSnapshot, saved, setDialogueSpeed, revealDialogueControl } from "./helpers";
import { battleDialogueUntilQuestionOrResult } from "./battle-helpers";

test.use({ reducedMotion: "reduce" });

for (const size of [
  { width: 360, height: 780, label: "portrait" },
  { width: 960, height: 540, label: "landscape" },
]) {
  test(`reference scenes remain playable in ${size.label}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    const shot = (name: string) => page.screenshot({
      path: `artifacts/utage-reference/${name}-${size.label}.png`,
    });

    await loadSnapshot(page, phase1.started);
    await setDialogueSpeed(page, "0");
    await expect(page.locator(".vn-character").first()).toBeVisible();
    await expect(page.locator(".dialogue-text")).toBeVisible();
    await shot("date-dialogue");

    await loadSnapshot(page, phase1.beforeChoice);
    await setDialogueSpeed(page, "0");
    await expect(page.locator(".choice")).toHaveCount(3);
    await expect(page.locator(".choice").first()).toBeEnabled();
    await shot("date-choices");

    await loadSnapshot(page, phase6.battleDialogue);
    await setDialogueSpeed(page, "0");
    await expect(page.locator(".battle-screen .dialogue-text")).toBeVisible();
    await shot("battle-dialogue");

    await loadSnapshot(page, phase6.battleQuestion);
    await expect(page.getByTestId("battle-question")).toBeVisible();
    await shot("battle-question");
    const before = await saved(page);
    await page.getByRole("button", { name: "すべての訳を見る" }).click();
    await expect(page.getByRole("button", { name: "すべての訳を閉じる" })).toBeVisible();
    expect(await saved(page)).toEqual(before);
    await shot("battle-translated");

    await loadSnapshot(page, phase6.B_selected);
    const selected = await saved(page);
    await page.getByRole("button", { name: "手がかり帳", exact: true }).first().click();
    await expect(page.getByTestId("case-context")).toBeVisible();
    expect(await saved(page)).toEqual(selected);
    await shot("battle-notebook");
    await page.getByTestId("cluebook-close").click();
    expect(await saved(page)).toEqual(selected);
  });
}

test("hiding and restoring a choice window never advances the saved story", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, phase1.beforeChoice);
  await setDialogueSpeed(page, "0");
  await expect(page.locator(".choice").first()).toBeEnabled();
  const before = await saved(page);
  const hide = page.getByRole("button", { name: "ウィンドウを隠す", exact: true });
  await revealDialogueControl(page, hide);
  await hide.click();
  const restore = page.getByRole("button", { name: "会話ウィンドウを表示", exact: true });
  await expect(restore).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await restore.click();
  expect(await saved(page)).toEqual(before);
  await expect(page.locator(".choice")).toHaveCount(3);
  await expect(page.locator(".choice").first()).toBeEnabled();
  const menu = page.getByText("会話の操作", { exact: true });
  await expect(menu).toBeFocused();
  await revealDialogueControl(page, hide);
  await hide.focus();
  await page.keyboard.press("Enter");
  await expect(restore).toBeVisible();
  await restore.focus();
  await page.keyboard.press("Enter");
  expect(await saved(page)).toEqual(before);
  await expect(menu).toBeFocused();
});

test("a restored battle dialogue does not advance until the next input", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await loadSnapshot(page, phase6.battleDialogue);
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  const hide = page.getByRole("button", { name: "ウィンドウを隠す", exact: true });
  await revealDialogueControl(page, hide);
  await hide.click();
  await page.getByRole("button", { name: "会話ウィンドウを表示", exact: true }).click();
  expect(await saved(page)).toEqual(before);
  await expect(page.getByText("会話の操作", { exact: true })).toBeFocused();
  await page.getByTestId("battle-advance").click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
});

test("short portrait keeps the face clear and the date playable to the end", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 360, height: 480 });
  async function expectFaceAboveWindow() {
    // On very short screens the page may scroll to reach a control; returning
    // to the top must still reveal the face, with the window below it.
    await page.evaluate(() => window.scrollTo(0, 0));
    const face = page.locator('.romance-scene .vn-character svg ellipse[cx="120"][cy="130"]');
    await expect(face).toBeVisible();
    const head = await face.boundingBox();
    const dialogue = await page.locator('.romance-scene .vn-dialogue').boundingBox();
    expect(head).not.toBeNull();
    expect(dialogue).not.toBeNull();
    expect(head!.y).toBeGreaterThanOrEqual(0);
    expect(head!.y + head!.height).toBeLessThanOrEqual(480);
    expect(head!.y + head!.height).toBeLessThanOrEqual(dialogue!.y + 14);
  }
  await loadSnapshot(page, phase1.started);
  await setDialogueSpeed(page, "0");
  await expectFaceAboveWindow();
  const text = await page.locator(".dialogue-text").boundingBox();
  const next = await page.getByRole("button", { name: "続きを読む", exact: true }).boundingBox();
  expect(text).not.toBeNull();
  expect(next).not.toBeNull();
  expect(text!.y + text!.height).toBeLessThanOrEqual(480);
  expect(next!.y + next!.height).toBeLessThanOrEqual(480);
  await page.screenshot({ path: "artifacts/utage-reference/date-dialogue-360x480.png" });
  await loadSnapshot(page, phase1.beforeChoice);
  await setDialogueSpeed(page, "0");
  await expect(page.locator(".choice").first()).toBeEnabled();
  await expectFaceAboveWindow();
  await page.screenshot({ path: "artifacts/utage-reference/date-choices-360x480.png" });
  await choose(page, 2);
  await choose(page, 0);
  const state = await advanceToChoiceOrEnd(page);
  expect(state.activeDate?.frame.ended).toBe(true);
  await page.getByRole("button", { name: "デートを終える", exact: true }).click();
  await expect.poll(async () => (await saved(page)).activeDate).toBeNull();
});

test("short portrait can finish all three battle rounds", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 480 });
  await loadSnapshot(page, phase6.battleQuestion);
  await expect(page.getByTestId("battle-question")).toBeVisible();
  await page.screenshot({ path: "artifacts/utage-reference/battle-question-360x480.png" });
  for (let round = 0; round < 3; round++) {
    const before = await battleDialogueUntilQuestionOrResult(page);
    expect(before.activeBattle?.phase).toBe("question");
    expect(before.activeBattle?.roundIndex).toBe(round);
    await page.getByTestId("answer-C").click();
    await expect.poll(async () => (await saved(page)).activeBattle?.phase).toBe("feedback");
    await page.getByTestId("battle-advance").click();
  }
  const result = await battleDialogueUntilQuestionOrResult(page);
  expect(result.activeBattle?.phase).toBe("result");
  expect(result.activeBattle?.answers).toHaveLength(3);
  await page.getByRole("button", { name: "再戦する", exact: true }).click();
  await expect.poll(async () => (await saved(page)).activeBattle?.phase).toBe("dialogue");
});
