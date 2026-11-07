import { DOUBLE_TAP_WINDOW_MS } from "../../src/components/double-tap";
import { allStorage, expect, expectNoActiveScene, learningKey, ops, playUntil, readSave, test, tier } from "./helpers";

// Lane 1 (docs/10): the real flow from the title screen, no Debug, no state shortcut.
// docs/07 acceptance 1–4 (names, AP from the first battle, a date spending AP once and finishing).
test("a new Milan journey walks to the Duomo, plays its guide, quiz battle and a date, and returns to free time", { tag: [tier.gate, tier.prod, tier.smoke] }, async ({ page }) => {
  test.setTimeout(120_000);
  // Time runs normally; it is paused only for the typewriter check below.
  await page.clock.install();
  // A name that looks like markup is shown as plain text (AGENTS.md: player input is text, never HTML).
  await ops.startJourney(page, "milano", ["<b>航</b>", "澪"]);
  const menu = page.getByTestId("travel-menu");
  await expect(page.getByTestId("travelers")).toContainText("<b>航</b>");
  await expect(page.getByTestId("travelers").locator("b")).toHaveCount(0);
  await expect(page.getByLabel("残り0AP")).toBeVisible();

  // Walking to the Duomo opens its sightseeing guide on arrival.
  // The default typewriter (文字送り「ふつう」, motion not reduced), which every
  // player starts with (AGENTS.md: 文字送り速度・スキップ, 誤タップ防止): the first
  // tap on a line still being written completes it without changing the save,
  // the second tap goes on to the next line.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByText("現在地：ドゥオモ広場")).toBeVisible();
  await expect(page.getByTestId("travel-transition")).toHaveCount(0);
  const line = page.getByTestId("dialogue-text");
  await expect(line).toHaveAttribute("data-ready", "true");
  // Freeze the page's clock so the next line cannot finish writing by itself (once the
  // guide that has just started takes taps: a new scene holds them for a moment).
  await ops.settled(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  const first = await readSave(page);
  await line.click();
  await expect.poll(async () => (await readSave(page)).revision).toBe(first.revision + 1);
  await expect(line).toHaveAttribute("data-ready", "false");
  await line.click();
  await expect(line).toHaveAttribute("data-ready", "true");
  expect((await readSave(page)).revision).toBe(first.revision + 1);
  await line.click();
  await expect.poll(async () => (await readSave(page)).revision).toBe(first.revision + 2);
  // Tap anywhere (user idea, 2026-11-07): a tap on the picture above the window acts like a
  // tap on the line, one step per tap, and a control is not the picture.
  const picture = await ops.sceneBackgroundPoint(page);
  await expect(line).toHaveAttribute("data-ready", "false");
  await ops.tap(page, picture);
  await expect(line).toHaveAttribute("data-ready", "true");
  expect((await readSave(page)).revision).toBe(first.revision + 2);
  await ops.tap(page, picture);
  await expect.poll(async () => (await readSave(page)).revision).toBe(first.revision + 3);
  await expect(line).toHaveAttribute("data-ready", "false");
  // The log (a control in the window) and the English note (in the header above the scene)
  // open and close without moving the story or finishing the line, also when the note's
  // 「閉じる」 gets a quick double tap: its second tap lands on the scene the note leaves
  // behind, and a press on any control of the page settles the scene for a moment.
  await ops.closeDialog(await ops.openDialogueLog(page));
  const note = await ops.openEnglishNote(page);
  const closeNote = await ops.centerOf(note.getByRole("button", { name: "閉じる", exact: true }));
  await ops.doubleTap(page, closeNote);
  await expect(note).toBeHidden();
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest("#tourism-screen"), closeNote),
    "the second tap landed on the guide").toBe(true);
  expect((await readSave(page)).revision).toBe(first.revision + 3);
  await expect(line).toHaveAttribute("data-ready", "false");
  // A tap on the line itself right after those presses counts as a press's second tap (the
  // clock is held, so it falls within the double-tap window): it does not finish the line.
  const lineBox = (await line.boundingBox())!;
  await page.touchscreen.tap(lineBox.x + lineBox.width / 2, lineBox.y + lineBox.height / 2);
  await expect(line).toHaveAttribute("data-ready", "false");
  expect((await readSave(page)).revision).toBe(first.revision + 3);
  await page.clock.resume();
  // The line now being written finishes by itself; later lines appear whole.
  await expect(line).toHaveAttribute("data-ready", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await playUntil(page, (state) => state.activeTourism?.phase === "exploring");
  await expect(page.getByTestId("observation-viewport")).toBeVisible();

  // The guide leads into the quiz battle; every answer and line is saved before the next.
  await page.getByRole("button", { name: "進む", exact: true }).click();
  // A quick double tap on an answer (誤タップ防止, user decision: the second tap is
  // ignored) records one answer and stays on that question's feedback. After the
  // first tap the verdict and feedback appear and the screen shifts, so the second
  // tap can land on another control (on this phone and question 「敵の反応を見る」,
  // which would skip the feedback; elsewhere 「英文を確認する」 or 「訳を見る」): it must
  // not act. The page's clock is held, so the two taps count as one double tap
  // however slow the machine.
  const question = await playUntil(page, (state) => state.activeBattle?.phase === "question" && state.activeBattle.roundIndex === 2);
  const answer = page.getByTestId("answer-C");
  await answer.scrollIntoViewIfNeeded();
  const box = (await answer.boundingBox())!;
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId("battle-feedback")).toBeVisible();
  const answered = await readSave(page);
  expect(answered.revision).toBe(question.revision + 1);
  expect(answered.activeBattle).toMatchObject({ phase: "feedback", roundIndex: question.activeBattle!.roundIndex });
  expect(answered.activeBattle!.answers).toHaveLength(question.activeBattle!.answers.length + 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[aria-expanded=true], details[open]")).toHaveCount(0);
  expect(JSON.parse((await allStorage(page))[learningKey()] ?? "{}").revealed ?? {}).toEqual({});
  // Taps after the double-tap window act again.
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  const result = await playUntil(page, (state) => state.activeBattle?.phase === "result");
  await expect(page.getByTestId("battle-result")).toBeVisible();
  await expect(page.getByTestId("battle-rewards")).toBeVisible();
  expect(result.activeBattle!.answers.length).toBeGreaterThan(0);
  expect(result.completedEpisodeIds).toEqual(["milano_duomo_episode"]);
  expect(result.ap).toBeGreaterThan(0);

  await ops.toFreeTime(page);
  await expect(page.getByLabel(`残り${result.ap}AP`)).toBeVisible();
  await expect(page.getByTestId("city-progress")).toContainText("観光 1 / 4");

  // A date costs AP when it starts and returns to the travel menu when it ends (docs/07 acceptance 3, 4).
  // A quick double tap on the destination starts it once, and the second tap, landing on the
  // date that opens under the finger, does not read its first line on unseen: taps are held for
  // a moment when a story scene starts (lines appear whole here, as with 文字送り「一括表示」).
  const novecento = await ops.centerOf(await ops.destination(page, "p_novecento"));
  const beforeDate = await readSave(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await ops.doubleTap(page, novecento);
  await expect.poll(async () => (await readSave(page)).activeDate?.dateId).toBe("milano_novecento_date_01");
  const started = await readSave(page);
  expect(started.revision).toBe(beforeDate.revision + 1);
  expect(started.ap).toBeLessThan(result.ap);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.settled(page);
  expect(await readSave(page)).toEqual(started);
  // The note beside the visited place's reference photo is not the picture: a tap on it does nothing.
  const dateLine = await line.textContent();
  await ops.tap(page, await ops.centerOf(page.getByTestId("destination-reference-note")));
  await expect(line).toHaveText(dateLine!);
  expect((await readSave(page)).revision).toBe(started.revision);
  // A notice above the scene (here after 「セーブ」) pushes the date down; its 「閉じる」 lets the date
  // move back up under the finger. A press on any control of the page, also outside the scene,
  // settles the scene for a moment: a quick tap on the picture right after does not read on
  // (where the second tap of a double tap on 「閉じる」 lands depends on the notice's length).
  const sceneryAfterNotice = await ops.sceneBackgroundPoint(page);
  await ops.manualSave(page);
  const closeNotice = await ops.centerOf(ops.noticeClose(page));
  await ops.settled(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await page.touchscreen.tap(closeNotice.x, closeNotice.y);
  await expect(ops.noticeClose(page)).toHaveCount(0);
  await page.touchscreen.tap(sceneryAfterNotice.x, sceneryAfterNotice.y);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.settled(page);
  await expect(line).toHaveText(dateLine!);
  expect((await readSave(page)).revision).toBe(started.revision);
  // A load brings the saved date back as a new scene under the finger (the confirmation's
  // 「ロードする」 sits over the date). With manual saving, the second tap of a quick double tap on
  // 「ロードする」 does not read the restored line on: a load holds taps like a scene start.
  await ops.setAutoSave(page, false);
  await ops.manualSave(page);
  await expect(ops.noticeClose(page)).toBeVisible();
  const saved = await readSave(page);
  await ops.tap(page, await ops.sceneBackgroundPoint(page));
  await expect(line).not.toHaveText(dateLine!);
  const loading = await ops.askToLoad(page);
  const load = await ops.centerOf(loading.loadButton);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await ops.doubleTap(page, load);
  await expect(loading.dialog).toBeHidden();
  await expect(line).toHaveText(dateLine!);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.settled(page);
  await expect(line).toHaveText(dateLine!);
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-testid="romance-scene"]'), load),
    "the second tap landed on the restored date").toBe(true);
  expect(await readSave(page)).toEqual(saved);
  await ops.setAutoSave(page, true);
  // With the window hidden, a tap on the picture only shows it again, also as a quick double
  // tap (誤タップ防止: the restore control leaves the picture under the finger, and the second
  // tap is ignored); the next tap goes on. Lines appear whole here (reduced motion), as they
  // do with 文字送り「一括表示」, so a second tap that read on would skip a line unread.
  const scenery = await ops.sceneBackgroundPoint(page);
  await ops.hideDialogueWindow(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await ops.doubleTap(page, scenery);
  await expect(page.getByTestId("romance-scene").getByRole("region", { name: "デートの会話" })).toBeVisible();
  expect((await readSave(page)).revision).toBe(started.revision);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.tap(page, scenery);
  await expect.poll(async () => (await readSave(page)).revision).toBe(started.revision + 1);
  // While the replies are offered, a tap on the picture neither chooses one nor goes on
  // (選択肢の誤タップ防止). A quick double tap on a reply saves that reply only: its second tap
  // lands on the scene the reply leaves behind and does not skip the reaction line.
  const choosing = await playUntil(page, (state) => !!state.activeDate?.frame.choices.length);
  const reply = page.getByTestId("date-choice").first();
  await expect(reply).toBeEnabled();
  await ops.tap(page, await ops.sceneBackgroundPoint(page));
  expect((await readSave(page)).revision).toBe(choosing.revision);
  const replyBox = (await reply.boundingBox())!;
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await ops.doubleTap(page, { x: replyBox.x + replyBox.width / 2, y: replyBox.y + replyBox.height / 2 });
  await expect.poll(async () => (await readSave(page)).revision).toBe(choosing.revision + 1);
  const replied = await readSave(page);
  expect(replied.activeDate!.choiceCount).toBe(choosing.activeDate!.choiceCount + 1);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  // At the last line a tap on the picture ends the date, as a tap on the line does. The free
  // time then appears under the finger: neither the double tap's second tap nor a tap on a
  // destination there acts for a moment (it would start another date or a walk).
  const last = await playUntil(page, (state) => !!state.activeDate?.frame.ended);
  const end = await ops.sceneBackgroundPoint(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await ops.doubleTap(page, end);
  await expect(menu).toBeVisible();
  const destination = (await page.getByTestId(/^travel-place-/u).getByRole("button").filter({ visible: true }).first().boundingBox())!;
  await page.touchscreen.tap(destination.x + destination.width / 2, destination.y + destination.height / 2);
  const finished = await readSave(page);
  expect(finished.revision).toBe(last.revision + 1);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.settled(page);
  expect(await readSave(page)).toEqual(finished);
  expect(finished.playedDateIds).toEqual(["milano_novecento_date_01"]);
  expect(finished.memories.length).toBeGreaterThan(0);
  expect(finished.ap).toBe(started.ap);
  expectNoActiveScene(finished);
  await expect(page.getByText("現在地：ノヴェチェント美術館")).toBeVisible();
  await expect(page.getByLabel(`残り${finished.ap}AP`)).toBeVisible();
});
