import { debugQueryString } from "../../src/dev/debug-query";
import { describeRelationshipChange, relationshipChange } from "../../src/domain/relationship-change";
import { test as base, bothStorages, debugGame, expect, ops, placeSave, playUntil, tier, type Locator, type Page } from "./helpers";

// Debug's flags and 街歩き's clock (2026-11-15 user request 「〜〜のフラグを得たことにする」「自由時間を指定する」; the player-facing
// name is 「街歩き」 since 2026-11-16) and 恋の段階 (2026-11-16): 場面の確認 opens 街歩き (scene=free) at a chosen time with flags,
// any scene at a chosen 恋の段階, and the Debug bar's 「フラグ・時刻・段階・人」 changes them in the running Debug game. Lane 3
// (docs/10): development server only, never a save/resume check.
// Every test starts next to a normal saved game and ends with both browser storages exactly as before (Debug never changes
// the player's data).
const test = base.extend<{ normalStorageUnchanged: void }>({
  normalStorageUnchanged: [async ({ page }, use) => {
    await page.goto("/");
    await placeSave(page, "milano", "newJourney", "milano", ["航", "澪"]);
    const before = await bothStorages(page);
    await use();
    expect(await bothStorages(page), "Debug changed the normal browser storage").toEqual(before);
  }, { auto: true }],
});

// Long flows: each loads the app twice on the development server and plays (docs/10「不安定さと時間の決まり」).
test.describe.configure({ timeout: 120_000 });

/** The 「行く」 of Milan's night-only date at the Navigli (its start window 18:00–22:00), chosen among the place's events. */
async function nightDateGo(page: Page): Promise<Locator> {
  const card = await ops.selectDestination(page, "p_navigli");
  const choice = card.getByTestId("event-choice-milano_night_01");
  if (await choice.count()) await choice.click();
  return ops.wayButton(card, "milano_night_01");
}

/** The Debug bar's 「フラグ・時刻・段階・人」. */
async function openEdit(page: Page): Promise<Locator> {
  await page.getByTestId("debug-edit-open").click();
  const dialog = page.getByRole("dialog", { name: "フラグ・時刻・段階・人" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("場面の確認 opens Milan's 街歩き at night with a flag, its URL says so, and the bar's 朝 closes the night-only date", { tag: tier.debug }, async ({ page }) => {
  await page.goto("/?debug");
  await ops.debugShown(page.getByTestId("debug-panel"));
  await page.getByTestId("debug-city").selectOption("milano");
  await page.getByTestId("debug-scene").selectOption("free");
  await expect(page.getByTestId("debug-target")).toHaveValue("p_hotel");
  await page.getByTestId("debug-clock-1140").click();
  await expect(page.getByTestId("debug-clock-1140")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("debug-time")).toHaveValue("19:00");
  await page.getByTestId("debug-flags").locator("summary").click();
  await page.getByTestId("debug-flag-milano_tino_needs_pick").check();
  await expect(page.getByTestId("debug-url")).toHaveValue(/\?debug&city=milano&scene=free&target=p_hotel&.*&time=19:00&flags=milano_tino_needs_pick$/u);
  await page.getByRole("button", { name: "この場面を開く" }).click();
  await ops.debugShown(page.getByTestId("debug-session"));
  await expect(page.getByTestId("debug-place")).toContainText("（1日目 19:00）");
  await expect.poll(async () => (await debugGame(page))?.travel.minute).toBe(19 * 60);
  expect((await debugGame(page))!.storyProgress.flags).toContain("milano_tino_needs_pick");
  await expect(await nightDateGo(page)).toBeEnabled();

  // 朝 puts the clock at 9:00 at once (memory only); the night-only date waits for the night again.
  const dialog = await openEdit(page);
  await expect(dialog.getByTestId("debug-edit-clock")).toContainText("19:00");
  await dialog.getByTestId("debug-clock-540").click();
  await expect(dialog.getByTestId("debug-edit-clock")).toContainText("09:00");
  await expect(dialog.getByTestId("debug-clock-540")).toHaveAttribute("aria-pressed", "true");
  await dialog.getByTestId("debug-edit-close").click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await debugGame(page))?.travel.minute).toBe(9 * 60);
  await expect(await nightDateGo(page)).toBeDisabled();
});

test("the bar's 「フラグ・時刻・段階・人」 sets a flag that a hotel scene reads, and changes nothing while that scene is open", { tag: tier.debug }, async ({ page }) => {
  await page.goto(`/${debugQueryString({ dataMode: "real", cityId: "delhi", scene: "free", progress: "initial" })}`);
  await ops.debugShown(page.getByTestId("debug-session"));
  let dialog = await openEdit(page);
  await expect(dialog.getByTestId("debug-edit-refusal")).toHaveCount(0);
  await dialog.getByTestId("debug-flag-gt_delhi_golgappa_sick").check();
  await expect.poll(async () => (await debugGame(page))?.storyProgress.flags).toEqual(["gt_delhi_golgappa_sick"]);
  await dialog.getByTestId("debug-edit-close").click();

  // 休む: the morning's scene `# when: flag gt_delhi_golgappa_sick` plays (without the flag the next morning comes at once). The
  // night's 「ホテルで休みました。」 card waits for a tap over it (2026-11-15), as a player reads it.
  await ops.sleep(page);
  await ops.settled(page);
  await expect.poll(async () => (await debugGame(page))?.activeEncounter?.encounterId, { timeout: 15_000 }).toBe("gt_delhi_hotel_sick_morning");
  dialog = await openEdit(page);
  await expect(dialog.getByTestId("debug-edit-refusal")).toContainText("場面の途中なので変えられません");
  await expect(dialog.getByTestId("debug-flag-gt_delhi_golgappa_sick")).toBeChecked();
  await expect(dialog.getByTestId("debug-flag-gt_delhi_golgappa_sick")).toBeDisabled();
  await expect(dialog.getByTestId("debug-clock-1140")).toBeDisabled();
  await dialog.getByTestId("debug-edit-close").click();
  expect((await debugGame(page))!.activeEncounter?.encounterId).toBe("gt_delhi_hotel_sick_morning");
});

test("恋の段階 2 offers Agra's rooftop confession (the journey's first) at night, from 場面の確認 and from the bar, and stage 1 does not", { tag: tier.debug }, async ({ page }) => {
  // The confession: `# when: episodes agra >= 1`, `not couple`, `time night`, and its catalog's minRomanceStage 2. Debug's
  // cleared Agra opens its epilogue at once (India goes on to Jaipur after it), so the Taj Mahal's quiz is played from the start.
  await page.goto("/?debug");
  await ops.debugShown(page.getByTestId("debug-panel"));
  await page.getByTestId("debug-city").selectOption("agra");
  await page.getByTestId("debug-scene").selectOption("battle");
  await page.getByTestId("debug-target").selectOption("gt_agra_main_taj_mahal_battle");
  await page.getByTestId("debug-progress").selectOption("initial");
  await expect(page.getByTestId("debug-url")).not.toHaveValue(/stage=/u);
  await page.getByTestId("debug-stage").selectOption("2");
  await expect(page.getByTestId("debug-url")).toHaveValue(/&spark=0&stage=2&roll=positive$/u);
  await page.getByRole("button", { name: "この場面を開く" }).click();
  await ops.debugShown(page.getByTestId("debug-session"));
  expect((await debugGame(page))!.romanceStage).toBe(2);

  await playUntil(page, (state) => state.activeBattle?.phase === "result", { source: debugGame });
  await page.getByRole("button", { name: "街歩きへ進む", exact: true }).click();
  const free = await playUntil(page, (state) => !state.activeBattle && !state.activeEncounter && !state.occasion, { source: debugGame });
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(free.completedEpisodeIds).toContain("gt_agra_main_taj_mahal");

  // Offered: the hotel's card in free time's row, with the date and its 「行く」.
  const hotel = page.getByTestId("travel-menu").getByTestId("travel-place-agra_hotel_hub");
  const offered = async () => {
    const card = await ops.selectDestination(page, "agra_hotel_hub");
    await expect(card.getByTestId("place-event-gt_agra_date_confession")).toBeVisible();
    await expect(ops.wayButton(card, "gt_agra_date_confession")).toBeEnabled();
  };
  let dialog = await openEdit(page);
  await expect(dialog.getByTestId("debug-edit-stage-2")).toHaveAttribute("aria-pressed", "true");
  await dialog.getByTestId("debug-clock-1140").click();
  await expect(dialog.getByTestId("debug-edit-clock")).toContainText("19:00");
  await dialog.getByTestId("debug-edit-close").click();
  await offered();

  // 1 from the bar: the confession leaves the row; nothing else changes (the relationship values stay).
  dialog = await openEdit(page);
  await dialog.getByTestId("debug-edit-stage-1").click();
  await expect(dialog.getByTestId("debug-edit-stage-1")).toHaveAttribute("aria-pressed", "true");
  await dialog.getByTestId("debug-edit-close").click();
  expect(await debugGame(page)).toMatchObject({ romanceStage: 1, affection: free.affection, trust: free.trust, spark: free.spark, travel: { minute: 19 * 60 } });
  await expect(hotel).toHaveCount(0);

  // 2 again.
  dialog = await openEdit(page);
  await dialog.getByTestId("debug-edit-stage-2").click();
  await expect(dialog.getByTestId("debug-edit-stage-2")).toHaveAttribute("aria-pressed", "true");
  await dialog.getByTestId("debug-edit-close").click();
  await offered();
});

// 撮影の形 (2026-11-16): screenshots that look like play, Debug staying on. A launch URL's shot=1 turns it on for the page only
// (nothing is stored), so turning it off in ゲームの設定 removes no key either: the browser storage stays as it was.
test("shot=1 opens a date without Debug's bar, candidates and strip; turned off in ゲームの設定, they show, with the reply's change", { tag: tier.debug }, async ({ page }) => {
  await page.goto(`/${debugQueryString({ dataMode: "real", cityId: "milano", scene: "date", target: "milano_brera_date_01", shot: true })}`);
  const session = page.getByTestId("debug-session");
  await ops.debugShown(session);
  await expect(session).toHaveAttribute("data-shot", "true");
  const strip = page.getByTestId("relationship-change");
  const marks = [page.locator(".debug-session-bar"), page.getByTestId("debug-candidates"), page.getByRole("status", { name: "Debug：関係の変化" })];
  for (const mark of marks) await expect(mark).toHaveCount(0);
  expect(page.url()).toMatch(/&shot=1$/u);

  // A reply that moves the relationship (ticket 0: a positive reaction): followed, not shown.
  const before = await playUntil(page, (state) => !!state.activeDate?.frame.choices.length, { source: debugGame });
  await page.getByTestId("date-choice").first().click();
  await expect.poll(async () => (await debugGame(page))?.revision).toBe(before.revision + 1);
  const change = relationshipChange(before, (await debugGame(page))!);
  expect(change?.axes.length).toBeGreaterThan(0);
  await expect(page.getByTestId("romance-scene")).toBeVisible();
  await expect(strip).toHaveCount(0);

  // ゲームの設定 → 制作者向け (open in Debug) → 撮影の形: off shows the bar, the candidates and this reply's change at once.
  const settings = await ops.openSettings(page);
  const shot = settings.getByTestId("debug-shot");
  await expect(shot).toBeChecked();
  await expect(settings.getByTestId("debug-shot-setting").getByRole("heading", { name: "撮影の形（Debug）" })).toBeVisible();
  await settings.getByLabel("Debugの表示を隠す").uncheck();
  await ops.closeDialog(settings);
  await expect(session).not.toHaveAttribute("data-shot");
  await expect(page.locator(".debug-session-bar")).toBeVisible();
  await expect(page.getByTestId("debug-candidates")).toBeVisible();
  await expect(strip).toBeVisible();
  expect(await strip.locator("p").allTextContents()).toEqual(describeRelationshipChange(change!));
  expect(page.url()).not.toContain("shot=");

  // 場面の確認 has the same setting: on, the scene's URL opens with it; off again leaves the storage as it was.
  await ops.backToDebugSettings(page);
  const panelShot = page.getByTestId("debug-panel").getByTestId("debug-shot");
  await expect(panelShot).not.toBeChecked();
  await panelShot.check();
  await expect(page.getByTestId("debug-url")).toHaveValue(/&shot=1$/u);
  await panelShot.uncheck();
  await expect(page.getByTestId("debug-url")).not.toHaveValue(/shot=/u);
});

test("the bar's 「フラグ・時刻・段階・人」 meets a person and takes them back (2026-11-27)", { tag: tier.debug }, async ({ page }) => {
  await page.goto(`/${debugQueryString({ dataMode: "real", cityId: "delhi", scene: "free", progress: "initial" })}`);
  await ops.debugShown(page.getByTestId("debug-session"));
  const dialog = await openEdit(page);
  const monu = dialog.getByTestId("debug-met-gt_monu");
  await expect(monu).not.toBeChecked();
  await monu.check();
  await expect(monu).toBeChecked();
  await expect.poll(async () => (await debugGame(page))?.debugMetIds).toEqual(["gt_monu"]);
  expect((await debugGame(page))!.metTimes?.map((item) => item.id)).toContain("gt_monu");
  await monu.uncheck();
  await expect.poll(async () => (await debugGame(page))?.debugMetIds).toBeUndefined();
  await dialog.getByTestId("debug-edit-close").click();
  await expect(dialog).toHaveCount(0);
});
