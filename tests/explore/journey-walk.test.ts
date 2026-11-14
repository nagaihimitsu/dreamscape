// Exploration test (docs/10「探索テスト」; research E2E-9): a seeded random walk through the game
// functions, over every available journey (the sample journey too when the test build includes it).
// Each step lists what the player can do now (listPlayerActions: the screens' own availability
// rules), takes one of those actions as GameApp's commit does (applyPlayerAction), saves and loads
// it with the game's own saveGame / loadGame, and checks:
// - safety: the state passes validateGameState, AP stays within 0..cap, AP changes only by the
//   rewards whose IDs are newly recorded (each ID once) minus the AP of a date started in that step,
//   every offered action changes the state, and the save → load round trip gives the same state;
// - liveness: before the end of the journey there is always something to do (zero actions = stuck);
// - progression (unified event design stage 2b): a city not yet cleared can still be cleared — the
//   build's progression check (scripts/progression-check.ts) run from the current state finds a way
//   to its finale ("the city can no longer be cleared" otherwise). Money and AP that no longer cover
//   the main parts or dates a city's finale still needs are listed in the summary, never failed
//   (they are set when balancing the finished scenario);
// - progress (the fixed run only): every start's run leaves its first city at least once (a departure,
//   or the end of the journey from its last city), and the walks clear every city of every available
//   journey and read its epilogue. A soft lock that leaves something to press but no way out of a
//   city (e.g. a result screen whose only control leads back to it) fails too, in any city.
// A failure names the seed, the step and the last actions; rerun it with DREAMSCAPE_WALK_SEEDS and
// `npm run test:walk` (it builds the content with the sample journey first: which journeys the content
// holds changes the walk).
// The starts are every journey's title and the start of each of its later cities; run r of seed s
// begins at start (s + r) mod their number. The fixed run has one seed per start (1 … the number of
// starts), so each start begins exactly one fixed seed's walk: releasing a journey or adding a city
// adds a walk instead of leaving a start unwalked. A run ends at the end of the journey (8 times out
// of 10; otherwise it stays for the dates still open) or after RESTART_STEPS steps.
// Apart from those progress checks, which content the walks reached is printed as a summary, never
// asserted: it shows content that normal play cannot reach (e.g. most Milano place encounters,
// ideas2 [WP06a]) without failing.
// `npm test`, `npm run verify` and `npm run test:walk`: the fixed run. DREAMSCAPE_WALK_SEEDS (comma-separated) and
// DREAMSCAPE_WALK_STEPS (steps per seed) widen it (e2e-explore.yml's walk job, run by hand).
import { screenFor } from "../../src/domain/screen";
import { itemUsableIn } from "../../src/domain/item-cities";
import { usableAp, usableMoney } from "../../src/domain/reservations";
import { placeSceneById } from "../../src/domain/scene-effects";
import { sceneOfAddress, taggedDateScene } from "../../src/domain/reservations";
import type { SceneEntry } from "../../src/content/scene-schemas";
import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { allRewardRules, balance, battles, cityContents, dates, episodes, getCityContent, getTour, journeyConfig, landmarks, progression, scenes, tours } from "../../src/content";
import { isTourOnlyPlace } from "../../src/content/travel-schemas";
import { bookTour, cancelTourBooking } from "../../src/domain/tour";
import { spendableMoney } from "../../src/domain/conditions";
import {
  apShortNow, canStillClearCity, mainPaymentsOf, moneyShortNow, sceneItemsOf, tourProgression, type ProgressionContent, type ProgressionSnapshot,
} from "../../scripts/progression-check";
import { encounters } from "../../src/content/encounters";
import { journeys } from "../../src/content/journeys";
import { cityStart } from "../../src/dev/scenario-builders";
import { getActiveBattleContent } from "../../src/domain/battle";
import { storyBattlesForCity } from "../../src/domain/chapter";
import { isJourneyComplete } from "../../src/domain/city-travel";
import { startCityArrival } from "../../src/domain/epilogue";
import { createGame, validateGameState, type GameState } from "../../src/domain/game";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../../src/domain/player-action";
import { loadGame, saveGame } from "../../src/persistence";
import { journeyStorage } from "../../src/persistence/journey-storage";

const FIXED_STEPS = 1200;
const RESTART_STEPS = 1200;
const TRACE_LENGTH = 25;

function envList(name: string): number[] | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const values = raw.split(",").map((item) => Number(item.trim()));
  if (values.some((value) => !Number.isSafeInteger(value))) throw new Error(`${name} must be integers separated by commas: ${raw}`);
  return values;
}

/** mulberry32: a small seeded generator, so a seed always replays the same walk. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const playable = journeys.filter((journey) => journey.status === "available");
type Start = { journeyId: string; label: string; build: () => GameState };
// The title (createGame + startCityArrival, as useGameSession.begin) and the start of every later
// city, made with the real game functions (src/dev/scenario-builders.ts).
const starts: Start[] = playable.flatMap((journey) => [
  { journeyId: journey.id, label: `${journey.id}: title`, build: () => {
    const created = createGame("ユウ", "ミオ", { journeyId: journey.id });
    return startCityArrival(created, created.revision);
  } },
  ...journey.cities.slice(1).map((city) => ({ journeyId: journey.id, label: `${journey.id}: ${city.id} start`, build: () => cityStart(city.id, ["ユウ", "ミオ"]) })),
]);
/** Run r of seed s begins at start (s + r) mod the number of starts. */
const startOf = (seed: number, run: number) => starts[(((seed + run) % starts.length) + starts.length) % starts.length];
/** One seed per start: seed i's first run begins at start i mod the number of starts, so every start is walked. */
const FIXED_SEEDS = starts.map((_, index) => index + 1);
const seeds = envList("DREAMSCAPE_WALK_SEEDS") ?? FIXED_SEEDS;
const steps = envList("DREAMSCAPE_WALK_STEPS")?.[0] ?? FIXED_STEPS;
/** The fixed seeds with at least the fixed steps: a walk's first steps never depend on its length. */
const fixedRun = seeds === FIXED_SEEDS && steps >= FIXED_STEPS;
/** Seeds whose walk ran to its last step (the progress checks need all fixed seeds). */
const finished = new Set<number>();
/** Starts with a run that left the start's city: a departure, or the end of the journey. */
const leftStartCity = new Set<string>();
const startCache = new Map<string, GameState>();
const startState = (start: Start) => {
  if (!startCache.has(start.label)) startCache.set(start.label, validateGameState(start.build()));
  return startCache.get(start.label)!;
};

/** A player's habits: mostly moving the story on, answering right more often than not, sometimes idling. */
function weight(state: GameState, action: PlayerAction): number {
  switch (action.kind) {
    case "battle_answer": {
      const active = state.activeBattle!;
      return getActiveBattleContent(active).quiz.questions[active.roundIndex].correctOptionId === action.optionId ? 3 : 1;
    }
    case "evidence_toggle": {
      const active = state.activeBattle!;
      const correct = getActiveBattleContent(active).battle.reasoning!.correctClueIds.includes(action.clueId);
      const selected = active.reasoning!.selectedClueIds.includes(action.clueId);
      return correct !== selected ? 4 : 1;
    }
    case "evidence_submit": return 6;
    case "guide_again": return 0.2;
    case "battle_press": case "discover": return 0.4;
    case "battle_observe": return 0.1;
    case "guide_next": case "observation_next": case "read_epilogue": case "battle_epilogue": case "depart": return 3;
    case "wait": return 0.5;
    case "rest": return 0.3;
    // A tour (stage 2a): booked readily when it holds a main part the city's finale needs, rarely cancelled.
    case "book_tour": return tourIsRequired(action.tourId) ? 3 : 1;
    case "cancel_tour": return 0.1;
    default: return 1;
  }
}
/** Whether a tour opens a main part its city's finale needs (its requiredEpisodeIds, or a special battle every finale waits for). */
function tourIsRequired(tourId: string): boolean {
  const tour = getTour(tourId);
  const finale = episodes.find((episode) => episode.cityId === tour?.cityId && episode.kind === "city_finale");
  return !!tour && !!finale && tour.steps.some((step) => step.kind === "event" &&
    (finale.requiredEpisodeIds.includes(step.eventId) || journeyConfig.storyBattles.some((battle) => battle.battleId === step.eventId)));
}
function pick(state: GameState, actions: PlayerAction[], next: () => number): PlayerAction {
  const weights = actions.map((action) => weight(state, action));
  let roll = next() * weights.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < actions.length; index++) {
    roll -= weights[index];
    if (roll < 0) return actions[index];
  }
  return actions[actions.length - 1];
}

/** The content the progression check reads, from the runtime catalogs (the same check as content:build's). */
const progressionContent: ProgressionContent = {
  journeys, episodes, storyBattles: journeyConfig.storyBattles, battles, landmarks, encounters: encounters.encounters, items: encounters.items, dates,
  rewards: allRewardRules, romance: progression, sceneItems: sceneItemsOf(scenes),
  // Registered cities only (a journey may list cities not built yet).
  travel: playable.flatMap((journey) => journey.cities).filter((city) => city.id in cityContents).map((city) => {
    const { travel, travelSettings } = getCityContent(city.id);
    return { cityId: city.id, hotelPlaceId: travelSettings.hotelPlaceId, initialBudget: travelSettings.initialBudget, events: travel.events, routes: travel.routes,
      tourOnlyPlaceIds: travel.places.filter((place) => isTourOnlyPlace(place)).map((place) => place.id) };
  }),
  tours: tours.map(tourProgression),
  mainPayments: mainPaymentsOf(scenes, { episodes, storyBattles: journeyConfig.storyBattles, battles }),
};
/** The records of a game state, as the progression check reads them. */
const snapshotOf = (state: GameState): ProgressionSnapshot => ({
  exact: true, battles: new Set(state.battleRecords.filter((item) => item.attempts > 0).map((item) => item.battleId)),
  episodes: new Set(state.completedEpisodeIds), cities: new Set(state.completedCityIds), landmarks: new Set(state.visitedLandmarkIds),
  guides: new Set(state.completedGuideIds), encounters: new Set(state.completedEncounterIds), seenEncounters: new Set(state.seenEncounterIds),
  dates: new Set(state.playedDateIds), epilogues: new Set(state.viewedEpilogueCityIds), items: state.inventory,
  couple: state.confessionStatus === "accepted", romanceStage: state.romanceStage, cityDay: state.travel.day,
  journeyDay: state.travel.calendar?.journeyDay, money: spendableMoney(state),
});
/** Seeds whose walk had too little money or AP for what a city's finale still needs, by city (the summary; never failed). */
const shortOf = { money: new Map<string, Set<number>>(), ap: new Map<string, Set<number>>() };
const noteShort = (kind: keyof typeof shortOf, cityId: string, seed: number) => {
  if (!shortOf[kind].has(cityId)) shortOf[kind].set(cityId, new Set());
  shortOf[kind].get(cityId)!.add(seed);
};
const hasFinale = (cityId: string) => episodes.some((episode) => episode.cityId === cityId && episode.kind === "city_finale");

const totalAp = (state: GameState) => state.ap + state.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);
function ruleAp(id: string): number {
  const rule = allRewardRules.find((item) => item.id === id);
  if (!rule) throw new Error(`no reward rule has the recorded ID ${id}`);
  return rule.ap;
}
/** AP the step spent: only starting a date costs AP (startDate). */
function spentAp(previous: GameState, next: GameState): number {
  const active = next.activeDate;
  if (!active || previous.activeDate?.runId === active.runId) return 0;
  const date = dates.find((item) => item.id === active.dateId);
  if (!date) throw new Error(`no date has the started ID ${active.dateId}`);
  return date.apCost;
}
/**
 * AP the step's scene tags gave or spent (stage 3a): a choice's # ap: (a place scene's, a guide's not re-read, an
 * epilogue's, a tagged date's not replayed) and a place scene's # on_done: ap when it closes done. Main parts'
 * # on_done: ap has no content yet.
 */
function tagAp(previous: GameState, next: GameState, action: PlayerAction): number {
  const optionAp = (scene: SceneEntry | undefined, optionId: string | undefined) => scene?.options.find((option) => option.id === optionId)?.ap ?? 0;
  const encounter = previous.activeEncounter;
  const place = encounter && placeSceneById(encounter.encounterId);
  if (action.kind === "encounter_choose" && place)
    return optionAp(place, encounter.frame.choices.find((choice) => choice.index === action.index)?.optionId);
  if ((action.kind === "encounter_finish" || action.kind === "encounter_next") && place && next.activeEncounter?.runId !== encounter.runId)
    return (encounter.chosen ?? []).some((item) => place.options.find((option) => option.id === item.optionId)?.later) ? 0 : place.done.ap ?? 0;
  const tourism = previous.activeTourism;
  if (action.kind === "guide_choose" && tourism && !tourism.replay)
    return optionAp(sceneOfAddress(landmarks.find((item) => item.id === tourism.landmarkId)?.guideStoryId),
      tourism.frame?.choices.find((choice) => choice.index === action.index)?.optionId);
  const epilogue = previous.activeEpilogue;
  if (action.kind === "epilogue_choose" && epilogue) {
    const finale = episodes.find((item) => item.id === epilogue.episodeId)!;
    return optionAp(sceneOfAddress(epilogue.kind === "arrival" ? getCityContent(finale.cityId).city.arrivalStoryId : finale.epilogueStoryId),
      epilogue.frame.choices.find((choice) => choice.index === action.index)?.optionId);
  }
  const date = previous.activeDate;
  if (action.kind === "date_choose" && date && !date.replay)
    return optionAp(taggedDateScene(date.dateId), date.frame.choices.find((choice) => choice.index === action.index)?.optionId);
  return 0;
}
const describeAction = (action: PlayerAction) => JSON.stringify(action);

/** What the walks reached, per journey (printed at the end, never asserted). */
type Reached = Record<"cities" | "episodes" | "battles" | "dates" | "encounters" | "rentals" | "rides" | "tours" | "cleared" | "epilogues", Set<string>> & { ends: number; steps: number };
const reached = new Map<string, Reached>();
function reachedFor(journeyId: string): Reached {
  if (!reached.has(journeyId)) reached.set(journeyId, {
    cities: new Set(), episodes: new Set(), battles: new Set(), dates: new Set(), encounters: new Set(), rentals: new Set(), rides: new Set(),
    tours: new Set(), cleared: new Set(), epilogues: new Set(), ends: 0, steps: 0,
  });
  return reached.get(journeyId)!;
}
/** Only what this step did counts (a later city's start state already holds the earlier cities). */
function record(start: Start, previous: GameState, state: GameState) {
  const seen = reachedFor(start.journeyId);
  if (state.currentCityId !== startState(start).currentCityId || isJourneyComplete(state)) leftStartCity.add(start.label);
  const added = (before: string[], after: string[]) => after.filter((id) => !before.includes(id));
  seen.steps++;
  seen.cities.add(state.currentCityId);
  added(previous.completedEpisodeIds, state.completedEpisodeIds).forEach((id) => seen.episodes.add(id));
  if (state.activeBattle) seen.battles.add(state.activeBattle.battleId);
  if (state.activeDate) seen.dates.add(state.activeDate.dateId);
  if (state.activeEncounter) seen.encounters.add(state.activeEncounter.encounterId);
  // A rental (rent action) of this step, by city: mode IDs are journey-local.
  added(previous.travel.rentedModeIds, state.travel.rentedModeIds).forEach((id) => seen.rentals.add(`${state.currentCityId}/${id}`));
  // A ride by vehicle of this step (the saved ride count went up), by city.
  if (previous.currentCityId === state.currentCityId)
    for (const [modeId, count] of Object.entries(state.travel.rideCounts))
      if (count > (previous.travel.rideCounts[modeId] ?? 0)) seen.rides.add(`${state.currentCityId}/${modeId}`);
  added(previous.completedTourIds, state.completedTourIds).forEach((id) => seen.tours.add(id));
  added(previous.completedCityIds, state.completedCityIds).forEach((id) => seen.cleared.add(id));
  added(previous.viewedEpilogueCityIds, state.viewedEpilogueCityIds).forEach((id) => seen.epilogues.add(id));
  if (isJourneyComplete(state) && !isJourneyComplete(previous)) seen.ends++;
}

/** One seed's walk: fails with the seed, the step and the recent actions when a check fails. */
function walk(seed: number, total: number) {
  const next = random(seed);
  const roll = () => Math.floor(next() * 10_000);
  const memory = new Map<string, string>();
  const base = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value), removeItem: (key: string) => void memory.delete(key) };
  let start: Start | undefined;
  let state: GameState | undefined;
  let since = 0;
  let runs = 0;
  let trace: string[] = [];
  const fail = (step: number, message: string): never => {
    throw new Error([
      `${message}`, `seed ${seed}, step ${step}, start「${start!.label}」, ${since} steps after the start`,
      `last actions (oldest first):`, ...trace.map((line) => `  ${line}`),
      `journeys walked: ${playable.map((journey) => journey.id).join(", ")}`,
      `rerun: DREAMSCAPE_WALK_SEEDS=${seed} DREAMSCAPE_WALK_STEPS=${total} npm run test:walk (builds the content with the sample journey first)`,
    ].join("\n"));
  };
  /** Run one of the game functions the walk calls; when it throws, fail with the seed and the trace like any check. */
  const run = <T>(step: number, what: string, call: () => T): T => {
    try {
      return call();
    } catch (error) {
      return fail(step, `${what} threw: ${(error as Error).message}`);
    }
  };
  for (let step = 0; step < total; step++) {
    if (!state || since >= RESTART_STEPS) {
      // The starts take turns, seed by seed and run by run.
      start = startOf(seed, runs++);
      since = 0;
      trace = [`(start ${start.label})`];
      state = run(step, "building the start", () => startState(start!));
      memory.clear();
    }
    const journeyId = start!.journeyId;
    const current: GameState = state;
    const actions = run(step, "listPlayerActions", () => listPlayerActions(current));
    const ended = run(step, "isJourneyComplete", () => isJourneyComplete(current));
    if (!actions.length) {
      if (!ended) fail(step, "stuck: nothing to do before the end of the journey");
      state = undefined;
      continue;
    }
    if (ended && next() < 0.8) { // The end of the journey: mostly start again, sometimes stay for dates.
      state = undefined;
      continue;
    }
    const action = run(step, "choosing an action", () => pick(current, actions, next));
    trace = [...trace, `${current.currentCityId} r${current.revision}: ${describeAction(action)}`].slice(-TRACE_LENGTH);
    const previous = current;
    const changed = run(step, "the action", () => applyPlayerAction(previous, playerActionChange(action, roll)));
    if (changed === previous) fail(step, "an offered action changed nothing");
    if (changed.ap < 0 || changed.ap > balance.apCap) fail(step, `AP out of range: ${changed.ap}`);
    // Stage 3b (4.8): what may never happen with the moment record.
    if (screenFor(changed) === "free_time" && changed.occasion) fail(step, "an occasion did not end: free time with the moment record still open");
    if (usableMoney(changed) < 0) fail(step, `the usable money is below 0: ${usableMoney(changed)}`);
    // A tour (stage 2a) is paid once on booking and refunded exactly that once on cancelling; neither repeats in the same revision.
    if (action.kind === "book_tour") {
      const price = getTour(action.tourId)?.offers.find((offer) => offer.id === action.offerId)?.price;
      if (changed.tour?.tourId !== action.tourId || changed.tour.pricePaid !== price || previous.travelBudget - changed.travelBudget !== price)
        fail(step, `booking the tour did not pay its price once: ${previous.travelBudget} → ${changed.travelBudget}, price ${price}`);
      if (bookTour(changed, action.tourId, action.offerId, previous.revision) !== changed) fail(step, "the booking was taken again in the same revision");
    }
    if (action.kind === "cancel_tour") {
      const paid = previous.tour?.pricePaid ?? NaN;
      if (changed.tour !== null || (changed.currentCityId === previous.currentCityId && changed.travelBudget - previous.travelBudget !== paid))
        fail(step, `the cancel did not refund the price paid exactly once: ${previous.travelBudget} → ${changed.travelBudget}, paid ${paid}`);
      if (cancelTourBooking(changed, previous.revision) !== changed || cancelTourBooking(previous, previous.revision - 1) !== previous)
        fail(step, "the cancel was taken again in the same revision");
    }
    if (usableAp(changed) < 0) fail(step, `the usable AP is below 0: ${usableAp(changed)}`);
    const met = changed.activeEncounter;
    if (met && met.runId !== previous.activeEncounter?.runId && previous.completedEncounterIds.includes(met.encounterId) &&
        !encounters.encounters.find((item) => item.id === met.encounterId)?.repeatable)
      fail(step, `a scene run once started again: ${met.encounterId}`);
    // A held item is this city's or carried through the journey from a city it has done (the item design §2.8).
    for (const [itemId, status] of Object.entries(changed.inventory))
      if (status === "held" && !itemUsableIn(changed, itemId, changed.currentCityId)) fail(step, `an item of another city is held: ${itemId}`);
    const lost = previous.claimedRewardIds.filter((id) => !changed.claimedRewardIds.includes(id));
    if (lost.length) fail(step, `reward IDs were forgotten (and could be paid again): ${lost.join(", ")}`);
    const earned = changed.claimedRewardIds.filter((id) => !previous.claimedRewardIds.includes(id));
    const spent = run(step, "counting the AP of a started date", () => spentAp(previous, changed));
    const tags = run(step, "counting the AP of the scene tags", () => tagAp(previous, changed, action));
    const expected = totalAp(previous) + run(step, "counting the AP of the new reward IDs", () => earned.reduce((sum, id) => sum + ruleAp(id), 0)) - spent + tags;
    if (totalAp(changed) !== expected)
      fail(step, `AP (held + stored) is ${totalAp(changed)}, expected ${expected}: new reward IDs [${earned.join(", ")}], AP of a started date ${spent}, AP of the scene tags ${tags}`);
    const storage = run(step, "opening the journey's storage", () => journeyStorage(base, journeyId));
    // saveGame validates the state (validateGameState) and refuses a revision that did not increase.
    // (No expected previous snapshot: one tab, so the other-tab check would only repeat a validation.)
    const result = run(step, "saveGame", () => saveGame(storage, changed));
    if (!result.ok) {
      try { validateGameState(changed); }
      catch (error) { fail(step, `validateGameState refused the new state: ${(error as Error).message}`); }
      fail(step, `saveGame refused the new state: ${result.message}`);
    }
    const loaded = run(step, "loadGame", () => loadGame(storage));
    if (loaded.status !== "loaded") fail(step, `loadGame could not read the save back (${loaded.status})`);
    const restored = (loaded as Extract<typeof loaded, { status: "loaded" }>).state;
    try { expect(restored).toEqual(changed); }
    catch { fail(step, "the save → load round trip changed the state"); }
    // Stage 2b: a city not yet cleared can still be cleared from here (the build's check, from the current state).
    const cityId = restored.currentCityId;
    if (hasFinale(cityId) && !restored.completedCityIds.includes(cityId)) {
      const now = snapshotOf(restored);
      if (!run(step, "the progression check", () => canStillClearCity(progressionContent, cityId, now)))
        fail(step, `the city can no longer be cleared: ${cityId}'s finale can never show on the map from this state (scripts/progression-check.ts)`);
      if (run(step, "the money summary", () => moneyShortNow(progressionContent, cityId, now)) !== undefined) noteShort("money", cityId, seed);
      if (run(step, "the AP summary", () => apShortNow(progressionContent, cityId, now, totalAp(restored), new Set(restored.claimedRewardIds))) !== undefined)
        noteShort("ap", cityId, seed);
    }
    state = restored;
    since++;
    run(step, "recording what the step reached", () => record(start!, previous, restored));
  }
  finished.add(seed);
}

/** Content of a journey a player could meet, against what the walks reached. */
function summary(): string {
  const lines = [`Exploration: seeds ${seeds.join(", ")}, ${steps} steps each (reached / all; never reached listed).`];
  const count = (label: string, all: string[], seen: Set<string>) => {
    const missing = all.filter((id) => !seen.has(id));
    return `  ${label}: ${all.length - missing.length} / ${all.length}${missing.length ? ` — never: ${missing.join(", ")}` : ""}`;
  };
  for (const journey of playable) {
    const seen = reachedFor(journey.id);
    const cityIds = journey.cities.map((city) => city.id);
    const events = cityIds.flatMap((cityId) => getCityContent(cityId).travel.events);
    const dateIds = events.filter((event) => event.category === "date" && dates.some((date) => date.id === event.id)).map((event) => event.id);
    const battleIds = [...episodes.filter((episode) => cityIds.includes(episode.cityId)).map((episode) => episode.battleId),
      ...cityIds.flatMap((cityId) => storyBattlesForCity(cityId).map((battle) => battle.battleId))].filter((id) => battles.some((battle) => battle.id === id));
    const cityEncounters = encounters.encounters.filter((event) => cityIds.includes(event.cityId));
    lines.push(`${journey.id} (${seen.steps} steps, journey end reached ${seen.ends} times):`,
      count("cities reached", cityIds, seen.cities),
      count("cities cleared", cityIds, seen.cleared),
      count("epilogues read", cityIds, seen.epilogues),
      count("stops completed", episodes.filter((episode) => cityIds.includes(episode.cityId)).map((episode) => episode.id), seen.episodes),
      count("battles started", battleIds, seen.battles),
      count("dates started", dateIds, seen.dates),
      count("place encounters met", cityEncounters.map((event) => event.id), seen.encounters),
      count("rentals made", cityIds.flatMap((cityId) => (getCityContent(cityId).travelSettings.rentals ?? []).map((offer) => `${cityId}/${offer.modeId}`)), seen.rentals),
      count("vehicles ridden", cityIds.flatMap((cityId) => [...new Set(getCityContent(cityId).travel.routes
        .filter((route) => route.mode !== "walk").map((route) => `${cityId}/${route.mode}`))]), seen.rides),
      count("tours finished", tours.filter((tour) => cityIds.includes(tour.cityId)).map((tour) => tour.id), seen.tours));
  }
  for (const [kind, label] of [["money", "money too short for the main parts a finale still needs"], ["ap", "AP too short for the dates a finale still needs"]] as const)
    lines.push(`${label} (not failed): ${shortOf[kind].size ? [...shortOf[kind]].map(([cityId, seen]) => `${cityId} (seeds ${[...seen].join(", ")})`).join("; ") : "none"}`);
  return lines.join("\n");
}

describe("random walk through the game functions", () => {
  afterAll(() => {
    const text = summary();
    console.log(text);
    // Also kept as a file (artifacts/ is not committed), for the artifact of e2e-explore.yml's walk job.
    mkdirSync("artifacts/explore", { recursive: true });
    writeFileSync("artifacts/explore/journey-walk-coverage.txt", `${text}\n`);
  });

  it.each(seeds.map((seed) => ({ seed, label: startOf(seed, 0).label })))("seed $seed (from 「$label」): every step is valid and saved, and the player is never stuck before the end", ({ seed }) => {
    walk(seed, steps);
  }, 120_000);

  // Runs after the seeds' walks (tests of a file run in order). Deterministic for the content built.
  it.runIf(fixedRun)("the fixed run leaves every start's city and clears every city of every available journey and reads its epilogue", () => {
    const unfinished = FIXED_SEEDS.filter((seed) => !finished.has(seed));
    expect(unfinished, "these fixed seeds did not finish their walk (failed above, or left out with -t): the checks need them all").toEqual([]);
    const fix = "If the journey grew instead (a run needs more steps), raise FIXED_STEPS or RESTART_STEPS (docs/10「関数の層のランダムウォーク」)";
    const stayed = starts.filter((start) => !leftStartCity.has(start.label)).map((start) => start.label);
    expect(stayed, [
      "no run from these starts left the start's city (no departure, or no end of the journey from its last city; the summary shows",
      `how far the walks got): a way forward is missing, e.g. a screen whose only controls lead back to it. ${fix}`,
    ].join(" ")).toEqual([]);
    const missing = (kind: "cleared" | "epilogues") => playable.flatMap((journey) =>
      journey.cities.filter((city) => !reachedFor(journey.id)[kind].has(city.id)).map((city) => `${journey.id}: ${city.id}`));
    expect(missing("cleared"), `no walk cleared these cities. ${fix}`).toEqual([]);
    expect(missing("epilogues"), `no walk read the epilogue of these cities. ${fix}`).toEqual([]);
  });
});
