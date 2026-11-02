import { expect, test } from "@playwright/test";
import { advanceToChoiceOrEnd, loadCurrentFreeTime, saved, setDialogueSpeed, startCafe, startCurrentSupperJourney, startNewGame } from "./helpers";
import { skipTourismGuide } from "./tourism-helpers";

test.use({ viewport: { width: 360, height: 640 }, reducedMotion: "reduce" });

test("observation keeps the image and selected location visible beside its explanation", async ({ page }, testInfo) => {
  await startCurrentSupperJourney(page);
  await skipTourismGuide(page);
  const viewport = page.getByTestId("observation-viewport");
  const marker = page.getByTestId("hotspot-last_supper_perspective");
  await marker.tap();
  const detail = page.getByTestId("discovery-detail");
  await expect(detail).toContainText("天井の線をたどる");
  await expect(marker).toHaveAttribute("aria-pressed", "true");
  const geometry = await marker.evaluate((target) => {
    const pin = target.getBoundingClientRect();
    const image = document.querySelector<HTMLElement>('[data-testid="observation-viewport"]')!.getBoundingClientRect();
    const explanation = document.querySelector<HTMLElement>('[data-testid="discovery-detail"]')!.getBoundingClientRect();
    const x = pin.left + pin.width / 2;
    const y = pin.top + pin.height / 2;
    return {
      imageHeight: image.height,
      markerVisible: x >= image.left && x <= image.right && y >= image.top && y <= image.bottom && y >= 0 && y <= innerHeight,
      obscured: x >= explanation.left && x <= explanation.right && y >= explanation.top && y <= explanation.bottom,
      detailVisible: explanation.top >= 0 && explanation.top < innerHeight,
    };
  });
  expect(geometry.imageHeight).toBeGreaterThan(100);
  expect(geometry.markerVisible).toBe(true);
  expect(geometry.obscured).toBe(false);
  expect(geometry.detailVisible).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("image-and-clue.png") });

  const beforeZoom = Number(await viewport.getAttribute("data-scale"));
  await page.getByTestId("zoom-in").tap();
  await expect.poll(async () => Number(await viewport.getAttribute("data-scale"))).toBeGreaterThan(beforeZoom);
  await page.getByTestId("zoom-reset").tap();
  await page.getByTestId("hotspot-last_supper_apostle_groups").tap();
  await expect(detail).toContainText("三人ずつのざわめき");
  const discovered = (await saved(page)).discoveredClueIds;
  expect(discovered).toEqual(expect.arrayContaining(["last_supper_perspective", "last_supper_apostle_groups"]));
  await page.reload();
  expect((await saved(page)).discoveredClueIds).toEqual(expect.arrayContaining(["last_supper_perspective", "last_supper_apostle_groups"]));
});

test("a current choice with confirmation enabled commits once without a dialog", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("dreamscape.presentation.v1", JSON.stringify({ schemaVersion: 1, confirmChoices: true, reduceMotion: true }));
  });
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  await advanceToChoiceOrEnd(page);
  const before = await saved(page);
  const choice = page.locator(".choice").first();
  await expect(choice).toBeEnabled();
  await choice.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await expect.poll(async () => (await saved(page)).activeDate?.choiceCount).toBe(before.activeDate!.choiceCount + 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const after = await saved(page);
  expect(after.revision).toBe(before.revision + 1);
  expect(after.ap).toBe(before.ap);
  expect(after.playerName).toBe(before.playerName);
  expect(after.heroineName).toBe(before.heroineName);
  await page.reload();
  expect(await saved(page)).toEqual(after);
});

test("a document remains alongside the image without inventing an image location", async ({ page }) => {
  await startCurrentSupperJourney(page);
  await skipTourismGuide(page);
  const viewport = page.getByTestId("observation-viewport");
  const initialScale = await viewport.getAttribute("data-scale");
  await page.getByRole("button", { name: "発見ポイント・資料を見る", exact: true }).tap();
  await page.getByTestId("discovery-last_supper_technique_card").tap();
  await expect(viewport).toBeVisible();
  await expect(page.getByTestId("discovery-detail")).toContainText("ゆっくり描くための選択");
  expect(await viewport.getAttribute("data-scale")).toBe(initialScale);
  expect((await saved(page)).discoveredClueIds).toContain("last_supper_technique_card");
  await page.getByRole("button", { name: "説明を閉じる", exact: true }).tap();
  await expect(page.getByTestId("discovery-detail")).toHaveCount(0);
  await expect(viewport).toBeVisible();
});

test("starting a paid date still asks before spending AP", async ({ page }) => {
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  const before = await saved(page);
  await page.getByTestId("event-milano_cafe_01").getByRole("button").tap();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await saved(page)).toEqual(before);
});
