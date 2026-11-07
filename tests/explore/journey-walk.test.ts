// Exploration test (docs/10「探索テスト」; research E2E-9): a seeded random walk through the game
// functions, over every available journey (the sample journey too when the test build includes it).
// Each step lists what the player can do now (listPlayerActions: the screens' own availability
// rules), takes one of those actions as GameApp's commit does (applyPlayerAction), saves and loads
// it with the game's own saveGame / loadGame, and checks:
// - safety: the state passes validateGameState, AP stays within 0..cap, AP changes only by the
//   rewards whose IDs are newly recorded (each ID once) minus the AP of a date started in that step,
//   every offered action changes the state, and the save → load round trip gives the same state;
// - liveness: before the end of the journey there is always something to do (zero actions = stuck).
// A failure names the seed, the step and the last actions; rerun it with DREAMSCAPE_WALK_SEEDS.
// The walk starts at the title of a journey or at the start of one of its later cities, and starts
// again at the end of the journey or after RESTART_STEPS steps.
// Which content the walks reached is printed as a summary, never asserted: it shows content that
// normal play cannot reach (e.g. most Milano place encounters, ideas2 [WP06a]) without failing.
// PR/verify: the fixed seeds below. Weekly: DREAMSCAPE_WALK_SEEDS (comma-separated) and
// DREAMSCAPE_WALK_STEPS (steps per seed) widen it.
import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { allRewardRules, balance, battles, dates, episodes, getCityContent } from "../../src/content";
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

const FIXED_SEEDS = [1, 2, 3, 4];
const FIXED_STEPS = 1500;
const RESTART_STEPS = 1200;
const TRACE_LENGTH = 25;

function envList(name: string): number[] | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const values = raw.split(",").map((item) => Number(item.trim()));
  if (values.some((value) => !Number.isSafeInteger(value))) throw new Error(`${name} must be integers separated by commas: ${raw}`);
  return values;
}
const seeds = envList("DREAMSCAPE_WALK_SEEDS") ?? FIXED_SEEDS;
const steps = envList("DREAMSCAPE_WALK_STEPS")?.[0] ?? FIXED_STEPS;

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
    case "battle_hint": case "guide_again": return 0.2;
    case "battle_press": case "discover": case "observe_again": return 0.4;
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

const totalAp = (state: GameState) => state.ap + state.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0);
const ruleAp = (id: string) => allRewardRules.find((rule) => rule.id === id)!.ap;
/** AP the step spent: only starting a date costs AP (startDate). */
function spentAp(previous: GameState, next: GameState): number {
  const date = next.activeDate;
  if (!date || previous.activeDate?.runId === date.runId) return 0;
  return dates.find((item) => item.id === date.dateId)!.apCost;
}
const describeAction = (action: PlayerAction) => JSON.stringify(action);

/** What the walks reached, per journey (printed at the end, never asserted). */
type Reached = Record<"cities" | "episodes" | "battles" | "dates" | "encounters" | "cleared" | "epilogues", Set<string>> & { ends: number; steps: number };
const reached = new Map<string, Reached>();
function reachedFor(journeyId: string): Reached {
  if (!reached.has(journeyId)) reached.set(journeyId, {
    cities: new Set(), episodes: new Set(), battles: new Set(), dates: new Set(), encounters: new Set(),
    cleared: new Set(), epilogues: new Set(), ends: 0, steps: 0,
  });
  return reached.get(journeyId)!;
}
/** Only what this step did counts (a later city's start state already holds the earlier cities). */
function record(journeyId: string, previous: GameState, state: GameState) {
  const seen = reachedFor(journeyId);
  const added = (before: string[], after: string[]) => after.filter((id) => !before.includes(id));
  seen.steps++;
  seen.cities.add(state.currentCityId);
  added(previous.completedEpisodeIds, state.completedEpisodeIds).forEach((id) => seen.episodes.add(id));
  if (state.activeBattle) seen.battles.add(state.activeBattle.battleId);
  if (state.activeDate) seen.dates.add(state.activeDate.dateId);
  if (state.activeEncounter) seen.encounters.add(state.activeEncounter.encounterId);
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
      `rerun: DREAMSCAPE_WALK_SEEDS=${seed} DREAMSCAPE_WALK_STEPS=${total} npx vitest run tests/explore/journey-walk.test.ts`,
    ].join("\n"));
  };
  for (let step = 0; step < total; step++) {
    if (!state || since >= RESTART_STEPS) {
      // The journeys take turns (seed by seed, run by run), then one of the journey's starts.
      const journeyId = playable[(seed + runs++) % playable.length].id;
      // A seed's first run of each journey starts at its title, later runs anywhere.
      const own = starts.filter((item) => item.journeyId === journeyId);
      start = runs <= playable.length ? own[0] : own[Math.floor(next() * own.length)];
      state = startState(start);
      memory.clear();
      since = 0;
      trace = [`(start ${start.label})`];
    }
    const journeyId = start!.journeyId;
    const actions = listPlayerActions(state);
    const ended = isJourneyComplete(state);
    if (!actions.length) {
      if (!ended) fail(step, "stuck: nothing to do before the end of the journey");
      state = undefined;
      continue;
    }
    if (ended && next() < 0.8) { // The end of the journey: mostly start again, sometimes stay for dates.
      state = undefined;
      continue;
    }
    const action = pick(state, actions, next);
    trace = [...trace, `${state.currentCityId} r${state.revision}: ${describeAction(action)}`].slice(-TRACE_LENGTH);
    const previous: GameState = state;
    let changed: GameState;
    try {
      changed = applyPlayerAction(previous, playerActionChange(action, roll));
    } catch (error) {
      return fail(step, `the action threw: ${(error as Error).message}`);
    }
    if (changed === previous) fail(step, "an offered action changed nothing");
    if (changed.ap < 0 || changed.ap > balance.apCap) fail(step, `AP out of range: ${changed.ap}`);
    const lost = previous.claimedRewardIds.filter((id) => !changed.claimedRewardIds.includes(id));
    if (lost.length) fail(step, `reward IDs were forgotten (and could be paid again): ${lost.join(", ")}`);
    const earned = changed.claimedRewardIds.filter((id) => !previous.claimedRewardIds.includes(id));
    const expected = totalAp(previous) + earned.reduce((sum, id) => sum + ruleAp(id), 0) - spentAp(previous, changed);
    if (totalAp(changed) !== expected)
      fail(step, `AP (held + stored) is ${totalAp(changed)}, expected ${expected}: new reward IDs [${earned.join(", ")}], AP of a started date ${spentAp(previous, changed)}`);
    const storage = journeyStorage(base, journeyId);
    // saveGame validates the state (validateGameState) and refuses a revision that did not increase.
    // (No expected previous snapshot: one tab, so the other-tab check would only repeat a validation.)
    const result = saveGame(storage, changed);
    if (!result.ok) {
      try { validateGameState(changed); }
      catch (error) { fail(step, `validateGameState refused the new state: ${(error as Error).message}`); }
      fail(step, `saveGame refused the new state: ${result.message}`);
    }
    const loaded = loadGame(storage);
    if (loaded.status !== "loaded") fail(step, `loadGame could not read the save back (${loaded.status})`);
    const restored = (loaded as Extract<typeof loaded, { status: "loaded" }>).state;
    try { expect(restored).toEqual(changed); }
    catch { fail(step, "the save → load round trip changed the state"); }
    state = restored;
    since++;
    record(journeyId, previous, state);
  }
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
    const dormant = cityEncounters.filter((event) => event.availability === "dormant").map((event) => event.id);
    lines.push(`${journey.id} (${seen.steps} steps, journey end reached ${seen.ends} times):`,
      count("cities reached", cityIds, seen.cities),
      count("cities cleared", cityIds, seen.cleared),
      count("epilogues read", cityIds, seen.epilogues),
      count("stops completed", episodes.filter((episode) => cityIds.includes(episode.cityId)).map((episode) => episode.id), seen.episodes),
      count("battles started", battleIds, seen.battles),
      count("dates started", dateIds, seen.dates),
      count("place encounters met", cityEncounters.filter((event) => event.availability !== "dormant").map((event) => event.id), seen.encounters),
      ...(dormant.length ? [`  dormant encounters (offered nowhere by design): ${dormant.join(", ")}`] : []));
  }
  return lines.join("\n");
}

describe("random walk through the game functions", () => {
  afterAll(() => {
    const text = summary();
    console.log(text);
    // Also kept as a file (artifacts/ is not committed), for the weekly run's artifact.
    mkdirSync("artifacts/explore", { recursive: true });
    writeFileSync("artifacts/explore/journey-walk-coverage.txt", `${text}\n`);
  });

  it.each(seeds)("seed %i: every step is valid and saved, and the player is never stuck before the end", (seed) => {
    walk(seed, steps);
  }, 120_000);
});
