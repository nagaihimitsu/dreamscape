import { readFileSync } from "node:fs";
import type { JourneyCatalog } from "../../src/content/journey-catalog";
import { DEBUG_HOOK_NAME, type DreamscapeDebugHook } from "../../src/dev/debug-hook";
import { debugQueryString } from "../../src/dev/debug-query";
import { allStorage, expect, readSave, startJourney, test } from "./helpers";

test("the title screen opens every registered journey without writing a save", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Dreamscape/);
  // Read after the dev server's content:build (of this spec's checkout, whatever the working folder):
  // each journey's status, initial state and title art.
  const catalog: JourneyCatalog = JSON.parse(readFileSync(new URL("../../src/content/generated/content/journeys/catalog.json", import.meta.url), "utf8"));
  const selector = page.getByLabel("旅行編");
  const journeys = await selector.locator("option").evaluateAll((options) =>
    options.map((option) => ({ id: (option as HTMLOptionElement).value, name: option.textContent ?? "" })));
  expect(journeys.map((journey) => journey.id)).toEqual(expect.arrayContaining(["milano", "golden_triangle"]));
  const headings = new Map<string, string | null>();
  // Go through the journeys with the keyboard: each switch rebuilds the screen,
  // and the new screen's selector takes the focus back so the next key works.
  await selector.selectOption(journeys[0].id);
  await selector.focus();
  for (const [index, journey] of journeys.entries()) {
    if (index > 0) await page.keyboard.press("ArrowDown");
    await expect(selector).toHaveValue(journey.id);
    const entry = catalog.journeys.find((item) => item.id === journey.id);
    expect(journey.name.includes("準備中"), journey.id).toBe(entry?.status === "preparing");
    if (entry?.status === "preparing") {
      // An unfinished journey cannot be played yet. With an initial state
      // (manifest initialState) it can store names for later; without one,
      // as a journey fresh from `npm run journey:new`, it is read-only.
      await expect(page.getByText("この旅行編は制作中です。", { exact: false })).toBeVisible();
      await expect(page.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
      if (entry.initialState) await expect(page.getByRole("button", { name: "旅の準備を保存する" })).toBeVisible();
      else {
        await expect(page.getByRole("status")).toHaveText("この旅行編は制作中です。公開をお待ちください。");
        await expect(page.getByRole("button")).toHaveCount(0);
      }
    } else {
      await expect(page.getByRole("button", { name: "旅をはじめる", exact: true })).toBeVisible();
      headings.set(journey.id, await page.locator(".masthead .edition").textContent());
      // The journey's own title art (a missing file fails the error guard), else the shared neutral scene.
      const art = catalog.journeys.find((item) => item.id === journey.id)?.titleArt;
      const scene = page.locator(".intro-art .canal-scene");
      await expect(scene.locator(".scene-stamp")).toHaveText(art?.captionJa ?? "旅の余白 ／ 予定のない午後");
      await expect(scene.locator("img")).toHaveCount(art ? 1 : 0);
      if (art) await expect(scene.locator("img")).toHaveAttribute("src", new RegExp(`${art.imagePath}$`));
      else await expect(scene).toHaveAttribute("data-fallback", "neutral");
    }
    await expect(selector).toBeFocused();
  }
  // Before the trip starts, the heading names the selected journey's first city.
  expect(headings.get("milano")).toBe("ミラノの旅");
  expect(headings.get("golden_triangle")).toBe("デリーの旅");
  expect(Object.keys(await allStorage(page)).filter((key) => key.includes(".save."))).toEqual([]);
});

test("a Debug launch URL opens its scene without changing the player's saved data", async ({ page }) => {
  await startJourney(page);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect((await readSave(page)).ap).toBe(0);
  const before = await allStorage(page);
  // Debug as a scene launchpad (docs/10): it checks the scene only, never saving and resuming.
  const url = debugQueryString({ dataMode: "real", cityId: "milano", scene: "date", target: "milano_brera_date_01",
    progress: "completed", ap: 9, affection: 0, trust: 0, spark: 0, roll: "negative" });
  await page.goto(`/${url}`);
  await expect(page.getByTestId("debug-session")).toBeVisible();
  await expect(page.getByTestId("romance-scene")).toBeVisible();
  // The development-only, read-only hook shows Debug's own game (its date spent AP from 9).
  const debug = await page.evaluate((name) => {
    const hook = (window as unknown as Record<string, DreamscapeDebugHook>)[name];
    return { state: hook.getState(), scene: hook.getScene() };
  }, DEBUG_HOOK_NAME);
  expect(debug.state?.activeDate?.dateId).toBe("milano_brera_date_01");
  expect(debug.state?.ap).toBeLessThan(9);
  expect(debug.scene?.url).toBe(url);
  // Back on the settings screen, the same scene's URL is offered for copying.
  await page.getByRole("button", { name: "設定へ戻る" }).click();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  await expect(page.getByTestId("debug-url")).toHaveValue(new URL(url, page.url()).href);
  // A URL that does not fit the content says why and links back to the settings screen.
  await page.goto("/?debug&city=milano&scene=battle&target=gt_delhi_main_red_fort_battle");
  await expect(page.getByRole("alert")).toHaveText("「gt_delhi_main_red_fort_battle」はミラノの「バトル」にありません。");
  await page.getByRole("link", { name: "場面の確認（設定画面）へ" }).click();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  expect(await allStorage(page)).toEqual(before);
});
