import { expect, test } from "@playwright/test";
import { saved, startNewGame } from "./helpers";
import { installIndiaTransportPreview } from "./india-preview-helpers";

test("the real Agra map offers both direct and cheaper connected taxi returns", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  await installIndiaTransportPreview(page);
  const options = await page.evaluate(async () => {
    const contentPath = "/src/content/index.ts";
    const routePath = "/src/domain/travel-routes.ts";
    const { getCityContent } = await import(/* @vite-ignore */ contentPath);
    const { findTravelHomeRoutes } = await import(/* @vite-ignore */ routePath);
    const { travel, travelSettings } = getCityContent("agra");
    const site = "agra_mehtab_bagh";
    const outbound = travel.routes.find((r: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      r.fromPlaceId === travelSettings.hotelPlaceId && r.toPlaceId === site && r.mode === "taxi");
    const home = findTravelHomeRoutes(travel.routes, site, travelSettings.hotelPlaceId).filter((r: { mode: string }) => r.mode === "taxi");
    const direct = home.find((r: { viaPlaceId?: string }) => !r.viaPlaceId);
    const cheaper = home.find((r: { cost: number; viaPlaceId?: string }) => r.viaPlaceId && direct && r.cost < direct.cost);
    const viaName = travel.places.find((p: { id: string }) => p.id === cheaper?.viaPlaceId)?.nameJa;
    if (!outbound || !direct || !cheaper || !viaName) throw new Error("Expected a direct and cheaper connected Agra taxi return");
    return { outbound, direct, cheaper, viaName };
  });
  await page.getByTestId("debug-city").selectOption("agra");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  const preview = page.getByTestId("debug-prototype-preview");
  await expect(preview).toContainText("料金は2人分です。");
  const status = preview.getByTestId("debug-prototype-status");
  const trip = async () => {
    await preview.getByTestId("debug-prototype-destination").selectOption("agra_mehtab_bagh");
    await preview.getByRole("button", { name: `タクシー ${options.outbound.minutes}分 · ₹${options.outbound.cost}`, exact: true }).click();
    await expect(preview.getByRole("status")).toContainText("一時データで移動を確認しました");
  };
  await trip();
  const directName = `滞在先で休む（タクシー ${options.direct.minutes}分 · ₹${options.direct.cost}）`;
  const viaName = `滞在先で休む（タクシー・${options.viaName}から徒歩 ${options.cheaper.minutes}分 · ₹${options.cheaper.cost}）`;
  await expect(preview.getByRole("button", { name: directName, exact: true })).toBeVisible();
  await expect(preview.getByRole("button", { name: viaName, exact: true })).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`agra-returns-${width}.png`), fullPage: true });
  }
  await preview.getByRole("button", { name: viaName, exact: true }).click();
  await expect(status).toContainText(`₹${30_000 - options.outbound.cost - options.cheaper.cost}`);
  await expect(status).toContainText("2日目");
  await trip();
  await preview.getByRole("button", { name: directName, exact: true }).click();
  const finalBudget = 30_000 - options.outbound.cost * 2 - options.cheaper.cost - options.direct.cost;
  await expect(status).toContainText(`₹${finalBudget}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(status).toContainText(`₹${finalBudget}`);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});

test("the ordinary return dialog charges the selected direct or connected route", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const seed = await page.evaluate(() => {
    const key = "dreamscape.save.v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.travel.currentPlaceId = "p_duomo";
    state.travel.returnReserve = 4;
    state.travelBudget = 20;
    localStorage.setItem(key, JSON.stringify(state));
    return JSON.stringify(state);
  });
  const install = () => page.evaluate(async () => {
    // Keep route edits in the page's Vite module instance after a hot update.
    const contentPath = performance.getEntriesByType("resource").map((entry) => entry.name)
      .filter((url) => new URL(url).pathname === "/src/content/index.ts").at(-1);
    if (!contentPath) throw new Error("The page's city registry has not loaded.");
    const { getCityContent } = await import(/* @vite-ignore */ contentPath);
    const routes = getCityContent("milano").travel.routes;
    const saved = [...routes];
    const template = saved.find((r: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      r.fromPlaceId === "p_duomo" && r.toPlaceId === "p_hotel" && r.mode === "walk");
    if (!template) throw new Error("Missing template route");
    routes.splice(0, routes.length, ...saved.filter((r: { fromPlaceId: string; toPlaceId: string }) => r.fromPlaceId !== "p_duomo" || r.toPlaceId === "p_duomo"),
      { ...template, mode: "taxi", minutes: 10, cost: 10 },
      { ...template, toPlaceId: "p_galleria", mode: "taxi", minutes: 15, cost: 4 });
  });
  const prepare = async () => {
    await page.reload();
    await install();
    await page.getByText("待機", { exact: true }).click();
    await page.getByRole("button", { name: "30分待つ" }).click();
    await expect.poll(async () => (await saved(page)).travel.returnReserve).toBe(4);
    await page.getByRole("button", { name: "滞在先で休む", exact: true }).click();
  };
  await prepare();
  const dialog = page.getByRole("dialog", { name: "滞在先で休む" });
  await expect(dialog).not.toContainText("2人分のゲーム内の目安");
  const via = dialog.getByRole("button", { name: /タクシー・ガッレリアから徒歩 20分 · €4/ });
  const direct = dialog.getByRole("button", { name: /タクシー 10分 · €10/ });
  await expect(via).toBeVisible();
  await expect(direct).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`return-dialog-${width}.png`) });
  }
  await via.click();
  await expect.poll(async () => (await saved(page)).travel.currentPlaceId).toBe("p_hotel");
  expect((await saved(page)).travelBudget).toBe(6);
  await page.evaluate((value) => localStorage.setItem("dreamscape.save.v1", value), seed);
  await prepare();
  await direct.click();
  await expect.poll(async () => (await saved(page)).travel.currentPlaceId).toBe("p_hotel");
  expect((await saved(page)).travelBudget).toBe(0);
});

// Render the real India game in memory so ordinary dialogs are verified
// independently of the player's persistent journey slots.
test("India travel and overnight dialogs identify the game fare as the total for two", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/?debug");
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.evaluate(async () => {
    const gamePath = "/src/domain/game.ts";
    const persistencePath = "/src/persistence/index.ts";
    const reactPath = "/node_modules/.vite/deps/react.js";
    const domPath = "/node_modules/.vite/deps/react-dom_client.js";
    const appPath = "/src/app/App.tsx";
    const { createGame } = await import(/* @vite-ignore */ gamePath);
    const { saveGame } = await import(/* @vite-ignore */ persistencePath);
    const reactModule = await import(/* @vite-ignore */ reactPath);
    const domModule = await import(/* @vite-ignore */ domPath);
    const React = reactModule.default ?? reactModule;
    const createRoot = domModule.createRoot ?? domModule.default?.createRoot;
    const { default: App } = await import(/* @vite-ignore */ appPath);
    const state = createGame("主人公", "ヒロイン", { journeyId: "golden_triangle" });
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); } };
    if (!saveGame(storage, state).ok) throw new Error("Could not save real India state");
    const host = document.createElement("div");
    document.getElementById("root")!.style.display = "none";
    document.body.append(host);
    createRoot(host).render(React.createElement(App, { storage, debug: true, nextRomanceRoll: () => 0 }));
  });
  await page.getByRole("button", { name: "滞在先で休む", exact: true }).click();
  const sleep = page.getByRole("dialog", { name: "滞在先で休む" });
  await expect(sleep).toContainText("移動料金は2人分のゲーム内の目安です。");
  await sleep.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByTestId("travel-place-delhi_red_fort").getByRole("button").click();
  const episode = page.getByTestId("travel-event-gt_delhi_main_red_fort");
  if (await episode.isVisible()) await episode.click();
  const travel = page.getByRole("dialog", { name: /へ$/ });
  await expect(travel).toContainText("料金は2人分です。");
  await expect(travel).toContainText("時間・料金はゲーム内の目安です。");
  await expect(travel.getByRole("button", { name: /タクシー/ })).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(travel.getByRole("button", { name: /タクシー/ })).toBeVisible();
  }
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});
