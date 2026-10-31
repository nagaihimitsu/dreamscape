import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import characterData from "../../content/presentation/characters.json" with { type: "json" };
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import { characterCatalogSchema } from "../../src/content/character-assets";
import { choose, expectNoOverflow, loadLegacyFreeTime, loadSnapshot, saved, setDialogueSpeed, startCafe, startNewGame } from "./helpers";

const neutralPath = "assets/test-character/south_europe_01/standing_01/neutral.png";
const smilePath = "assets/test-character/south_europe_01/standing_01/smile.png";

/** Keep synthetic artwork and its registration entirely within the test server response. */
async function installDeliveredImages(page: Page, options: { smile?: boolean; failNeutral?: boolean; failSmile?: boolean } = {}) {
  const catalog = characterCatalogSchema.parse(characterData);
  const heroine = catalog.characters.find((character) => character.id === "heroine")!;
  const pose = heroine.costumes!.find((costume) => costume.id === "south_europe_01")!.poses[0];
  pose.expressions = { neutral: neutralPath, ...(options.smile ? { smile: smilePath } : {}) };
  const png = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: { r: 100, g: 120, b: 130, alpha: 0.5 } } }).png().toBuffer();
  await page.route(/\/content\/presentation\/characters\.json(?:\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: `export default ${JSON.stringify(catalog)};` }),
  );
  await page.route("**/assets/test-character/**", (route) => {
    const broken = (options.failNeutral && route.request().url().endsWith("/neutral.png")) ||
      (options.failSmile && route.request().url().endsWith("/smile.png"));
    return broken ? route.abort("failed") : route.fulfill({ status: 200, contentType: "image/png", body: png });
  });
}

test("a delivered neutral stays on the same outfit during an old date and a renamed date", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await installDeliveredImages(page);
  await loadSnapshot(page, phase1.started);
  const old = await saved(page);
  await expect(page.locator(".romance-scene .vn-character img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  await setDialogueSpeed(page, "0");
  await choose(page, 1); // This real branch asks for shy, which has not been delivered.
  await expect.poll(async () => (await saved(page)).activeDate?.frame.emotion).toBe("shy");
  await expect(page.locator(".romance-scene .vn-character img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  const progressed = await saved(page);
  expect(progressed.ap).toBe(old.ap);
  await page.reload();
  expect(await saved(page)).toEqual(progressed);
  await expect(page.locator(".romance-scene .vn-character img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  await expectNoOverflow(page);

  // An independently named player and heroine still reference the stable heroine ID.
  await page.evaluate(() => localStorage.removeItem("dreamscape.save.v1"));
  await startNewGame(page, ["航海者", "花子"]);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  expect((await saved(page)).heroineName).toBe("花子");
  await expect(page.locator(".romance-scene .vn-character img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
});

test("the development preview shows added expressions and same-pose fallback without touching the save", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await installDeliveredImages(page, { smile: true });
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("dreamscape.save.v1", "test-save-must-not-change"));
  await page.goto("/?character-preview");
  await expect(page.getByTestId("character-preview")).toBeVisible();
  const portrait = page.getByTestId("preview-stage").locator(".vn-character");
  await expect(portrait.locator("img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  const initialPosition = await portrait.getAttribute("style");
  await page.getByTestId("preview-emotion").selectOption("smile");
  await expect(portrait.locator("img")).toHaveAttribute("src", new RegExp(`${smilePath}$`));
  expect(await portrait.getAttribute("style")).toBe(initialPosition);
  await page.getByTestId("preview-emotion").selectOption("shy");
  await expect(portrait.locator("img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  await expect(page.getByTestId("preview-status")).toContainText("neutral");
  expect(await portrait.getAttribute("style")).toBe(initialPosition);
  await page.getByTestId("preview-background").selectOption("dark");
  await expect(page.getByTestId("preview-stage")).toHaveClass(/preview-stage-dark/);
  await expectNoOverflow(page);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"))).toBe("test-save-must-not-change");
});

test("a broken registered image cannot block a saved date", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await installDeliveredImages(page, { failNeutral: true });
  await loadSnapshot(page, phase1.started);
  const before = await saved(page);
  await expect(page.locator(".romance-scene .vn-character svg")).toBeVisible();
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  expect((await saved(page)).activeDate!.choiceCount).toBe(before.activeDate!.choiceCount + 1);
  expect((await saved(page)).ap).toBe(before.ap);
});

test("a broken expression falls back to its own costume neutral in the preview", async ({ page }) => {
  await installDeliveredImages(page, { smile: true, failSmile: true });
  await page.goto("/?character-preview");
  await page.getByTestId("preview-emotion").selectOption("smile");
  await expect(page.getByTestId("preview-stage").locator(".vn-character img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  await expect(page.getByTestId("preview-status")).toContainText("読み込めません");
});

test("a full-canvas 2:3 portrait has room for its head above the date dialogue on phones", async ({ page }, testInfo) => {
  await installDeliveredImages(page);
  await loadSnapshot(page, phase1.started);
  for (const size of [{ width: 320, height: 568 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(size);
    const scene = page.getByTestId("romance-scene");
    const image = scene.locator(".vn-character img");
    await expect(image).toBeVisible();
    const sceneBox = (await scene.boundingBox())!;
    const imageBox = (await image.boundingBox())!;
    const dialogueBox = (await scene.locator(".vn-dialogue").boundingBox())!;
    // object-fit: contain + object-position: center bottom, not the full CSS box.
    const paintedHeight = Math.min(imageBox.height, imageBox.width * 1536 / 1024);
    const paintedTop = imageBox.y + imageBox.height - paintedHeight;
    const approximateHeadTop = paintedTop + paintedHeight * 120 / 1536;
    const approximateHeadBottom = paintedTop + paintedHeight * 360 / 1536;
    expect(approximateHeadTop).toBeGreaterThanOrEqual(sceneBox.y);
    expect(approximateHeadBottom).toBeLessThan(dialogueBox.y);
    await expectNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`date-${size.width}.png`) });
  }
});
