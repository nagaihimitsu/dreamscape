import { test, expect } from "@playwright/test";
import { loadSnapshot, startNewGame } from "./helpers";
import phase4 from "../fixtures/phase4-saves.json" with { type: "json" };

test.use({ viewport: { width: 360, height: 780 } });

test("mobile start and optional sightseeing keep the next action easy to reach", async ({
  page,
}) => {
  await page.goto("/");
  const start = await page
    .getByRole("button", { name: "旅をはじめる", exact: true })
    .boundingBox();
  expect(start).not.toBeNull();
  expect(start!.y + start!.height).toBeLessThanOrEqual(780);
  await page.setViewportSize({ width: 320, height: 640 });
  const smallStart = await page
    .getByRole("button", { name: "旅をはじめる", exact: true })
    .boundingBox();
  expect(smallStart!.y + smallStart!.height).toBeLessThanOrEqual(640);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  await page.getByTestId("episode-start").click();
  await page.getByTestId("tourism-skip").click();
  const battle = page.getByRole("button", {
    name: "バトルを始める",
    exact: true,
  });
  const points = page.getByRole("button", { name: "発見ポイント・資料を見る", exact: true });
  await expect(battle).toBeVisible();
  await expect(points).toBeVisible();
  for (const element of [battle, points]) {
    const box = (await element.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(780);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("available dates come before legacy assistance", async ({ page }) => {
  await loadSnapshot(page, phase4.legacyChapter);
  const date = page.getByTestId("event-milano_cafe_01");
  const assistance = page.locator(".trial-progress");
  await expect(date.getByRole("button")).toBeEnabled();
  expect((await date.boundingBox())!.y).toBeLessThan(
    (await assistance.boundingBox())!.y,
  );
});
