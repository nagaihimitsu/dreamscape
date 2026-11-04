import { expect, test, type Page } from "@playwright/test";
import { advanceDialogue, expectNoOverflow, setDialogueSpeed } from "./helpers";
import type { GameState } from "../../src/domain/game";
import type { ReactionTarget } from "../../src/content/dialogue-reactions";
import { readIndiaState } from "./city-arrival-helpers";

/** Mount the real story in an isolated save without modifying player data. */
async function openDebugScene(page: Page, cityId: string, scene: "tourism" | "date" | "battle", id: string) {
  await page.goto("/?debug");
  await page.evaluate(async ({ cityId, scene, id }) => {
    const debugPath = "/src/dev/debug-state.ts";
    const persistencePath = "/src/persistence/index.ts";
    const reactPath = "/node_modules/.vite/deps/react.js";
    const domPath = "/node_modules/.vite/deps/react-dom_client.js";
    const appPath = "/src/app/App.tsx";
    const { createDebugState } = await import(/* @vite-ignore */ debugPath);
    const { saveGame } = await import(/* @vite-ignore */ persistencePath);
    const { default: React } = await import(/* @vite-ignore */ reactPath);
    const { default: { createRoot } } = await import(/* @vite-ignore */ domPath);
    const { default: App } = await import(/* @vite-ignore */ appPath);
    const state = createDebugState({ cityId, scene, id, progress: "completed",
      ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); } };
    const saved = saveGame(storage, state);
    if (!saved.ok) throw new Error(saved.message);
    const host = document.createElement("div");
    document.getElementById("root")!.style.display = "none";
    document.body.append(host);
    let root = createRoot(host);
    const render = () => root.render(React.createElement(App, { storage, debug: true, nextRomanceRoll: () => 0 }));
    render();
    (window as unknown as { indiaReactionTest: unknown }).indiaReactionTest = {
      read: () => JSON.parse(storage.getItem("dreamscape.save.v1")!),
      remount: () => { root.unmount(); root = createRoot(host); render(); },
    };
  }, { cityId, scene, id });
  await setDialogueSpeed(page, "0");
}

async function readDebugState(page: Page): Promise<GameState> {
  return page.evaluate(() => (window as unknown as {
    indiaReactionTest: { read: () => GameState };
  }).indiaReactionTest.read());
}

const currentFrame = (state: GameState) => state.activeTourism?.frame ?? state.activeDate?.frame ?? state.activeBattle?.frame;

async function advanceDebugToMark(page: Page, target: ReactionTarget) {
  for (let step = 0; step < 60; step++) {
    const before = await readDebugState(page);
    const frame = currentFrame(before);
    if (frame?.reactions?.[target]?.mark) return before;
    expect(frame?.choices ?? []).toHaveLength(0);
    await advanceDialogue(page);
    await expect.poll(async () => (await readDebugState(page)).revision).toBeGreaterThan(before.revision);
  }
  throw new Error(`The authored reaction was not reached: ${target}`);
}

async function expectMarkClears(page: Page, target: ReactionTarget, selector: string) {
  // Consecutive lines may deliberately use different marks. Check the first
  // unmarked frame rather than assuming the next authored line must be plain.
  for (let step = 0; step < 30; step++) {
    const before = await readDebugState(page);
    expect(currentFrame(before)?.choices ?? []).toHaveLength(0);
    await advanceDialogue(page);
    await expect.poll(async () => (await readDebugState(page)).revision).toBeGreaterThan(before.revision);
    const next = currentFrame(await readDebugState(page));
    if (!next?.reactions?.[target]?.mark) {
      await expect(page.locator(selector)).toHaveCount(0);
      return;
    }
    await expect(page.locator(`${selector}[data-effect="${next.reactions[target]!.mark}"]`)).toBeVisible();
  }
  throw new Error("No unmarked authored frame found");
}

test("Delhi arrival shows the actual mark and restores it after reloading", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await page.getByRole("button", { name: "旅をはじめる" }).click();
  await expect(page.getByTestId("arrival-logo")).toHaveCount(0, { timeout: 15_000 });
  await setDialogueSpeed(page, "0");
  for (let step = 0; !(await readIndiaState(page)).activeEpilogue?.frame.reactions?.heroine?.mark; step++) {
    expect(step).toBeLessThan(20);
    const before = await readIndiaState(page);
    await advanceDialogue(page, "arrival-advance");
    await expect.poll(async () => (await readIndiaState(page)).revision).toBeGreaterThan(before.revision);
  }
  const saved = await readIndiaState(page);
  const authoredMark = saved.activeEpilogue!.frame.reactions!.heroine!.mark;
  const mark = page.locator(`.vn-character .comic-effect[data-effect="${authoredMark}"]`);
  await expect(mark).toBeVisible();
  await expectNoOverflow(page);
  await page.reload();
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await expect(mark).toBeVisible();
  expect(await readIndiaState(page)).toEqual(saved);
  for (let step = 0; step < 20; step++) {
    const before = await readIndiaState(page);
    await advanceDialogue(page, "arrival-advance");
    await expect.poll(async () => (await readIndiaState(page)).revision).toBeGreaterThan(before.revision);
    const next = await readIndiaState(page);
    if (!next.activeEpilogue?.frame.reactions?.heroine?.mark) break;
  }
  await expect(page.locator(".vn-character .comic-effect")).toHaveCount(0);
});

for (const example of [
  { cityId: "agra", scene: "tourism" as const, id: "agra_agra_fort", screen: "tourism-guide" },
  { cityId: "jaipur", scene: "date" as const, id: "gt_jaipur_date_jal_mahal", screen: "romance-scene" },
]) {
  test(`${example.cityId} ${example.scene} shows its actual mark and preserves the current scene`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 360, height: 740 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openDebugScene(page, example.cityId, example.scene, example.id);
    await expect(page.getByTestId(example.screen)).toBeVisible();
    const saved = await advanceDebugToMark(page, "heroine");
    const authoredMark = currentFrame(saved)!.reactions!.heroine!.mark;
    const mark = page.locator(`.vn-character .comic-effect[data-effect="${authoredMark}"]`);
    await expect(mark).toBeVisible();
    await expect.poll(() => mark.locator("img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expectNoOverflow(page);
    await page.evaluate(() => (window as unknown as { indiaReactionTest: { remount: () => void } }).indiaReactionTest.remount());
    await expect(mark).toBeVisible();
    expect(await readDebugState(page)).toEqual(saved);
    await expectMarkClears(page, "heroine", ".vn-character .comic-effect");
    expect(errors).toEqual([]);
  });
}

test("a Delhi opponent's actual mark appears on the opponent and clears on the next line", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 740 });
  await openDebugScene(page, "delhi", "battle", "gt_delhi_main_red_fort_battle");
  await expect(page.locator(".battle-screen")).toBeVisible();
  const saved = await advanceDebugToMark(page, "enemy");
  const authoredMark = currentFrame(saved)!.reactions!.enemy!.mark;
  const enemyMark = page.locator(`.battle-enemy .comic-effect[data-effect="${authoredMark}"]`);
  await expect(enemyMark).toBeVisible();
  await expectNoOverflow(page);
  await page.evaluate(() => (window as unknown as { indiaReactionTest: { remount: () => void } }).indiaReactionTest.remount());
  await expect(enemyMark).toBeVisible();
  expect(await readDebugState(page)).toEqual(saved);
  await expectMarkClears(page, "enemy", ".battle-enemy .comic-effect");
});
