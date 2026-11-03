import { expect, test } from "@playwright/test";

test("a destination without a walking route shows and uses registered transport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ path);
    const travel = getCityContent("milano").travel;
    const index = travel.routes.findIndex((route: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_duomo" && route.mode === "walk");
    const [walk] = travel.routes.splice(index, 1);
    if (!walk) throw new Error("Missing fixture route");
    travel.routes.push({ ...walk, mode: "taxi", minutes: 5, cost: 9 });
    travel.routes.push({ ...walk, mode: "bus", minutes: 10, cost: 2 });
  });
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
  const destination = page.getByTestId("travel-place-p_duomo");
  if (!(await destination.isVisible())) await page.getByText("ほかの行き先を見る", { exact: true }).click();
  await expect(destination).toContainText("タクシー約5分");
  await expect(destination).toContainText("徒歩の所要時間不明");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await destination.getByRole("button").click();
  const options = page.getByRole("dialog", { name: /へ$/ });
  await expect(options.getByRole("button", { name: /タクシー 5分/ })).toBeVisible();
  await expect(options.getByRole("button", { name: /バス 10分/ })).toBeVisible();
  await expect(options.getByRole("button", { name: /徒歩/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await options.getByRole("button", { name: /タクシー 5分/ }).click();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
});

test("a destination with no registered outbound route is absent from the list and map", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ path);
    const travel = getCityContent("milano").travel;
    for (let i = travel.routes.length - 1; i >= 0; i--) {
      const route = travel.routes[i];
      if (route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_duomo") travel.routes.splice(i, 1);
    }
  });
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
  await expect(page.getByTestId("travel-place-p_duomo")).toHaveCount(0);
  await page.locator(".travel-map-places summary").click();
  await expect(page.locator(".travel-map-places option", { hasText: "ドゥオモ広場" })).toHaveCount(0);
});
