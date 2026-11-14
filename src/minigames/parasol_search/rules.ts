import type { MiniGameRating, MiniGameRules } from "../contract";
import { searchEnding, searchRules, type SearchGame, type SearchRecord, type SearchSetup } from "../engines/search/engine";

// The parasol's rules (docs/13 2.4): a search skin of three rounds, the three things the heroine later tells the vegetable
// seller she saw from the window (2026-11-13 playtest: the game now looks at what the story reports), each a different
// kind of looking (2026-11-14, round 3: 「難しく、楽しく」). Round 1, compare: her old parasol among the street's umbrellas
// (the tag's `at`: one of the near pavement's stalls; two more old parasols, two more vegetable stalls). Round 2, watch:
// the customer arguing with her over the price, among six others; the argument comes in bursts (arms up and the ₹!), and
// two others throw their arms up between them, shouting too, with no ₹ (the feints). Round 3, catch (the climax): she
// hands a tomato to the child in front of her stall, then the children run off; the tomato child reaches the side street
// at `walkOffMs` (the round's own time: 「あ、行っちゃう！」, she points it out, and the find is hers). A wrong one is only looked at (the round goes on); 「どこ？」 or doing nothing for a while
// has her point it out, and the next round comes (sooner after a round the player left to her). Outcomes: every round
// found by the player with at most one wrong look in all (`found`), with more (`found_slow`), or any round pointed out
// (`pointed`). The rating (★, the result card only) adds the time. The tag's `rounds` may play fewer. The bursts, feints
// and the handover are on the field's clock from the round's start (parasolActive: the skin draws them, the tests' bot
// reads them); the outcome never reads a time. Nothing is random. Pure.

export type ParasolOutcome = "found" | "found_slow" | "pointed";
/** Where on the near pavement the old parasol is. */
export type ParasolPlace = "left" | "middle" | "right";
export interface ParasolParams {
  at: ParasolPlace;
  /** How many of the three rounds to play, from the first (3 in the story; 1 in the practice). */
  rounds?: number;
}

/** Round 1's umbrellas, in the field's order (and Tab's): five stalls on the far pavement, three people walking in the road, five stalls on the near pavement. */
export const PARASOL_SPOTS = [
  "far_1", "far_2", "far_3", "far_4", "far_5", "road_1", "road_2", "road_3", "near_1", "near_2", "near_3", "near_4", "near_5",
] as const;
export type ParasolSpot = (typeof PARASOL_SPOTS)[number];
/** The near pavement's stalls where the old parasol may be (the tag's `at`). */
export const PARASOL_PLACES: Record<ParasolPlace, ParasolSpot> = { left: "near_2", middle: "near_3", right: "near_4" };
/** Round 2's customers, in the field's order: each stands in front of a stall (three across the road, four on the near pavement). */
export const PARASOL_CUSTOMERS = ["far_2", "far_3", "far_4", "near_1", "near_2", "near_3", "near_4"] as const satisfies readonly ParasolSpot[];
/** Round 3's children walking by, in the field's order (two across the road, three on the near side); one holds the tomato she gave. */
export const PARASOL_CHILDREN = ["child_1", "child_2", "child_3", "child_4", "child_5"] as const;
export const PARASOL_TOMATO_CHILD = 1;
export const PARASOL_ROUNDS = 3;

/** The parasol's numbers (E1; Debug's room may change them for its next play). Times of a round are from its start. */
export type ParasolTuning = {
  /** Doing nothing this long in a round: she points it out, and the next round comes. */
  idleMs: number;
  /** After a round the player left to her (nothing looked at, doing nothing): the next rounds' wait before she points. */
  idleAfterLeftMs: number;
  /** Every round found with at most this many wrong looks in all: found; more: found_slow. */
  quickMisses: number;
  /** ★3: no wrong look, and the whole look within this long a round (the three rounds: three times it). */
  starMsPerRound: number;
  /** Round 2: the argument's first burst (arms up, the ₹!), how often it comes, and how long it lasts. */
  argueFirstMs: number;
  argueEveryMs: number;
  argueForMs: number;
  /**
   * Round 2's feints, at the same pace: the glad one's arms go up first (a wind-up before the first burst: the patient eye
   * waits for the ₹), the waver's one arm during it, the stretcher's after it.
   */
  feintGladMs: number;
  feintWaveMs: number;
  feintStretchMs: number;
  feintForMs: number;
  /**
   * Round 3: the tomato in the child's hands, then the children run off; the tomato child reaches the side street's mouth
   * (she points it out: a player still looking then found it with her).
   */
  handoverMs: number;
  walkFromMs: number;
  walkOffMs: number;
};
export const PARASOL_TUNING: ParasolTuning = {
  idleMs: 8000, idleAfterLeftMs: 4000, quickMisses: 1, starMsPerRound: 1700,
  argueFirstMs: 1500, argueEveryMs: 2600, argueForMs: 1000, feintGladMs: 450, feintWaveMs: 1950, feintStretchMs: 2550, feintForMs: 900,
  // The climax (2026-11-14 playtest: at 6.5 s, waiting for her warning still caught the child): a beat at the stall after
  // the handover, then they run off and the round is over at 4.3 s.
  handoverMs: 700, walkFromMs: 1300, walkOffMs: 4300,
};
export const PARASOL_QUICK_MISSES = PARASOL_TUNING.quickMisses;
export const PARASOL_IDLE_MS = PARASOL_TUNING.idleMs;

/** The rounds the tag plays (1 to 3, all three when it says nothing). */
export const parasolRounds = (params: ParasolParams) => Math.min(PARASOL_ROUNDS, Math.max(1, Math.trunc(params.rounds ?? PARASOL_ROUNDS) || PARASOL_ROUNDS));

/** The rounds' targets for the tag's `at`: her stall, the customer at it, the child with the tomato. */
export function parasolTargets(params: ParasolParams): [number, number, number] {
  const stall = PARASOL_PLACES[params.at] ?? PARASOL_PLACES.middle;
  return [PARASOL_SPOTS.indexOf(stall), PARASOL_CUSTOMERS.indexOf(stall as (typeof PARASOL_CUSTOMERS)[number]), PARASOL_TOMATO_CHILD];
}

/** What a round-2 customer does on the field: argues (hers), throws the arms up (the two feints), or something calmer. */
export type ParasolGesture = "argue" | "ask" | "laugh" | "wave" | "basket" | "cheer" | "stretch";

/** A moment that comes again and again: on from `first`, for `length`, every `every` (ms of the round). */
export const parasolBurst = (ms: number, first: number, every: number, length: number): boolean =>
  ms >= first && (every > 0 ? (ms - first) % every : ms - first) < length;

/**
 * Whether a round-2 customer is doing their gesture at a time of the round: the argument's bursts, the feints about them
 * (both arms up for joy or a stretch, one arm waving); the calmer ones (a question, a laugh, a basket) all along.
 */
export function parasolActive(gesture: ParasolGesture, ms: number, tuning: ParasolTuning = PARASOL_TUNING): boolean {
  const every = Math.max(1, tuning.argueEveryMs);
  if (gesture === "argue") return parasolBurst(ms, tuning.argueFirstMs, every, tuning.argueForMs);
  if (gesture === "cheer") return parasolBurst(ms, tuning.feintGladMs, every, tuning.feintForMs);
  if (gesture === "stretch") return parasolBurst(ms, tuning.feintStretchMs, every, tuning.feintForMs);
  if (gesture === "wave") return parasolBurst(ms, tuning.feintWaveMs, every, tuning.feintForMs);
  return true;
}

/** The least a tell shows (ms): a burst or a feint shorter than this is a flicker, not a gesture to read. */
export const PARASOL_MIN_TELL_MS = 500;

/** Why a tuning would make the look unfair (Debug's room lists them; none: fair). */
export function parasolFairness(tuning: ParasolTuning): string[] {
  const problems: string[] = [];
  if (tuning.argueForMs < PARASOL_MIN_TELL_MS) problems.push(`argueForMs ${tuning.argueForMs} is shorter than ${PARASOL_MIN_TELL_MS}: the ₹ flickers`);
  if (tuning.argueEveryMs < tuning.argueForMs) problems.push("argueEveryMs is shorter than argueForMs: the argument never stops (no feints to read)");
  if (tuning.argueFirstMs + tuning.argueForMs > tuning.idleMs) problems.push("the first burst ends after the idle limit: she points before it can be seen");
  if (tuning.feintForMs < PARASOL_MIN_TELL_MS) problems.push(`feintForMs ${tuning.feintForMs} is shorter than ${PARASOL_MIN_TELL_MS}`);
  if (tuning.handoverMs > tuning.walkFromMs) problems.push("handoverMs is after walkFromMs: the children walk off before the tomato is handed over");
  if (tuning.walkOffMs - tuning.handoverMs < 3000) problems.push("less than 3 s between the handover and the walk-off: no time to find the tomato child");
  if (tuning.starMsPerRound * 3 < tuning.argueFirstMs + tuning.handoverMs + 1500) problems.push("starMsPerRound is too short for ★3 to be reachable after the first burst and the handover");
  return problems;
}

export const parasolSetupFor = (tuning: ParasolTuning) => (params: ParasolParams): SearchSetup => {
  const [stall, customer, child] = parasolTargets(params);
  return {
    rounds: [
      { spots: PARASOL_SPOTS.length, targets: [stall] },
      { spots: PARASOL_CUSTOMERS.length, targets: [customer] },
      // The tomato child reaches the side street's mouth (she points it out): the round's own time.
      { spots: PARASOL_CHILDREN.length, targets: [child], limitMs: Math.max(1, Math.round(tuning.walkOffMs)) },
    ].slice(0, parasolRounds(params)),
    // A wrong one is only a look: the player looks at the next.
    wrongLimit: null,
    buttons: [{ id: "ask", presses: 1, ends: "round" }],
    timeLimitMs: null,
    idleMs: Math.max(1, Math.round(tuning.idleMs)),
    idleAfterLeftMs: Math.max(1, Math.round(tuning.idleAfterLeftMs)),
    idleEnds: "round",
  };
};
export const parasolSetup = parasolSetupFor(PARASOL_TUNING);

export const parasolGameFor = (tuning: ParasolTuning): SearchGame<ParasolParams, ParasolOutcome> => ({
  setup: parasolSetupFor(tuning),
  outcome: (ending) => {
    // She pointed out any of the three (「どこ？」, doing nothing, or the child gone): pointed.
    if (ending.helped > 0) return "pointed";
    switch (ending.kind) {
      case "found": return ending.misses <= tuning.quickMisses ? "found" : "found_slow";
      // Helped through the last round, or a play stopped with nothing (never sent by the play): she points it out. There
      // is no wrong limit, no play button, no time limit; were there, she would point it out too.
      case "helped":
      case "button":
      case "idle":
      case "timeout":
      case "wrong": return "pointed";
    }
  },
  auto: (outcome) => {
    switch (outcome) {
      case "found": return { kind: "found", misses: 0 };
      case "found_slow": return { kind: "found", misses: tuning.quickMisses + 1 };
      case "pointed": return { kind: "button", button: "ask" };
    }
  },
});
export const parasolGame = parasolGameFor(PARASOL_TUNING);

/**
 * How well the look went (the result card's ★ only; never saved, never Ink), in step with the outcome: found with no
 * wrong look and every round within its time ★3, found ★2, found_slow ★1, pointed out not rated. The score is the time,
 * and the wrong looks when there were any (what took a ★ off a quick find): 「4.6秒・見間違い 2」; a ★2 says what ★3
 * asks (2026-11-14 playtest: 「5.8秒で見つけた」 did not say why it was not ★3): 「5.8秒（★3は5.1秒まで）」.
 */
export function parasolRating(record: SearchRecord, params: ParasolParams, tuning: ParasolTuning = PARASOL_TUNING): MiniGameRating | null {
  const ending = searchEnding(record, parasolSetupFor(tuning)(params));
  if (ending.kind !== "found" || ending.helped > 0) return null;
  const endMs = typeof record?.endMs === "number" && Number.isFinite(record.endMs) ? record.endMs : null;
  // Tenths rounded up: a time over the ★3 bar never reads as the bar itself.
  const seconds = endMs === null ? null : `${(Math.ceil(endMs / 100) / 10).toFixed(1)}秒`;
  const starMs = tuning.starMsPerRound * parasolRounds(params);
  const looked = seconds === null ? undefined : ending.misses > 0 ? `${seconds}・見間違い ${ending.misses}` : `${seconds}で見つけた`;
  if (ending.misses > tuning.quickMisses) return { stars: 1, ...(looked ? { scoreJa: looked } : {}) };
  const inTime = endMs !== null && endMs <= starMs;
  if (ending.misses === 0 && inTime) return { stars: 3, ...(looked ? { scoreJa: looked } : {}) };
  const limitJa = `${(starMs / 1000).toFixed(1)}秒まで`;
  const bar = ending.misses === 0 ? limitJa : inTime ? "見間違いなし" : `見間違いなしで${limitJa}`;
  const scoreJa = seconds === null ? undefined : `${ending.misses > 0 ? looked : seconds}（★3は${bar}）`;
  return { stars: 2, ...(scoreJa ? { scoreJa } : {}) };
}

export function parasolRulesFor(tuning: ParasolTuning): MiniGameRules<ParasolParams, ParasolOutcome, SearchRecord> {
  return { ...searchRules(parasolGameFor(tuning)), rate: (record, params) => parasolRating(record, params, tuning) };
}
export const parasolRules = parasolRulesFor(PARASOL_TUNING);
