import { allStorage, expect, journeyCatalog, learningKey, ops, playUntil, presentationKey, readSave, saveKey, test, tier } from "./helpers";

// Lane 1 (docs/10): saving and resuming are only ever checked through the real flow.

// AGENTS.md 「同一バージョン内の保存・再開を守る」「セーブ再開で二重消費しない」; docs/07 acceptance 2, 5, 6 and 「英語学習データと保存の方針」.
test("autosaved progress, a battle question, the English note and the text speed are restored after a reload", { tag: tier.gate }, async ({ page }) => {
  test.setTimeout(120_000);
  await ops.startJourney(page);
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
test("a manual save keeps the saved position and settings when unsaved changes are discarded", { tag: tier.gate }, async ({ page }) => {
  await ops.startJourney(page);
  await ops.setAutoSave(page, false);
  const initial = await readSave(page);

  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect(await readSave(page)).toEqual(initial);
  await ops.manualSave(page);
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

  // ロード asks too, and loading brings the manual save's scene back.
  await page.getByTestId("tourism-skip").click();
  await page.getByRole("navigation", { name: "旅の操作" }).getByRole("button", { name: "ロード", exact: true }).click();
  const loading = page.getByRole("dialog", { name: "保存した場面を読み込みますか？" });
  await loading.getByRole("button", { name: "ロードする", exact: true }).click();
  await expect(loading).toBeHidden();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "保存した場面から再開しました。" })).toBeVisible();
  expect(prompts).toEqual(["beforeunload"]);
});

// AGENTS.md 「明示確認と別タブ競合の保護を維持する」: a second tab never overwrites the first one's progress.
test("a second tab cannot open a journey that is already open", { tag: tier.gate }, async ({ page, context }) => {
  await ops.startJourney(page, "milano", ["先の名前", "あゆみ"]);
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
  // AGENTS.md 「アクセシビリティを考慮する」: 再試行 disappears with the lock message, so the
  // resumed game's main area takes the focus instead of leaving it on the page body.
  await expect(second.getByRole("main")).toBeFocused();
  await expect(second.getByTestId("travelers")).toContainText("先の名前");
  expect(await allStorage(second)).toEqual(saved);
});

// AGENTS.md 「安全に読み込めないデータを勝手に上書き・削除しない」, docs/07 acceptance 10.
test("an unreadable save stays as it was until the player backs it up and starts again", { tag: tier.gate }, async ({ page }) => {
  const damaged = "{damaged-save";
  await page.goto("/");
  await page.evaluate(([key, raw]) => localStorage.setItem(key, raw), [saveKey(), damaged]);
  await page.reload();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("保存データを読み込めませんでした");
  await expect(page.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);

  // Asking to delete and then choosing 「消去せず戻る」 changes nothing.
  await alert.getByRole("button", { name: "保存データを消去する" }).click();
  const confirm = page.getByRole("dialog", { name: "保存データを消去しますか？" });
  await confirm.getByRole("button", { name: "消去せず戻る" }).click();
  await expect(confirm).toBeHidden();
  expect((await allStorage(page))[saveKey()]).toBe(damaged);

  // Starting again keeps the original bytes under a backup key of the same journey.
  await page.getByLabel("主人公の名前").fill("航");
  await page.getByLabel("ヒロインの名前").fill("澪");
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

  await page.getByLabel("主人公の名前").fill("航");
  await page.getByLabel("ヒロインの名前").fill("澪");
  await page.getByRole("button", { name: "元のデータを残して新しく始める" }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect((await allStorage(page))[saveKey()]).toBe(damaged);
  expect(await backups()).toEqual([]);

  await ops.manualSave(page);
  await expect(page.getByRole("status").filter({ hasText: "現在の場面を保存しました。" })).toBeVisible();
  expect(await backups()).toEqual([damaged]);
  expect((await readSave(page)).playerName).toBe("航");
});

// AGENTS.md: 未知の新しい版は破損と区別して案内し、削除は対象キーと影響範囲を示し明示確認のうえで行う.
test("a save from a newer version is reported as such, and deleting it removes only that journey's save and notes", { tag: tier.gate }, async ({ page }) => {
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

  await alert.getByRole("button", { name: "保存データを消去する" }).click();
  const confirm = page.getByRole("dialog", { name: "保存データを消去しますか？" });
  await expect(confirm).toContainText("以前に退避したバックアップと、ほかのサイトのデータは消去しません。");
  await confirm.getByRole("button", { name: "保存データを消去する" }).click();
  await expect(page.getByRole("button", { name: "旅をはじめる", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  const storage = await allStorage(page);
  expect(storage).not.toHaveProperty([saveKey()]);
  expect(storage).not.toHaveProperty([learningKey()]);
  expect(storage).toMatchObject(others);
});

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
