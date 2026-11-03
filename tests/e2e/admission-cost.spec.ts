import { expect, test } from "@playwright/test";
import { expectNoOverflow, saved } from "./helpers";

test("a modeled route shows the party admission before charging it once", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ path);
    const travel = getCityContent("milano").travel;
    const event = travel.events.find((item: { id: string }) => item.id === "milano_duomo_episode");
    const walk = travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.fromPlaceId === "p_hotel" && item.toPlaceId === "p_duomo" && item.mode === "walk");
    if (!event || !walk) throw new Error("Missing travel test data");
    event.admissionCost = 20;
    walk.estimation = "game_model";
    travel.routes.push({ ...walk, mode: "taxi", minutes: 5, cost: 5 });
  });
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
  const destination = page.getByTestId("travel-place-p_duomo");
  await expect(destination).toContainText("ゲーム内の推定");
  await expect(destination).toContainText("入場料 €20（2人分・ゲーム設定）");
  await expectNoOverflow(page);
  await destination.getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: /へ$/ });
  await expect(dialog).toContainText("入場料 €20（2人分・ゲーム設定）");
  await expectNoOverflow(page);
  await dialog.getByRole("button", { name: /徒歩.*ゲーム内の推定/ }).click();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect((await saved(page)).travelBudget).toBe(40);
  await page.reload();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect((await saved(page)).travelBudget).toBe(40);
});
