import { expect, test, type Locator, type Page } from "@playwright/test";
import { cityEpisodes, playCityBattle } from "./city-helpers";
import { expectNoOverflow, saved, setDialogueSpeed, startNewGame } from "./helpers";
import { finishTourismGuide, openCluebook } from "./tourism-helpers";

test.use({ reducedMotion: "reduce" });

async function expectLoadedPhoto(image: Locator, path: RegExp) {
  await expect(image).toHaveAttribute("src", path);
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await expect(image).toHaveCSS("object-fit", "cover");
}

async function expectSceneCovered(scene: Locator, image: Locator) {
  const sceneBox = await scene.boundingBox();
  const imageBox = await image.boundingBox();
  expect(sceneBox).not.toBeNull();
  expect(imageBox).not.toBeNull();
  expect(imageBox!.x).toBeLessThanOrEqual(sceneBox!.x + 1);
  expect(imageBox!.y).toBeLessThanOrEqual(sceneBox!.y + 1);
  expect(imageBox!.x + imageBox!.width).toBeGreaterThanOrEqual(sceneBox!.x + sceneBox!.width - 1);
  expect(imageBox!.y + imageBox!.height).toBeGreaterThanOrEqual(sceneBox!.y + sceneBox!.height - 1);
}

async function beginDuomo(page: Page) {
  await startNewGame(page);
  await page.getByTestId("episode-start").click();
  expect((await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
}

test("Duomo photo and place remain visible from guide through observation, battle and result", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await beginDuomo(page);
  const guide = page.locator(".tourism-guide-scene");
  const guideImage = guide.locator(".vn-background img");
  await expectLoadedPhoto(guideImage, /duomo-milano\.webp$/);
  await expectSceneCovered(guide, guideImage);
  await expect(page.getByRole("heading", { name: "ミラノ大聖堂（ドゥオモ）", exact: true })).toBeVisible();
  await setDialogueSpeed(page, "0");
  await page.screenshot({ path: testInfo.outputPath("duomo-guide-mobile.png") });
  await finishTourismGuide(page);
  await expect(page.getByTestId("observation-viewport").locator("img")).toHaveAttribute("src", /duomo-milano\.webp$/);
  await page.getByTestId("zoom-in").click();
  await expect.poll(async () => Number(await page.getByTestId("observation-viewport").getAttribute("data-scale"))).toBeGreaterThan(1);
  await page.getByTestId("zoom-reset").click();
  const observationBook = await openCluebook(page);
  await expect(observationBook).toBeVisible();
  await page.getByTestId("cluebook-close").click();
  await page.getByRole("button", { name: "バトルを始める", exact: true }).click();
  const photo = page.locator(".battle-backdrop img");
  await expectLoadedPhoto(photo, /duomo-milano\.webp$/);
  await expect(page.getByTestId("battle-location")).toContainText("ドゥオモ");
  const notebookButton = page.getByRole("button", { name: "手がかり帳", exact: true });
  const [nameBox, notebookBox] = await Promise.all([page.getByTestId("battle-location").boundingBox(), notebookButton.boundingBox()]);
  expect(nameBox).not.toBeNull();
  expect(notebookBox).not.toBeNull();
  expect(nameBox!.x + nameBox!.width <= notebookBox!.x || notebookBox!.x + notebookBox!.width <= nameBox!.x || nameBox!.y + nameBox!.height <= notebookBox!.y || notebookBox!.y + notebookBox!.height <= nameBox!.y).toBe(true);
  await notebookButton.click();
  await expect(page.getByRole("dialog", { name: "手がかり帳", exact: true })).toBeVisible();
  await page.getByTestId("cluebook-close").click();
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("duomo-battle-mobile.png") });
  await playCityBattle(page, cityEpisodes[0], 0);
  await expect(page.getByTestId("battle-location")).toContainText("ドゥオモ");
  await expectLoadedPhoto(photo, /duomo-milano\.webp$/);
  await page.getByTestId("next-tourism").click();
  expect((await saved(page)).activeTourism?.landmarkId).toBe("galleria_vittorio_emanuele_ii");
  await expectLoadedPhoto(page.locator(".tourism-guide-scene .vn-background img"), /galleria/i);
  await page.getByRole("button", { name: "バトルを始める", exact: true }).click();
  await expectLoadedPhoto(page.locator(".battle-backdrop img"), /galleria/i);
  await expect(page.getByTestId("battle-location")).toContainText("ガッレリア");
  await expectNoOverflow(page);
});

test("the guide fills its scene on desktop and a failed photo keeps a fallback", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await beginDuomo(page);
  const guide = page.locator(".tourism-guide-scene");
  const guideImage = guide.locator(".vn-background img");
  await expectLoadedPhoto(guideImage, /duomo-milano\.webp$/);
  await expectSceneCovered(guide, guideImage);
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("duomo-guide-desktop.png") });
  await page.route("**/assets/tourism/duomo-milano.webp", (route) => route.abort());
  await page.reload();
  await expect(guide.locator(".canal-scene svg")).toBeVisible();
  await expect(guide.locator(".vn-background img")).toHaveCount(0);
  await page.getByRole("button", { name: "バトルを始める", exact: true }).click();
  await expect(page.getByTestId("battle-location")).toContainText("ドゥオモ");
  await expect(page.locator(".battle-backdrop svg")).toBeVisible();
  await expect(page.locator(".battle-backdrop img")).toHaveCount(0);
});
