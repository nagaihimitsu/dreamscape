import { DOUBLE_TAP_WINDOW_MS } from "../../src/components/double-tap";
import type { GameState } from "../../src/domain/game";
import { DEBUG_HOOK_NAME, type DreamscapeDebugHook } from "../../src/dev/debug-hook";
import { debugQueryString, type DebugSettings } from "../../src/dev/debug-query";
import { test as base, bothStorages, debugGame, devModules, expect, ops, placeSave, playUntil, tier, type Page } from "./helpers";

// Lane 3 (docs/10「Debugを場面の起動台にする」): Debug opens scenes that the real
// flow reaches only after many steps. These tests check that a scene can be played
// through and left; they never count as save/resume checks (AGENTS.md: Debugを通常の
// 保存・再開確認の代わりにしない). Development server only.
// Every test starts next to a normal saved game and ends with both browser storages
// exactly as before (docs/07 acceptance 14: Debug never changes the player's data).
const test = base.extend<{ normalStorageUnchanged: void }>({
  normalStorageUnchanged: [async ({ page }, use) => {
    await page.goto("/");
    await placeSave(page, "milano", "newJourney", "milano", ["航", "澪"]);
    const before = await bothStorages(page);
    await use();
    expect(await bothStorages(page), "Debug changed the normal browser storage").toEqual(before);
  }, { auto: true }],
});

const settings = (input: Pick<DebugSettings, "cityId" | "scene" | "id"> & Partial<DebugSettings>): DebugSettings =>
  ({ progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive", ...input });

type SpecialBattle = { cityId: string; battleId: string; correctClueIds: string[] };

/** The first special battle of each kind that Debug lists, read from the dev server's content (no fixed IDs). */
function specialBattles(page: Page): Promise<Partial<Record<"contradiction" | "connection", SpecialBattle>>> {
  return page.evaluate(async (modules) => {
    const { battles, getCities } = await import(/* @vite-ignore */ modules.content);
    const { debugTargets } = await import(/* @vite-ignore */ modules.debugState);
    const found: Record<string, SpecialBattle> = {};
    for (const city of getCities().filter((item: { productionStatus?: string }) => item.productionStatus !== "prototype")) {
      const listed = new Set(debugTargets(city.id).battle.map((target: { id: string }) => target.id));
      for (const battle of battles)
        if (battle.reasoning && listed.has(battle.id) && !found[battle.reasoning.kind])
          found[battle.reasoning.kind] = { cityId: city.id, battleId: battle.id, correctClueIds: battle.reasoning.correctClueIds };
    }
    return found;
  }, devModules);
}

for (const [kind, label] of [["contradiction", "B（矛盾追及）"], ["connection", "C（証拠連結）"]] as const) {
  // docs/07 「将来のテスト」: B/C特殊戦で証拠メモを開閉しても回答状態保持. Special battles lead to
  // the city finale, so an evidence screen that does not accept the right evidence stops every player.
  test(`special battle ${label}: the evidence chosen in the clue book stays chosen, is accepted and leads to the result`, { tag: tier.debug }, async ({ page }) => {
    const special = (await specialBattles(page))[kind];
    expect(special, `a ${kind} special battle that Debug lists`).toBeDefined();
    await ops.openDebugScene(page, settings({ cityId: special!.cityId, scene: "battle", id: special!.battleId }));
    await playUntil(page, (state) => state.activeBattle?.phase === "reasoning", { source: debugGame });
    await ops.passReasoningIntro(page);
    await ops.chooseEvidence(page, special!.correctClueIds);
    const count = special!.correctClueIds.length;
    await expect(page.getByTestId("selected-evidence")).toContainText(`選んだ証拠 ${count} / ${count}枚`);
    const chosen = (await debugGame(page))!.activeBattle!.reasoning!.selectedClueIds;
    expect([...chosen].sort()).toEqual([...special!.correctClueIds].sort());
    // Opening and closing the clue book again keeps the choice.
    await page.getByTestId("reasoning-notebook").click();
    for (const clueId of special!.correctClueIds)
      await expect(page.getByTestId("clue-picker").locator(`option[value="${clueId}"]`)).toContainText("（選択中）");
    await page.getByTestId("cluebook-close").click();
    expect((await debugGame(page))!.activeBattle!.reasoning!.selectedClueIds).toEqual(chosen);

    await page.getByTestId("reasoning-submit").click();
    const result = await playUntil(page, (state) => state.activeBattle?.phase === "result", { source: debugGame });
    expect(result.activeBattle!.reasoning).toMatchObject({ submittedClueIds: chosen });
    await expect(page.getByTestId("battle-result")).toBeVisible();
    await ops.backToDebugSettings(page);
  });
}

type ItemEncounter = { cityId: string; encounterId: string; itemId: string; itemName: string; correctOptionId?: string };

/**
 * The first encounter Debug can open that gives an item, from the dev server's content;
 * `byAnswer`: one whose English answer gives it (the scene goes on with the item held).
 */
function itemEncounter(page: Page, byAnswer = false): Promise<ItemEncounter | undefined> {
  return page.evaluate(async ({ modules, byAnswer }) => {
    const { getCities } = await import(/* @vite-ignore */ modules.content);
    const { encounters } = await import(/* @vite-ignore */ modules.encounters);
    const { debugTargets } = await import(/* @vite-ignore */ modules.debugState);
    for (const city of getCities().filter((item: { productionStatus?: string }) => item.productionStatus !== "prototype"))
      for (const target of debugTargets(city.id).encounter.filter((item: { unavailable?: string }) => !item.unavailable)) {
        const encounter = encounters.encounters.find((item: { id: string }) => item.id === target.id);
        const itemId = byAnswer ? encounter.quiz?.rewardItemId : encounter.quiz?.rewardItemId ?? encounter.completionItemId;
        const itemName = encounters.items.find((item: { id: string }) => item.id === itemId)?.nameJa;
        if (itemId) return { cityId: city.id, encounterId: encounter.id, itemId, itemName, correctOptionId: encounter.quiz?.question.correctOptionId };
      }
    return undefined;
  }, { modules: devModules, byAnswer });
}

// AGENTS.md 「英語は…道中交流で主人公の返答・行動を選ぶ3択に用いる」「道中の品物は所属都市を登録し…」.
test("an encounter answered in English gives its item, and the scene ends back at the place", { tag: tier.debug }, async ({ page }) => {
  const encounter = await itemEncounter(page);
  expect(encounter, "an encounter with an item that Debug can open").toBeDefined();
  // A won reward needs the saved ticket below its chance: the positive ticket (0) always wins.
  await ops.openDebugScene(page, settings({ cityId: encounter!.cityId, scene: "encounter", id: encounter!.encounterId, roll: "positive" }));
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  const pick = (state: GameState) => state.activeEncounter?.phase === "quiz" ? encounter!.correctOptionId! : "A";
  const done = await playUntil(page, (state) => state.completedEncounterIds.includes(encounter!.encounterId), { source: debugGame, pick });
  expect(done.inventory[encounter!.itemId]).toBe("held");
  // The header lists it among the items held in this city.
  await expect(page.getByRole("group", { name: "所持アイテム" }).getByRole("button", { name: `${encounter!.itemName}の詳細` })).toBeVisible();
  // Encounters waiting at the same place may follow; the scene ends back at the place or the travel menu.
  await playUntil(page, (state) => !state.activeEncounter, { source: debugGame, pick });
  await expect(page.getByTestId("observation-viewport").or(page.getByTestId("travel-menu"))).toBeVisible();
  await ops.backToDebugSettings(page);
});

// docs/07 acceptance 3, 4 and AGENTS.md 「恋愛の選択は固定正解とせず…保存済み乱数によって…変わる」:
// with the most favourable (0) and the least favourable (9999) saved ticket, a date plays to its end.
for (const roll of ["positive", "negative"] as const) {
  test(`a date with the ${roll} reaction ticket plays to its end`, { tag: tier.debug }, async ({ page }) => {
    const date = await page.evaluate(async (modules) => {
      const { debugTargets, defaultDebugCityId } = await import(/* @vite-ignore */ modules.debugState);
      return { cityId: defaultDebugCityId as string, dateId: debugTargets(defaultDebugCityId).date[0]?.id as string | undefined };
    }, devModules);
    expect(date.dateId, "a date of Debug's default city").toBeDefined();
    await ops.openDebugScene(page, settings({ cityId: date.cityId, scene: "date", id: date.dateId!, ap: 6, roll }));
    await expect(page.getByTestId("romance-scene")).toBeVisible();
    const opened = (await debugGame(page))!;
    expect(opened.activeDate?.dateId).toBe(date.dateId);
    const finished = await playUntil(page, (state) => !state.activeDate, { source: debugGame });
    expect(finished.playedDateIds).toContain(date.dateId);
    expect(finished.ap).toBe(opened.ap);
    await expect(page.getByTestId("travel-menu")).toBeVisible();
    await ops.backToDebugSettings(page);
  });
}

test("a Debug launch URL opens its scene, offers the same URL and explains a URL that does not fit", { tag: tier.debug }, async ({ page }) => {
  const url = debugQueryString({ dataMode: "real", cityId: "milano", scene: "date", target: "milano_brera_date_01",
    progress: "completed", ap: 9, affection: 0, trust: 0, spark: 0, roll: "negative" });
  await page.goto(`/${url}`);
  await expect(page.getByTestId("debug-session")).toBeVisible();
  await expect(page.getByTestId("romance-scene")).toBeVisible();
  // The development-only, read-only hook shows Debug's own game (its date spent AP from 9).
  const debug = await page.evaluate((name) => {
    const hook = (window as unknown as Record<string, DreamscapeDebugHook>)[name];
    return { state: hook.getState(), scene: hook.getScene() };
  }, DEBUG_HOOK_NAME);
  expect(debug.state?.activeDate?.dateId).toBe("milano_brera_date_01");
  expect(debug.state?.ap).toBeLessThan(9);
  expect(debug.scene?.url).toBe(url);
  // Back on the settings screen, the same scene's URL is offered for copying.
  await ops.backToDebugSettings(page);
  await expect(page.getByTestId("debug-url")).toHaveValue(new URL(url, page.url()).href);
  // A URL that does not fit the content says why and links back to the settings screen.
  await page.goto("/?debug&city=milano&scene=battle&target=gt_delhi_main_red_fort_battle");
  await expect(page.getByRole("alert")).toHaveText("「gt_delhi_main_red_fort_battle」はミラノの「バトル」にありません。");
  await page.getByRole("link", { name: "場面の確認（設定画面）へ" }).click();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
});

type TapScene = "encounter" | "epilogue" | "battle" | "rebuttal" | "tourism";
type TapTarget = { cityId: string; scene: DebugSettings["scene"]; id: string };

/** One scene of each kind in Debug's default city, from the dev server's content (no fixed IDs). */
function tapTargets(page: Page): Promise<Partial<Record<TapScene, TapTarget>>> {
  return page.evaluate(async (modules) => {
    const { battles, reasoningIntroductions } = await import(/* @vite-ignore */ modules.content);
    const { debugTargets, defaultDebugCityId } = await import(/* @vite-ignore */ modules.debugState);
    const cityId: string = defaultDebugCityId;
    const listed: Record<string, { id: string; unavailable?: string }[]> = debugTargets(cityId);
    const special = (id: string) => !!battles.find((battle: { id: string; reasoning?: unknown }) => battle.id === id)?.reasoning;
    const choices: [TapScene, DebugSettings["scene"], (id: string) => boolean][] = [
      ["encounter", "encounter", () => true], ["epilogue", "epilogue", () => true],
      ["battle", "battle", (id) => !special(id)], ["rebuttal", "battle", (id) => !!reasoningIntroductions[id]],
      ["tourism", "tourism", () => true],
    ];
    const found: Partial<Record<TapScene, TapTarget>> = {};
    for (const [kind, scene, fits] of choices) {
      const id = listed[scene].find((item) => !item.unavailable && fits(item.id))?.id;
      if (id) found[kind] = { cityId, scene, id };
    }
    return found;
  }, devModules);
}

/** The scene shows a line to read on (no choice, quiz or last line); the rebuttal is presentation only, not saved. */
const reading: Record<TapScene, (state: GameState) => boolean> = {
  encounter: (state) => !!state.activeEncounter && !state.activeEncounter.frame.choices.length && !state.activeEncounter.frame.ended &&
    state.activeEncounter.phase !== "quiz" && state.activeEncounter.phase !== "feedback",
  epilogue: (state) => !!state.activeEpilogue && !state.activeEpilogue.frame.ended,
  battle: (state) => state.activeBattle?.phase === "dialogue" && !state.activeBattle.frame?.ended,
  rebuttal: (state) => state.activeBattle?.phase === "reasoning",
  tourism: (state) => state.activeTourism?.phase === "guide" && !state.activeTourism.frame?.ended,
};

// User idea (2026-11-07, docs/02 「UX/スマホ」): in every story scene a tap anywhere but on a control
// reads on, one step per tap. The tourism guide and the date are played in play.spec.ts; these are
// the other scene kinds (encounter, epilogue — the arrival uses the same screen —, battle dialogue,
// and a special battle's presentation-only rebuttal).
for (const kind of ["encounter", "epilogue", "battle", "rebuttal"] as const) {
  test(`${kind}: a tap on the picture reads one step on, a click between the window's tools or a double tap on the log's 「閉じる」 does not`, { tag: tier.debug }, async ({ page }) => {
    const target = (await tapTargets(page))[kind];
    expect(target, `a ${kind} that Debug opens in its default city`).toBeDefined();
    // Time runs normally; it is held only for the double tap below.
    await page.clock.install();
    await ops.openDebugScene(page, settings(target!));
    await playUntil(page, reading[kind], { source: debugGame });
    const line = page.getByTestId("dialogue-text");
    await expect(line).toHaveAttribute("data-ready", "true");
    const before = (await debugGame(page))!;
    const text = await line.textContent();
    // A click in a gap of the tool row is a near miss of its buttons: nothing moves.
    const gap = await ops.dialogueToolsGap(page);
    await page.mouse.click(gap.x, gap.y);
    expect((await debugGame(page))!.revision).toBe(before.revision);
    expect(await line.textContent()).toBe(text);
    // A quick double tap on the log's 「閉じる」: the second tap lands on the scene the log leaves
    // behind, within the moment a press on a control settles the scene, and does not read on.
    const log = await ops.openDialogueLog(page);
    const close = await ops.centerOf(log.getByRole("button", { name: "閉じる", exact: true }));
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
    await ops.doubleTap(page, close);
    await expect(log).toBeHidden();
    await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
    await page.clock.resume();
    await ops.settled(page);
    expect((await debugGame(page))!.revision).toBe(before.revision);
    expect(await line.textContent()).toBe(text);
    // A tap on the picture (the battle's stage) goes one line on, like a tap on the line.
    await ops.tap(page, await ops.sceneBackgroundPoint(page));
    await expect(line).not.toHaveText(text!);
    expect((await debugGame(page))!.revision).toBe(kind === "rebuttal" ? before.revision : before.revision + 1);
  });
}

// A presentation-only scene end (the special battle's rebuttal) holds taps like a saved one: the
// tap on its last line brings the cut-in, whose 「スキップ」 must not take the double tap's second tap.
test("rebuttal: the tap that ends it does not also skip the cut-in under the finger", { tag: tier.debug }, async ({ page }) => {
  const target = (await tapTargets(page)).rebuttal;
  expect(target, "a special battle with a rebuttal that Debug opens in its default city").toBeDefined();
  await page.clock.install();
  await ops.openDebugScene(page, settings(target!));
  await playUntil(page, reading.rebuttal, { source: debugGame });
  const line = page.getByTestId("dialogue-text");
  const last = page.getByTestId("reasoning-rebuttal-advance");
  for (let step = 0; step < 50 && !(await last.isVisible()); step++) {
    const text = await line.textContent();
    await ops.tap(page, await ops.sceneBackgroundPoint(page));
    await expect(line).not.toHaveText(text!);
  }
  await expect(last).toBeVisible();
  const end = await ops.sceneBackgroundPoint(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await ops.doubleTap(page, end);
  const cutIn = page.getByTestId("reasoning-cutin");
  await expect(cutIn).toBeVisible();
  const skip = (await page.getByTestId("reasoning-cutin-skip").boundingBox())!;
  await page.touchscreen.tap(skip.x + skip.width / 2, skip.y + skip.height / 2);
  await expect(cutIn).toBeVisible();
  // After the moment the skip works. The clock stays held, so the cut-in cannot end by itself first.
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await ops.settled(page);
  await page.getByTestId("reasoning-cutin-skip").click();
  await expect(page.getByTestId("reasoning-notebook")).toBeVisible();
  await page.clock.resume();
});

// A story scene that starts under the finger (here the enemy's reaction after an answer's
// feedback) does not take the second tap of the double tap that started it: taps are held for
// a moment, so its first line is not read on before it is seen (lines appear whole here).
test("battle: a double tap on 「敵の反応を見る」 opens the reaction and stays on its first line", { tag: tier.debug }, async ({ page }) => {
  const target = (await tapTargets(page)).battle;
  expect(target, "a battle that Debug opens in its default city").toBeDefined();
  await page.clock.install();
  await ops.openDebugScene(page, settings(target!));
  const feedback = await playUntil(page, (state) => state.activeBattle?.phase === "feedback", { source: debugGame });
  const reaction = await ops.centerOf(page.getByTestId("battle-advance"));
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await ops.doubleTap(page, reaction);
  await expect.poll(async () => (await debugGame(page))!.activeBattle?.phase).toBe("dialogue");
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.settled(page);
  expect((await debugGame(page))!.revision).toBe(feedback.revision + 1);
});

// docs/02 「UX/スマホ」: nothing reads on while something is open over the scene. The header's
// held-item detail closes on a tap anywhere outside it; that tap only closes it.
test("encounter: the tap on the picture that closes the held-item detail does not read on", { tag: tier.debug }, async ({ page }) => {
  const encounter = await itemEncounter(page, true);
  expect(encounter, "an encounter whose English answer gives an item, that Debug can open").toBeDefined();
  // A won reward needs the saved ticket below its chance: the positive ticket (0) always wins.
  await ops.openDebugScene(page, settings({ cityId: encounter!.cityId, scene: "encounter", id: encounter!.encounterId, roll: "positive" }));
  const pick = (state: GameState) => state.activeEncounter?.phase === "quiz" ? encounter!.correctOptionId! : "A";
  const held = await playUntil(page, (state) => !state.activeEncounter || state.inventory[encounter!.itemId] === "held" && reading.encounter(state), { source: debugGame, pick });
  expect(held.activeEncounter, "a line to read after the item is given").not.toBeNull();
  const line = page.getByTestId("dialogue-text");
  const text = await line.textContent();
  const picture = await ops.sceneBackgroundPoint(page);
  const items = page.getByRole("group", { name: "所持アイテム" });
  await items.getByRole("button", { name: `${encounter!.itemName}の詳細` }).click();
  await expect(items.getByRole("dialog")).toBeVisible();
  await ops.tap(page, picture);
  await expect(items.getByRole("dialog")).toBeHidden();
  await expect(line).toHaveText(text!);
  // The next tap reads one line on: the closing tap did not.
  await ops.tap(page, picture);
  await expect.poll(async () => (await debugGame(page))!.revision).toBe(held.revision + 1);
});

// User idea (2026-11-07): the whole screen reads on, not only the scene's picture. The guide's
// heading strip (the landmark's name beside 手がかり帳) on a phone, and on a wide screen the page's
// margin beside the guide, which keeps a phone-like width there.
test("tourism: a tap on the landmark's heading, and on a wide screen on the page's margin, reads one step on", { tag: tier.debug }, async ({ page }) => {
  const target = (await tapTargets(page)).tourism;
  expect(target, "a guide that Debug opens in its default city").toBeDefined();
  await ops.openDebugScene(page, settings(target!));
  await playUntil(page, reading.tourism, { source: debugGame });
  const line = page.getByTestId("dialogue-text");
  const before = (await debugGame(page))!;
  const heading = page.getByTestId("tourism-screen").getByRole("heading", { level: 1 });
  await ops.tap(page, await ops.centerOf(heading));
  await expect.poll(async () => (await debugGame(page))!.revision).toBe(before.revision + 1);
  await page.setViewportSize({ width: 1280, height: 800 });
  const text = await line.textContent();
  const margin = await page.getByTestId("tourism-screen").evaluate((screen) => {
    const box = screen.getBoundingClientRect();
    return { x: box.left / 2, y: box.top + box.height / 3 };
  });
  expect(margin.x, "the guide is narrower than the wide screen").toBeGreaterThan(20);
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, margin), "the point is the page's own margin").toBe("main");
  await ops.settled(page);
  await page.mouse.click(margin.x, margin.y);
  await expect(line).not.toHaveText(text!);
  expect((await debugGame(page))!.revision).toBe(before.revision + 2);
});
