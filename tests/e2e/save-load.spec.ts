import { allStorage, expect, goTo, playUntil, readSave, saveKey, startJourney, test, useInstantText } from "./helpers";

test("autosaved progress and an event in progress are restored after a reload", async ({ page }) => {
  test.setTimeout(120_000);
  await startJourney(page);
  await useInstantText(page);
  await goTo(page, "p_duomo");
  await page.getByTestId("tourism-skip").click();
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await playUntil(page, (state) => state.activeBattle?.phase === "result");
  await page.getByRole("button", { name: "自由時間へ進む", exact: true }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  const progress = await readSave(page);
  expect(progress.completedEpisodeIds).toEqual(["milano_duomo_episode"]);

  await page.reload();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(await readSave(page)).toEqual(progress);
  await expect(page.getByLabel(`残り${progress.ap}AP`)).toBeVisible();
  await expect(page.getByText("現在地：ドゥオモ広場")).toBeVisible();
  await expect(page.getByTestId("city-progress")).toContainText("観光 1 / 4");

  // Reloading in the middle of a date returns to the same line without charging AP again.
  await goTo(page, "p_novecento");
  const date = await playUntil(page, (state) => state.activeDate?.frame.choices.length === 3);
  expect(date.ap).toBeLessThan(progress.ap);
  await page.reload();
  await expect(page.locator(".choice")).toHaveCount(3);
  expect(await readSave(page)).toEqual(date);
  await expect(page.locator(".choice").first()).toContainText(date.activeDate!.frame.choices[0].text);
  const finished = await playUntil(page, (state) => !state.activeDate);
  expect(finished.ap).toBe(date.ap);
  expect(finished.playedDateIds).toEqual(["milano_novecento_date_01"]);
});

test("a manual save keeps the saved position and settings when unsaved changes are discarded", async ({ page }) => {
  await startJourney(page);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "設定" });
  await settings.getByLabel("自動保存する").uncheck();
  await settings.getByRole("button", { name: "閉じる", exact: true }).click();
  const initial = await readSave(page);

  await goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect(await readSave(page)).toEqual(initial);
  await page.getByRole("button", { name: "セーブ", exact: true }).click();
  const manual = await readSave(page);
  expect(manual.travel.currentPlaceId).toBe("p_duomo");
  expect(manual.activeTourism?.landmarkId).toBe("duomo_milano");

  // Progress after the manual save is not stored; reloading asks first, then restores the save.
  await page.getByTestId("tourism-skip").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect(await readSave(page)).toEqual(manual);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "設定" }).getByLabel("自動保存する")).not.toBeChecked();
});

test("a second tab cannot open a journey that is already open", async ({ page, context }) => {
  await startJourney(page, "milano", ["先の名前", "あゆみ"]);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  const saved = await allStorage(page);
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("alert")).toContainText("別のタブで開いています");
  await expect(second.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
  expect(await allStorage(second)).toEqual(saved);

  // Once the first tab is closed, the second can continue the same journey.
  await page.close();
  await second.getByRole("button", { name: "再試行" }).click();
  await expect(second.getByTestId("travel-menu")).toBeVisible();
  await expect(second.locator(".travelers")).toContainText("先の名前");
  expect(await allStorage(second)).toEqual(saved);
});

test("an unreadable save is reported and left untouched", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.setItem(key, "{damaged-save"), saveKey());
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("保存データを読み込めませんでした");
  await expect(page.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
  expect((await allStorage(page))[saveKey()]).toBe("{damaged-save");
});
