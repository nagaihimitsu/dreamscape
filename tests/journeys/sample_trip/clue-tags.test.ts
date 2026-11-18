import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { scenes, tourismClues } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import type { SceneEntry } from "../../../src/content/scene-schemas";
import { meets } from "../../../src/domain/conditions";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "../../../src/domain/player-action";
import { applyChoiceEffects, applyDoneEffects, sceneById } from "../../../src/domain/scene-effects";
import { screenFor } from "../../../src/domain/screen";
import { clueRecordAllowed } from "../../../src/domain/tourism";
import { beginTravelEvent } from "../../../src/domain/travel-game";
import { cityStart, openBattleScene, playBattleToResult } from "../../../src/dev/scenario-builders";
import { ClueNotebook } from "../../../src/features/tourism/ClueNotebook";
import { clueRecordedNotice } from "../../../src/features/tourism/clue-source";

// A clue heard in conversation (2026-11-18) on the sample journey (fictional): a choice's # clue: and a head's # on_done: clue
// record a clue in 手がかり帳 once, the save keeps it without its landmark's visit, the condition clue <ID> reads it, the clue
// book says it was heard, and the game says it was recorded. The scene list's effects are patched here as content:build would
// write them for the tags (the build's reading of the tags: clue-tags-build.test.ts); the Ink stays the sample's own.

const RAIN = "smp_obs_mihon_market_rain";
const MARKET = "mihon_market";
const TOWER_EVENT = "smp_mihon_main_clock_tower";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const MAP = ["travel", "wait", "rest", "rent", "claim_ap", "depart", "read_epilogue"];
const kept = [...scenes];
afterEach(() => { (scenes as SceneEntry[]).splice(0, scenes.length, ...kept); });

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

/** Give the sample scene `id` the clue on one of its choices (`# clue:`) or at its end (`# on_done: clue`). */
function patch(id: string, change: (scene: SceneEntry) => SceneEntry) {
  const index = scenes.findIndex((scene) => scene.id === id);
  (scenes as SceneEntry[])[index] = change(scenes[index]);
}
const onChoice = (optionId: string, clues: string[]) => (scene: SceneEntry): SceneEntry =>
  ({ ...scene, options: scene.options.map((option) => (option.id === optionId ? { ...option, clues } : option)) });
const onDone = (clues: string[]) => (scene: SceneEntry): SceneEntry => ({ ...scene, done: { ...scene.done, clues } });

/** Visit the clock tower from the city's start: the first action each screen offers, `prefer`'s choices where they are offered. */
function visitTower(prefer: readonly string[], until: (state: GameState) => boolean) {
  let state = restore(applyPlayerAction(cityStart("mihon"), (current) => beginTravelEvent(current, TOWER_EVENT, "walk", current.revision, () => 0), () => 0));
  const steps: { previous: GameState; next: GameState }[] = [];
  for (let step = 0; !until(state); step++) {
    expect(step, `the visit did not reach the expected step (${screenFor(state)})`).toBeLessThan(400);
    if (state.activeBattle && state.activeBattle.phase !== "result") { state = restore(playBattleToResult(state)); continue; }
    const actions = listPlayerActions(state).filter((action) => !MAP.includes(action.kind));
    const choices = state.activeEncounter?.frame?.choices ?? [];
    const action = actions.find((item) => item.kind === "encounter_choose" &&
      prefer.includes(choices.find((choice) => choice.index === item.index)?.optionId ?? "")) ?? actions[0];
    if (!action) throw new Error(`no action on the screen ${screenFor(state)}`);
    const next = restore(applyPlayerAction(state, playerActionChange(action, () => 0), () => 0));
    steps.push({ previous: state, next });
    state = next;
  }
  return { state, steps };
}
const heardAt = (steps: { previous: GameState; next: GameState }[]) =>
  steps.filter(({ previous, next }) => !previous.discoveredClueIds.includes(RAIN) && next.discoveredClueIds.includes(RAIN));

describe("a clue heard in conversation", () => {
  it("is recorded by a choice's # clue: once, before its landmark's visit, and the save keeps it", () => {
    patch("smp_mihon_clock_bell", onChoice("stay_below", [RAIN]));
    const bellDone = (state: GameState) => state.completedEncounterIds.includes("smp_mihon_clock_bell") && !state.activeEncounter;
    const { state, steps } = visitTower(["stay_below"], bellDone);
    expect(state.discoveredClueIds.filter((id) => id === RAIN)).toHaveLength(1);
    expect(state.visitedLandmarkIds).not.toContain(MARKET);
    expect(meets(state, { clue: RAIN })).toBe(true);
    // Recorded with the choice itself (the action that chose it), and the game says so outside the observation.
    const [heard] = heardAt(steps);
    expect(heard.previous.activeEncounter?.encounterId).toBe("smp_mihon_clock_bell");
    expect(clueRecordedNotice(heard.previous, heard.next)).toBe(`手がかり帳に「${tourismClues.find((clue) => clue.id === RAIN)!.titleJa}」を記録しました。`);
    // Applied again (a repeat, a second tap that got through), the clue is still recorded once.
    const option = sceneById("smp_mihon_clock_bell")!.options.find((item) => item.id === "stay_below")!;
    expect(applyChoiceEffects(state, "smp_mihon_clock_bell", option, state.revision + 1).state.discoveredClueIds).toEqual(state.discoveredClueIds);
    // The other choice records nothing.
    const climbed = visitTower(["climb"], bellDone).state;
    expect(climbed.discoveredClueIds).not.toContain(RAIN);
    expect(meets(climbed, { clue: RAIN })).toBe(false);
  });

  it("is recorded by a scene's # on_done: clue as the scene ends, not before, once", () => {
    patch("smp_mihon_clock_gears", onDone([RAIN]));
    const gearsRunning = (state: GameState) => state.activeEncounter?.encounterId === "smp_mihon_clock_gears";
    const running = visitTower([], gearsRunning).state;
    expect(running.discoveredClueIds).not.toContain(RAIN);
    const { state, steps } = visitTower([], (current) => current.completedEncounterIds.includes("smp_mihon_clock_gears"));
    expect(state.discoveredClueIds.filter((id) => id === RAIN)).toHaveLength(1);
    expect(heardAt(steps).map(({ previous }) => previous.activeEncounter?.encounterId)).toEqual(["smp_mihon_clock_gears"]);
    // Its # on_done: clue applied again (its AP is the scene's own once-only rule's) leaves the record as it is.
    expect(applyDoneEffects(state, "smp_mihon_clock_gears", { clues: sceneById("smp_mihon_clock_gears")!.done.clues }, state.revision + 1)).toEqual(state);
  });

  it("is kept by the save check only when a scene gives it or its landmark was visited (clueRecordAllowed)", () => {
    const start = cityStart("mihon");
    const withRain: GameState = { ...start, discoveredClueIds: [RAIN] };
    // No scene gives it and the market was not visited: refused, as before.
    expect(clueRecordAllowed(withRain, RAIN)).toBe(false);
    expect(() => restore(withRain)).toThrow("手がかりの発見記録が一致しません。");
    expect(restore({ ...withRain, visitedLandmarkIds: [MARKET] }).discoveredClueIds).toEqual([RAIN]);
    // A scene gives it: kept without the visit. An unknown clue is refused either way.
    patch("smp_mihon_clock_bell", onChoice("stay_below", [RAIN]));
    expect(clueRecordAllowed(withRain, RAIN)).toBe(true);
    expect(restore(withRain).discoveredClueIds).toEqual([RAIN]);
    expect(clueRecordAllowed(withRain, "smp_no_such_clue")).toBe(false);
    expect(() => restore({ ...withRain, discoveredClueIds: [RAIN, "smp_no_such_clue"] })).toThrow("手がかりの発見記録が一致しません。");
  });

  it("says nothing more for a clue the observation finds (its button gleams there), and counts several clues", () => {
    const start = cityStart("mihon");
    const observing = { ...start, activeTourism: { landmarkId: MARKET, phase: "exploring", contentHash: "x", storyState: null, frame: null } } as GameState;
    expect(clueRecordedNotice(observing, { ...observing, discoveredClueIds: [RAIN] })).toBeNull();
    expect(clueRecordedNotice(start, start)).toBeNull();
    expect(clueRecordedNotice(start, { ...start, discoveredClueIds: [RAIN, "smp_obs_mihon_market_rows"] })).toBe("手がかり帳に2件を記録しました。");
  });

  it("says nothing for a clue found in the observation a quiz was left for (「観光に戻って調べる」: the quiz stays underneath)", () => {
    const battle = openBattleScene(cityStart("mihon"), "smp_mihon_main_clock_tower_battle");
    const observe = listPlayerActions(battle).find((action) => action.kind === "battle_observe");
    expect(observe, "the clock tower's quiz offers 「観光に戻って調べる」").toBeDefined();
    let state = restore(applyPlayerAction(battle, playerActionChange(observe!, () => 0), () => 0));
    for (let step = 0; state.activeTourism?.phase === "guide"; step++) {
      expect(step).toBeLessThan(300);
      const actions = listPlayerActions(state);
      state = restore(applyPlayerAction(state, playerActionChange(actions.find((action) => action.kind === "guide_close") ?? actions[0], () => 0), () => 0));
    }
    expect(state.activeBattle).not.toBeNull();
    expect(screenFor(state)).toBe("tourism");
    const discover = listPlayerActions(state).find((action) => action.kind === "discover");
    expect(discover, "the observation offers a clue to find").toBeDefined();
    const found = restore(applyPlayerAction(state, playerActionChange(discover!, () => 0), () => 0));
    expect(found.discoveredClueIds.length).toBeGreaterThan(state.discoveredClueIds.length);
    expect(clueRecordedNotice(state, found)).toBeNull();
  });
});

describe("the clue book for a clue heard in conversation", () => {
  const book = (props: Partial<Parameters<typeof ClueNotebook>[0]>) =>
    renderToStaticMarkup(createElement(ClueNotebook, { discoveredIds: [RAIN], onClose: () => {}, ...props }));
  const reasoning = { caseClueIds: [RAIN, "smp_obs_mihon_market_timer", "smp_obs_mihon_market_rows"], claimText: "", questionEn: "Which one?",
    selectedIds: [], maxSelections: 1 as const, selectionEnabled: true, canToggle: () => true, onSelect: () => {} };
  const provenance = (markup: string) => [...markup.matchAll(/class="case-provenance">([^<]*)</gu)].map((match) => match[1]);

  it("says 「会話で聞いた」 in a reasoning battle and a city finale, with no landmark photo; an observed clue keeps its words", () => {
    const observedCase = book({ landmarkId: MARKET, reasoning });
    expect(provenance(observedCase)).toEqual(["観察済み"]);
    expect(observedCase).toContain("資料カード");
    expect(provenance(book({ cityId: "mihon" }))).toEqual(["見本の朝市"]);
    expect(provenance(book({ landmarkId: MARKET, reasoning, discoveredIds: [] }))).toEqual(["ケース資料"]);
    patch("smp_mihon_clock_bell", onChoice("stay_below", [RAIN]));
    const heardCase = book({ landmarkId: MARKET, reasoning });
    expect(provenance(heardCase)).toEqual(["会話で聞いた"]);
    // The pill says it was heard: no heading says it again (read aloud twice otherwise).
    expect(heardCase).not.toContain("会話で聞いたこと");
    expect(heardCase).not.toContain(`data-testid="clue-image-${RAIN}"`);
    const heardCity = book({ cityId: "mihon" });
    expect(provenance(heardCity)).toEqual(["会話で聞いた"]);
    expect(heardCity).not.toContain("会話で聞いたこと");
    expect(heardCity).not.toContain(`data-testid="clue-image-${RAIN}"`);
    // A book with no pill (the landmark's, from its observation) names it heard in its heading.
    expect(book({ landmarkId: MARKET })).toContain("会話で聞いたこと");
    // Not found yet, a case file is a case file however it would be recorded: its mark, its form and its photo.
    const unfound = book({ landmarkId: MARKET, reasoning, discoveredIds: [] });
    expect(provenance(unfound)).toEqual(["ケース資料"]);
    expect(unfound).toContain("資料カード");
    expect(unfound).not.toContain("会話で聞いた");
    expect(unfound).toContain(`data-testid="clue-image-${RAIN}"`);
  });

  it("names hearing from people as a way to fill an empty book", () => {
    expect(book({ cityId: "mihon", discoveredIds: [] })).toContain("観光画面の気になる場所や資料カードを調べたり、人から話を聞いたりすると、ここに記録されます。");
  });
});
