import { expect, test, type Locator, type Page } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import catalog from "../../content/romance/date_catalog.json" with { type: "json" };
import destinations from "../../content/romance/date_destinations.json" with { type: "json" };
import castleCleared from "../fixtures/castle-clear-unplayed.json" with { type: "json" };
import { choose, expectNoOverflow, findDateOption, finishCafe, loadSnapshot, revealDialogueControl, saved, startCafe, startNewGame } from "./helpers";
import { setEvidence } from "./reasoning-helpers";

test.use({ reducedMotion: "reduce" });

// Playwright's click and toBeVisible do not prove a control fits on screen:
// clicks can silently scroll it into view. Check clipping ancestors as well.
async function expectOnScreen(target: Locator) {
  await expect(target).toBeVisible();
  expect(await target.evaluate((element) => {
    const box = element.getBoundingClientRect();
    if (box.left < -1 || box.top < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1) return false;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const css = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(css.overflowY) && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1)) return false;
      if (/(auto|scroll|hidden|clip)/.test(css.overflowX) && (box.left < bounds.left - 1 || box.right > bounds.right + 1)) return false;
    }
    return true;
  })).toBe(true);
}

async function checkDatePool(page: Page) {
  // Older saves remain in their original format until the first write. The UI
  // works from the migrated state and may offer a revised scene once.
  const { state, visibleIds, updatedIds } = await page.evaluate(async ({ snapshot, ids }) => {
    const modulePath = "/src/domain/game.ts";
    const domain = await import(/* @vite-ignore */ modulePath);
    const migrated = domain.validateGameState(snapshot);
    return {
      state: migrated,
      visibleIds: ids.filter((id) => domain.isEventVisible(migrated, id)),
      updatedIds: ids.filter((id) => domain.isUpdatedDateReplay(migrated, id)),
    };
  }, { snapshot: await saved(page), ids: catalog.dates.map((date) => date.id) });
  const visible = catalog.dates.filter((date) =>
    visibleIds.includes(date.id) &&
    (date.kind === "normal" || !state.playedDateIds.includes(date.id) || date.repeatable));
  const ordinary = visible.filter((date) => date.kind === "normal");
  const items = [
    ...visible.filter((date) => date.kind !== "normal"),
    ...ordinary.filter((date) => !updatedIds.includes(date.id)),
    ...ordinary.filter((date) => updatedIds.includes(date.id)),
  ];
  const count = Math.ceil(items.length / 5);
  const list = page.locator(".date-list");
  const nav = page.getByRole("navigation", { name: "デート候補のページ" });
  for (let pageIndex = 0; pageIndex < count; pageIndex++) {
    const pageItems = items.slice(pageIndex * 5, pageIndex * 5 + 5);
    await list.evaluate((node) => node.scrollIntoView({ block: "start" }));
    await expect(list.locator(".date-card")).toHaveCount(pageItems.length);
    for (const date of pageItems) {
      const row = page.getByTestId(`event-${date.id}`);
      const button = row.getByRole("button");
      const destination = "destinationId" in date ? destinations.destinations.find((item) => item.id === date.destinationId) : undefined;
      await expect(button).toContainText(destination?.nameJa ?? date.titleJa);
      const cost = updatedIds.includes(date.id) ? 0 : date.apCost;
      await expect(button).toContainText(cost ? `${cost} AP` : "AP不要");
      if (await button.isEnabled()) await expect(row.locator(".event-description")).toBeVisible();
      else await expect(row.getByRole("status")).not.toBeEmpty();
      const size = (await button.boundingBox())!;
      expect(size.height).toBeGreaterThanOrEqual(44);
      expect(size.y).toBeGreaterThanOrEqual(0);
      expect(size.y + size.height).toBeLessThanOrEqual(640);
    }
    expect((await list.boundingBox())!.height).toBeLessThanOrEqual(520);
    await expectNoOverflow(page);
    if (count > 1) {
      await expectOnScreen(nav);
      await expect(nav).toContainText(`${pageIndex + 1} / ${count}`);
      const next = nav.getByRole("button", { name: "次の候補" });
      if (pageIndex < count - 1) {
        await next.focus();
        await page.keyboard.press("Enter");
        await expect(next).toBeFocused();
      } else await expect(next).toBeDisabled();
    }
  }
  if (count > 1) {
    const previous = nav.getByRole("button", { name: "前の候補" });
    await expect(previous).toBeEnabled();
    await previous.focus();
    await page.keyboard.press("Enter");
    await expect(previous).toBeFocused();
    await expect(nav).toContainText(`${count - 1} / ${count}`);
  }
}

for (const width of [320, 360]) {
  test(`available date choices are comparable on a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await loadSnapshot(page, phase6.freeTime);
    await checkDatePool(page);
    await expect((await findDateOption(page, "milano_cafe_01")).getByRole("button")).toBeEnabled();
    await expect((await findDateOption(page, "milano_brera_date_01")).getByRole("button")).toBeEnabled();
    const before = await saved(page);
    await (await findDateOption(page, "milano_cafe_01")).getByRole("button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect((await saved(page)).ap).toBe(before.ap);
    await page.getByRole("button", { name: "APを使って始める", exact: true }).click();
    expect((await saved(page)).activeDate?.dateId).toBe("milano_cafe_01");
  });

  test(`the full destination pool remains compact on a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    // Produced by real domain transitions: four episodes, A/B/C battles, no dates.
    await loadSnapshot(page, castleCleared);
    await checkDatePool(page);
  });
}

test("date availability and explanations remain understandable when AP runs out", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, { ...phase6.freeTime, ap: 0 });
  const cafe = page.getByTestId("event-milano_cafe_01");
  await expect(cafe.getByRole("button")).toBeDisabled();
  await expect(cafe.getByRole("status")).toContainText("AP");
  await expectNoOverflow(page);
});

test("playing a date updates the compact choices without losing progression", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.freeTime);
  await startCafe(page);
  await choose(page, 0);
  await choose(page, 1);
  await finishCafe(page);
  const after = await saved(page);
  expect(after.playedDateIds).toContain("milano_cafe_01");
  await expect((await findDateOption(page, "milano_walk_01")).getByRole("button")).toBeEnabled();
  await expect(page.getByTestId("event-milano_cafe_01")).toHaveCount(0);
  await expectNoOverflow(page);
});

test("the next episode's main action is visible on entry", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  const start = page.getByTestId("episode-start");
  await expectOnScreen(start);
  await start.click();
  expect((await saved(page)).activeTourism).not.toBeNull();
});

test("revisit choices are concise and keep tourism and battle routes working", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.freeTime);
  await page.getByText("旅先を再訪する", { exact: true }).click();
  const panel = page.locator(".revisit-menu");
  await expect(panel.getByRole("heading", { name: "観光・観察" })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "クイズバトル" })).toBeVisible();
  // Unencountered story battles are presented in the route before they can be replayed.
  await expect(panel.getByRole("heading", { name: "特別対決" })).toHaveCount(0);
  for (const row of await panel.locator(".revisit-list li").all()) {
    const button = row.getByRole("button");
    await expect(button).toBeEnabled();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(112);
  }
  await expectNoOverflow(page);
  await page.getByTestId("revisit-tourism-last_supper").click();
  expect((await saved(page)).activeTourism?.landmarkId).toBe("last_supper");
});

test("observation list exposes points, documents and return actions together", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.exploring);
  await page.getByRole("button", { name: "発見ポイント・資料を見る", exact: true }).click();
  const panel = page.locator(".observation-notes");
  expect(await page.getByTestId("observation-viewport").evaluate((node) => Boolean(node.closest("[inert]")))).toBe(true);
  for (const id of ["last_supper_perspective", "last_supper_apostle_groups", "last_supper_light", "last_supper_doorway", "last_supper_technique_card"]) {
    await expectOnScreen(page.getByTestId(`discovery-${id}`));
  }
  await expectOnScreen(page.getByTestId("guide-replay"));
  await expectOnScreen(panel.locator(".tourism-credits summary"));
  await expect(panel.getByRole("button", { name: "一覧に戻る", exact: true })).toHaveCount(0);
  await page.getByTestId("discovery-last_supper_technique_card").click();
  await expect(page.getByTestId("discovery-detail")).toBeVisible();
  expect((await saved(page)).discoveredClueIds).toContain("last_supper_technique_card");
  await page.keyboard.press("Escape");
  const opener = page.getByRole("button", { name: "発見ポイント・資料を見る", exact: true });
  await expect(opener).toBeFocused();
  await opener.click();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "設定" });
  await expect(settings).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("display settings are separate touchable rows and persist", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.guide);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "設定" });
  const rows = dialog.locator(".translation-setting");
  await expect(rows).toHaveCount(2);
  let previousBottom = 0;
  for (const row of await rows.all()) {
    await expectOnScreen(row);
    const rect = (await row.boundingBox())!;
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(rect.y).toBeGreaterThanOrEqual(previousBottom - 1);
    previousBottom = rect.y + rect.height;
  }
  const toggle = dialog.getByLabel("常に日本語訳を表示する");
  await toggle.check();
  await page.reload();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await expect(page.getByLabel("常に日本語訳を表示する")).toBeChecked();
});

test("battle question keeps all options usable without an accidental answer", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.battleQuestion);
  for (const id of ["A", "B", "C"]) {
    await expectOnScreen(page.getByTestId(`option-text-${id}`));
    await expectOnScreen(page.getByTestId(`answer-${id}`));
    await expectOnScreen(page.getByRole("button", { name: `選択肢${id}の訳を見る`, exact: true }));
  }
  const before = await saved(page);
  await page.getByRole("button", { name: "すべての訳を見る", exact: true }).click();
  expect((await saved(page)).activeBattle?.answers).toEqual(before.activeBattle?.answers);
  for (const id of ["A", "B", "C"]) {
    const answer = page.getByTestId(`answer-${id}`);
    await answer.scrollIntoViewIfNeeded();
    await expect(answer).toBeVisible();
    await expect(answer).toBeEnabled();
  }
});

test("dialogue log text stays legible against its actual dialog background", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.guide);
  const button = page.getByTestId("tourism-guide").getByRole("button", { name: "会話ログ" });
  await revealDialogueControl(page, button);
  const before = await saved(page);
  await button.click();
  const dialog = page.getByRole("dialog", { name: "会話ログ" });
  const line = dialog.locator(".vn-log p").first();
  await expect(line).toBeVisible();
  const contrast = await line.evaluate((element) => {
    const color = getComputedStyle(element).color;
    const background = getComputedStyle(element.closest("dialog")!).backgroundColor;
    const channels = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (value: string) => {
      const [r, g, b] = channels(value).map((channel) => {
        const c = channel / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const a = luminance(color), b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(await saved(page)).toEqual(before);
});

for (const [format, snapshot, selectedSnapshot] of [["B", phase6.B_reasoning, phase6.B_selected], ["C", phase6.C_reasoning, phase6.C_selected]] as const) {
  test(`${format} reasoning keeps the claim and evidence operations visible`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await loadSnapshot(page, snapshot);
    await expectOnScreen(page.locator(".reasoning-claim"));
    await expectOnScreen(page.getByTestId("reasoning-notebook"));
    await expectOnScreen(page.getByTestId("reasoning-submit"));
    if (format === "B") await expectOnScreen(page.getByTestId("reasoning-press"));
    await expectNoOverflow(page);
  });
  test(`${format} reasoning keeps the evidence submit action visible after selection`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await loadSnapshot(page, selectedSnapshot);
    if (format === "C") await setEvidence(page, ["last_supper_apostle_groups", "last_supper_perspective"]);
    const submit = page.getByTestId("reasoning-submit");
    await expectOnScreen(submit);
    await expect(submit).toBeEnabled();
    await submit.click();
    expect((await saved(page)).activeBattle?.reasoning?.status).toBe("accepted");
  });
}

test("English notebook compares answers one question at a time and preserves a review mark", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.result);
  const before = await saved(page);
  await page.getByRole("button", { name: "回答した問題を振り返る" }).click();
  const dialog = page.getByRole("dialog", { name: "英語ノート" });
  const picker = dialog.locator("#review-question-picker");
  await expect(picker.locator("option")).toHaveCount(4);
  await picker.selectOption({ index: 1 });
  const firstQuestion = await dialog.getByTestId("review-question").locator("h3").first().innerText();
  await expect(dialog.getByRole("button", { name: "問題文の訳を閉じる" })).toBeVisible();
  await dialog.getByRole("button", { name: "次の問題", exact: true }).click();
  const secondQuestion = await dialog.getByTestId("review-question").locator("h3").first().innerText();
  expect(secondQuestion).not.toBe(firstQuestion);
  await dialog.getByRole("button", { name: "あとで復習する", exact: true }).click();
  await dialog.getByLabel("復習に登録した問題だけ見る").check();
  await expect(picker.locator("option")).toHaveCount(2);
  await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "回答した問題を振り返る" }).click();
  await page.getByLabel("復習に登録した問題だけ見る").check();
  await expect(page.locator("#review-question-picker option")).toHaveCount(2);
  expect(await saved(page)).toEqual(before);
});
