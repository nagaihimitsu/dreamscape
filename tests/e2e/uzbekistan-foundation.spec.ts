import { expect, test } from "@playwright/test";
import { expectNoOverflow, startNewGame } from "./helpers";
import { saveIndependentIndiaGame } from "./india-preview-helpers";
import { finishCityArrival } from "./city-arrival-helpers";

const uzbekistanKey = "dreamscape.journey.uzbekistan.save.v1";
const indiaKey = "dreamscape.journey.golden_triangle.save.v1";
const cities = [["tashkent", "タシュケント"], ["samarkand", "サマルカンド"],
  ["bukhara", "ブハラ"], ["khiva", "ヒヴァ"]] as const;

test("Uzbekistan preparation is independent of both existing journeys on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await page.getByLabel("主人公の名前").fill("インドの名前");
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
  await finishCityArrival(page);
  const india = await page.evaluate((key) => localStorage.getItem(key), indiaKey);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("dialog", { name: "設定" }).getByLabel("旅行編").selectOption("uzbekistan");
  await expect(page.getByText("タシュケント → サマルカンド → ブハラ → ヒヴァ")).toBeVisible();
  await expect(page.getByText("この旅行編は制作中です。観光やイベントはまだ遊べません。")).toBeVisible();
  await expect(page.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
  await page.getByLabel("主人公の名前").fill("ウズベキスタンの名前");
  await page.getByLabel("ヒロインの名前").fill("新しい相手");
  await page.getByRole("button", { name: "旅の準備を保存する" }).click();
  await expect(page.getByText("ウズベキスタンの名前 と 新しい相手")).toBeVisible();
  await expectNoOverflow(page);
  const uzbekistan = await page.evaluate((key) => localStorage.getItem(key), uzbekistanKey);
  expect(JSON.parse(uzbekistan!)).toMatchObject({ journeyId: "uzbekistan", currentCityId: "tashkent",
    ap: 0, affection: 0, trust: 0, spark: 0, memories: [], claimedRewardIds: [], inventory: {} });
  expect(await page.evaluate((key) => localStorage.getItem(key), indiaKey)).toBe(india);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"))).toBeNull();
  await page.getByLabel("旅行編").selectOption("milano");
  await page.getByRole("button", { name: "旅をはじめる" }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  const milan = await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"));
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("dialog", { name: "設定" }).getByLabel("旅行編").selectOption("uzbekistan");
  await expect(page.getByText("ウズベキスタンの名前 と 新しい相手")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"))).toBe(milan);
  expect(await page.evaluate((key) => localStorage.getItem(key), uzbekistanKey)).toBe(uzbekistan);
  expect(await page.evaluate((key) => localStorage.getItem(key), indiaKey)).toBe(india);
});

test("Uzbekistan preparation locks competing tabs and preserves damaged saves", async ({ page, context }) => {
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("uzbekistan");
  await page.getByLabel("主人公の名前").fill("先の名前");
  await page.getByRole("button", { name: "旅の準備を保存する" }).click();
  const saved = await page.evaluate((key) => localStorage.getItem(key), uzbekistanKey);
  const second = await context.newPage();
  await second.goto("/");
  await second.getByLabel("旅行編").selectOption("uzbekistan");
  await expect(second.getByRole("alert")).toContainText("別のタブで開いています");
  await expect(second.getByRole("button", { name: "旅の準備を保存する" })).toHaveCount(0);
  await page.getByLabel("旅行編").selectOption("milano");
  await second.getByRole("button", { name: "再試行" }).click();
  await expect(second.getByText("先の名前 と あゆみ")).toBeVisible();
  expect(await second.evaluate((key) => localStorage.getItem(key), uzbekistanKey)).toBe(saved);
  await second.close();
  await page.evaluate((key) => localStorage.setItem(key, "{broken"), uzbekistanKey);
  await page.getByLabel("旅行編").selectOption("uzbekistan");
  await expect(page.getByRole("alert")).toContainText("元のデータは残っています");
  await expect(page.getByRole("button", { name: "旅の準備を保存する" })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), uzbekistanKey)).toBe("{broken");
});

test("all four maps can travel, rest and reload in Debug without editing player saves", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  expect((await saveIndependentIndiaGame(page)).ok).toBe(true);
  await page.evaluate(async () => {
    const draftPath = "/src/persistence/journey-preparation.ts";
    const storagePath = "/src/persistence/journey-storage.ts";
    const { saveJourneyDraft } = await import(/* @vite-ignore */ draftPath);
    const { journeyStorage } = await import(/* @vite-ignore */ storagePath);
    if (!saveJourneyDraft(journeyStorage(localStorage, "uzbekistan"), "uzbekistan", "相手").ok) throw new Error("Draft save failed");
  });
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  for (const [cityId, name] of cities) {
    await page.getByTestId("debug-city").selectOption(cityId);
    await page.getByRole("button", { name: "地図・交通を確認" }).click();
    const preview = page.getByTestId("debug-prototype-preview");
    await expect(preview).toContainText(`${name} · 都市データの確認`);
    await expect(preview).toContainText("物語は始まりません");
    await expect(preview).toContainText("料金は2人分です");
    await expect(preview.getByTestId("debug-prototype-status")).toContainText("4000000");
    await expect(preview.getByTestId("debug-prototype-status")).not.toContainText("₹");
    await expect(preview.getByTestId("travel-map-canvas")).toBeVisible();
    const options = await preview.getByTestId("debug-prototype-destination").locator("option").evaluateAll((elements) => elements.map((element) => (element as HTMLOptionElement).value));
    expect(options.every((id) => id.startsWith(`${cityId}_`))).toBe(true);
    const destination = options.find((id) => !id.endsWith("hotel_hub"))!;
    await preview.getByTestId("debug-prototype-destination").selectOption(destination);
    await preview.getByRole("button", { name: /^徒歩/ }).click();
    await expect(preview.getByRole("status")).toContainText("一時データで移動を確認しました");
    const afterMove = await preview.getByTestId("debug-prototype-status").textContent();
    await preview.getByRole("button", { name: "一時データを読み直す" }).click();
    await expect(preview.getByRole("status")).toContainText("一時データから再開しました");
    await expect(preview.getByTestId("debug-prototype-status")).toHaveText(afterMove!);
    await preview.getByRole("button", { name: /^滞在先で休む（徒歩/ }).first().click();
    await expect(preview.getByTestId("debug-prototype-status")).toContainText("2日目（火） 09:00");
    await expectNoOverflow(page);
    await preview.getByRole("button", { name: "設定へ戻る" }).click();
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
  }
  await page.getByTestId("debug-data-mode").selectOption("fixture");
  for (const [cityId, name] of cities) {
    await page.getByTestId("debug-city").selectOption(cityId);
    await expect(page.getByTestId("debug-city").locator(`option[value="${cityId}"]`)).toContainText(`${name}（仮データ）`);
    await page.getByTestId("debug-scene").selectOption("tourism");
    await page.getByTestId("debug-target").selectOption(`${cityId}_landmark`);
    await page.getByRole("button", { name: "この場面を開く" }).click();
    await expect(page.getByTestId("tourism-guide")).toBeVisible();
    await page.getByRole("button", { name: "設定へ戻る" }).click();
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
  }
  await page.getByTestId("debug-data-mode").selectOption("real");
  await page.getByTestId("debug-city").selectOption("khiva");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  await expect(page.getByTestId("debug-prototype-destination").locator('option[value="khiva_place"]')).toHaveCount(0);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});
