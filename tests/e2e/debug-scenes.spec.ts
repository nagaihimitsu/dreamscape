import { DOUBLE_TAP_WINDOW_MS } from "../../src/components/double-tap";
import type { GameState } from "../../src/domain/game";
import { DEBUG_HOOK_NAME, type DreamscapeDebugHook } from "../../src/dev/debug-hook";
import { debugQueryString, type DebugSettings } from "../../src/dev/debug-query";
import { describeRelationshipChange, relationshipChange } from "../../src/domain/relationship-change";
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

// Long flows (docs/10「不安定さと時間の決まり」): every test here loads the app at least twice on
// the development server and plays a scene, where each press of a control is followed by the game's
// 350-ms guard. On CI they take 6–22 s; on 2026-11-08 a runner about four times slower than usual
// (its dev server started in 93 s instead of 23 s) ran 9 of the 15 tests this file then had out of
// the default 30 s (in one of them the page.clock.pauseAt still pending then, now ops.holdClock,
// also failed with "Cannot fast-forward to the past").
test.describe.configure({ timeout: 120_000 });

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

type ItemEncounter = {
  cityId: string; encounterId: string; itemId: string; itemName: string; correctOptionId?: string;
  /** The choices of every encounter that use the item up (`<encounter ID>:<option ID>`). */
  usingChoices: string[];
  /** Where in its landmark's visit it runs: while observing (`observe`), or before or after the main part. */
  slot: string;
};

/** The first encounter Debug can open that gives an item and is answered with a choice, from the dev server's content. */
function itemEncounter(page: Page): Promise<ItemEncounter | undefined> {
  return page.evaluate(async (modules) => {
    const { getCities } = await import(/* @vite-ignore */ modules.content);
    const { encounters } = await import(/* @vite-ignore */ modules.encounters);
    const { encounterVisitSlot } = await import(/* @vite-ignore */ modules.encounter);
    const { debugTargets } = await import(/* @vite-ignore */ modules.debugState);
    type Option = { id: string; consumeItemId?: string };
    for (const city of getCities().filter((item: { productionStatus?: string }) => item.productionStatus !== "prototype"))
      for (const target of debugTargets(city.id).encounter.filter((item: { unavailable?: string }) => !item.unavailable)) {
        const encounter = encounters.encounters.find((item: { id: string }) => item.id === target.id);
        const itemId = encounter.quiz?.rewardItemId ?? encounter.completionItemId;
        const itemName = encounters.items.find((item: { id: string }) => item.id === itemId)?.nameJa;
        const usingChoices = encounters.encounters.flatMap((item: { id: string; options?: Option[] }) =>
          (item.options ?? []).filter((option) => option.consumeItemId === itemId).map((option) => `${item.id}:${option.id}`));
        if (itemId && encounter.options?.length)
          return { cityId: city.id, encounterId: encounter.id, itemId, itemName, correctOptionId: encounter.quiz?.question.correctOptionId, usingChoices,
            slot: encounterVisitSlot(encounter.id) ?? "" };
      }
    return undefined;
  }, devModules);
}

// AGENTS.md 「英語は基本的にクイズと、道中交流で主人公の返答・行動を選ぶ選択肢（ふつうは3択。数は制作者が決める）に用いる」「品物は所属都市を登録し、その都市で入手する…」.
test("an encounter answered in English gives its item, and its moment goes on (to the observation, or to free time after a battle)", { tag: tier.debug }, async ({ page }) => {
  const encounter = await itemEncounter(page);
  expect(encounter, "an encounter with an item that Debug can open").toBeDefined();
  // A scene after a landmark's battle (Milan's Nora) is met from the journey's start, as Debug plays the visit to it.
  const observing = encounter!.slot === "observe";
  // A won reward needs the saved ticket below its chance: the positive ticket (0) always wins.
  await ops.openDebugScene(page, settings({ cityId: encounter!.cityId, scene: "encounter", id: encounter!.encounterId, roll: "positive",
    ...(observing ? {} : { progress: "initial" as const }) }));
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  // A scene that follows in the same moment may use the item up: there the first choice that keeps it is pressed, so the
  // item is still held when the moment goes on.
  const pick = (state: GameState) => {
    const active = state.activeEncounter;
    if (active?.phase === "quiz") return encounter!.correctOptionId!;
    const keeping = active?.frame.choices.findIndex((choice) => !encounter!.usingChoices.includes(`${active.encounterId}:${choice.optionId}`)) ?? 0;
    return String.fromCharCode(65 + Math.max(keeping, 0));
  };
  const done = await playUntil(page, (state) => state.completedEncounterIds.includes(encounter!.encounterId), { source: debugGame, pick });
  expect(done.inventory[encounter!.itemId]).toBe("held");
  // Debug meets the encounter at its moment, as play does: met while observing, it ends back in that observation (encounters
  // waiting there may follow); met after the battle, the visit goes on to free time.
  const after = await playUntil(page, (state) => !state.activeEncounter, { source: debugGame, pick });
  if (observing) {
    expect(after.activeTourism, "the observation the encounter started from").not.toBeNull();
    await expect(page.getByTestId("observation-viewport")).toBeVisible();
  } else {
    expect(after.activeTourism).toBeNull();
    await expect(page.getByTestId("travel-menu")).toBeVisible();
  }
  // There the header lists it among the items held in this city (over a conversation it shows them only
  // at a choice): its detail (or, with more items, the list of every held item) names it.
  await expect(await ops.openHeldItems(page)).toContainText(encounter!.itemName);
  await page.keyboard.press("Escape");
  await ops.backToDebugSettings(page);
});

// docs/07 acceptance 3, 4 and AGENTS.md 「恋愛の選択では、言葉の特性・現在の関係・保存済み乱数によって会話と複数軸の影響が変わる噛み合いも使える」:
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
    // Debug always shows a reply's relationship change (as Debug mode does in play): exactly the saved difference.
    const choosing = await playUntil(page, (state) => !!state.activeDate?.frame.choices.length, { source: debugGame });
    await page.getByTestId("date-choice").first().click();
    await expect.poll(async () => (await debugGame(page))!.revision).toBe(choosing.revision + 1);
    const change = relationshipChange(choosing, (await debugGame(page))!);
    await expect.poll(() => page.getByTestId("relationship-change").locator("p").allTextContents()).toEqual(describeRelationshipChange(change!));
    const finished = await playUntil(page, (state) => !state.activeDate, { source: debugGame });
    expect(finished.playedDateIds).toContain(date.dateId);
    expect(finished.ap).toBe(opened.ap);
    await expect(page.getByTestId("travel-menu")).toBeVisible();
    await ops.backToDebugSettings(page);
  });
}

test("a Debug launch URL opens its scene and offers the same URL", { tag: tier.debug }, async ({ page }) => {
  const url = debugQueryString({ dataMode: "real", cityId: "milano", scene: "date", target: "milano_brera_date_01",
    progress: "completed", ap: 9, affection: 0, trust: 0, spark: 0, roll: "negative" });
  await page.goto(`/${url}`);
  await ops.debugShown(page.getByTestId("debug-session"));
  await expect(page.getByTestId("romance-scene")).toBeVisible();
  // The development-only, read-only hook shows Debug's own game (its date spent AP from 9).
  const debug = await page.evaluate((name) => {
    const hook = (window as unknown as Record<string, DreamscapeDebugHook>)[name];
    return { state: hook.getState(), scene: hook.getScene() };
  }, DEBUG_HOOK_NAME);
  expect(debug.state?.activeDate?.dateId).toBe("milano_brera_date_01");
  expect(debug.state?.ap).toBeLessThan(9);
  expect(debug.scene?.url).toBe(url);
  // Back on the scene picker, the same scene's URL is offered for copying.
  await ops.backToDebugSettings(page);
  await expect(page.getByTestId("debug-url")).toHaveValue(new URL(url, page.url()).href);
});

// Its own test (and time budget): each half loads the app afresh on a dev server, which is slow under load.
test("a Debug launch URL that does not fit the content says why and links back to the scene picker", { tag: tier.debug }, async ({ page }) => {
  await page.goto("/?debug&city=milano&scene=battle&target=gt_delhi_main_red_fort_battle");
  await ops.debugShown(page.getByRole("alert"));
  await expect(page.getByRole("alert")).toHaveText("「gt_delhi_main_red_fort_battle」はミラノの「クイズ」にありません。");
  // The link loads the scene picker as a new page (a dev server serves it module by module):
  // wait for that page's load, as page.goto does, and then for Debug, which loads after it.
  await Promise.all([
    page.waitForURL((address) => address.search === "?debug"),
    page.getByRole("link", { name: "場面の確認へ" }).click(),
  ]);
  await ops.debugShown(page.getByTestId("debug-panel"));
});

type TapScene = "encounter" | "epilogue" | "battle" | "special" | "tourism";
type TapTarget = { cityId: string; scene: DebugSettings["scene"]; id: string };

/** One scene of each kind in Debug's default city, from the dev server's content (no fixed IDs). */
function tapTargets(page: Page): Promise<Partial<Record<TapScene, TapTarget>>> {
  return page.evaluate(async (modules) => {
    const { battles } = await import(/* @vite-ignore */ modules.content);
    const { debugTargets, defaultDebugCityId } = await import(/* @vite-ignore */ modules.debugState);
    const cityId: string = defaultDebugCityId;
    const listed: Record<string, { id: string; unavailable?: string }[]> = debugTargets(cityId);
    const special = (id: string) => !!battles.find((battle: { id: string; reasoning?: unknown }) => battle.id === id)?.reasoning;
    const choices: [TapScene, DebugSettings["scene"], (id: string) => boolean][] = [
      ["encounter", "encounter", () => true], ["epilogue", "epilogue", () => true],
      ["battle", "battle", (id) => !special(id)], ["special", "battle", (id) => special(id)],
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

/** The scene shows a line to read on (no choice, quiz or last line); a special battle's line stops at its proof's call. */
const reading: Record<TapScene, (state: GameState) => boolean> = {
  encounter: (state) => !!state.activeEncounter && !state.activeEncounter.frame.choices.length && !state.activeEncounter.frame.ended &&
    state.activeEncounter.phase !== "quiz" && state.activeEncounter.phase !== "feedback",
  epilogue: (state) => !!state.activeEpilogue && !state.activeEpilogue.frame.ended,
  battle: (state) => state.activeBattle?.phase === "dialogue" && !state.activeBattle.frame?.ended,
  special: (state) => state.activeBattle?.phase === "dialogue" && !!state.activeBattle.frame?.choices.some((choice) => choice.call === "reasoning"),
  tourism: (state) => state.activeTourism?.phase === "guide" && !state.activeTourism.frame?.ended,
};

// User idea (2026-11-07, docs/02 「UX/スマホ」): in every story scene a tap anywhere but on a control
// reads on, one step per tap. The tourism guide and the date are played in play.spec.ts; these are
// the other scene kinds (encounter, epilogue — the arrival uses the same screen —, and battle dialogue,
// a special battle's claim and rebuttal included).
for (const kind of ["encounter", "epilogue", "battle"] as const) {
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
    await ops.holdClock(page);
    await ops.doubleTap(page, close);
    await expect(log).toBeHidden();
    await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
    await page.clock.resume();
    await ops.settled(page);
    expect((await debugGame(page))!.revision).toBe(before.revision);
    expect(await line.textContent()).toBe(text);
    // A tap on the picture (the battle's stage) goes one line on, like a tap on the line.
    await ops.tapAt(page, await ops.sceneBackgroundPoint(page));
    await expect(line).not.toHaveText(text!);
    expect((await debugGame(page))!.revision).toBe(before.revision + 1);
  });
}

// The special battle's talk before its proof ends like any story scene and holds taps: the tap on
// its last line brings the cut-in, whose 「スキップ」 must not take the double tap's second tap.
test("special battle: the tap that ends the talk before the proof does not also skip the cut-in under the finger", { tag: tier.debug }, async ({ page }) => {
  const target = (await tapTargets(page)).special;
  expect(target, "a special battle that Debug opens in its default city").toBeDefined();
  await page.clock.install();
  await ops.openDebugScene(page, settings(target!));
  await playUntil(page, reading.special, { source: debugGame });
  await expect(page.getByTestId("battle-advance").or(page.getByTestId("reasoning-rebuttal-advance"))).toBeVisible();
  await expect(page.getByTestId("dialogue-text")).toHaveAttribute("data-ready", "true");
  const end = await ops.sceneBackgroundPoint(page);
  await ops.holdClock(page);
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
// feedback) does not take the second tap of the double tap that started it, so its first line is
// not read on before it is seen (lines appear whole here). Two guards stop that tap: the hold on
// every tap when a story scene starts (html[data-tap-hold], checked right after the double tap
// while the clock is held) and the moment in which a press on a control settles the scene
// (useSceneTap). The revision check at the end fails only when both are gone; the hold alone is
// also pinned by play.spec.ts (the double tap on a date's destination). After a long explanation
// the player scrolls the reading area until the button shows at its bottom edge and taps it there;
// the second tap falls on the reaction's line, where a tap reads on.
test("battle: a double tap on 「相手の反応を見る」 opens the reaction and stays on its first line", { tag: tier.debug }, async ({ page }) => {
  const target = (await tapTargets(page)).battle;
  expect(target, "a battle that Debug opens in its default city").toBeDefined();
  await page.clock.install();
  await ops.openDebugScene(page, settings(target!));
  const feedback = await playUntil(page, (state) => state.activeBattle?.phase === "feedback", { source: debugGame });
  const advance = page.getByTestId("battle-advance");
  await advance.evaluate((button) => button.scrollIntoView({ block: "end" }));
  const reaction = await ops.centerOf(advance);
  expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-testid="battle-advance"]'), reaction),
    "the double tap lands on 「相手の反応を見る」").toBe(true);
  await ops.holdClock(page);
  await ops.doubleTap(page, reaction);
  await expect.poll(async () => (await debugGame(page))!.activeBattle?.phase).toBe("dialogue");
  await expect(page.locator("html[data-tap-hold]"), "taps are held as the reaction starts").toHaveCount(1);
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  await ops.settled(page);
  expect(await ops.readsOnAt(page, reaction), "the second tap landed where a tap reads the reaction on").toBe(true);
  expect((await debugGame(page))!.revision).toBe(feedback.revision + 1);
});

// After a wrong answer the explanation, which starts with 「正しい答え：英文（訳）」, can be taller than the
// battle paper's reading area (UI_REVIEW_CHECKLIST: 「長文・対訳・文字拡大時に内容が切れず、主な操作へ到達
// できる。必要なスクロールは内容を読む領域に限る。」). Focus goes to it (for screen readers), and its first
// line shows just below the round bar that stays at the top of the area, not hidden under it. 「相手の反応を
// 見る」 at its end is reached by scrolling the area and then shows whole, not under the bar or cut at the
// edge (UI_REVIEW_CHECKLIST: 「スクロールして重なった部品の下に隠れない」; UI_RULES A-18: 「操作パネルの
// 重要部分だけが見切れる」 is avoided).
test("battle: a long explanation after a wrong answer starts below the round bar, and 「相手の反応を見る」 is reached by scrolling", { tag: tier.debug }, async ({ page }) => {
  const target = (await tapTargets(page)).battle;
  expect(target, "a battle that Debug opens in its default city").toBeDefined();
  const wrong = await page.evaluate(async ({ modules, battleId }) => {
    const { battles, battleQuizzes } = await import(/* @vite-ignore */ modules.content);
    const question = battleQuizzes[battles.find((battle: { id: string }) => battle.id === battleId).quizId].questions[0];
    return question.options.find((option: { id: string }) => option.id !== question.correctOptionId).id as string;
  }, { modules: devModules, battleId: target!.id });
  await ops.openDebugScene(page, settings(target!));
  await playUntil(page, (state) => state.activeBattle?.phase === "feedback", { source: debugGame, pick: () => wrong });
  await expect(page.getByTestId("battle-feedback")).toBeFocused();
  const start = await page.evaluate(() => {
    const area = document.getElementById("battle-content")!;
    const bar = area.querySelector('[data-testid="battle-roundbar"]')!.getBoundingClientRect();
    const feedback = document.getElementById("battle-feedback")!.getBoundingClientRect();
    const first = document.querySelector('[data-testid="battle-feedback"] [data-testid="correct-answer"]')!;
    const line = first.getBoundingClientRect();
    const shown = document.elementFromPoint(line.left + 4, line.top + 1);
    return {
      room: area.getBoundingClientRect().bottom - bar.bottom, rest: feedback.bottom - line.top,
      below: line.top - bar.bottom, shown: !!shown && first.contains(shown),
    };
  });
  expect(start.rest, "the explanation from its first line on is taller than the reading area below the round bar").toBeGreaterThan(start.room);
  expect(start.shown, "the first line of the explanation shows, not the round bar over it").toBe(true);
  // Only a small gap above that line (the box's top padding may sit under the bar), so as much of the rest shows as can.
  expect(start.below, "the first line starts just below the round bar").toBeLessThanOrEqual(12);
  const reaction = page.getByRole("button", { name: "相手の反応を見る" });
  await page.locator("#battle-content").evaluate((area) => area.scrollTo({ top: area.scrollHeight }));
  expect(await reaction.evaluate((button) => {
    const box = button.getBoundingClientRect();
    const at = (y: number) => button.contains(document.elementFromPoint(box.left + box.width / 2, y));
    return at(box.top + 1) && at(box.bottom - 1);
  }), "「相手の反応を見る」 shows whole at the end of the reading area").toBe(true);
  await ops.tapAt(page, await ops.centerOf(reaction));
  await expect.poll(async () => (await debugGame(page))!.activeBattle?.phase).toBe("dialogue");
});

// User idea (2026-11-07): the whole screen reads on, not only the scene's picture: on a wide screen
// also the page's margin beside the guide, which keeps a phone-like width there.
test("tourism: on a wide screen the page's margin beside the guide reads one step on", { tag: tier.debug }, async ({ page }) => {
  const target = (await tapTargets(page)).tourism;
  expect(target, "a guide that Debug opens in its default city").toBeDefined();
  await ops.openDebugScene(page, settings(target!));
  await playUntil(page, reading.tourism, { source: debugGame });
  const line = page.getByTestId("dialogue-text");
  const before = (await debugGame(page))!;
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
  expect((await debugGame(page))!.revision).toBe(before.revision + 1);
});

// The credits of a story scene's photo (licence attribution) are in ⚙設定 while the scene shows: over a
// conversation only the header shows (user decision 2026-11-11). Over a landmark battle's question,
// 「画像の出典」 opens the photo with its credits.
test("battle: ⚙設定's 「画像の出典」 opens the battle's photo and its credits", { tag: tier.debug }, async ({ page }) => {
  const target = (await tapTargets(page)).battle;
  expect(target, "a landmark battle that Debug opens in its default city").toBeDefined();
  await ops.openDebugScene(page, settings(target!));
  await playUntil(page, (state) => state.activeBattle?.phase === "question", { source: debugGame });
  await ops.menuItem(page, "画像の出典");
  const viewer = page.getByRole("dialog", { name: "背景画像" });
  await expect(viewer).toBeVisible();
  await viewer.getByText("画像の説明・出典と利用条件").click();
  await expect(viewer.getByRole("link", { name: "画像の出典" })).toBeVisible();
  await ops.closeDialog(viewer);
  await ops.backToDebugSettings(page);
});
