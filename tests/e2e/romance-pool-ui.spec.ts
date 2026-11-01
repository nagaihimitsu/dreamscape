import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import castleCleared from "../fixtures/castle-clear-unplayed.json" with { type: "json" };
import galleriaStage2 from "../fixtures/galleria-stage2-pool.json" with { type: "json" };
import { choose, expectNoOverflow, findDateOption, finishEvent, loadSnapshot, saved, setDialogueSpeed, startEvent } from "./helpers";

test.beforeEach(async ({ page }) => { await installRomanceRolls(page, [0, 0, 5000, 0]); });

test.use({ reducedMotion: "reduce", viewport: { width: 360, height: 640 } });

for (const width of [320, 360]) {
  test(`invitations, a time-limited event and places share a compact pool at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    // Actual game transitions: two episodes completed and one date played.
    await loadSnapshot(page, galleriaStage2);
    const initial = await saved(page);
    const list = page.locator(".date-list");
    await list.evaluate((node) => node.scrollIntoView({ block: "start" }));
    await expect(list.locator(".date-card")).toHaveCount(5);
    await expect(page.getByTestId("event-milano_invitation_01").locator(".event-context")).toHaveText("りえからのお誘い");
    await expect(page.getByTestId("event-milano_confession_01").locator(".event-context")).toHaveText("大切な話");
    await expect(page.getByTestId("event-milano_rain_pause_01").locator(".event-context")).toHaveText("今だけの出来事");
    expect((await list.boundingBox())!.height).toBeLessThanOrEqual(520);
    const nav = page.getByRole("navigation", { name: "デート候補のページ" });
    await expect(nav).toContainText("1 / 2");
    const next = nav.getByRole("button", { name: "次の候補" });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(next).toBeFocused();
    await expect(nav).toContainText("2 / 2");
    const scala = await findDateOption(page, "milano_la_scala_date_01");
    await expect(scala.getByRole("button")).toBeVisible();
    expect((await scala.getByRole("button").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expectNoOverflow(page);
    expect(await saved(page)).toEqual(initial);
  });
}

test("a date on the final page can be played and the smaller pool remains navigable", async ({ page }) => {
  await loadSnapshot(page, castleCleared);
  const nav = page.getByRole("navigation", { name: "デート候補のページ" });
  const date = await findDateOption(page, "milano_love_date_01");
  await expect(date.getByRole("button")).toContainText("L.O.V.E.");
  await expect(nav).toContainText("3 / 3");
  await expect(nav.getByRole("button", { name: "次の候補" })).toBeDisabled();
  await startEvent(page, "milano_love_date_01", 1);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  await choose(page, 1);
  await finishEvent(page, 2);
  expect((await saved(page)).playedDateIds).toContain("milano_love_date_01");
  await expect(nav).toContainText(/1 \/ [2-9]/);
  await expectNoOverflow(page);
  await expect(await findDateOption(page, "milano_love_date_01")).toHaveCount(0);
  const pageText = await nav.locator("span").innerText();
  const [current, total] = pageText.split(" / ").map(Number);
  expect(current).toBe(total);
  await expect(nav.getByRole("button", { name: "次の候補" })).toBeDisabled();
});

test("a rejected confession leaves the journey open and requires another experience before retry", async ({ page }) => {
  await loadSnapshot(page, castleCleared);
  await startEvent(page, "milano_cafe_01", 2);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  await choose(page, 0);
  await finishEvent(page, 2);
  await startEvent(page, "milano_confession_01", 0);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  await finishEvent(page, 1);
  const rejected = await saved(page);
  expect(rejected.confessionStatus).toBe("rejected");
  expect(rejected.endingReached).toBe(false);
  await expect(page.getByRole("status").filter({ hasText: "恋人として付き合えない" })).toBeVisible();
  const confession = page.getByTestId("event-milano_confession_01");
  await expect(confession.getByRole("button")).toBeDisabled();
  await expect(confession.getByRole("status")).toContainText("新しいひとときを");
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await startEvent(page, "milano_walk_01", 3);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  await choose(page, 1);
  await finishEvent(page, 2);
  await expect(page.getByTestId("event-milano_confession_01").getByRole("button")).toBeEnabled();
  expect((await saved(page)).confessionStatus).toBe("rejected");
  await expectNoOverflow(page);
});
