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
  { scene: "flow-hud-menu", titleJa: "⚙設定を開いた状態", descriptionJa: "旅を始めて上の「設定」（セーブ・ロード・ゲームの設定）", open: async (page) => {
    await ops.startJourney(page);
    await ops.openMenu(page);
  } },
  { scene: "flow-settings", titleJa: "ゲームの設定", descriptionJa: "旅を始めて「設定」→「ゲームの設定」", open: async (page) => {
    await ops.startJourney(page);
    await ops.openSettings(page);
  } },
  { scene: "flow-old-data", titleJa: "古い保存データの整理", descriptionJa: "旅を始め、旧版のセーブ・バックアップ・以前のミラノ編の英語ノートを置いて「設定」→「ゲームの設定」→「古い保存データの整理」", open: async (page) => {
    await ops.startJourney(page);
    await page.evaluate(() => {
      localStorage.setItem("dreamscape.journey.golden_triangle.save.v1", JSON.stringify({ schemaVersion: 13, revision: 3 }));
      localStorage.setItem("dreamscape.journey.milano.save.v1.backup.1762500000000", "{damaged-save");
      localStorage.setItem("dreamscape.learning.v1", JSON.stringify({ schemaVersion: 1, records: {} }));
    });
    await ops.openOldDataCleanup(page);
  } },
  { scene: "flow-old-data-confirm", titleJa: "古い保存データの整理の確認", descriptionJa: "上と同じデータで、ミラノ編のバックアップを選んで「選んだデータを消去する」（ボタンは同じ位置に「消去せず戻る」「消去する」）", open: async (page) => {
    await ops.startJourney(page);
    await page.evaluate(() => {
      localStorage.setItem("dreamscape.journey.golden_triangle.save.v1", JSON.stringify({ schemaVersion: 13, revision: 3 }));
      localStorage.setItem("dreamscape.journey.milano.save.v1.backup.1762500000000", "{damaged-save");
      localStorage.setItem("dreamscape.learning.v1", JSON.stringify({ schemaVersion: 1, records: {} }));
    });
    const cleanup = await ops.openOldDataCleanup(page);
    await ops.chooseOldData(page, cleanup, [/ミラノ編のバックアップ/]);
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
