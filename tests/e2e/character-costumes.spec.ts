import { installRomanceRolls } from "./romance-rolls";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import characterData from "../../content/presentation/characters.json" with { type: "json" };
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import { characterCatalogSchema } from "../../src/content/character-assets";
import { choose, expectNoOverflow, loadLegacyFreeTime, loadSnapshot, saved, setDialogueSpeed, startCafe, startNewGame } from "./helpers";

const neutralPath = "assets/test-character/south_europe_01/standing_01/neutral.png";
const smilePath = "assets/test-character/south_europe_01/standing_01/smile.png";
const basicNeutralPath = "assets/test-character/default_01/standing_01/neutral.png";
const basicSmilePath = "assets/test-character/default_01/standing_01/smile.png";

/** Keep synthetic artwork and its registration entirely within the test server response. */
async function installDeliveredImages(page: Page, options: { basic?: boolean; smile?: boolean; failNeutral?: boolean; failSmile?: boolean } = {}) {
  const catalog = characterCatalogSchema.parse(characterData);
  const heroine = catalog.characters.find((character) => character.id === "heroine")!;
  const outfit = options.basic ? "default_01" : "south_europe_01";
  const pose = heroine.costumes!.find((costume) => costume.id === outfit)!.poses[0];
  if (options.basic) heroine.costumes!.find((costume) => costume.id === "south_europe_01")!.poses[0].expressions = {};
  const neutral = options.basic ? basicNeutralPath : neutralPath;
  const smile = options.basic ? basicSmilePath : smilePath;
  pose.expressions = { neutral, ...(options.smile ? { smile } : {}) };
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

test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test("a basic outfit works in Milan with its regional outfit undelivered, including an old renamed save", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await installDeliveredImages(page, { basic: true });
  await loadSnapshot(page, phase1.started);
  const before = await saved(page);
  const portrait = page.locator(".romance-scene .vn-character");
  await expect(portrait.locator(":scope > img")).toHaveAttribute("src", new RegExp(`${basicNeutralPath}$`));
  const placement = await portrait.getAttribute("style");
  await setDialogueSpeed(page, "0");
  await choose(page, 1);
  await expect.poll(async () => (await saved(page)).activeDate?.frame.emotion).toBe("shy");
  await expect(portrait.locator(":scope > img")).toHaveAttribute("src", new RegExp(`${basicNeutralPath}$`));
  expect(await portrait.getAttribute("style")).toBe(placement);
  const progressed = await saved(page);
  expect(progressed.ap).toBe(before.ap);
  await page.reload();
  expect(await saved(page)).toEqual(progressed);
  await expect(portrait.locator(":scope > img")).toHaveAttribute("src", new RegExp(`${basicNeutralPath}$`));
  await expectNoOverflow(page);

  await page.evaluate(() => localStorage.removeItem("dreamscape.save.v1"));
  await startNewGame(page, ["航海者", "花子"]);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  expect((await saved(page)).heroineName).toBe("花子");
  await expect(portrait.locator(":scope > img")).toHaveAttribute("src", new RegExp(`${basicNeutralPath}$`));
});

test("the preview supports the registered expressions, choosing neutral when a difference is absent", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await installDeliveredImages(page, { basic: true, smile: true });
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("dreamscape.save.v1", "test-save-must-not-change"));
  await page.goto("/?character-preview");
  await expect(page.getByTestId("preview-costume")).toHaveValue("default_01");
  const selector = page.getByTestId("preview-emotion");
  const ids = characterData.expressionIds;
  expect(await selector.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))).toEqual(ids);
  const portrait = page.getByTestId("preview-stage").locator(".vn-character");
  const placement = await portrait.getAttribute("style");
  for (const emotion of ids) {
    await selector.selectOption(emotion);
    const expected = emotion === "smile" ? basicSmilePath : basicNeutralPath;
    await expect(portrait.locator(":scope > img")).toHaveAttribute("src", new RegExp(`${expected}$`));
    expect(await portrait.getAttribute("style")).toBe(placement);
  }
  await page.getByTestId("preview-background").selectOption("dark");
  await expect(page.getByTestId("preview-stage")).toHaveClass(/preview-stage-dark/);
  await expectNoOverflow(page);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"))).toBe("test-save-must-not-change");
});

test("a failed basic image cannot block the in-progress date", async ({ page }) => {
  await installDeliveredImages(page, { basic: true, failNeutral: true });
  await loadSnapshot(page, phase1.started);
  const before = await saved(page);
  await expect(page.locator(".romance-scene .vn-character svg")).toBeVisible();
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  expect((await saved(page)).activeDate!.choiceCount).toBe(before.activeDate!.choiceCount + 1);
  expect((await saved(page)).ap).toBe(before.ap);
});

test("the preview distinguishes a broken basic expression from an unfinished one", async ({ page }) => {
  await installDeliveredImages(page, { basic: true, smile: true, failSmile: true });
  await page.goto("/?character-preview");
  await page.getByTestId("preview-emotion").selectOption("smile");
  await expect(page.getByTestId("preview-stage").locator(".vn-character > img")).toHaveAttribute("src", new RegExp(`${basicNeutralPath}$`));
  await expect(page.getByTestId("preview-status")).toContainText("読み込めません");
  await page.getByTestId("preview-emotion").selectOption("shy_deep");
  await expect(page.getByTestId("preview-status")).toContainText("未登録");
  await expect(page.getByTestId("preview-stage").locator(".vn-character > img")).toHaveAttribute("src", new RegExp(`${basicNeutralPath}$`));
});

test("the full-figure preview fits the delivered canvas and keeps each expression aligned", async ({ page }) => {
  await page.goto("/?character-preview");
  await expect(page.getByTestId("preview-costume")).toHaveValue("default_01");
  await expect(page.getByTestId("preview-layout")).toHaveValue("fit");
  await page.getByLabel("台詞枠を表示").uncheck();
  const stage = page.getByTestId("preview-stage");
  const portrait = stage.locator(".vn-character > img");
  const heroine = characterData.characters.find((item) => item.id === "heroine")!;
  const expressions = heroine.costumes!.find((item) => item.id === "default_01")!.poses[0].expressions as Record<string, string>;
  const ids = ["neutral", "smile", "happy", "shy", "shy_deep", "surprised", "surprised_big", "worried", "serious", "teasing", "teasing_big"];
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(viewport);
    let baseline: { left: number; top: number; width: number; height: number } | undefined;
    for (const emotion of ids) {
      expect(expressions[emotion]).toBeTruthy();
      await page.getByTestId("preview-emotion").selectOption(emotion);
      await expect(portrait).toHaveAttribute("src", new RegExp(`${expressions[emotion]}$`));
      await expect.poll(() => portrait.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1024);
      expect(await portrait.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBe(1536);
      const image = (await portrait.boundingBox())!;
      const frame = (await stage.boundingBox())!;
      const height = Math.min(image.height, image.width * 1536 / 1024);
      const width = height * 1024 / 1536;
      // The image uses object-fit: contain and object-position: center bottom.
      const rendered = {
        left: image.x + (image.width - width) / 2 - frame.x,
        top: image.y + image.height - height - frame.y,
        width,
        height,
      };
      expect(rendered.left).toBeGreaterThanOrEqual(-0.5);
      expect(rendered.top).toBeGreaterThanOrEqual(-0.5);
      expect(rendered.left + rendered.width).toBeLessThanOrEqual(frame.width + 0.5);
      expect(rendered.top + rendered.height).toBeLessThanOrEqual(frame.height + 0.5);
      if (baseline) {
        expect(rendered.left).toBeCloseTo(baseline.left, 1);
        expect(rendered.top).toBeCloseTo(baseline.top, 1);
        expect(rendered.width).toBeCloseTo(baseline.width, 1);
        expect(rendered.height).toBeCloseTo(baseline.height, 1);
      } else baseline = rendered;
    }
    await expectNoOverflow(page);
  }
  const fitBox = (await portrait.boundingBox())!;
  await page.getByTestId("preview-layout").selectOption("game");
  const gameBox = (await portrait.boundingBox())!;
  expect(gameBox.width).not.toBeCloseTo(fitBox.width, 1);
});

test("a delivered neutral stays on the same outfit during an old date and a renamed date", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await installDeliveredImages(page);
  await loadSnapshot(page, phase1.started);
  const old = await saved(page);
  await expect(page.locator(".romance-scene .vn-character > img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  await setDialogueSpeed(page, "0");
  await choose(page, 1); // This legacy branch asks for shy, which has not been delivered.
  await expect.poll(async () => (await saved(page)).activeDate?.frame.emotion).toBe("shy");
  await expect(page.locator(".romance-scene .vn-character > img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  const progressed = await saved(page);
  expect(progressed.ap).toBe(old.ap);
  await page.reload();
  expect(await saved(page)).toEqual(progressed);
  await expect(page.locator(".romance-scene .vn-character > img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  await expectNoOverflow(page);

  // An independently named player and heroine still reference the stable heroine ID.
  await page.evaluate(() => localStorage.removeItem("dreamscape.save.v1"));
  await startNewGame(page, ["航海者", "花子"]);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  expect((await saved(page)).heroineName).toBe("花子");
  await expect(page.locator(".romance-scene .vn-character > img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
});

test("the development preview shows added expressions and same-pose fallback without touching the save", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await installDeliveredImages(page, { smile: true });
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("dreamscape.save.v1", "test-save-must-not-change"));
  await page.goto("/?character-preview");
  await expect(page.getByTestId("character-preview")).toBeVisible();
  await page.getByTestId("preview-costume").selectOption("south_europe_01");
  const portrait = page.getByTestId("preview-stage").locator(".vn-character");
  await expect(portrait.locator(":scope > img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  const initialPosition = await portrait.getAttribute("style");
  await page.getByTestId("preview-emotion").selectOption("smile");
  await expect(portrait.locator(":scope > img")).toHaveAttribute("src", new RegExp(`${smilePath}$`));
  expect(await portrait.getAttribute("style")).toBe(initialPosition);
  await page.getByTestId("preview-emotion").selectOption("shy");
  await expect(portrait.locator(":scope > img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
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
  await page.getByTestId("preview-costume").selectOption("south_europe_01");
  await page.getByTestId("preview-emotion").selectOption("smile");
  await expect(page.getByTestId("preview-stage").locator(".vn-character > img")).toHaveAttribute("src", new RegExp(`${neutralPath}$`));
  await expect(page.getByTestId("preview-status")).toContainText("読み込めません");
});

test("a full-canvas 2:3 portrait has room for its head above the date dialogue on phones", async ({ page }, testInfo) => {
  await installDeliveredImages(page);
  await loadSnapshot(page, phase1.started);
  for (const size of [{ width: 320, height: 568 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(size);
    const scene = page.getByTestId("romance-scene");
    const image = scene.locator(".vn-character > img");
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
