import { expect, test, type Page } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import { expectNoOverflow, loadSnapshot, saved, setDialogueSpeed } from "./helpers";

const storyId = "battles/milano_last_supper";
const enemyLine = "「一枚目は作品のため。二枚目は一枚目のため。三枚目は――」";
const heroineLine = "「……最後の一枚は、誰が守るんですか」";

/** Inject only Vite's test response: the shipped reaction catalog stays empty. */
async function installTestReactions(page: Page) {
  const entries = [
    { storyId, speaker: "enemy", text: enemyLine, targetCharacterId: "heroine", expression: "surprised", mark: "interrobang" },
    { storyId, speaker: "enemy", text: enemyLine, targetCharacterId: "enemy", expression: "serious", mark: "sweat" },
    { storyId, speaker: "heroine", text: heroineLine, targetCharacterId: "enemy", expression: "worried", mark: "question" },
    { storyId: "milano/cafe_01", speaker: "narrator", text: "運河沿いの小さなカフェ。", targetCharacterId: "heroine", expression: "smile", mark: "music" },
  ];
  await page.route(/\/content\/presentation\/dialogue-reactions\.json(?:\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: `export default ${JSON.stringify({ schemaVersion: 1, entries })};` }),
  );
}

async function advanceTo(page: Page, target: string) {
  for (let step = 0; step < 15; step++) {
    const before = await saved(page);
    if (before.activeBattle?.frame?.text === target) return before;
    expect(before.activeBattle?.phase).toBe("dialogue");
    await page.getByTestId("battle-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  }
  throw new Error(`The line was not reached: ${target}`);
}

test("without reaction annotations, the ordinary battle keeps its existing presentation", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, phase6.battleDialogue);
  await setDialogueSpeed(page, "0");
  const state = await advanceTo(page, enemyLine);
  await expect(page.locator(".battle-screen .comic-effect")).toHaveCount(0);
  await page.reload();
  expect(await saved(page)).toEqual(state);
  await expect(page.locator(".battle-screen .comic-effect")).toHaveCount(0);
});

test("both characters may react silently; marks track the frame across rerenders and reloads", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await installTestReactions(page);
  await loadSnapshot(page, phase6.battleDialogue);
  await setDialogueSpeed(page, "0");
  const state = await advanceTo(page, enemyLine);
  expect(state.activeBattle?.frame?.speaker).toBe("enemy");
  const hero = page.locator(".battle-heroine .vn-character");
  const enemy = page.locator(".battle-enemy .vn-character");
  await expect(hero.locator("img").first()).toHaveAttribute("src", /\/default_01\/standing_01\/surprised\.png$/);
  const heroMark = hero.locator('.comic-effect[data-effect="interrobang"]');
  const enemyMark = enemy.locator('.comic-effect[data-effect="sweat"]');
  await expect(heroMark).toBeVisible();
  await expect(enemyMark).toBeVisible();
  await expect(enemy.locator(".enemy-portrait")).toHaveClass(/expression-serious/);
  await expect(heroMark).toHaveAttribute("aria-hidden", "true");
  await expect(heroMark).toHaveCSS("pointer-events", "none");
  const currentMarkImage = await heroMark.locator("img").elementHandle();
  expect(currentMarkImage).not.toBeNull();
  await page.getByText("会話の操作", { exact: true }).click();
  await page.getByLabel("文字送り").selectOption("45");
  await page.getByLabel("文字送り").selectOption("0");
  expect(await heroMark.locator("img").evaluate((node, previous) => node === previous, currentMarkImage)).toBe(true);
  expect(await saved(page)).toEqual(state);
  await page.getByText("会話の操作", { exact: true }).click();

  for (const size of [
    { width: 360, height: 780 }, { width: 430, height: 932 },
    { width: 1280, height: 800 }, { width: 780, height: 360 },
  ]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    const text = await page.locator(".battle-paper-shell").boundingBox();
    expect(text).not.toBeNull();
    for (const mark of [heroMark, enemyMark]) {
      const box = await mark.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.y).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(text!.y + 1);
    }
    await page.screenshot({ path: testInfo.outputPath(`battle-reactions-${size.width}x${size.height}.png`), animations: "disabled" });
  }
  await page.setViewportSize({ width: 360, height: 780 });
  await page.reload();
  expect(await saved(page)).toEqual(state);
  await expect(hero.locator('.comic-effect[data-effect="interrobang"]')).toBeVisible();
  await expect(enemy.locator('.comic-effect[data-effect="sweat"]')).toBeVisible();
  const next = await advanceTo(page, heroineLine);
  expect(next.activeBattle?.frame?.speaker).toBe("heroine");
  await expect(hero.locator(".comic-effect")).toHaveCount(0);
  await expect(enemy.locator('.comic-effect[data-effect="question"]')).toBeVisible();
  await expect(enemy.locator(".enemy-portrait")).toHaveClass(/expression-worried/);
  await page.reload();
  expect(await saved(page)).toEqual(next);
  await expect(enemy.locator('.comic-effect[data-effect="question"]')).toBeVisible();
  await page.getByTestId("battle-advance").click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(next.revision);
  await expect(page.locator(".battle-screen .comic-effect")).toHaveCount(0);
  expect((await saved(page)).ap).toBe(state.ap);
  expect((await saved(page)).activeBattle?.score).toBe(state.activeBattle?.score);
});

test("reduced motion keeps a reaction visible without animation", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installTestReactions(page);
  await loadSnapshot(page, phase6.battleDialogue);
  await setDialogueSpeed(page, "0");
  const state = await advanceTo(page, enemyLine);
  const mark = page.locator('.battle-heroine .comic-effect[data-effect="interrobang"]');
  await expect(mark).toBeVisible();
  await expect(mark.locator("img")).toHaveCSS("animation-name", "none");
  expect(await saved(page)).toEqual(state);
});

test("each registered mark loads as a decorative asset", async ({ page }) => {
  test.setTimeout(120_000);
  let mark = "question";
  await page.route(/\/content\/presentation\/dialogue-reactions\.json(?:\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: `export default ${JSON.stringify({ schemaVersion: 1, entries: [
        { storyId: "milano/cafe_01", speaker: "narrator", text: "運河沿いの小さなカフェ。", targetCharacterId: "heroine", mark },
      ] })};`,
    }),
  );
  await loadSnapshot(page, phase1.started);
  const state = await saved(page);
  for (const candidate of ["question", "exclamation", "interrobang", "anger", "sweat", "blush", "gloom", "dizzy", "music", "heart", "sparkle", "sleep", "sigh"]) {
    mark = candidate;
    await page.reload();
    const image = page.locator(`.romance-scene .comic-effect[data-effect="${candidate}"] img`);
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    expect(await saved(page)).toEqual(state);
  }
});

test("a heroine can react silently during narration in an old saved date", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await installTestReactions(page);
  await loadSnapshot(page, phase1.started);
  const before = await saved(page);
  const portrait = page.locator(".romance-scene .vn-character");
  await expect(portrait.locator("img").first()).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
  const mark = portrait.locator('.comic-effect[data-effect="music"]');
  await expect(mark).toBeVisible();
  for (const size of [
    { width: 360, height: 780 }, { width: 430, height: 932 },
    { width: 1280, height: 800 }, { width: 780, height: 360 },
  ]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    const box = await mark.boundingBox();
    const dialogue = await page.locator(".romance-scene .vn-dialogue").boundingBox();
    expect(box).not.toBeNull();
    expect(dialogue).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.y).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(dialogue!.y + 1);
    await page.screenshot({ path: testInfo.outputPath(`date-reaction-${size.width}x${size.height}.png`), animations: "disabled" });
  }
  await page.setViewportSize({ width: 360, height: 780 });
  await page.reload();
  expect(await saved(page)).toEqual(before);
  await expect(mark).toBeVisible();
  await setDialogueSpeed(page, "0");
  await page.getByRole("button", { name: "続きを読む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  await expect(portrait.locator(".comic-effect")).toHaveCount(0);
  expect((await saved(page)).ap).toBe(before.ap);
});
