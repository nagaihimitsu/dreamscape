import { expect, test, type Locator, type Page } from "@playwright/test";
import { loadCurrentScene } from "./current-scenarios";
import { expectNoOverflow, saved } from "./helpers";
import { finishAutomaticEncounters } from "./battle-helpers";

test.use({ reducedMotion: "reduce" });

async function expectBarAndScene(page: Page, scene: Locator) {
  const bar = page.locator(".journey-bar");
  await expect(bar).toBeVisible();
  await expect(page.getByTestId("journey-context")).toContainText("現在地：");
  await expect(bar.locator(".travel-budget")).toBeVisible();
  await expect(bar.locator(".ap")).toBeVisible();
  await expect(scene).toBeVisible();
  const [barBox, sceneBox] = await Promise.all([bar.boundingBox(), scene.boundingBox()]);
  expect(barBox).not.toBeNull();
  expect(sceneBox).not.toBeNull();
  expect(barBox!.y).toBeGreaterThanOrEqual(0);
  expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(sceneBox!.y + 1);
  await expectNoOverflow(page);
}

for (const size of [{ width: 360, height: 780 }, { width: 430, height: 932 }]) {
  test(`bar stays above guide, observation and battle on ${size.width}×${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loadCurrentScene(page, "guide");
    await expectBarAndScene(page, page.getByTestId("tourism-screen"));
    await expect(page.getByTestId("tourism-guide")).toBeVisible();
    await page.getByTestId("tourism-skip").click();
    await expectBarAndScene(page, page.getByTestId("tourism-screen"));
    await expect(page.getByTestId("observation-viewport")).toBeVisible();
    await page.getByRole("button", { name: "進む", exact: true }).click();
    await finishAutomaticEncounters(page);
    await expectBarAndScene(page, page.locator(".battle-screen"));
    const location = page.getByTestId("battle-location");
    const notebook = page.getByRole("button", { name: "手がかり帳", exact: true });
    await expect(location).toBeVisible();
    await expect(notebook).toBeVisible();
    const [barBox, placeBox, buttonBox] = await Promise.all([
      page.locator(".journey-bar").boundingBox(), location.boundingBox(), notebook.boundingBox(),
    ]);
    expect(placeBox!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height - 1);
    expect(buttonBox!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height - 1);
    const before = await saved(page);
    await page.reload();
    expect(await saved(page)).toEqual(before);
    await expectBarAndScene(page, page.locator(".battle-screen"));
  });
}

test("bar remains visible without blocking a special battle or a date choice", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadCurrentScene(page, "specialBReasoning");
  await expectBarAndScene(page, page.locator(".battle-screen"));
  await expect(page.getByTestId("reasoning-notebook")).toBeVisible();
  await loadCurrentScene(page, "dateChoice");
  await expectBarAndScene(page, page.getByTestId("romance-scene"));
  await expect(page.locator(".choice").first()).toBeVisible();
});

test("bar is visible in a landscape battle without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 360 });
  await loadCurrentScene(page, "battleDialogue");
  await expectBarAndScene(page, page.locator(".battle-screen"));
  await expect(page.getByTestId("battle-location")).toBeVisible();
  await expect(page.getByRole("button", { name: "手がかり帳", exact: true })).toBeVisible();
});

test("bar remains visible when a landscape observation page is scrolled", async ({ page }) => {
  await page.setViewportSize({ width: 780, height: 360 });
  await loadCurrentScene(page, "observation");
  await expect(page.getByTestId("observation-viewport")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 180));
  const bar = page.locator(".journey-bar");
  await expect(bar).toBeInViewport();
  await expect(page.getByTestId("journey-context")).toBeVisible();
  await expectNoOverflow(page);
});
