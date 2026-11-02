import { expect, test } from "@playwright/test";
import { expectNoOverflow, loadCurrentGalleriaFreeTime, loadCurrentCompletedFreeTime, saved, setDialogueSpeed, startNewGame } from "./helpers";

test("visited places show only their own encounters and resume the same place after reload", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 780 });
  await startNewGame(page);
  await loadCurrentGalleriaFreeTime(page);
  await page.getByText("旅先を再訪する", { exact: true }).click();
  await expect(page.getByTestId("revisit-tourism-duomo_milano")).toBeVisible();
  await expect(page.getByTestId("revisit-tourism-galleria_vittorio_emanuele_ii")).toBeVisible();
  await expect(page.getByTestId("revisit-tourism-la_scala_case")).toHaveCount(0);
  await expect(page.getByTestId("revisit-tourism-brera_case")).toHaveCount(0);
  const place = page.getByTestId("revisit-place-duomo_milano");
  await place.click();
  const panel = page.getByRole("region", { name: "ミラノ大聖堂（ドゥオモ）で過ごす" });
  await expect(panel.getByText("切れた三本目", { exact: true })).toBeVisible();
  await expect(page.getByText("版の実演", { exact: true })).toHaveCount(0);
  await expectNoOverflow(page);
  await panel.getByRole("button", { name: /行く/ }).click();
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  await page.reload();
  await setDialogueSpeed(page, "0");
  for (let turn = 0; turn < 40; turn++) {
    const state = await saved(page);
    const encounter = state.activeEncounter;
    if (!encounter) break;
    if (encounter.frame.choices.length) await page.getByRole("button", { name: "Cを選ぶ" }).click();
    else if (encounter.frame.ended) await page.getByRole("button", { name: /自由時間へ/ }).click();
    else await page.getByRole("button", { name: "続きを読む", exact: true }).click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  expect((await saved(page)).activeEncounter).toBeNull();
  await expect(place).toHaveAttribute("aria-expanded", "true");
  await expect(place).toBeFocused();
  await expect(panel).toBeVisible();
  await expectNoOverflow(page);
});

test("only current completed special battles unlock their places without observation", async ({ page }) => {
  await startNewGame(page);
  await loadCurrentGalleriaFreeTime(page);
  await page.getByText("旅先を再訪する", { exact: true }).click();
  await expect(page.getByTestId("revisit-tourism-la_scala_case")).toHaveCount(0);
  await expect(page.getByTestId("revisit-tourism-brera_case")).toHaveCount(0);

  await loadCurrentCompletedFreeTime(page);
  await page.getByText("旅先を再訪する", { exact: true }).click();
  await expect(page.getByTestId("revisit-tourism-la_scala_case")).toBeVisible();
  await expect(page.getByTestId("revisit-tourism-brera_case")).toBeVisible();
});

test("a completed Galleria save retains access to the fortune encounter", async ({ page }) => {
  await startNewGame(page);
  await loadCurrentGalleriaFreeTime(page);
  expect((await saved(page)).completedEpisodeIds).toContain("milano_galleria_episode");
  expect((await saved(page)).battleRecords.some((record) => record.battleId === "milano_galleria_01")).toBe(true);
  await page.getByText("旅先を再訪する", { exact: true }).click();
  await page.getByTestId("revisit-place-galleria_vittorio_emanuele_ii").click();
  const place = page.getByRole("region", { name: /ガッレリアで過ごす$/ });
  await place.getByRole("button", { name: /行く\s*：回らない願掛け/ }).click();
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  expect((await saved(page)).activeEncounter?.encounterId).toBe("galleria_fortune");
});
