import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Shot } from "../../scripts/dev/screen-gallery";
import { debugExampleUrls } from "../../scripts/dev/screen-gallery";
import { expect, ops, playUntil, test, type Page } from "../e2e/helpers";

// Screens for people checking by eye (`npm run screens`, docs/10「人が画面を確かめる」).
// Not a gate and no image comparison: each test only brings a screen up the way a
// player (or a Debug launch URL) does and saves it with its record for the gallery.
const out = process.env.SCREENS_OUT ?? path.resolve("artifacts/screens");

async function save(page: Page, scene: string, titleJa: string, route: Shot["route"], width: number) {
  // The settled screen: no travel transition over it, every image loaded (so two runs match).
  await expect(page.getByTestId("travel-transition")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => [...document.images].every((image) => image.complete))).toBe(true);
  const file = `shots/${width}/${scene}.png`;
  mkdirSync(path.join(out, `shots/${width}`), { recursive: true });
  const image = await page.screenshot({ path: path.join(out, file), fullPage: true, animations: "disabled", caret: "hide" });
  const shot: Shot = { scene, titleJa, route, width, file, sha256: createHash("sha256").update(image).digest("hex") };
  writeFileSync(path.join(out, `shots/${width}/${scene}.json`), JSON.stringify(shot, null, 2));
}

type FlowScene = { scene: string; titleJa: string; descriptionJa: string; open: (page: Page) => Promise<void> };
const toBattle = async (page: Page) => {
  await ops.startJourney(page);
  await ops.goTo(page, "p_duomo");
  await ops.skipGuideToBattle(page);
};
const flows: FlowScene[] = [
  { scene: "flow-title", titleJa: "タイトル画面", descriptionJa: "最初の画面", open: async (page) => {
    await page.goto("/");
    await expect(ops.startButton(page)).toBeVisible();
  } },
  { scene: "flow-travel-menu", titleJa: "旅の始まりの行き先", descriptionJa: "ミラノの旅を始めた直後", open: (page) => ops.startJourney(page) },
  { scene: "flow-settings", titleJa: "設定", descriptionJa: "旅を始めて「設定」", open: async (page) => {
    await ops.startJourney(page);
    await ops.openSettings(page);
  } },
  { scene: "flow-route-choice", titleJa: "移動手段の選択", descriptionJa: "旅を始めて「最後の晩餐」を選ぶ（徒歩と路面電車16番）", open: async (page) => {
    await ops.startJourney(page);
    await ops.goTo(page, "p_supper");
    await expect(ops.routeButton(page, "路面電車")).toBeVisible();
  } },
  { scene: "flow-tourism-guide", titleJa: "観光案内", descriptionJa: "ドゥオモ広場へ歩いた直後", open: async (page) => {
    await ops.startJourney(page);
    await ops.goTo(page, "p_duomo");
    await expect(page.getByTestId("tourism-guide")).toBeVisible();
  } },
  { scene: "flow-battle-question", titleJa: "クイズバトルの問題", descriptionJa: "ドゥオモの案内を閉じて対決へ", open: async (page) => {
    await toBattle(page);
    await playUntil(page, (state) => state.activeBattle?.phase === "question");
  } },
  { scene: "flow-battle-feedback", titleJa: "回答後の解説", descriptionJa: "最初の問題にAで答えた後", open: async (page) => {
    await toBattle(page);
    await playUntil(page, (state) => state.activeBattle?.phase === "feedback");
  } },
  { scene: "flow-battle-result", titleJa: "バトルの結果と報酬", descriptionJa: "ドゥオモの対決をすべてAで答えた後", open: async (page) => {
    await toBattle(page);
    await playUntil(page, (state) => state.activeBattle?.phase === "result");
  } },
  { scene: "flow-english-note", titleJa: "英語ノート", descriptionJa: "ドゥオモの対決の後、最初の問題を選ぶ", open: async (page) => {
    await toBattle(page);
    await playUntil(page, (state) => state.activeBattle?.phase === "result");
    await ops.toFreeTime(page);
    const note = await ops.openEnglishNote(page);
    const picker = note.getByLabel("回答した問題を選ぶ");
    await picker.selectOption((await picker.locator("option").nth(1).getAttribute("value"))!);
  } },
];

for (const flow of flows)
  test(`${flow.titleJa}（通常の操作）`, async ({ page }) => {
    await flow.open(page);
    await save(page, flow.scene, flow.titleJa, { kind: "flow", descriptionJa: flow.descriptionJa }, page.viewportSize()!.width);
  });

// Every example URL of docs/10 that the normal development server opens (debug-state.test.ts proves they open).
const examples = debugExampleUrls(readFileSync(path.resolve("docs/10_DEVELOPMENT_CHECKS.md"), "utf8"));
for (const [index, example] of examples.entries())
  test(`${example.titleJa}（Debug起動URL）`, async ({ page }) => {
    await page.goto(`/${example.url}`);
    // A scene opens inside the Debug bar; a prototype city's map opens its own preview.
    await expect(page.getByTestId("debug-session").getByRole("main").or(page.getByTestId("debug-prototype-preview"))).toBeVisible();
    await save(page, `debug-${String(index + 1).padStart(2, "0")}`, example.titleJa, { kind: "debug", url: example.url }, page.viewportSize()!.width);
  });
