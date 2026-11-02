import { expect, test } from "@playwright/test";
import { expectNoOverflow, saved, startNewGame } from "./helpers";

test("the top bar follows time and place while keeping resources visible", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  const bar = page.locator(".journey-bar");
  const context = page.getByTestId("journey-context");
  await expect(context).toContainText("1日目 09:00");
  await expect(context).toContainText("現在地：滞在先（架空）");
  await expect(bar.getByLabel("旅の予算 60ユーロ")).toBeVisible();
  await expect(bar.getByLabel("残り0AP")).toBeVisible();
  await page.getByText("待機", { exact: true }).click();
  await page.getByRole("button", { name: "30分待つ" }).click();
  await expect(context).toContainText("1日目 09:30");
  await page.getByTestId("travel-place-p_duomo").getByRole("button").click();
  await expect.poll(async () => (await saved(page)).travel.currentPlaceId).toBe("p_duomo");
  // The journey bar remains visible while a scene is in progress.
  await expect(bar).toBeVisible();
  await expect(context).toContainText("現在地：ドゥオモ広場");
  await page.getByTestId("tourism-skip").click();
  await page.getByRole("button", { name: "自由時間へ戻る" }).click();
  await expect(context).toBeVisible();
  await expect(context).toContainText("現在地：ドゥオモ広場");
  await expect(context).toContainText("1日目 10:52");
  await expectNoOverflow(page);
});

test("the top bar remains usable with long names on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const player = "あいうえおかきくけこさしすせそたちつてとなにぬね";
  const heroine = "アイウエオカキクケコサシスセソタチツテトナニヌネ";
  await startNewGame(page, [player, heroine]);
  const bar = page.locator(".journey-bar");
  await expect(bar.locator(".travelers")).toContainText(player);
  await expect(bar.locator(".travelers")).toContainText(heroine);
  for (const element of [bar.locator(".travelers"), bar.getByLabel("旅の予算 60ユーロ"), bar.getByLabel("残り0AP"), page.getByTestId("journey-context")]) {
    await expect(element).toBeVisible();
    const bounds = await element.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  await expectNoOverflow(page);
});
