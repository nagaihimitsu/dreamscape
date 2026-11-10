import { DOUBLE_TAP_WINDOW_MS } from "../../src/components/double-tap";
import { CONFIRM_SETTLE_MS } from "../../src/components/ConfirmActionButton";
import { LAST_JOURNEY_KEY } from "../../src/app/last-journey";
import { DEBUG_MODE_KEY } from "../../src/app/debug-mode";
import { allStorage, expect, generated, journeyCatalog, learningKey, ops, placeGuideSave, playUntil, presentationKey, readSave, saveKey, test, tier } from "./helpers";

// Lane 1 (docs/10): saving and resuming are only ever checked through the real flow.

// AGENTS.md 「同一バージョン内の保存・再開を守る」「セーブ再開で二重消費しない」; docs/07 acceptance 2, 5, 6 and 「英語学習データと保存の方針」.
test("autosaved progress, a battle question, the English note and the text speed are restored after a reload", { tag: tier.gate }, async ({ page }) => {
  test.setTimeout(120_000);
  // Name fields left empty start with the default names, their placeholders (nameOrDefault, src/domain/player-names.ts).
  await ops.startJourney(page, "milano", ["", ""]);
  const balance = generated<{ defaultPlayerName: string; defaultHeroineName: string }>("romance/balance.json");
  expect(await readSave(page)).toMatchObject({ playerName: balance.defaultPlayerName, heroineName: balance.defaultHeroineName });
  await ops.goTo(page, "p_duomo");
  await ops.skipGuideToBattle(page);
  const beforeBattle = await readSave(page);

  // docs/07 acceptance 5 and 「将来のテスト」 (battle save): reloading on a question
  // resumes that same question; docs/07 acceptance 2: its rewards and AP are granted once.
  const question = await playUntil(page, (state) => state.activeBattle?.phase === "question" && state.activeBattle.roundIndex === 1);
  const questionText = await page.getByTestId("battle-question").getByRole("heading", { level: 2 }).textContent();
  await page.reload();
  await expect(page.getByTestId("battle-question")).toBeVisible();
  expect(await readSave(page)).toEqual(question);
  await expect(page.getByTestId("battle-question").getByRole("heading", { level: 2 })).toHaveText(questionText!);
  const result = await playUntil(page, (state) => state.activeBattle?.phase === "result");
  const receipt = result.battleRewardReceipt!.entries;
  expect(receipt.length).toBeGreaterThan(0);
  expect(result.ap).toBe(beforeBattle.ap + receipt.reduce((sum, entry) => sum + entry.creditedAp, 0));
  expect(result.claimedRewardIds).toEqual([...beforeBattle.claimedRewardIds, ...receipt.map((entry) => entry.rewardId)]);
  await page.reload();
  await expect(page.getByTestId("battle-rewards")).toBeVisible();
  expect(await readSave(page)).toEqual(result);
  await ops.toFreeTime(page);
  const progress = await readSave(page);
  expect(progress.completedEpisodeIds).toEqual(["milano_duomo_episode"]);
  expect(progress.ap).toBe(result.ap);

  // The English note (its own save) keeps the answered questions and the marks,
  // and the text speed (the presentation settings) is kept as chosen.
  const note = await ops.openEnglishNote(page);
  const picker = note.getByLabel("回答した問題を選ぶ");
  const firstQuestion = await picker.locator("option").nth(1).getAttribute("value");
  await picker.selectOption(firstQuestion!);
  await note.getByRole("button", { name: "あとで復習する" }).click();
  await expect(note.getByRole("button", { name: "復習の登録を解除" })).toHaveAttribute("aria-pressed", "true");
  await ops.closeDialog(note);
  await ops.setTextSpeed(page, 45);
  const kept = await allStorage(page);
  expect(kept[learningKey()]).toBeDefined();

  await page.reload();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(await readSave(page)).toEqual(progress);
  await expect(page.getByLabel(`残り${progress.ap}AP`)).toBeVisible();
  await expect(page.getByText("現在地：ドゥオモ広場")).toBeVisible();
  await expect(page.getByTestId("city-progress")).toContainText("観光 1 / 4");
  const reopened = await ops.openEnglishNote(page);
  await reopened.getByLabel("回答した問題を選ぶ").selectOption(firstQuestion!);
  await expect(reopened.getByRole("button", { name: "復習の登録を解除" })).toHaveAttribute("aria-pressed", "true");
  await ops.closeDialog(reopened);
  const settings = await ops.openSettings(page);
  await expect(settings.getByLabel("文字送り")).toHaveValue("45");
  await ops.closeDialog(settings);
  const afterReload = await allStorage(page);
  expect(afterReload[presentationKey]).toBe(kept[presentationKey]);

  // Reloading in the middle of a date returns to the same line without charging AP again (docs/07 acceptance 5, 6).
  await ops.goTo(page, "p_novecento");
  const date = await playUntil(page, (state) => state.activeDate?.frame.choices.length === 3);
  expect(date.ap).toBeLessThan(progress.ap);
  await page.reload();
  await expect(page.getByTestId("date-choice")).toHaveCount(3);
  expect(await readSave(page)).toEqual(date);
  await expect(page.getByTestId("date-choice").first()).toContainText(date.activeDate!.frame.choices[0].text);
  const finished = await playUntil(page, (state) => !state.activeDate);
  expect(finished.ap).toBe(date.ap);
  expect(finished.playedDateIds).toEqual(["milano_novecento_date_01"]);
});

// AGENTS.md 「現在のバージョンで作成した有効なセーブは…正しく保存・再開できる」 and docs/07 acceptance 6;
// docs/07 acceptance 10: with manual saving, leaving unsaved progress asks first (switching journeys,
// ロード, reloading), as hasUnsavedProgress/leaveStep decide (docs/10 「画面の保護を担う関数」).
// UI stage 0, item I: like the title's start, a preparing journey's 「旅の準備を保存する」 with empty name fields
// saves the default names shown as placeholders (nameOrDefault in PreparingJourney).
test("a preparing journey saved with empty name fields keeps the default names", { tag: tier.gate }, async ({ page }) => {
  const preparing = journeyCatalog().journeys.find((journey) => journey.status === "preparing" && journey.initialState);
  test.skip(!preparing, "no preparing journey with an initial state to save names for");
  const balance = generated<{ defaultPlayerName: string; defaultHeroineName: string }>("romance/balance.json");
  await page.goto("/");
  await ops.chooseJourney(page, preparing!.id);
  await expect(page.getByLabel("主人公の名前")).toHaveValue("");
  await expect(page.getByLabel("ヒロインの名前")).toHaveValue("");
  await page.getByRole("button", { name: "旅の準備を保存する" }).click();
  await expect(page.getByRole("status")).toContainText(`${balance.defaultPlayerName} と ${balance.defaultHeroineName}`);
  expect(JSON.parse((await allStorage(page))[saveKey(preparing!.id)]!)).toMatchObject({
    kind: "journey_preparation", journeyId: preparing!.id, playerName: balance.defaultPlayerName, heroineName: balance.defaultHeroineName });
});

test("a manual save keeps the saved position and settings when unsaved changes are discarded", { tag: tier.gate }, async ({ page }) => {
  await page.clock.install();
  await ops.startJourney(page);

  // セーブ・ロード・ゲームの設定 live in the header's ⚙設定 (UI redesign §3.1, U2/U24/U28), a
  // disclosure: by keyboard it opens on セーブ, the arrows move between its three items, Esc
  // closes it back on ⚙設定, and leaving it with Tab closes it.
  const gear = ops.settingsButton(page);
  const panel = page.getByTestId("hud-menu-panel");
  const item = (name: string) => panel.getByRole("button", { name, exact: true });
  await gear.focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("button")).toHaveText(["セーブ", "ロード", "ゲームの設定"]);
  await expect(item("セーブ")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(item("ロード")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(gear).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(item("セーブ")).toBeFocused();
  for (let step = 0; step < 3; step++) await page.keyboard.press("Tab");
  await expect(panel).toBeHidden();
  // ゲームの設定 opens the settings dialog, which gives the focus back to ⚙設定 when it closes.
  await gear.focus();
  await page.keyboard.press("Enter");
  await item("ゲームの設定").focus();
  await page.keyboard.press("Enter");
  await ops.closeDialog(page.getByRole("dialog", { name: "ゲームの設定" }));
  await expect(gear).toBeFocused();
  // A tap outside the panel only closes it: nothing under it is pressed (here a destination),
  // the save stays as it was, and the focus is back on ⚙設定.
  const untouched = await readSave(page);
  await ops.openMenu(page);
  await expect(item("セーブ")).toBeFocused();
  await ops.tapAt(page, await ops.centerOf(await ops.destination(page, "p_duomo")));
  await expect(panel).toBeHidden();
  await expect(gear).toBeFocused();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(await readSave(page)).toEqual(untouched);
  // A quick double tap on 「ゲームの設定」 (AGENTS.md 選択肢の誤タップ防止): the dialog opens under the
  // finger, and on a phone the point is one of its controls (the autosave checkbox at 320–390 px).
  // The second tap changes nothing, as the dialog takes no press for a moment (Modal's
  // settlePresses), then takes them as usual. The page's clock is held, so the second tap comes
  // within that moment however slow the machine.
  {
    const point = await ops.centerOf((await ops.openMenu(page)).getByRole("button", { name: "ゲームの設定", exact: true }));
    await ops.holdClock(page);
    await page.touchscreen.tap(point.x, point.y);
    const settings = page.getByRole("dialog", { name: "ゲームの設定" });
    await expect(settings).toBeVisible();
    const autosave = settings.getByLabel("自動保存する");
    const speed = settings.getByLabel("文字送り");
    await expect(autosave).toBeChecked();
    const speedBefore = await speed.inputValue();
    expect(await settings.evaluate((dialog, { x, y }) => [...dialog.querySelectorAll("label, button, select, input")].some((control) => {
      const box = control.getBoundingClientRect();
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    }), point), "the second tap's point is one of the settings' controls").toBe(true);
    await page.touchscreen.tap(point.x, point.y);
    await expect(settings).toBeVisible();
    await expect(autosave).toBeChecked();
    expect(await speed.inputValue()).toBe(speedBefore);
    await page.clock.fastForward(CONFIRM_SETTLE_MS);
    await page.clock.resume();
    await expect(settings).not.toHaveAttribute("data-settling");
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("dialog")?.getAttribute("aria-labelledby"), point),
      "a later tap at that point reaches the settings").toBe("settings-title");
    await ops.closeDialog(settings);
  }
  expect(await readSave(page)).toEqual(untouched);

  await ops.setAutoSave(page, false);
  const initial = await readSave(page);

  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect(await readSave(page)).toEqual(initial);
  // A quick double tap on ⚙設定 → 「セーブ」 over the guide (AGENTS.md 選択肢の誤タップ防止): the panel
  // leaves from under the finger, and on a phone a control of the guide lies under セーブ's point
  // (手がかり帳 at 320–390 px). The scene is saved, and the second tap presses nothing: no tap reaches
  // the page for a moment after セーブ, as after a scene change. The page's clock is held, so the
  // second tap comes within that moment however slow the machine.
  const savePoint = await ops.centerOf((await ops.openMenu(page)).getByRole("button", { name: "セーブ", exact: true }));
  await ops.holdClock(page);
  await page.touchscreen.tap(savePoint.x, savePoint.y);
  await expect(panel).toBeHidden();
  expect(await page.evaluate(({ x, y }) => [...document.querySelectorAll("#tourism-screen button")].some((control) => {
    const box = control.getBoundingClientRect();
    return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  }), savePoint), "the second tap's point is one of the guide's controls").toBe(true);
  await page.touchscreen.tap(savePoint.x, savePoint.y);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.settled(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  const manual = await readSave(page);
  expect(manual.travel.currentPlaceId).toBe("p_duomo");
  expect(manual.activeTourism?.landmarkId).toBe("duomo_milano");

  // Progress after the manual save is not stored. Switching journeys asks first; 戻る keeps this scene.
  await page.getByTestId("tourism-skip").click();
  await expect(page.getByTestId("tourism-guide")).toHaveCount(0);
  const otherJourney = journeyCatalog().journeys.find((journey) => journey.id !== "milano")!.id;
  const settings = await ops.openSettings(page);
  await settings.getByLabel("旅行編").selectOption(otherJourney);
  const switching = page.getByRole("dialog", { name: "旅行編を切り替える" });
  await expect(switching).toContainText("手動セーブしていない進行は失われます。");
  await switching.getByRole("button", { name: "戻る", exact: true }).click();
  await expect(switching).toBeHidden();
  await expect(page.getByTestId("tourism-guide")).toHaveCount(0);
  await expect(page.getByText("現在地：ドゥオモ広場")).toBeVisible();

  // Reloading asks through the browser's own prompt; leaving restores the manual save.
  const prompts: string[] = [];
  page.on("dialog", (dialog) => { prompts.push(dialog.type()); void dialog.accept(); });
  await page.reload();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect(prompts).toEqual(["beforeunload"]);
  expect(await readSave(page)).toEqual(manual);
  const reopened = await ops.openSettings(page);
  await expect(reopened.getByLabel("自動保存する")).not.toBeChecked();
  await ops.closeDialog(reopened);

  // ロード asks too: 戻る keeps the scene and gives the focus back to ⚙設定, and loading brings
  // the manual save's scene back.
  await page.getByTestId("tourism-skip").click();
  const asked = await ops.askToLoad(page);
  await asked.dialog.getByRole("button", { name: "戻る", exact: true }).click();
  await expect(asked.dialog).toBeHidden();
  await expect(gear).toBeFocused();
  await expect(page.getByTestId("tourism-guide")).toHaveCount(0);
  const loading = await ops.askToLoad(page);
  await loading.loadButton.click();
  await expect(loading.dialog).toBeHidden();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "保存した場面から再開しました。" })).toBeVisible();
  expect(prompts).toEqual(["beforeunload"]);
});

// AGENTS.md 選択肢の誤タップ防止, docs/02 「UX/スマホ」: 「切り替える」 rebuilds the screen with the other
// journey's saved scene under the finger. With lines shown whole (reduced motion), the second tap of a
// quick double tap would read its first line on unseen: no tap is taken for a moment after a switch.
test("a quick double tap on 「切り替える」 does not read on the other journey's saved story scene", { tag: tier.gate }, async ({ page }) => {
  const other = journeyCatalog().journeys.find((journey) => journey.id !== "milano" && journey.status === "available");
  expect(other, "an available journey besides Milan").toBeDefined();
  await page.clock.install();
  await ops.startJourney(page);
  // State shortcut (lane 2 in docs/10): the other journey's save holds a sightseeing guide at its first line.
  const placed = await placeGuideSave(page, other!.id);
  // With manual saving and a move not yet saved, switching asks first, with its 「切り替える」.
  await ops.setAutoSave(page, false);
  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await ops.settled(page);
  const settings = await ops.openSettings(page);
  await settings.getByLabel("旅行編").selectOption(other!.id);
  const confirm = await ops.centerOf(page.getByRole("dialog", { name: "旅行編を切り替える" }).getByRole("button", { name: "切り替える", exact: true }));
  await ops.holdClock(page);
  await page.touchscreen.tap(confirm.x, confirm.y);
  const line = page.getByTestId("dialogue-text");
  // The second tap comes while the other journey's guide is on screen (the held clock keeps it a double tap).
  await expect(line).toContainText(placed.activeTourism!.frame!.text);
  await page.touchscreen.tap(confirm.x, confirm.y);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.settled(page);
  await expect(line).toContainText(placed.activeTourism!.frame!.text);
  // It reads on only where a tap would: the picture or the line, not one of the guide's controls.
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest("#tourism-screen"), confirm),
    "the second tap landed on the other journey's guide").toBe(true);
  expect(await ops.readsOnAt(page, confirm), "the second tap landed on the guide's picture or line, not on a control").toBe(true);
  expect(await readSave(page, other!.id)).toEqual(placed);
});

// AGENTS.md 「明示確認と別タブ競合の保護を維持する」: a second tab never overwrites the first one's progress.
test("a second tab cannot open a journey that is already open", { tag: tier.gate }, async ({ page, context }) => {
  await ops.startJourney(page, "milano", ["先の名前", "あゆみ"]);
  const saved = await allStorage(page);
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.getByRole("alert")).toContainText("別のタブで開いています");
  // UI redesign §3.7 K: the lock screen's heading takes the focus (one Tab then reaches 「再試行」).
  await expect(second.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(ops.startButton(second)).toHaveCount(0);
  expect(await allStorage(second)).toEqual(saved);

  // Once the first tab is closed, the second can continue the same journey.
  await page.close();
  await second.getByRole("button", { name: "再試行" }).click();
  await expect(second.getByTestId("travel-menu")).toBeVisible();
  // AGENTS.md 「アクセシビリティを考慮する」: 再試行 disappears with the lock message, so the
  // resumed game's main area takes the focus instead of leaving it on the page body.
  await expect(second.getByRole("main")).toBeFocused();
  expect(await ops.readTravelers(second)).toContain("先の名前");
  expect(await allStorage(second)).toEqual(saved);
});

// AGENTS.md 選択肢の誤タップ防止: 再試行 rebuilds the screen like a switch, with the journey's saved
// scene under the finger; the second tap of a quick double tap does not read its first line on.
test("a quick double tap on 「再試行」 does not read on the saved story scene that opens", { tag: tier.gate }, async ({ page, context }) => {
  await page.goto("/");
  // State shortcut (lane 2 in docs/10): Milan's save holds its first sightseeing guide at the first line.
  const placed = await placeGuideSave(page, "milano");
  await page.reload();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  const second = await context.newPage();
  await second.clock.install();
  await second.goto("/");
  const retry = second.getByRole("button", { name: "再試行" });
  await expect(retry).toBeVisible();
  await page.close();
  // The closed tab's lock is gone, so the next check opens the journey without waiting.
  await expect.poll(() => second.evaluate(async () => (await navigator.locks.query()).held?.length ?? 0)).toBe(0);
  const point = await ops.centerOf(retry);
  await ops.holdClock(second);
  await second.touchscreen.tap(point.x, point.y);
  const line = second.getByTestId("dialogue-text");
  // The second tap comes while the guide is on screen (the held clock keeps it a double tap).
  await expect(line).toContainText(placed.activeTourism!.frame!.text);
  await second.touchscreen.tap(point.x, point.y);
  await second.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await second.clock.resume();
  await ops.settled(second);
  await expect(line).toContainText(placed.activeTourism!.frame!.text);
  // It reads on only where a tap would: the picture or the line, not one of the guide's controls.
  expect(await second.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest("#tourism-screen"), point),
    "the second tap landed on the guide").toBe(true);
  expect(await ops.readsOnAt(second, point), "the second tap landed on the guide's picture or line, not on a control").toBe(true);
  expect(await readSave(second)).toEqual(placed);
});

// AGENTS.md 「安全に読み込めないデータを勝手に上書き・削除しない」, docs/07 acceptance 10.
test("an unreadable save stays as it was until the player backs it up and starts again", { tag: tier.gate }, async ({ page }) => {
  const damaged = "{damaged-save";
  await page.goto("/");
  await page.evaluate(([key, raw]) => localStorage.setItem(key, raw), [saveKey(), damaged]);
  await page.reload();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("保存データを読み込めませんでした");
  // The title offers only a start that keeps the original (no plain 「旅をはじめる」).
  await expect(ops.startButton(page)).toContainText("元のデータを退避して新しく始める");

  // Asking to delete and then choosing 「消去せず戻る」 changes nothing.
  await alert.getByRole("button", { name: "保存データを消去する" }).click();
  const confirm = page.getByRole("dialog", { name: "保存データを消去しますか？" });
  await confirm.getByRole("button", { name: "消去せず戻る" }).click();
  await expect(confirm).toBeHidden();
  expect((await allStorage(page))[saveKey()]).toBe(damaged);

  // Starting again keeps the original bytes under a backup key of the same journey.
  await ops.fillNames(page);
  await page.getByRole("button", { name: "元のデータを退避して新しく始める" }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  const storage = await allStorage(page);
  const backups = Object.keys(storage).filter((key) => key.startsWith(`${saveKey()}.backup.`));
  expect(backups.map((key) => storage[key])).toEqual([damaged]);
  expect((await readSave(page)).playerName).toBe("航");
});

// The same with manual saving (docs/07 acceptance 10, writeNewGame/writeExplicitSave): starting again
// writes nothing, and the first セーブ backs the original bytes up before saving over them.
test("with manual saving, an unreadable save stays in place until the first セーブ backs it up", { tag: tier.gate }, async ({ page }) => {
  const damaged = "{damaged-save";
  await ops.startJourney(page);
  await ops.setAutoSave(page, false);
  await page.evaluate(([key, raw]) => localStorage.setItem(key, raw), [saveKey(), damaged]);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("新しく始めた場合、手動セーブ時に元のデータをバックアップします。");
  const backups = async () => {
    const storage = await allStorage(page);
    return Object.keys(storage).filter((key) => key.startsWith(`${saveKey()}.backup.`)).map((key) => storage[key]);
  };

  await ops.fillNames(page);
  await page.getByRole("button", { name: "元のデータを残して新しく始める" }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect((await allStorage(page))[saveKey()]).toBe(damaged);
  expect(await backups()).toEqual([]);

  await ops.manualSave(page);
  await expect(page.getByRole("status").filter({ hasText: "現在の場面を保存しました。" })).toBeVisible();
  expect(await backups()).toEqual([damaged]);
  expect((await readSave(page)).playerName).toBe("航");
});

// writeNewGame refuses a start once the slot no longer holds what the title showed, and the title
// opens nothing then (useGameSession.begin): another tab's newer bytes are neither replaced nor
// backed up as if they were the unreadable save (AGENTS.md 「別タブ競合の保護」).
test("an unreadable save that another tab replaces before the start is kept, and the refused start opens nothing", { tag: tier.gate }, async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(([key]) => localStorage.setItem(key, "{damaged-save"), [saveKey()]);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("保存データを読み込めませんでした");
  // Another tab of the site (not the game, which this tab's lock keeps closed there) writes the slot.
  const other = await context.newPage();
  await other.goto("/favicon-32.png");
  await other.evaluate(([key]) => localStorage.setItem(key, "newer bytes from another tab"), [saveKey()]);
  await other.close();

  await ops.fillNames(page);
  await page.getByRole("button", { name: "元のデータを退避して新しく始める" }).click();
  await expect(page.getByText("別の画面でセーブが更新されています。再読み込みしてからやり直してください。")).toBeVisible();
  await expect(page.getByLabel("主人公の名前")).toBeVisible();
  await expect(page.getByTestId("travel-menu")).toHaveCount(0);
  const storage = await allStorage(page);
  expect(storage[saveKey()]).toBe("newer bytes from another tab");
  expect(Object.keys(storage).filter((key) => key.includes(".backup."))).toEqual([]);
});

// titleSaveActions (docs/10 「画面の保護を担う関数」): over another journey's save the title offers
// neither a start nor deletion; when the storage area cannot be read both stay disabled.
test("the title offers no start or deletion over another journey's save, and disables both when storage cannot be read", { tag: tier.gate }, async ({ page }) => {
  await ops.startJourney(page);
  const otherJourney = journeyCatalog().journeys.find((journey) => journey.id !== "milano" && journey.status === "available")!.id;
  // A Milano save copied into the other journey's slot; Milano's own slot is emptied so the title opens.
  await page.evaluate(([from, to]) => {
    localStorage.setItem(to, localStorage.getItem(from)!);
    localStorage.removeItem(from);
  }, [saveKey(), saveKey(otherJourney)]);
  await page.reload();
  await ops.chooseJourney(page, otherJourney);
  await expect(page.getByRole("alert")).toContainText("保存先の旅行編と現在地の旅行編が一致しないか、現在地を確認できません。元のデータは変更せず保護しています。");
  await expect(page.getByLabel("主人公の名前")).toHaveCount(0);
  await expect(ops.startButton(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "保存データを消去する" })).toHaveCount(0);
  const copied = (await allStorage(page))[saveKey(otherJourney)];
  expect(copied).toContain('"currentCityId":"milano"');

  // The storage area cannot be read (e.g. blocked site data): the title of the journey last opened
  // (the other one, chosen above; the saves cannot be read, that preference can) disables both.
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (key.endsWith(".save.v1")) throw new DOMException("The operation is insecure.", "SecurityError");
      return getItem.call(this, key);
    };
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("このブラウザの保存領域を読み取れません。保存の設定を確認してください。");
  await ops.fillNames(page);
  await expect(ops.startButton(page)).toBeDisabled();
  await expect(page.getByRole("button", { name: "保存データを消去する" })).toBeDisabled();
  expect((await allStorage(page))[saveKey(otherJourney)]).toBe(copied);
});

// AGENTS.md: 未知の新しい版は破損と区別して案内し、削除は対象キーと影響範囲を示し明示確認のうえで行う.
// A double tap on 「保存データを消去する」 (AGENTS.md 「明示確認」「誤タップ防止」): the confirmation opens over
// the button, and its own 「保存データを消去する」 can be under the finger for the second tap (it was at
// 320×568 from 設定). That tap deletes nothing: the confirmation's action takes presses only once the
// confirmation has been on screen a moment (ConfirmActionButton). The page's clock is held, so the
// second tap comes 300 ms after the first however slow the machine.
test("a save from a newer version is reported as such, and deleting it removes only that journey's save and notes", { tag: tier.gate }, async ({ page }) => {
  await page.clock.install();
  const newer = JSON.stringify({ schemaVersion: 999, revision: 1 });
  const others = {
    [`${saveKey()}.backup.1`]: "an earlier backup",
    [saveKey("golden_triangle")]: "another journey's save",
    [learningKey("golden_triangle")]: "another journey's notes",
  };
  await page.goto("/");
  await page.evaluate((items) => { for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value); },
    { ...others, [saveKey()]: newer, [learningKey()]: JSON.stringify({ schemaVersion: 1, revision: 0, alwaysTranslate: false, revealed: {}, marks: {}, records: {}, openQuestion: null, openTopic: null }) });
  await page.reload();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("新しいバージョンの保存データです");
  await expect(alert).toContainText("アプリを更新してください");
  await expect(alert).not.toContainText("保存データを読み込めませんでした");

  const seeded = await allStorage(page);
  await ops.holdClock(page);
  await ops.tap(page, alert.getByRole("button", { name: "保存データを消去する" }));
  const confirm = page.getByRole("dialog", { name: "保存データを消去しますか？" });
  await expect(confirm).toBeVisible();
  const remove = confirm.getByRole("button", { name: "保存データを消去する" });
  await page.clock.runFor(300);
  await ops.tap(page, remove);
  await expect(remove).toBeDisabled();
  await page.clock.resume();
  await expect(remove).toBeEnabled();
  expect(await allStorage(page)).toEqual(seeded);
  await expect(confirm).toContainText("以前に退避したバックアップと、ほかのサイトのデータは消去しません。");
  await remove.click();
  await expect(ops.startButton(page)).toBeVisible();
  await expect(ops.startButton(page)).toHaveAccessibleName(ops.startLabel);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const storage = await allStorage(page);
  expect(storage).not.toHaveProperty([saveKey()]);
  expect(storage).not.toHaveProperty([learningKey()]);
  expect(storage).toMatchObject(others);
});

// AGENTS.md 「削除は対象キーと影響範囲を示し、明示確認と別タブ競合の保護を維持する」, docs/07 「古い保存データの整理」.
// What may be removed is decided by old-data.ts (unit-tested); this checks what only a browser shows: the
// origin's real keys are listed, nothing goes before the second confirmation, a journey open in another
// tab (its Web Lock) refuses the removal, and afterwards exactly the chosen keys are gone.
test("old saved data is listed with its keys, removed only after confirmation and never while its journey is open in another tab", { tag: tier.gate }, async ({ page, context }) => {
  await ops.startJourney(page);
  const indiaName = journeyCatalog().journeys.find((journey) => journey.id === "golden_triangle")!.nameJa;
  const old = {
    [saveKey("golden_triangle")]: JSON.stringify({ schemaVersion: 13, revision: 3, completedChapters: [] }),
    [`${saveKey()}.backup.1762500000000`]: "{damaged-save",
    "dreamscape.save.v1": JSON.stringify({ schemaVersion: 9, revision: 30 }),
    "dreamscape.learning.v1": JSON.stringify({ schemaVersion: 1, records: {} }),
  };
  await page.evaluate((items) => {
    for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value);
    localStorage.setItem("another-app.on-this-origin", "kept");
  }, { ...old, [learningKey("golden_triangle")]: JSON.stringify({ schemaVersion: 1, records: {} }), [DEBUG_MODE_KEY]: "on" });
  const seeded = await allStorage(page);
  expect(seeded[LAST_JOURNEY_KEY]).not.toBe("golden_triangle");

  // Another tab opens the Indian journey (its title reports the old save and holds the journey's lock).
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByRole("alert")).toContainText("別のタブで開いています");
  await ops.chooseJourney(other, "golden_triangle");
  await expect(other.getByRole("alert")).toContainText("保存データの形式はバージョン13です");
  // Choosing it remembers the journey on this device (a preference, never listed for removal); the
  // other tab writes nothing else (the old save it reports stays as it was).
  await expect.poll(async () => (await allStorage(page))[LAST_JOURNEY_KEY]).toBe("golden_triangle");
  const before = await allStorage(page);
  expect(before).toEqual({ ...seeded, [LAST_JOURNEY_KEY]: "golden_triangle" });

  let cleanup = await ops.openOldDataCleanup(page);
  for (const key of Object.keys(old)) await expect(cleanup.getByText(key, { exact: true })).toBeVisible();
  // The save in use, every journey's English notes, the settings, the remembered journey, the Debug-mode switch and other apps' keys are not listed.
  for (const key of [saveKey(), learningKey(), learningKey("golden_triangle"), presentationKey, LAST_JOURNEY_KEY, DEBUG_MODE_KEY, "another-app.on-this-origin"])
    await expect(cleanup.getByText(key, { exact: true })).toHaveCount(0);

  // 「消去せず戻る」 changes nothing.
  let confirm = await ops.chooseOldData(page, cleanup, [new RegExp(`${indiaName}のセーブ（旧版）`), /ミラノ編のバックアップ/]);
  await expect(confirm.getByText(saveKey("golden_triangle"), { exact: true })).toBeVisible();
  await confirm.getByRole("button", { name: "消去せず戻る" }).click();
  expect(await allStorage(page)).toEqual(before);

  // While the other tab has the journey open, nothing is removed.
  await cleanup.getByRole("button", { name: "選んだデータを消去する" }).click();
  await confirm.getByRole("button", { name: "消去する", exact: true }).click();
  await expect(cleanup.getByRole("alert")).toHaveText(`${indiaName}を別のタブで開いているため、何も消去しませんでした。そのタブを閉じてからやり直してください。`);
  expect(await allStorage(page)).toEqual(before);

  // Once it is closed, exactly the chosen keys go; the game in this tab carries on.
  await other.close();
  await cleanup.getByRole("button", { name: "選んだデータを消去する" }).click();
  await confirm.getByRole("button", { name: "消去する", exact: true }).click();
  await expect(cleanup.getByRole("status")).toHaveText("消去しました（キー2個）。");
  const after = await allStorage(page);
  const { [saveKey("golden_triangle")]: _removedSave, [`${saveKey()}.backup.1762500000000`]: _removedBackup, ...kept } = before;
  expect(after).toEqual(kept);
  await ops.closeDialog(cleanup);
  // The reload opens the journey last chosen on this device (the other tab's Indian journey): choose Milan again.
  await page.reload();
  await expect(page.getByLabel("旅行編")).toHaveValue("golden_triangle");
  await ops.chooseJourney(page, "milano");
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  cleanup = await ops.openOldDataCleanup(page);
  await expect(cleanup.getByText(saveKey("golden_triangle"), { exact: true })).toHaveCount(0);
  await expect(cleanup.getByText("dreamscape.learning.v1", { exact: true })).toBeVisible();
  confirm = await ops.chooseOldData(page, cleanup, [/以前のミラノ編のセーブ/, /以前のミラノ編の英語ノート/]);
  await confirm.getByRole("button", { name: "消去する", exact: true }).click();
  await expect(cleanup.getByText("整理できる古い保存データはありません。")).toBeVisible();
  const { "dreamscape.save.v1": _rootSave, "dreamscape.learning.v1": _rootNotes, ...left } = kept;
  expect(await allStorage(page)).toEqual({ ...left, [LAST_JOURNEY_KEY]: "milano" });
});

// The cleanup opened from a journey other than the default one (here the Indian journey) treats that
// journey as the one open in this tab (GameApp passes its own ID): its backups go without a lock (this
// tab holds it) and its own slot is never listed, while Milan's old save is another journey's.
// AGENTS.md 「明示確認」「誤タップ防止」: a quick second tap that reaches 「消去する」 (here tapped on purpose
// 300 ms after 「選んだデータを消去する」) removes nothing: 「消去する」 takes presses only once the
// confirmation has been on screen a moment (ConfirmActionButton). The page's clock is held, so the second
// tap comes 300 ms after the first however slow the machine. (A second tap at the same place lands on
// 「消去せず戻る」: the next test.)
test("from another journey, the cleanup lists that journey's own old data, and a double tap cannot pass its confirmation", { tag: tier.gate }, async ({ page }) => {
  await page.clock.install();
  // The Indian journey opens on its arrival talk; 設定 is already there.
  await page.goto("/");
  await ops.beginJourney(page, "golden_triangle");
  await expect.poll(async () => (await allStorage(page))[saveKey("golden_triangle")]).toBeDefined();
  const name = (journeyId: string) => journeyCatalog().journeys.find((journey) => journey.id === journeyId)!.nameJa;
  const backup = `${saveKey("golden_triangle")}.backup.1762500000000`;
  const old = { [backup]: "{damaged-save", [saveKey()]: JSON.stringify({ schemaVersion: 13, revision: 3, completedChapters: [] }) };
  await page.evaluate((items) => { for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value); }, old);
  // The game keeps writing its own save (the arrival's opening finishes on a timer); it is never
  // listed and is compared apart: it must stay, everything else exactly as expected.
  const besidesGame = async () => {
    const { [saveKey("golden_triangle")]: game, ...rest } = await allStorage(page);
    expect(game).toContain('"schemaVersion":17');
    return rest;
  };
  const before = await besidesGame();

  const cleanup = await ops.openOldDataCleanup(page);
  await expect(cleanup.getByRole("checkbox", { name: new RegExp(`^${name("golden_triangle")}のバックアップ（1件）`) })).toBeVisible();
  await expect(cleanup.getByRole("checkbox", { name: new RegExp(`^${name("milano")}のセーブ（旧版）`) })).toBeVisible();
  for (const key of Object.keys(old)) await expect(cleanup.getByText(key, { exact: true })).toBeVisible();
  await expect(cleanup.getByText(saveKey("golden_triangle"), { exact: true })).toHaveCount(0);

  // The double tap: nothing goes, the confirmation stays until 消去せず戻る or a deliberate press.
  await cleanup.getByRole("checkbox", { name: /のバックアップ（1件）/ }).check();
  const ask = cleanup.getByRole("button", { name: "選んだデータを消去する" });
  const confirm = page.getByRole("dialog", { name: "選んだ保存データを消去しますか？" });
  const remove = confirm.getByRole("button", { name: "消去する", exact: true });
  await ops.holdClock(page);
  await ops.tap(page, ask);
  await expect(confirm).toBeVisible();
  await page.clock.runFor(300);
  await ops.tap(page, remove);
  await expect(remove).toBeDisabled();
  await page.clock.resume();
  await expect(remove).toBeEnabled();
  expect(await besidesGame()).toEqual(before);
  // The wait starts again each time the confirmation opens (here after 「消去せず戻る」).
  await confirm.getByRole("button", { name: "消去せず戻る" }).click();
  await expect(confirm).toBeHidden();
  await ops.holdClock(page);
  await ops.tap(page, ask);
  await expect(confirm).toBeVisible();
  await page.clock.runFor(300);
  await ops.tap(page, remove);
  await expect(remove).toBeDisabled();
  await page.clock.resume();
  await expect(remove).toBeEnabled();
  expect(await besidesGame()).toEqual(before);

  // A deliberate press removes the backup once, without this journey's lock: a second press that
  // reaches the button before it re-renders as disabled (both clicks in one task) removes nothing more
  // and leaves the result shown.
  await remove.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(cleanup.getByRole("status")).toHaveText("消去しました（キー1個）。");
  await expect(cleanup.getByRole("alert")).toHaveCount(0);
  const { [backup]: _removedBackup, ...withoutBackup } = before;
  expect(await besidesGame()).toEqual(withoutBackup);

  // Milan's old save goes under Milan's lock, which no tab holds.
  const next = await ops.chooseOldData(page, cleanup, [new RegExp(`^${name("milano")}のセーブ（旧版）`)]);
  await next.getByRole("button", { name: "消去する", exact: true }).click();
  await expect(cleanup.getByRole("status")).toHaveText("消去しました（キー1個）。");
  await expect(cleanup.getByText("整理できる古い保存データはありません。")).toBeVisible();
  const { [saveKey()]: _removedSave, ...left } = withoutBackup;
  expect(await besidesGame()).toEqual(left);
});

// User decision 2026-11-08 (answer 9), AGENTS.md 「明示確認」「誤タップ防止」: the confirmation's buttons take
// the places of the list's, so 「消去せず戻る」 is exactly where 「選んだデータを消去する」 was and 「消去する」
// where 「閉じる」 was. A slow second tap at the same place, after 「消去する」 has stopped waiting (0.5 s),
// goes back to the list and removes nothing. Checked at the gate's phone and the narrowest one.
for (const size of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
  test(`a slow second tap where 「選んだデータを消去する」 was goes back to the list and removes nothing (${size.width}×${size.height})`, { tag: tier.gate }, async ({ page }) => {
    await page.setViewportSize(size);
    await page.clock.install();
    await ops.startJourney(page);
    await page.evaluate((items) => { for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value); }, {
      [saveKey("golden_triangle")]: JSON.stringify({ schemaVersion: 13, revision: 3, completedChapters: [] }),
      [`${saveKey()}.backup.1762500000000`]: "{damaged-save",
      "dreamscape.learning.v1": JSON.stringify({ schemaVersion: 1, records: {} }),
    });
    const before = await allStorage(page);
    const cleanup = await ops.openOldDataCleanup(page);
    await cleanup.getByRole("checkbox", { name: /ミラノ編のバックアップ/ }).check();
    const ask = cleanup.getByRole("button", { name: "選んだデータを消去する" });
    await ask.scrollIntoViewIfNeeded();
    const box = (await ask.boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const confirm = page.getByRole("dialog", { name: "選んだ保存データを消去しますか？" });
    await ops.holdClock(page);
    await page.touchscreen.tap(point.x, point.y);
    await expect(confirm).toBeVisible();
    await page.clock.runFor(600);
    // 「消去する」 takes presses by now, and it is not under the finger: 「消去せず戻る」 is.
    await expect(confirm.getByRole("button", { name: "消去する", exact: true })).toBeEnabled();
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent, point)).toBe("消去せず戻る");
    await page.touchscreen.tap(point.x, point.y);
    await page.clock.resume();
    await expect(confirm).toBeHidden();
    await expect(page.getByRole("dialog", { name: "古い保存データの整理" })).toBeVisible();
    expect(await allStorage(page)).toEqual(before);
  });

  // The other way round: after the result, 「閉じる」 is where 「消去する」 was. A quick second tap of a
  // double tap on 「消去する」 (200 ms, the page's clock held) must not close the dialog before the
  // result line is seen: the list's buttons wait a moment after a result (OldDataCleanup).
  test(`a quick second tap where 「消去する」 was keeps the result shown (${size.width}×${size.height})`, { tag: tier.gate }, async ({ page }) => {
    await page.setViewportSize(size);
    await page.clock.install();
    await ops.startJourney(page);
    const backup = `${saveKey()}.backup.1762500000000`;
    await page.evaluate((items) => { for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value); }, {
      [saveKey("golden_triangle")]: JSON.stringify({ schemaVersion: 13, revision: 3, completedChapters: [] }),
      [backup]: "{damaged-save",
      "dreamscape.learning.v1": JSON.stringify({ schemaVersion: 1, records: {} }),
    });
    const { [backup]: _removed, ...kept } = await allStorage(page);
    const cleanup = await ops.openOldDataCleanup(page);
    const confirm = await ops.chooseOldData(page, cleanup, [/ミラノ編のバックアップ/]);
    const remove = confirm.getByRole("button", { name: "消去する", exact: true });
    await expect(remove).toBeEnabled();
    const box = (await remove.boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await ops.holdClock(page);
    await page.touchscreen.tap(point.x, point.y);
    const result = cleanup.getByRole("status");
    await expect(result).toHaveText("消去しました（キー1個）。");
    await page.clock.runFor(200);
    const close = cleanup.getByRole("button", { name: "閉じる", exact: true });
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent, point)).toBe("閉じる");
    await expect(close).toBeDisabled();
    await page.touchscreen.tap(point.x, point.y);
    await expect(cleanup).toBeVisible();
    await expect(result).toBeVisible();
    await page.clock.resume();
    await expect(close).toBeEnabled();
    await expect(result).toBeVisible();
    expect(await allStorage(page)).toEqual(kept);
  });
}

// AGENTS.md 「保存領域の読込失敗…」 and the save rule of docs/02: a write that fails says so,
// changes nothing, never locks the player out, and the last good save is what a reload resumes.
test("a save that cannot be written is reported, the game stays usable and the last good save survives", { tag: tier.gate }, async ({ page }) => {
  // Only the save key fails, and only while the page's flag is set (test-side only; the game is unchanged).
  await page.addInitScript((key) => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (name === key && (window as unknown as { failSaveWrites?: boolean }).failSaveWrites)
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      return write.call(this, name, value);
    };
  }, saveKey());
  await ops.startJourney(page);
  const good = await readSave(page);
  await page.evaluate(() => { (window as unknown as { failSaveWrites?: boolean }).failSaveWrites = true; });

  const notice = page.getByRole("status").filter({ hasText: "保存できませんでした。空き容量やブラウザの保存設定を確認して、もう一度お試しください。" });
  await ops.goTo(page, "p_duomo");
  await expect(notice).toBeVisible();
  await expect(page.getByTestId("tourism-guide")).toHaveCount(0);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(await readSave(page)).toEqual(good);
  // The notice closes and the same action can be tried again.
  await notice.getByRole("button", { name: "閉じる" }).click();
  await expect(notice).toHaveCount(0);
  await ops.goTo(page, "p_duomo");
  await expect(notice).toBeVisible();
  expect(await readSave(page)).toEqual(good);

  await page.reload();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(await readSave(page)).toEqual(good);
  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect((await readSave(page)).revision).toBeGreaterThan(good.revision);
});
