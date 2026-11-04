import { expect, test } from "@playwright/test";
import { expectNoOverflow, startNewGame } from "./helpers";
import { finishCityArrival } from "./city-arrival-helpers";

const indiaKey = "dreamscape.journey.golden_triangle.save.v1";

test("Milan and playable India are independent and resumable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await expect(page.getByText("この旅行編は制作中です。観光やイベントはまだ遊べません。")).toHaveCount(0);
  await page.getByLabel("主人公の名前").fill("インドの主人公");
  await page.getByLabel("ヒロインの名前").fill("インドの相手");
  await page.getByRole("button", { name: "旅をはじめる" }).click();
  await finishCityArrival(page);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expectNoOverflow(page);
  const initialIndia = await page.evaluate((key) => localStorage.getItem(key), indiaKey);
  expect(initialIndia).toBeTruthy();
  expect(JSON.parse(initialIndia!)).toMatchObject({ currentCityId: "delhi", travelBudget: 30000, ap: 0,
    playerName: "インドの主人公", heroineName: "インドの相手", completedCityIds: [], memories: [] });
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"))).toBeNull();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("dialog", { name: "設定" }).getByLabel("旅行編").selectOption("milano");
  await page.getByRole("button", { name: "旅をはじめる" }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  const milan = await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"));
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("dialog", { name: "設定" }).getByLabel("旅行編").selectOption("golden_triangle");
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expect(page.locator(".travelers")).toContainText("インドの主人公");
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"))).toBe(milan);
  expect(await page.evaluate((key) => localStorage.getItem(key), indiaKey)).toBe(initialIndia);
  await page.reload();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("dialog", { name: "設定" }).getByLabel("旅行編").selectOption("golden_triangle");
  await expect(page.locator(".travelers")).toContainText("インドの主人公");
  expect(await page.evaluate((key) => localStorage.getItem(key), indiaKey)).toBe(initialIndia);
});

test("a second tab cannot edit India while the journey is open", async ({ page, context }) => {
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await page.getByLabel("主人公の名前").fill("先の名前");
  await page.getByRole("button", { name: "旅をはじめる" }).click();
  await finishCityArrival(page);
  const first = await page.evaluate((key) => localStorage.getItem(key), indiaKey);
  const second = await context.newPage();
  await second.goto("/");
  await second.getByLabel("旅行編").selectOption("golden_triangle");
  await expect(second.getByRole("alert")).toContainText("別のタブで開いています");
  await expect(second.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("dialog", { name: "設定" }).getByLabel("旅行編").selectOption("milano");
  await second.getByRole("button", { name: "再試行" }).click();
  await expect(second.getByTestId("travel-menu")).toBeVisible();
  await expect(second.locator(".travelers")).toContainText("先の名前");
  expect(await page.evaluate((key) => localStorage.getItem(key), indiaKey)).toBe(first);
});

test("a damaged India save is preserved", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.setItem(key, "{broken"), indiaKey);
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await expect(page.getByRole("alert")).toContainText("元のデータは残っています");
  await expect(page.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), indiaKey)).toBe("{broken");
});

test("switching away from unsaved Milan asks before discarding progress", async ({ page }) => {
  await startNewGame(page);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  let settings = page.getByRole("dialog", { name: "設定" });
  await settings.getByLabel("自動保存する").uncheck();
  await settings.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByTestId("travel-place-p_duomo").getByRole("button").click();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  settings = page.getByRole("dialog", { name: "設定" });
  await settings.getByLabel("旅行編").selectOption("golden_triangle");
  const confirm = page.getByRole("dialog", { name: "旅行編を切り替える" });
  await expect(confirm).toContainText("手動セーブしていない進行");
  await confirm.getByRole("button", { name: "戻る" }).click();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
});

test("India stays closed if the browser cannot protect its save from other tabs", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "locks", { configurable: true, value: undefined }));
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await expect(page.getByRole("alert")).toContainText("対応ブラウザをご利用ください");
  await expect(page.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), indiaKey)).toBeNull();
  await page.getByLabel("旅行編").selectOption("milano");
  await expect(page.getByRole("button", { name: "旅をはじめる" })).toBeVisible();
});
