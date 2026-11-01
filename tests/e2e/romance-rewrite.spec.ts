import { expect, test } from "@playwright/test";
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import { choose, expectNoOverflow, findDateOption, finishEvent, loadSnapshot, saved, setDialogueSpeed, startEvent } from "./helpers";
import { installRomanceRolls } from "./romance-rolls";

test.use({ reducedMotion: "reduce" });
test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test("新しい美術館へ自由時間から出かけ、選択を保存して最後まで読める", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, phase7.cityClearViewed);
  const entry = await findDateOption(page, "milano_novecento_date_01");
  await expect(entry.getByRole("button")).toContainText("ノヴェチェント美術館");
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("novecento-menu-360.png") });
  await startEvent(page, "milano_novecento_date_01", 1);
  const scene = page.getByTestId("romance-scene");
  await expect(scene.getByTestId("date-destination")).toHaveText("ミラノ ／ ノヴェチェント美術館");
  await expect(scene.locator(".dialogue-text")).toContainText("ノヴェチェント美術館");
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("novecento-dialogue-360.png") });
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  const afterFirst = await saved(page);
  await page.reload();
  expect(await saved(page)).toEqual(afterFirst);
  await page.setViewportSize({ width: 430, height: 932 });
  await expectNoOverflow(page);
  await choose(page, 1);
  await page.screenshot({ path: testInfo.outputPath("novecento-dialogue-430.png") });
  await finishEvent(page, 2);
  const finished = await saved(page);
  expect(finished.playedDateIds).toContain("milano_novecento_date_01");
  expect(finished.memories).toContain("milano_novecento_first_a");
  expect(finished.memories).toContain("milano_novecento_second_b");
});

test("ブレラの刷新会話が既存の観光デート導線から始まる", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 430, height: 932 });
  await loadSnapshot(page, phase7.cityClearViewed);
  await startEvent(page, "milano_brera_date_01", 2);
  const scene = page.getByTestId("romance-scene");
  await expect(scene.getByTestId("date-destination")).toHaveText("ミラノ ／ ブレラ絵画館");
  await expect(scene.locator(".dialogue-text")).toContainText("ハイエツの《接吻》");
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("brera-dialogue-430.png") });
  await setDialogueSpeed(page, "0");
  await choose(page, 1);
  await choose(page, 0);
  await finishEvent(page, 2);
  const finished = await saved(page);
  expect(finished.memories).toContain("milano_brera_v2_first_listen");
  expect(finished.memories).toContain("milano_brera_v2_second_joke");
});
