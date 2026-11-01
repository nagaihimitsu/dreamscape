import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import { availableAp, choose, expectNoOverflow, findDateOption, finishEvent, loadSnapshot, saved, setDialogueSpeed, startEvent } from "./helpers";

test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test.use({ reducedMotion: "reduce" });

test("old saves expose the places only after their sightseeing episodes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.ending);
  for (const id of ["milano_la_scala_date_01", "milano_brera_date_01", "milano_navigli_date_01"])
    await expect(page.getByTestId(`event-${id}`)).toHaveCount(0);
  const old = await saved(page);
  expect(old.endingReached).toBe(true);
  expect(old.completedEpisodeIds).toEqual([]);
  await expectNoOverflow(page);
});

test("three destination dates work from a completed old save on a phone", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase7.cityClearViewed);
  const initial = await saved(page);
  const places = [
    { id: "milano_la_scala_date_01", name: "スカラ座", cost: 2, photo: "la_scala.webp", emotion: "neutral" },
    { id: "milano_brera_date_01", name: "ブレラ絵画館", cost: 2, photo: "brera.webp", emotion: "smile" },
    { id: "milano_navigli_date_01", name: "ナヴィリオ地区", cost: 1, photo: "navigli.webp", emotion: "smile" },
  ];
  for (const place of places) {
    const event = await findDateOption(page, place.id);
    await expect(event.getByRole("button")).toContainText(place.name);
    // The name is the action, not repeated as a large title and another button.
    await expect(event.getByRole("button")).toHaveCount(1);
    const before = await saved(page);
    await startEvent(page, place.id, place.cost);
    const active = await saved(page);
    expect(availableAp(active)).toBe(availableAp(before) - place.cost);
    const scene = page.getByTestId("romance-scene");
    await expect(scene.getByTestId("date-destination")).toHaveText(`ミラノ ／ ${place.name}`);
    // A licensed photo identifies the place; neutral remains the failure fallback.
    const background = scene.locator(".canal-scene");
    await expect(background).toHaveAttribute("data-fallback", "neutral");
    await expect(background.locator("svg")).toHaveCount(0);
    const photo = background.locator("img");
    await expect(photo).toHaveAttribute("src", new RegExp(`${place.photo.replace(".", "\\.")}$`));
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 640 });
      await expectNoOverflow(page);
      await expect(scene.getByTestId("date-destination")).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${place.id}-${width}.png`) });
    }
    await page.reload();
    expect(await saved(page)).toEqual(active);
    await expect(scene.getByTestId("date-destination")).toHaveText(`ミラノ ／ ${place.name}`);
    await setDialogueSpeed(page, "0");
    await choose(page, 0);
    expect((await saved(page)).activeDate?.frame.emotion).toBe(place.emotion);
    const portrait = scene.locator(".vn-character img");
    await expect(portrait).toHaveAttribute("src", new RegExp(`/default_01/standing_01/${place.emotion}\\.png$`));
    const selected = await saved(page);
    await page.reload();
    expect(await saved(page)).toEqual(selected);
    await expect(portrait).toHaveAttribute("src", new RegExp(`/default_01/standing_01/${place.emotion}\\.png$`));
    await choose(page, 1);
    await finishEvent(page, 2);
    const finished = await saved(page);
    expect(finished.playedDateIds).toContain(place.id);
    expect(finished.memories.length).toBe(before.memories.length + 2);
    expect(finished.endingReached).toBe(true);
    await expect(page.getByTestId(`event-${place.id}`)).toHaveCount(0);
    await page.reload();
    expect(await saved(page)).toEqual(finished);
  }
  const final = await saved(page);
  expect(final.completedEpisodeIds).toEqual(initial.completedEpisodeIds);
  expect(final.completedCityIds).toEqual(initial.completedCityIds);
  expect(final.battleRecords).toEqual(initial.battleRecords);
  expect(final.confessionStatus).toBe(initial.confessionStatus);
  expect(availableAp(final)).toBe(availableAp(initial) - 5);
});
