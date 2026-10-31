import { expect, test, type Page } from "@playwright/test";
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved, setDialogueSpeed } from "./helpers";

async function revealControl(page: Page, name: string) {
  const target = page.getByRole("button", { name, exact: true });
  if (!(await target.isVisible())) {
    const menu = page.getByText("会話の操作", { exact: true });
    if (await menu.isVisible()) await menu.click();
  }
  return target;
}

test("auto advance moves a read line and stops at a choice or question", async ({ page }) => {
  await loadSnapshot(page, phase1.started);
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  await page.getByRole("button", { name: "自動送り", exact: true }).click();
  await expect(page.getByRole("button", { name: "自動送り中" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await saved(page)).revision, { timeout: 8000 }).toBeGreaterThan(before.revision);
  await page.getByRole("button", { name: "自動送り中" }).click();
  await expect(page.getByRole("button", { name: "自動送り", exact: true })).toHaveAttribute("aria-pressed", "false");

  await loadSnapshot(page, phase1.beforeChoice);
  await setDialogueSpeed(page, "0");
  await expect(page.getByRole("button", { name: "自動送り", exact: true })).toBeDisabled();
  expect((await saved(page)).activeDate?.choiceCount).toBe(phase1.beforeChoice.activeDate.choiceCount);

  await loadSnapshot(page, phase6.battleQuestion);
  await expect(page.getByRole("button", { name: /自動送り/ })).toHaveCount(0);
  expect((await saved(page)).activeBattle?.answers).toHaveLength(0);
});

for (const panel of ["会話ログ", "設定"] as const) {
  test(`opening ${panel} stops auto without advancing or resuming`, async ({ page }) => {
    await loadSnapshot(page, phase1.started);
    await setDialogueSpeed(page, "0");
    const before = await saved(page);
    await page.getByRole("button", { name: "自動送り", exact: true }).click();
    await page.getByRole("button", { name: panel, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(2300);
    expect(await saved(page)).toEqual(before);
    await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(page.getByRole("button", { name: "自動送り", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(2300);
    expect(await saved(page)).toEqual(before);
  });
}

test("hiding a scene stops auto and restoring it never advances the line", async ({ page }) => {
  await loadSnapshot(page, phase1.started);
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  await page.getByRole("button", { name: "自動送り", exact: true }).click();
  await (await revealControl(page, "ウィンドウを隠す")).click();
  await page.waitForTimeout(2300);
  expect(await saved(page)).toEqual(before);
  await page.getByRole("button", { name: "会話ウィンドウを表示" }).click();
  expect(await saved(page)).toEqual(before);
  await expect(page.getByRole("button", { name: "自動送り", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("the compact control menu stops auto until the player starts it again", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, phase1.started);
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  await page.getByRole("button", { name: "自動送り", exact: true }).click();
  await page.getByText("会話の操作", { exact: true }).click();
  await expect(page.getByRole("button", { name: "自動送り", exact: true })).toBeDisabled();
  await page.waitForTimeout(2300);
  expect(await saved(page)).toEqual(before);
  await page.getByText("会話の操作", { exact: true }).click();
  await expect(page.getByRole("button", { name: "自動送り", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(2300);
  expect(await saved(page)).toEqual(before);
});

for (const scene of [
  { name: "date", snapshot: phase1.started, menu: "details.vn-tools-menu > summary", next: ".next" },
  { name: "tourism guide", snapshot: phase6.guide, menu: "details.vn-tools-menu > summary", next: "[data-testid=tourism-advance]" },
  { name: "battle dialogue", snapshot: phase6.battleDialogue, menu: "details.battle-tool-menu > summary", next: "[data-testid=battle-advance]" },
] as const) {
  test(`${scene.name} cannot advance from the text or next button with the control menu open`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await loadSnapshot(page, scene.snapshot);
    await setDialogueSpeed(page, "0");
    const before = await saved(page);
    await page.locator(scene.menu).click();
    // Programmatic activation also represents keyboard/assistive activation;
    // the menu must protect the game rule even if the button remains visible.
    await page.locator(".dialogue-text").evaluate((element: HTMLElement) => element.click());
    await page.locator(scene.next).evaluate((element: HTMLElement) => element.click());
    expect(await saved(page)).toEqual(before);
    await page.locator(scene.menu).click();
    await page.locator(scene.next).click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  });
}

test("a choice cannot be selected while the compact controls are open", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, phase1.beforeChoice);
  await setDialogueSpeed(page, "0");
  await expect(page.locator(".choice").first()).toBeEnabled();
  const before = await saved(page);
  await page.getByText("会話の操作", { exact: true }).click();
  await page.locator(".choice").first().evaluate((element: HTMLElement) => element.click());
  expect(await saved(page)).toEqual(before);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const mode of ["modal", "hidden", "menu"] as const) {
  test(`typing pauses while ${mode} and resumes at the same character`, async ({ page }) => {
    await loadSnapshot(page, phase1.beforeChoice);
    await setDialogueSpeed(page, "45");
    await expect(page.locator(".dialogue-text .unrevealed")).not.toHaveText("");
    if (mode === "modal") {
      await page.getByRole("button", { name: "会話ログ", exact: true }).click();
    } else if (mode === "hidden") {
      await (await revealControl(page, "ウィンドウを隠す")).click();
    } else {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.getByText("会話の操作", { exact: true }).click();
    }
    const remaining = await page.locator(".dialogue-text .unrevealed").textContent();
    expect(remaining?.length).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    expect(await page.locator(".dialogue-text .unrevealed").textContent()).toBe(remaining);
    if (mode === "modal") {
      await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    } else if (mode === "hidden") {
      await page.getByRole("button", { name: "会話ウィンドウを表示" }).click();
      const openMenu = page.locator("details.vn-tools-menu[open] > summary");
      if (await openMenu.isVisible()) await openMenu.click();
    } else {
      await page.getByText("会話の操作", { exact: true }).click();
    }
    await expect.poll(async () => page.locator(".dialogue-text .unrevealed").textContent()).not.toBe(remaining);
  });
}
