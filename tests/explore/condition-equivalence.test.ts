// One-off equivalence test for the condition system's stage 1 (removed in the stage's last commit).
// It records, for many game states, what the date, entry-rule and battle-record rules answer, so the
// same states can be compared after the rules move to `meets` (src/domain/conditions.ts):
// - the states of the fixed random walks (same starts, seeds, steps and player habits as
//   tests/explore/journey-walk.test.ts, without its save/load round trip);
// - scenario-builder states for every city of every available journey: the city's start, each
//   non-finale episode alone, every ordered pair of two episodes (Milano), each special battle
//   alone, the finale cleared and its result left; each with raised relationship values too, and
//   each with an observation opened at every landmark of the city.
// COND1_EQUIV=capture writes one JSON line per state to COND1_EQUIV_FILE; COND1_EQUIV=compare reads
// that file and fails on the first differences (same line count, same state hash per line — the
// same trajectories, so no gameplay change — and the same answers). Without COND1_EQUIV the file is
// skipped, so `npm test` is unaffected.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allRewardRules, battles, dates, episodes, getCityContent, landmarks } from "../../src/content";
import { encounters } from "../../src/content/encounters";
import { journeys } from "../../src/content/journeys";
import { cityStart, clearCity, finishEpisode, playBattleToResult, withRelationship } from "../../src/dev/scenario-builders";
import { getActiveBattleContent, startBattle } from "../../src/domain/battle";
import { getAvailableStoryBattles, isRewardEarned, leaveBattleResult, storyBattlesForCity } from "../../src/domain/chapter";
import { isJourneyComplete } from "../../src/domain/city-travel";
import { getTourismEncounterAvailability, hasPendingPlaceEncounter } from "../../src/domain/encounter";
import { startCityArrival } from "../../src/domain/epilogue";
import {
  createGame, evaluateProgression, getDateAvailability, isDateUnlockedForTravel, isEventVisible, validateGameState, type GameState,
} from "../../src/domain/game";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../../src/domain/player-action";
import { openTourism, skipTourismGuide } from "../../src/domain/tourism";
import { getTravelEventDefinition, isTravelEventUnlocked, isTravelEventVisible, isUnclearedMainTravelEvent } from "../../src/domain/travel-game";

const mode = process.env.COND1_EQUIV;
const file = process.env.COND1_EQUIV_FILE ?? "/dev/shm/cond1-equiv/baseline.jsonl";
const FIXED_STEPS = 1200;
const RESTART_STEPS = 1200;

/** JSON with sorted keys, so a state's hash does not depend on the order its fields were written in (and without Ink's random seed). */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value).sort().filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`;
  // An Ink story state carries the story's random seed (inkjs picks a new one per story): not part of the comparison.
  if (typeof value === "string") return JSON.stringify(value.replace(/"storySeed":\d+/gu, '"storySeed":0'));
  return JSON.stringify(value) ?? "null";
}
const hash = (state: GameState) => createHash("sha1").update(canonical(state)).digest("hex");
const attempt = <T>(call: () => T): T | { threw: string } => {
  try { return call(); } catch (error) { return { threw: (error as Error).message }; }
};

/** What the rules answer for one state. */
function answers(state: GameState) {
  const city = getCityContent(state.currentCityId);
  const cityEncounters = encounters.encounters.filter((event) => event.cityId === state.currentCityId);
  const cityLandmarks = landmarks.filter((landmark) => landmark.cityId === state.currentCityId);
  const progressed = attempt(() => evaluateProgression(state));
  return {
    dates: dates.map((date) => {
      const availability = attempt(() => getDateAvailability(state, date.id));
      return [date.id, availability, attempt(() => isDateUnlockedForTravel(state, date.id)),
        date.kind !== "normal" ? attempt(() => isEventVisible(state, date.id)) : null];
    }),
    events: city.travel.events.map((event) => [event.id,
      dates.some((date) => date.id === event.id) ? attempt(() => isTravelEventVisible(state, event)) : null,
      attempt(() => isUnclearedMainTravelEvent(state, event.id)), attempt(() => isTravelEventUnlocked(state, event.id)),
      attempt(() => getTravelEventDefinition(state, event.id)?.activityMinutes ?? null)]),
    progression: "threw" in progressed ? progressed : [progressed.romanceStage, progressed.unlockedEventIds],
    encounters: cityEncounters.map((event) => [event.id, attempt(() => getTourismEncounterAvailability(state, event.id))]),
    pending: cityLandmarks.map((landmark) => [landmark.id, attempt(() => hasPendingPlaceEncounter(state, landmark.id))]),
    storyBattles: attempt(() => getAvailableStoryBattles(state).map((battle) => battle.battleId)),
    rewards: allRewardRules.map((rule) => [rule.id, attempt(() => isRewardEarned(state, rule))]),
    valid: attempt(() => { validateGameState(state); return "ok"; }),
  };
}

type Line = { source: string; step: number; hash: string; j: string };
const lineOf = (source: string, step: number, state: GameState): Line =>
  ({ source, step, hash: hash(state), j: canonical(answers(state)) });

/** mulberry32, as the walk test. */
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
type Start = { label: string; build: () => GameState };
const starts: Start[] = playable.flatMap((journey) => [
  { label: `${journey.id}: title`, build: () => {
    const created = createGame("ユウ", "ミオ", { journeyId: journey.id });
    return startCityArrival(created, created.revision);
  } },
  ...journey.cities.slice(1).map((city) => ({ label: `${journey.id}: ${city.id} start`, build: () => cityStart(city.id, ["ユウ", "ミオ"]) })),
]);
const startOf = (seed: number, run: number) => starts[(((seed + run) % starts.length) + starts.length) % starts.length];
const startCache = new Map<string, GameState>();
const startState = (start: Start) => {
  if (!startCache.has(start.label)) startCache.set(start.label, validateGameState(start.build()));
  return startCache.get(start.label)!;
};
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
    case "battle_hint": case "guide_again": return 0.2;
    case "battle_press": case "discover": return 0.4;
    case "battle_observe": return 0.1;
    case "guide_next": case "observation_next": case "read_epilogue": case "battle_epilogue": case "depart": return 3;
    case "wait": return 0.5;
    case "rest": return 0.3;
    default: return 1;
  }
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

/** One fixed walk (seed = start index + 1), as the walk test's fixed run. */
function walkLines(seed: number): Line[] {
  const lines: Line[] = [];
  const next = random(seed);
  const roll = () => Math.floor(next() * 10_000);
  let state: GameState | undefined;
  let since = 0;
  let runs = 0;
  let label = "";
  for (let step = 0; step < FIXED_STEPS; step++) {
    if (!state || since >= RESTART_STEPS) {
      const start = startOf(seed, runs++);
      label = start.label;
      since = 0;
      state = startState(start);
      lines.push(lineOf(`walk ${seed} (${label})`, step, state));
    }
    const current: GameState = state;
    const actions = listPlayerActions(current);
    if (!actions.length) { state = undefined; continue; }
    const ended = isJourneyComplete(current);
    if (ended && next() < 0.8) { state = undefined; continue; }
    const action = pick(current, actions, next);
    state = applyPlayerAction(current, playerActionChange(action, roll));
    since++;
    lines.push(lineOf(`walk ${seed} (${label})`, step, state));
  }
  return lines;
}

/** Scenario-builder states of one city, each also with raised relationship values and with an observation open at each landmark. */
function builderLines(cityId: string, pairs: boolean): Line[] {
  const lines: Line[] = [];
  const start = attempt(() => cityStart(cityId, ["ユウ", "ミオ"]));
  if ("threw" in start) return [{ source: `builder ${cityId} start`, step: 0, hash: "", j: canonical(start) }];
  const own = episodes.filter((episode) => episode.cityId === cityId && episode.kind !== "city_finale");
  const states: [string, () => GameState][] = [
    ["start", () => start],
    ...own.map((episode): [string, () => GameState] => [`episode ${episode.id}`, () => finishEpisode(start, episode.id)]),
    ...(pairs ? own.flatMap((first) => own.filter((second) => second !== first).map((second): [string, () => GameState] =>
      [`episodes ${first.id} then ${second.id}`, () => finishEpisode(finishEpisode(start, first.id), second.id)])) : []),
    ...storyBattlesForCity(cityId).map((battle): [string, () => GameState] => [`special ${battle.battleId}`, () => {
      const result = playBattleToResult(startBattle(start, battle.battleId));
      return validateGameState(leaveBattleResult(result, result.revision));
    }]),
    ["cleared", () => clearCity(start)],
  ];
  for (const [name, build] of states) {
    const built = attempt(build);
    if ("threw" in built) { lines.push({ source: `builder ${cityId} ${name}`, step: 0, hash: "", j: canonical(built) }); continue; }
    const variants: [string, GameState | { threw: string }][] = [
      ["", built], [" +relationship", attempt(() => withRelationship(built, { affection: 20, trust: 20, spark: 20 }))],
    ];
    for (const [suffix, variant] of variants) {
      if ("threw" in variant) { lines.push({ source: `builder ${cityId} ${name}${suffix}`, step: 0, hash: "", j: canonical(variant) }); continue; }
      lines.push(lineOf(`builder ${cityId} ${name}${suffix}`, 0, variant));
      for (const landmark of landmarks.filter((item) => item.cityId === cityId)) {
        let observed = openTourism(variant, landmark.id);
        if (observed.activeTourism?.phase === "guide") observed = skipTourismGuide(observed, observed.revision);
        if (observed !== variant) lines.push(lineOf(`builder ${cityId} ${name}${suffix} observing ${landmark.id}`, 0, observed));
      }
    }
  }
  return lines;
}

function allLines(): Line[] {
  const lines: Line[] = [];
  starts.forEach((_, index) => lines.push(...walkLines(index + 1)));
  for (const journey of playable)
    for (const city of journey.cities) lines.push(...builderLines(city.id, journey.id === "milano"));
  return lines;
}

describe.skipIf(!mode)("condition stage 1: one-off equivalence (old rules vs meets)", () => {
  it(`${mode} ${file}`, () => {
    expect(battles.length).toBeGreaterThan(0);
    const lines = allLines();
    if (mode === "capture") {
      writeFileSync(file, lines.map((line) => JSON.stringify(line)).join("\n") + "\n");
      console.log(`captured ${lines.length} states (${lines.filter((line) => line.source.startsWith("walk")).length} walk, ` +
        `${lines.filter((line) => line.source.startsWith("builder")).length} builder) into ${file}`);
      return;
    }
    const baseline = readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Line);
    const differences: string[] = [];
    if (baseline.length !== lines.length) differences.push(`line count: baseline ${baseline.length}, now ${lines.length}`);
    for (let index = 0; index < Math.min(baseline.length, lines.length) && differences.length < 20; index++) {
      const before = baseline[index];
      const now = lines[index];
      if (before.source !== now.source || before.step !== now.step) differences.push(`line ${index}: ${before.source}#${before.step} → ${now.source}#${now.step}`);
      else if (before.hash !== now.hash) differences.push(`line ${index} ${now.source}#${now.step}: state hash differs`);
      else if (before.j !== now.j) {
        const left = JSON.parse(before.j) as Record<string, unknown>;
        const right = JSON.parse(now.j) as Record<string, unknown>;
        const keys = Object.keys(left).filter((key) => canonical(left[key]) !== canonical(right[key]));
        differences.push(`line ${index} ${now.source}#${now.step}: answers differ in ${keys.join(", ")}: ` +
          keys.map((key) => `${key} ${canonical(left[key]).slice(0, 400)} → ${canonical(right[key]).slice(0, 400)}`).join(" | "));
      }
    }
    console.log(`compared ${lines.length} states (baseline ${baseline.length}); differences: ${differences.length}`);
    expect(differences).toEqual([]);
  }, 1_800_000);
});
