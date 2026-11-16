import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGamePlayProps, PlayClock } from "../contract";
import { RHYTHM_TAP_BOTS, rhythmTapBotRandom, rhythmTapBotTally, rhythmTapBotTaps } from "../engines/rhythm_tap/bot";
import { rhythmTapFairness } from "../engines/rhythm_tap/engine";
import { NO_JUICE } from "../host/no-juice";
import { describeMiniGameRules } from "../testing/rules-contract";
import { sayTogether } from "./definition";
import { Play, retune, rules as moduleRules } from "./play";
import {
  SAY_GAME, SAY_NUMBERS, SAY_WARMUP, SAY_WARMUP_NUMBERS, SAY_WARMUP_WORD_COUNT, SAY_WORD_COUNT, sayGame, sayGameOf, sayTogetherRules,
  type SayRecord, type SayTogetherOutcome, type SayTogetherParams,
} from "./rules";
import { SAY_WARMUP_TEXT, SAY_WORDS_TEXT, sayEndsAt, sayTogetherSkin, sayView, sayWarmupSkin } from "./Skin";

// Practice's warm-up (2026-11-16, the user: 練習は本番より簡単・短く、本番の予習にしない): its own short play, a plain
// count and two words on one even beat, read through the practice params the host merges over the tag's.

const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
const record = (taps: readonly number[]): SayRecord => ({ taps, stopMs: null });
const WARMUP_PARAMS: SayTogetherParams = { warmup: "yes" };
const { wordsAt, countAt } = SAY_WARMUP;
const practiceParams = () => sayTogether.params(context).parse({ ...sayTogether.examples[0], ...(sayTogether.practice ? sayTogether.practice.params : {}) });

describeMiniGameRules({ ...sayTogether, id: "say_together's warm-up", examples: [{ warmup: "yes" }] }, sayTogetherRules, { records: [
  record([]), record([0]), record([countAt[0]]), record(wordsAt), record([SAY_WARMUP.endMs]), record([SAY_WARMUP.endMs + 1]), record([Number.NaN]),
  { taps: "x", stopMs: null } as unknown as SayRecord,
] });

describe("saying it together's practice params", () => {
  it("are the warm-up for practice only: the tag's own params (and the examples) play the real one", () => {
    expect(sayTogether.practice).toEqual({ params: { warmup: "yes" } });
    expect(sayGameOf(practiceParams())).toBe(SAY_WARMUP);
    for (const example of sayTogether.examples) {
      expect(example).not.toHaveProperty("warmup");
      expect(sayGameOf(sayTogether.params(context).parse(example))).toBe(SAY_GAME);
    }
    expect(() => sayTogether.params(context).parse({ warmup: "no" })).toThrow();
  });

  it("leave the real play's rules as they were without the warm-up", () => {
    const random = rhythmTapBotRandom(5);
    for (let play = 0; play < 300; play++) {
      const played = record(SAY_GAME.wordsAt.map((at) => at + (random() - 0.5) * 900).filter(() => random() > 0.15));
      expect(sayTogetherRules.outcomeOf(played, {})).toBe(SAY_GAME.rules.outcomeOf(played, {}));
      expect(sayTogetherRules.rate!(played, {})).toEqual(SAY_GAME.rules.rate!(played, {}));
      expect(sayTogetherRules.outcomeOf(played, WARMUP_PARAMS)).toBe(SAY_WARMUP.rules.outcomeOf(played, WARMUP_PARAMS));
    }
    for (const outcome of ["together", "early", "late", "silent"] as const) {
      expect(sayTogetherRules.autoRecord(outcome, {})).toEqual(SAY_GAME.rules.autoRecord(outcome, {}));
      expect(sayTogetherRules.autoRecord(outcome, WARMUP_PARAMS)).toEqual(SAY_WARMUP.rules.autoRecord(outcome, WARMUP_PARAMS));
    }
    expect(moduleRules).toBe(sayTogetherRules);
  });
});

describe("saying it together's warm-up", () => {
  it("is short: over by about 2.7 s, half the real play", () => {
    const last = wordsAt[SAY_WARMUP_WORD_COUNT - 1];
    // The skin ends it on its last word, or as that word's window closes; the engine's own end is a fallback after it.
    expect(last + SAY_WARMUP.lateOf(SAY_WARMUP_WORD_COUNT - 1)).toBeLessThanOrEqual(2700);
    expect(SAY_WARMUP.endMs).toBeLessThanOrEqual(3000);
    expect(SAY_WARMUP.endMs).toBeLessThan(SAY_GAME.endMs / 1.5);
    expect(SAY_WARMUP.wordsAt[0]).toBeLessThan(SAY_GAME.wordsAt[0]);
  });

  it("has none of the real play's twists: two words, not four, on one even beat of its own, no held word, no breath", () => {
    expect(SAY_WARMUP_WORD_COUNT).toBeLessThan(SAY_WORD_COUNT);
    expect(wordsAt).toHaveLength(SAY_WARMUP_WORD_COUNT);
    const moments = [...countAt, ...wordsAt];
    const gaps = moments.slice(1).map((at, index) => at - moments[index]);
    expect(new Set(gaps)).toEqual(new Set([SAY_WARMUP_NUMBERS.beatMs]));
    // Not her count's beat, nor her first word's moment: nothing of the real timing to learn here.
    expect(SAY_WARMUP_NUMBERS.beatMs).not.toBe(SAY_NUMBERS.beatMs);
    expect(countAt[0]).not.toBe(SAY_GAME.countAt[0]);
    expect(wordsAt[0]).not.toBe(SAY_GAME.wordsAt[0]);
    for (let ms = 0; ms <= SAY_WARMUP.endMs; ms += 10) expect(sayView(SAY_WARMUP, ms, record([]), false, false)).toMatchObject({ held: 0, breath: false });
    expect(SAY_WARMUP.numbers).toMatchObject({ stretchMs: 0, catchUpMs: 0, holdMs: 0, breathMs: 0 });
  });

  it("is forgiving: one window, wider than the real play's on both sides, and fair on a phone", () => {
    expect(SAY_WARMUP_NUMBERS.cleanEarlyMs).toBeGreaterThan(SAY_NUMBERS.cleanEarlyMs);
    expect(SAY_WARMUP_NUMBERS.cleanLateMs).toBeGreaterThan(SAY_NUMBERS.laterLateMs);
    expect(SAY_WARMUP.lateOf(0)).toBe(SAY_WARMUP.lateOf(1));
    expect(SAY_WARMUP.fairness()).toEqual([]);
    expect(rhythmTapFairness(SAY_WARMUP.tuning)).toEqual([]);
  });

  it("says a plain count and its own words, not the story's", () => {
    const story = [...SAY_WORDS_TEXT, "せー", "の"];
    for (const text of [...SAY_WARMUP_TEXT.count, ...SAY_WARMUP_TEXT.words]) for (const word of story) expect(text).not.toContain(word);
    expect(SAY_WARMUP_TEXT.words).toHaveLength(SAY_WARMUP_WORD_COUNT);
    expect(sayWarmupSkin.hintJa).not.toBe(sayTogetherSkin.hintJa);
    expect(`${sayWarmupSkin.hintJa}${sayWarmupSkin.actionHintJa}`).not.toMatch(/せー|ヤートリーガン|デーン/u);
    expect(sayWarmupSkin.countIn).toEqual(countAt);
    expect(sayWarmupSkin.tuning.beats).toEqual(wordsAt);
    expect(sayWarmupSkin.bigBeats).toEqual([SAY_WARMUP_WORD_COUNT - 1]);
    expect(sayWarmupSkin.ignoreBeforeMs).toBe(countAt[0]);
  });

  it("judges the first word as the real play does, in its own window", () => {
    const outcome = (taps: readonly number[]) => sayTogetherRules.outcomeOf(record(taps), WARMUP_PARAMS);
    const { cleanEarlyMs, cleanLateMs } = SAY_WARMUP_NUMBERS;
    expect(outcome(wordsAt)).toBe("together");
    expect(outcome([wordsAt[0] - cleanEarlyMs])).toBe("together");
    expect(outcome([wordsAt[0] + cleanLateMs])).toBe("together");
    expect(outcome([wordsAt[0] - cleanEarlyMs - 1])).toBe("early");
    expect(outcome([wordsAt[0] + cleanLateMs + 1])).toBe("late");
    expect(outcome([])).toBe("silent");
    // A tap before her count is no tap.
    expect(outcome([countAt[0] - 1])).toBe("silent");
    expect(sayTogetherRules.rate!(record(wordsAt), WARMUP_PARAMS)).toEqual({ stars: 3, scoreJa: "2語そろった（2語中）" });
    expect(sayTogetherRules.rate!(record([]), WARMUP_PARAMS)).toBeNull();
  });

  it("ends by itself with one of the game's outcomes: on its last word said together, else as that word's window closes", () => {
    const outcomes = sayTogether.outcomes.map((item) => item.id);
    const last = wordsAt[SAY_WARMUP_WORD_COUNT - 1];
    const lastLate = last + SAY_WARMUP.lateOf(SAY_WARMUP_WORD_COUNT - 1);
    expect(sayEndsAt(SAY_WARMUP, last - 1, record(wordsAt))).toBe(false);
    expect(sayEndsAt(SAY_WARMUP, last, record(wordsAt))).toBe(true);
    expect(sayEndsAt(SAY_WARMUP, lastLate - 1, record([]))).toBe(false);
    expect(sayEndsAt(SAY_WARMUP, lastLate, record([]))).toBe(true);
    expect(lastLate).toBeLessThan(SAY_WARMUP.endMs);
    // Every play, whatever its taps, reaches its end by then with a declared outcome.
    const random = rhythmTapBotRandom(9);
    for (let play = 0; play < 300; play++) {
      const played = record(Array.from({ length: Math.floor(random() * 5) }, () => Math.round(random() * SAY_WARMUP.endMs)));
      expect(sayEndsAt(SAY_WARMUP, lastLate, played)).toBe(true);
      expect(outcomes).toContain(sayTogetherRules.outcomeOf(played, WARMUP_PARAMS));
    }
    for (const outcome of outcomes) {
      const auto = sayTogetherRules.autoRecord(outcome, WARMUP_PARAMS);
      expect(sayEndsAt(SAY_WARMUP, lastLate, auto)).toBe(true);
      expect(sayTogetherRules.outcomeOf(auto, WARMUP_PARAMS)).toBe(outcome);
    }
  });

  it("is easier than the real play for round 3's bots: both words together for nearly every average player", () => {
    const play = (game: typeof SAY_GAME, params: SayTogetherParams, bot: (typeof RHYTHM_TAP_BOTS)[number], seed: number) => {
      const random = rhythmTapBotRandom(seed);
      const scene = { beats: game.wordsAt, leadGapMs: game.countAt[1] - game.countAt[0] };
      return rhythmTapBotTally(Array.from({ length: 500 }, () => {
        const played = record(rhythmTapBotTaps(scene, bot, random));
        return { outcome: sayTogetherRules.outcomeOf(played, params), stars: sayTogetherRules.rate!(played, params)?.stars ?? null };
      }));
    };
    for (const [index, bot] of RHYTHM_TAP_BOTS.entries()) {
      const warmup = play(SAY_WARMUP, WARMUP_PARAMS, bot, 31 + index);
      const real = play(SAY_GAME, {}, bot, 31 + index);
      expect(warmup.stars["★3"] ?? 0, bot.name).toBeGreaterThan(real.stars["★3"] ?? 0);
      expect(warmup.outcomes.together, bot.name).toBeGreaterThanOrEqual(real.outcomes.together);
    }
    expect(play(SAY_WARMUP, WARMUP_PARAMS, RHYTHM_TAP_BOTS[1], 41).stars["★3"]).toBeGreaterThan(0.9);
  });
});

describe("saying it together's play with practice params", () => {
  const clock: PlayClock = { now: () => 0, at: () => 0, onFrame: () => () => undefined, after: () => () => undefined };
  const render = (PlayOf: typeof Play, params: SayTogetherParams) => renderToStaticMarkup(createElement(PlayOf, {
    params, auto: null, available: ["together", "early", "late", "silent"], still: false, seed: 1, clock,
    cast: { heroine: createElement("i") }, names: { player: "主人公", heroine: "ヒロイン" }, art: {}, sound: () => undefined, vibrate: () => undefined,
    status: () => undefined, decided: () => undefined, end: () => undefined, practice: params.warmup === "yes", juice: NO_JUICE, react: () => undefined,
  } satisfies MiniGamePlayProps<SayTogetherParams, SayTogetherOutcome>));
  const marks = (html: string) => html.match(/data-state="coming"/gu)?.length ?? 0;

  it("plays the warm-up for practice and the real phrase otherwise, retuned or not", () => {
    for (const PlayOf of [Play, retune({ ...SAY_NUMBERS, beatMs: 560 }).Play]) {
      const warmup = render(PlayOf, WARMUP_PARAMS);
      expect(warmup).toContain(sayWarmupSkin.hintJa);
      expect(marks(warmup)).toBe(SAY_WARMUP_WORD_COUNT);
      const real = render(PlayOf, {});
      expect(real).toContain(sayTogether.hintJa);
      expect(marks(real)).toBe(SAY_WORD_COUNT);
    }
  });

  it("keeps the warm-up's own rules in Debug's room (its numbers are not the room's) and the room's edit for the real play", () => {
    const edited = { ...SAY_NUMBERS, beatMs: 560 };
    const { rules } = retune(edited);
    const game = sayGame(edited);
    for (const outcome of ["together", "early", "late", "silent"] as const) {
      expect(rules.autoRecord(outcome, WARMUP_PARAMS)).toEqual(SAY_WARMUP.rules.autoRecord(outcome, WARMUP_PARAMS));
      expect(rules.autoRecord(outcome, {})).toEqual(game.rules.autoRecord(outcome, {}));
    }
    expect(rules.outcomeOf(record(wordsAt), WARMUP_PARAMS)).toBe("together");
    expect(rules.outcomeOf(record(game.wordsAt), {})).toBe("together");
  });
});
