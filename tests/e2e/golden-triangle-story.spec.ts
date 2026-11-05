import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { GameState } from "../../src/domain/game";
import type { QuizDefinition } from "../../src/content/schemas";
import battles from "../../content/battles/catalog.json" with { type: "json" };
import type { TravelCatalog } from "../../src/content/travel-schemas";
import { advanceDialogue, expectNoOverflow, setDialogueSpeed } from "./helpers";
import { finishCityArrival } from "./city-arrival-helpers";

const key = "dreamscape.journey.golden_triangle.save.v1";
const cities = ["delhi", "agra", "jaipur"] as const;
const catalogs = Object.fromEntries(cities.map((city) => [city,
  JSON.parse(fs.readFileSync(path.join("content/travel", `${city}.json`), "utf8")) as TravelCatalog]));
const quiz = (id: string): QuizDefinition => JSON.parse(fs.readFileSync(path.join("content/quizzes", `${id}.json`), "utf8"));
const state = (page: Page): Promise<GameState> => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);

test.use({ reducedMotion: "reduce" });

async function reloadIndia(page: Page) {
  const before = await state(page);
  await page.reload();
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await expect.poll(() => state(page)).toEqual(before);
}

async function rest(page: Page) {
  await expect(page.getByTestId("travel-transition")).toHaveCount(0);
  await expect(page.getByTestId("time-passage")).toHaveCount(0);
  const before = await state(page);
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  const dialog = page.getByRole("dialog", { name: "滞在先で休む", exact: true });
  const routes = dialog.locator("button.travel-route:enabled");
  await expect(routes.first()).toBeVisible();
  await routes.first().click();
  await expect.poll(async () => (await state(page)).travel.day).toBe(before.travel.day + 1);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expect(page.getByTestId("travel-transition")).toHaveCount(0);
  await expect(page.getByTestId("time-passage")).toHaveCount(0);
}

async function travel(page: Page, eventId: string) {
  const city = (await state(page)).currentCityId;
  const event = catalogs[city].events.find((event) => event.id === eventId)!;
  expect(event, eventId).toBeTruthy();
  for (let attempt = 0; attempt < 32; attempt++) {
    await expect(page.getByTestId("travel-transition")).toHaveCount(0);
    await expect(page.getByTestId("time-passage")).toHaveCount(0);
    const before = await state(page);
    const destination = page.getByTestId(`travel-place-${event.placeId}`);
    if (!await destination.isVisible()) {
      const more = page.getByText("ほかの行き先を見る", { exact: true });
      if (await more.isVisible() && await more.locator("..").getAttribute("open") === null) await more.click();
    }
    await destination.getByRole("button").click();
    const eventChoice = page.getByTestId(`travel-event-${eventId}`);
    if (await eventChoice.isVisible() && await eventChoice.isEnabled()) await eventChoice.click();
    const routes = page.getByRole("dialog").locator("button.travel-route:enabled");
    const count = await routes.count();
    if (count) {
      const minutes = (await routes.allTextContents()).map((text) => Number(text.match(/(\d+)分/)?.[1] ?? Infinity));
      await routes.nth(minutes.indexOf(Math.min(...minutes))).click();
      await expect.poll(async () => (await state(page)).revision).toBeGreaterThan(before.revision);
    }
    const after = await state(page);
    if (after.revision > before.revision) {
      await expect(page.getByTestId("travel-transition")).toHaveCount(0);
      return;
    }
    const closedDay = await page.getByText("今日は休館日です。", { exact: true }).count() > 0;
    await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    if (closedDay || before.travel.minute >= 17 * 60) await rest(page);
    else {
      const wait = page.getByLabel("時間を進める", { exact: true });
      if (await wait.locator("..").getAttribute("open") === null) await wait.click();
      const nextOpening = page.getByRole("button", { name: /\d{2}:\d{2}まで待つ/ });
      const advance = await nextOpening.count() ? nextOpening : page.getByRole("button", { name: "30分待つ" });
      await advance.click();
      await expect.poll(async () => (await state(page)).revision).toBeGreaterThan(before.revision);
    }
  }
  throw new Error(`Could not reach ${eventId} within the available opening windows`);
}

async function readGuide(page: Page) {
  for (let line = 0; (await state(page)).activeTourism?.phase === "guide"; line++) {
    expect(line).toBeLessThan(45);
    await advanceDialogue(page, "tourism-advance");
  }
  await page.getByRole("button", { name: "進む", exact: true }).click();
}

async function playBattle(page: Page, quizId: string, screenshots: boolean) {
  const definition = quiz(quizId);
  for (let step = 0; step < 160; step++) {
    const before = await state(page);
    const active = before.activeBattle!;
    expect(active).toBeTruthy();
    if (active.phase === "result") return;
    if (active.phase === "dialogue") {
      if (screenshots && step === 0) {
        await expectNoOverflow(page);
        await page.screenshot({ path: `artifacts/golden-triangle-review/${before.currentCityId}-dialogue.png`, fullPage: true });
      }
      expect(active.frame?.speaker).not.toBe("player");
      await advanceDialogue(page, "battle-advance");
    } else if (active.phase === "question") {
      const question = definition.questions[active.roundIndex];
      await expect(page.getByTestId("battle-question")).toContainText(question.questionEn);
      if (screenshots && active.roundIndex === 0) {
        await expectNoOverflow(page);
        await page.screenshot({ path: `artifacts/golden-triangle-review/${before.currentCityId}-question.png`, fullPage: true });
        await reloadIndia(page);
      }
      await page.getByTestId(`answer-${question.correctOptionId}`).click();
    } else {
      await page.getByTestId("battle-advance").click();
    }
    await expect.poll(async () => (await state(page)).revision).toBeGreaterThan(before.revision);
  }
  throw new Error(`Battle did not end: ${quizId}`);
}

async function playDate(page: Page) {
  let choices = 0;
  for (let step = 0; step < 100; step++) {
    const before = await state(page);
    const active = before.activeDate;
    expect(active).toBeTruthy();
    expect(active!.frame.speaker).not.toBe("player");
    if (active!.frame.choices.length) {
      await expect(page.locator(".choice")).toHaveCount(3);
      await expect(page.locator(".choice").first()).toBeEnabled();
      if (choices === 0) {
        await page.setViewportSize({ width: 320, height: 740 });
        await expectNoOverflow(page);
        await page.screenshot({ path: `artifacts/golden-triangle-review/${before.currentCityId}-date-320.png`, fullPage: true });
        await page.setViewportSize({ width: 360, height: 780 });
      }
      await page.locator(".choice").nth(choices % 3).click();
      choices++;
      if (choices === 1) {
        await expect.poll(async () => (await state(page)).activeDate?.choiceCount).toBe(1);
        const chosen = await state(page);
        await reloadIndia(page);
        expect((await state(page)).activeDate?.frame).toEqual(chosen.activeDate?.frame);
        expect((await state(page)).ap).toBe(chosen.ap);
      }
    } else if (active!.frame.ended) {
      await page.getByRole("button", { name: "デートを終える", exact: true }).click();
      expect(choices).toBe(2);
      await expect(page.getByTestId("travel-menu")).toBeVisible();
      return;
    } else await advanceDialogue(page);
    await expect.poll(async () => (await state(page)).revision).toBeGreaterThan(before.revision);
  }
  throw new Error("Date did not end");
}

async function readEnding(page: Page) {
  let sawLocalSpeaker = false;
  const cityId = (await state(page)).currentCityId;
  for (let step = 0; step < 120; step++) {
    const before = await state(page);
    if (!before.activeEpilogue || before.activeEpilogue.kind === "arrival") {
      if (cityId === "agra" || cityId === "jaipur") expect(sawLocalSpeaker).toBe(true);
      return;
    }
    if (before.activeEpilogue.frame.speaker === "enemy") {
      const name = battles.battles.find((battle) => battle.id === `gt_${cityId}_finale_battle`)!.enemyNameJa;
      await expect(page.getByTestId("city-epilogue-screen").locator(".speaker")).toHaveText(name);
      if (!sawLocalSpeaker) {
        await page.setViewportSize({ width: 320, height: 740 });
        await expectNoOverflow(page);
        await page.screenshot({ path: `artifacts/golden-triangle-review/${cityId}-epilogue-speaker-320.png`, fullPage: true });
        await page.setViewportSize({ width: 360, height: 780 });
      }
      sawLocalSpeaker = true;
    }
    expect(before.activeEpilogue.frame.speaker).not.toBe("player");
    if (step === 2) {
      await expectNoOverflow(page);
      await page.screenshot({ path: `artifacts/golden-triangle-review/${before.currentCityId}-epilogue.png`, fullPage: true });
      await reloadIndia(page);
    }
    await advanceDialogue(page, "epilogue-advance");
    await expect.poll(async () => (await state(page)).revision).toBeGreaterThan(before.revision);
  }
  throw new Error("City ending did not finish");
}

test("the published India story is playable through all three cities with automatic departures", async ({ page }) => {
  test.setTimeout(600_000);
  page.setDefaultTimeout(15_000);
  fs.mkdirSync("artifacts/golden-triangle-review", { recursive: true });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await page.getByLabel("主人公の名前").fill("旅人");
  await page.getByLabel("ヒロインの名前").fill("澪");
  await page.getByRole("button", { name: "旅をはじめる" }).click();
  await setDialogueSpeed(page, "0");
  expect((await state(page)).travelBudget).toBe(30000);
  for (const [index, city] of cities.entries()) {
    expect((await state(page)).currentCityId).toBe(city);
    await finishCityArrival(page, async () => {
      const beforeLine = await state(page);
      await advanceDialogue(page, "arrival-advance");
      await expect.poll(async () => (await state(page)).revision).toBeGreaterThan(beforeLine.revision);
      await expectNoOverflow(page);
      await page.screenshot({ path: `artifacts/golden-triangle-review/${city}-arrival.png`, fullPage: true });
      await reloadIndia(page);
      await expect(page.getByTestId("arrival-logo")).toHaveCount(0);
    });
    const catalog = catalogs[city];
    const normal = catalog.events.filter((event) => event.id.startsWith(`gt_${city}_main_`));
    expect(normal).toHaveLength(4);
    // Visit in a different order from the authoring catalog; dates are optional.
    for (const [position, event] of [...normal].reverse().entries()) {
      await travel(page, event.id);
      await readGuide(page);
      await playBattle(page, `${event.id}_quiz`, position === 0);
      await page.getByRole("button", { name: "自由時間へ進む", exact: true }).click();
      expect((await state(page)).completedEpisodeIds).toContain(event.id);
      if (position === 0) {
        const date = catalog.events.find((event) => event.id.startsWith(`gt_${city}_date_`))!;
        await rest(page);
        await travel(page, date.id);
        await playDate(page);
        expect((await state(page)).playedDateIds).toContain(date.id);
      }
      await rest(page);
    }
    await travel(page, `gt_${city}_finale`);
    await playBattle(page, `gt_${city}_finale_quiz`, false);
    const completed = await state(page);
    await expect(page.getByRole("button", { name: "自由時間へ進む", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "エピローグへ進む", exact: true }).click();
    await readEnding(page);
    const after = await state(page);
    expect(after.completedCityIds).toEqual(cities.slice(0, index + 1));
    expect(after.viewedEpilogueCityIds).toEqual(cities.slice(0, index + 1));
    for (const field of ["ap", "pendingApRewards", "travelBudget", "affection", "trust", "spark", "memories", "playedDateIds", "claimedRewardIds"] as const)
      expect(after[field]).toEqual(completed[field]);
    if (index < 2) {
      expect(after.currentCityId).toBe(cities[index + 1]);
      expect(after.travel).toMatchObject({ day: 1, minute: 540 });
      expect(after.travel.currentPlaceId).toBe(after.travel.hotelPlaceId);
    } else expect(after.currentCityId).toBe("jaipur");
    if (index === 2) {
      await expect(page.getByTestId("travel-menu")).toBeVisible();
      await reloadIndia(page);
    }
  }
  expect((await state(page)).battleRecords.filter((record) => record.battleId.startsWith("gt_") && record.attempts > 0)).toHaveLength(15);
  expect((await state(page)).playedDateIds).toHaveLength(3);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.milano.save.v1"))).toBeNull();
  await expect(page.getByRole("button", { name: /次の都市へ出発/ })).toHaveCount(0);
  await expectNoOverflow(page);
});
