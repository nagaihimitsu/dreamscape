import { expect, test } from "@playwright/test";
import catalog from "../../content/tourism/catalog.json" with { type: "json" };
import oldQuiz from "../../content/quizzes/last_supper_B1.json" with { type: "json" };
import quiz from "../../content/quizzes/sound_supper_B1.json" with { type: "json" };
import phase3 from "../fixtures/phase3-saves.json" with { type: "json" };
import {
  SAVE_KEY,
  expectNoOverflow,
  saved,
  startLegacyJourney,
} from "./helpers";
import {
  answerRound,
  battleDialogueUntilQuestionOrResult,
  playBattle,
  reloadUnchanged,
  romanceProgress,
} from "./battle-helpers";
import {
  expectImageWithinPanBounds,
  finishTourismGuide,
  closeObservationList,
  openCluebook,
  openObservationList,
  selectObservationClue,
  showClue,
  openTourismFromEntry,
  skipTourismGuide,
  touchGesture,
} from "./tourism-helpers";

test.use({ reducedMotion: "reduce" });

const landmark = catalog.landmarks.find((item) => item.id === "last_supper")!;
const clues = catalog.clues.filter((item) => item.landmarkId === landmark.id);
const hotspots = clues.filter((item) => item.kind === "hotspot");
const document = clues.find((item) => item.kind === "document")!;

test("a named guide resumes, the real image loads, and every discovery persists in the cluebook", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startLegacyJourney(page, ["航", "澪"]);
  const before = romanceProgress(await saved(page));
  await openTourismFromEntry(page);
  expect((await saved(page)).activeTourism!.phase).toBe("guide");
  const guideState = await reloadUnchanged(page);
  await expect(page.locator(".dialogue-text")).toContainText(
    guideState.activeTourism!.frame!.text,
  );
  const transcript = await finishTourismGuide(page);
  expect(transcript.join("\n")).toMatch(/澪|航/);
  expect((await saved(page)).ap).toBe(1);
  expect((await saved(page)).completedGuideIds).toEqual([landmark.id]);
  await expect(
    page.getByRole("heading", { name: landmark.nameJa, exact: true }),
  ).toBeVisible();
  const image = page.getByTestId("observation-viewport").locator("img");
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const asset = catalog.assets.find(
    (item) => item.id === landmark.imageAssetId,
  )!;
  expect(
    await image.evaluate((element: HTMLImageElement) => element.naturalWidth),
  ).toBe(asset.width);
  await openObservationList(page);
  await page.getByText("画像の出典と利用条件", { exact: true }).click();
  await expect(page.locator(".tourism-credits a").first()).toHaveAttribute(
    "href",
    asset.sourceUrl,
  );
  await expect(page.locator(".tourism-credits a").last()).toHaveAttribute(
    "href",
    asset.licenseUrl,
  );
  await page.getByText("画像の出典と利用条件", { exact: true }).click();
  await closeObservationList(page);
  expect((await saved(page)).discoveredClueIds).toEqual([]);

  for (const clue of hotspots) {
    await page.getByTestId("zoom-reset").click();
    const point = page.getByTestId(`hotspot-${clue.id}`);
    const box = (await point.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await point.tap();
    await expect(page.getByTestId("discovery-detail")).toContainText(
      clue.titleJa,
    );
    await expect(page.getByTestId("discovery-detail")).toContainText(
      clue.descriptionJa,
    );
    await expect
      .poll(async () => (await saved(page)).discoveredClueIds.includes(clue.id))
      .toBe(true);
    const found = await saved(page);
    await selectObservationClue(page, clue.id);
    expect((await saved(page)).discoveredClueIds).toEqual(
      found.discoveredClueIds,
    );
    await expectImageWithinPanBounds(page);
    await closeObservationList(page);
  }
  await selectObservationClue(page, document.id);
  await expect(page.getByTestId("discovery-detail")).toContainText(
    document.descriptionJa,
  );
  expect((await saved(page)).discoveredClueIds).toHaveLength(clues.length);
  await closeObservationList(page);
  expect(romanceProgress(await saved(page))).toEqual(before);
  await reloadUnchanged(page);
  const book = await openCluebook(page);
  for (const clue of clues) {
    await showClue(page, clue.id);
    await expect(book.getByRole("heading", { name: clue.titleJa, exact: true })).toBeVisible();
    await expect(book).toContainText(clue.descriptionJa);
  }
  await showClue(page, document.id);
  await book
    .getByRole("heading", { name: document.titleJa, exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page.getByTestId("cluebook-close")).toBeInViewport();
  await expectNoOverflow(page);
  await page.screenshot({
    path: "artifacts/phase4-mobile-cluebook.png",
    fullPage: true,
  });
  await page.getByTestId("cluebook-close").click();
  await page.getByTestId("zoom-reset").click();
  await page.getByTestId("observation-viewport").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/phase4-mobile-observation.png" });
  const beforeHidingMarkers = await saved(page);
  await page.getByTestId("toggle-markers").click();
  await expect(page.getByTestId("toggle-markers")).toHaveText("印を表示");
  for (const clue of hotspots)
    await expect(page.getByTestId(`hotspot-${clue.id}`)).toBeHidden();
  expect(await saved(page)).toEqual(beforeHidingMarkers);
  await page.getByTestId("observation-viewport").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "artifacts/phase4-mobile-observation-clear.png",
  });
  await page.getByTestId("zoom-in").click();
  expect(
    Number(
      await page.getByTestId("observation-viewport").getAttribute("data-scale"),
    ),
  ).toBeGreaterThan(1);
  expect(await saved(page)).toEqual(beforeHidingMarkers);
  await page.getByTestId("zoom-reset").click();
  await page.getByTestId("toggle-markers").click();
  for (const clue of hotspots)
    await expect(page.getByTestId(`hotspot-${clue.id}`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("native touch pinch and drag change the view within bounds without accidental discoveries", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await startLegacyJourney(page);
  await openTourismFromEntry(page);
  await skipTourismGuide(page);
  const viewport = page.getByTestId("observation-viewport");
  await viewport.scrollIntoViewIfNeeded();
  await expect(viewport).toHaveAttribute("data-scale", "1");
  const box = (await viewport.boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await touchGesture(
    page,
    [35, 50, 70, 90, 110].map((offset) => [
      { id: 1, x: center.x - offset, y: center.y },
      { id: 2, x: center.x + offset, y: center.y },
    ]),
  );
  await expect
    .poll(async () => Number(await viewport.getAttribute("data-scale")))
    .toBeGreaterThan(1.5);
  expect((await saved(page)).discoveredClueIds).toEqual([]);
  await expectImageWithinPanBounds(page);
  const originalX = Number(await viewport.getAttribute("data-x"));
  await touchGesture(
    page,
    [0, 25, 55, 95].map((offset) => [
      { id: 1, x: center.x + offset, y: center.y + offset / 3 },
    ]),
  );
  await expect
    .poll(async () => Number(await viewport.getAttribute("data-x")))
    .not.toBe(originalX);
  for (let attempt = 0; attempt < 4; attempt++) {
    await touchGesture(
      page,
      [0, 40, 90, 130].map((offset) => [
        { id: 1, x: center.x + offset, y: center.y + offset / 3 },
      ]),
    );
  }
  await expectImageWithinPanBounds(page);
  expect((await saved(page)).discoveredClueIds).toEqual([]);
  await page.getByTestId("zoom-reset").click();
  await expect(viewport).toHaveAttribute("data-scale", "1");
  await page.getByTestId("zoom-in").click();
  const increased = Number(await viewport.getAttribute("data-scale"));
  expect(increased).toBeGreaterThan(1);
  await page.getByTestId("zoom-out").click();
  expect(Number(await viewport.getAttribute("data-scale"))).toBeLessThan(
    increased,
  );
  await expectImageWithinPanBounds(page);
  await page.setViewportSize({ width: 430, height: 820 });
  await expectImageWithinPanBounds(page);
  await expectNoOverflow(page);
});

test("battle cluebook preserves the question, open hint and locked answer, including a return to observation", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 740 });
  await startLegacyJourney(page);
  const romance = romanceProgress(await saved(page));
  await openTourismFromEntry(page);
  await skipTourismGuide(page);
  await selectObservationClue(page, hotspots[0].id);
  await selectObservationClue(page, document.id);
  await closeObservationList(page);
  await page
    .getByRole("button", { name: "バトルを始める", exact: true })
    .click();
  await battleDialogueUntilQuestionOrResult(page);
  await page.getByRole("button", { name: "ヒントを見る", exact: true }).click();
  const questionState = await saved(page);
  const book = await openCluebook(page);
  const availableIds = await page.getByTestId("clue-picker").locator("option")
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  // The list itself must not expose undiscovered clues, even if the current
  // page happens to show a different clue.
  expect(availableIds.sort()).toEqual([hotspots[0].id, document.id].sort());
  await showClue(page, hotspots[0].id);
  await expect(book).toContainText(hotspots[0].descriptionJa);
  await showClue(page, document.id);
  await expect(book).toContainText(document.descriptionJa);
  await expect(book).not.toContainText(hotspots[1].descriptionJa);
  expect(await saved(page)).toEqual(questionState);
  await page.keyboard.press("Escape");
  await expect(book).not.toBeVisible();
  expect(await saved(page)).toEqual(questionState);
  await expect(
    page.getByText(quiz.questions[0].hintJa, { exact: true }),
  ).toBeVisible();
  await reloadUnchanged(page);
  await answerRound(page, quiz.questions[0], true, true);
  const answered = await saved(page);
  await page.screenshot({
    path: "artifacts/phase4-mobile-battle-feedback.png",
  });
  await openCluebook(page);
  await page.getByTestId("cluebook-close").click();
  expect(await saved(page)).toEqual(answered);
  for (const option of quiz.questions[0].options)
    await expect(page.getByTestId(`answer-${option.id}`)).toBeDisabled();

  await openCluebook(page);
  await page
    .getByRole("button", { name: "観光に戻って調べる", exact: true })
    .click();
  await expect(page.getByTestId("observation-viewport")).toBeVisible();
  expect((await saved(page)).activeBattle).toEqual(answered.activeBattle);
  await selectObservationClue(page, hotspots[1].id);
  await closeObservationList(page);
  await reloadUnchanged(page);
  expect((await saved(page)).activeBattle).toEqual(answered.activeBattle);
  await page.getByRole("button", { name: "バトルに戻る", exact: true }).click();
  await expect(page.getByTestId("battle-feedback")).toBeVisible();
  expect((await saved(page)).activeBattle).toEqual(answered.activeBattle);
  await page.getByTestId("battle-advance").click();
  for (const question of quiz.questions.slice(1)) {
    await battleDialogueUntilQuestionOrResult(page);
    await answerRound(page, question, true);
    await page.getByTestId("battle-advance").click();
  }
  const result = await battleDialogueUntilQuestionOrResult(page);
  expect(result.activeBattle!.score).toBe(3);
  expect(result.ap).toBe(6);
  expect(result.battleRecords[0].attempts).toBe(1);
  expect(romanceProgress(result)).toEqual(romance);
  expect(result.discoveredClueIds).toHaveLength(3);
});

test("observation and the guide can be skipped to complete a battle with no clues", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 740 });
  await startLegacyJourney(page);
  const romance = romanceProgress(await saved(page));
  await openTourismFromEntry(page);
  await page
    .getByRole("button", { name: "バトルを始める", exact: true })
    .click();
  expect((await saved(page)).activeTourism).toBeNull();
  expect((await saved(page)).discoveredClueIds).toEqual([]);
  await openCluebook(page);
  await expect(page.getByTestId("clue-picker")).toHaveCount(0);
  for (const clue of clues)
    await expect(page.getByRole("dialog")).not.toContainText(
      clue.descriptionJa,
    );
  await page.getByTestId("cluebook-close").click();
  const result = await playBattle(page, quiz.questions, [false, false, false]);
  expect(result.state.activeBattle!.score).toBe(0);
  expect(result.state.ap).toBe(5);
  expect(romanceProgress(result.state)).toEqual(romance);
  expect(result.state.discoveredClueIds).toEqual([]);
});

test("an authentic Phase 3 answered battle migrates without changing its answer when visiting tourism", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: phase3.feedback },
  );
  await page.reload();
  await expect(page.getByTestId("battle-feedback")).toBeVisible();
  // Merely loading or opening a read-only notebook must not overwrite the old slot.
  expect(await saved(page)).toEqual(phase3.feedback);
  await openCluebook(page);
  await page.getByTestId("cluebook-close").click();
  expect(await saved(page)).toEqual(phase3.feedback);
  await openCluebook(page);
  await page
    .getByRole("button", { name: "観光に戻って調べる", exact: true })
    .click();
  await skipTourismGuide(page);
  await selectObservationClue(page, hotspots[0].id);
  await closeObservationList(page);
  const migrated = await saved(page);
  expect(migrated.schemaVersion).toBe(11);
  expect(migrated.activeBattle).toEqual({
    ...phase3.feedback.activeBattle,
    reasoning: null,
  });
  expect(romanceProgress(migrated)).toEqual(
    romanceProgress(phase3.feedback as unknown as typeof migrated),
  );
  await reloadUnchanged(page);
  await page.getByRole("button", { name: "バトルに戻る", exact: true }).click();
  expect((await saved(page)).activeBattle).toEqual({
    ...phase3.feedback.activeBattle,
    reasoning: null,
  });
  for (const option of oldQuiz.questions[0].options)
    await expect(page.getByTestId(`answer-${option.id}`)).toBeDisabled();
  await page.getByTestId("battle-advance").click();
  await battleDialogueUntilQuestionOrResult(page);
  expect((await saved(page)).activeBattle!.roundIndex).toBe(1);
});

test("a Phase 3 romance ending can visit and leave tourism without changing the completed route", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: phase3.ending },
  );
  await page.reload();
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  const initial = romanceProgress(await saved(page));
  await openTourismFromEntry(page);
  await finishTourismGuide(page);
  await selectObservationClue(page, document.id);
  await closeObservationList(page);
  await page
    .getByRole("button", { name: "自由時間へ戻る", exact: true })
    .click();
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  expect(romanceProgress(await saved(page))).toEqual(initial);
  await reloadUnchanged(page);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await openTourismFromEntry(page);
  expect((await saved(page)).activeTourism!.phase).toBe("exploring");
  expect((await saved(page)).discoveredClueIds).toEqual([document.id]);
});
