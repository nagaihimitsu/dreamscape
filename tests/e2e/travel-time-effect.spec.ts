import { expect, test } from "@playwright/test";
import { saved, startNewGame, openStaleTab } from "./helpers";

test.use({ reducedMotion: "no-preference" });

test("waiting has no effect; successful lodging shows the next day", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  const effect = page.getByTestId("time-passage");

  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await expect(effect).toHaveCount(0);
  await page.getByRole("dialog", { name: "滞在先で休む" }).getByRole("button", { name: "閉じる" }).click();
  expect((await saved(page)).travel.day).toBe(1);

  await page.getByText("待機", { exact: true }).click();
  await page.getByRole("button", { name: "30分待つ" }).click();
  await expect(effect).toHaveCount(0);
  expect((await saved(page)).travel.minute).toBe(570);

  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("button", { name: /徒歩 0分 · €0/ }).click();
  await expect(effect).toBeVisible();
  await expect(effect).toContainText("次の日");
  await expect(effect).toHaveCSS("pointer-events", "none");
  const rested = await saved(page);
  expect(rested.travel).toMatchObject({ day: 2, minute: 540, currentPlaceId: "p_hotel" });
  expect(rested.ap).toBe(0);
  await page.reload();
  expect((await saved(page)).travel).toEqual(rested.travel);
  await expect(effect).toHaveCount(0);
});

test("a rejected save does not play the effect", async ({ page, context }) => {
  await startNewGame(page);
  const other = await openStaleTab(context);
  await other.goto("/");
  await other.getByText("待機", { exact: true }).click();
  await other.getByRole("button", { name: "30分待つ" }).click();
  await expect.poll(async () => (await saved(other)).travel.minute).toBe(570);

  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("button", { name: /徒歩 0分 · €0/ }).click();
  await expect(page.getByTestId("time-passage")).toHaveCount(0);
  expect((await saved(page)).travel.minute).toBe(570);
});

test("reduced motion shows the next-day label without moving the sun", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startNewGame(page);
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("button", { name: /徒歩 0分 · €0/ }).click();
  await expect.poll(async () => (await saved(page)).travel.day).toBe(2);
  const effect = page.getByTestId("time-passage");
  await expect(effect).toContainText("次の日");
  await expect(effect.locator(".time-passage-sun")).toHaveCSS("animation-name", "none");
  await expect(page.getByTestId("time-passage")).toHaveCount(0);
});

test("the in-game reduced-motion setting also keeps the transition still", async ({ page }) => {
  await startNewGame(page);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByLabel("演出を短縮する").check();
  await page.getByRole("dialog", { name: "設定" }).getByRole("button", { name: "閉じる" }).click();
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("button", { name: /徒歩 0分 · €0/ }).click();
  await expect.poll(async () => (await saved(page)).travel.day).toBe(2);
  const effect = page.getByTestId("time-passage");
  await expect(effect).toContainText("次の日");
  await expect(effect.locator(".time-passage-sun")).toHaveCSS("animation-name", "none");
  await expect(page.getByTestId("time-passage")).toHaveCount(0);
});
