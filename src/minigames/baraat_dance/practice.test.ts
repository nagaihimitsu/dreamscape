import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGamePlayProps, PlayClock } from "../contract";
import { RHYTHM_TAP_BOTS, rhythmTapBotRandom, rhythmTapBotTally, rhythmTapBotTaps } from "../engines/rhythm_tap/bot";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapJudge, rhythmTapWindow, type RhythmTapRecord } from "../engines/rhythm_tap/engine";
import { NO_JUICE } from "../host/no-juice";
import { baraatDance } from "./definition";
import { Play, retune } from "./play";
import {
  BARAAT_GAME, BARAAT_NUMBERS, BARAAT_TUNING, BARAAT_WARMUP_GAME, baraatRules, type BaraatOutcome, type BaraatParams,
} from "./rules";
import { baraatSkin, baraatWarmupSkin } from "./Skin";

// Practice's warm-up (2026-11-16, the user's decision: practice is shorter and simpler than the real dance, and no
// rehearsal of it). The host plays it with the definition's practice params over the tag's (`warmup yes`); the story's
// dance never gets them.

const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
const schema = baraatDance.params(context);
const practice = baraatDance.practice ? baraatDance.practice.params ?? {} : {};
const WARMUP: BaraatParams = schema.parse(practice);
const DANCE: BaraatParams = schema.parse({});
const warm = BARAAT_WARMUP_GAME.tuning;
const outcomes = baraatDance.outcomes.map((outcome) => outcome.id);
const gapsOf = (times: readonly number[]) => times.slice(1).map((time, index) => time - times[index]);

describe("the baraat dance's practice (the warm-up)", () => {
  it("is what practice's params read as; the story's tag (no key) reads none of it, and no example names it", () => {
    expect(practice).toEqual({ warmup: "yes" });
    expect(WARMUP).toEqual({ warmup: "yes" });
    expect(DANCE).toEqual({});
    for (const example of baraatDance.examples) expect(example).not.toHaveProperty("warmup");
    expect(() => schema.parse({ warmup: "no" })).toThrow();
  });

  it("is much shorter: a third of the dance or less (about 5.6 s against 17)", () => {
    const end = rhythmTapEnd(warm);
    expect(end).toBe(5600);
    expect(end).toBeLessThanOrEqual(rhythmTapEnd(BARAAT_TUNING) / 3);
    expect(warm.beats.length).toBeLessThanOrEqual(BARAAT_TUNING.beats.length / 3);
  });

  it("is the basic tap only: a count of two, then five even beats, slower, with wider windows; none of the dance's twists", () => {
    expect(rhythmTapFairness(warm)).toEqual([]);
    expect(BARAAT_WARMUP_GAME.countIn).toHaveLength(2);
    expect(warm.beats).toHaveLength(5);
    // One even pace from the count to the last beat: no groove off the beat, no burst, no change of tempo.
    expect(new Set(gapsOf([...BARAAT_WARMUP_GAME.countIn, ...warm.beats]))).toEqual(new Set([750]));
    expect(Math.min(...gapsOf(warm.beats))).toBeGreaterThan(Math.max(...gapsOf(BARAAT_TUNING.beats.slice(0, 5))));
    // No rests (the break, the stop), no finale's narrower window, no big beats; no phrase but the count and its beats.
    expect(warm.rests).toBeUndefined();
    expect(warm.peak).toBeUndefined();
    expect(BARAAT_WARMUP_GAME.bigBeats).toEqual([]);
    expect(BARAAT_WARMUP_GAME.sections.map((section) => section.name)).toEqual(["count", "warmup"]);
    // Forgiving: every beat's window wider than any of the dance's.
    for (const index of warm.beats.keys()) {
      const window = rhythmTapWindow(warm, index);
      expect(window.earlyMs).toBeGreaterThan(BARAAT_NUMBERS.earlyMs);
      expect(window.lateMs).toBeGreaterThan(BARAAT_NUMBERS.lateMs);
    }
  });

  it("is no preview of the dance: its own count and pace, never the dance's first bars", () => {
    expect(BARAAT_WARMUP_GAME.countIn.length).not.toBe(BARAAT_GAME.countIn.length);
    expect(gapsOf(BARAAT_WARMUP_GAME.countIn)).not.toEqual(gapsOf(BARAAT_GAME.countIn).slice(0, 1));
    const from = (times: readonly number[]) => times.map((time) => time - times[0]);
    expect(from(warm.beats)).not.toEqual(from(BARAAT_TUNING.beats).slice(0, warm.beats.length));
  });

  it("ends by itself at its end, whatever the player does, with one of the game's outcomes; every outcome reachable", () => {
    const end = rhythmTapEnd(warm);
    const mashed = Array.from({ length: 40 }, (_, index) => 1800 + index * 100);
    const records: RhythmTapRecord[] = [
      { taps: [], stopMs: null }, { taps: warm.beats, stopMs: null }, { taps: mashed, stopMs: null },
      { taps: [...BARAAT_WARMUP_GAME.countIn, ...warm.beats.slice(0, 2)], stopMs: null }, { taps: [Number.NaN], stopMs: Number.NaN },
      ...outcomes.map((outcome) => baraatRules.autoRecord(outcome, WARMUP)),
    ];
    for (const record of records) {
      expect(rhythmTapJudge(record, warm, end - 1).ended).toBeNull();
      expect(rhythmTapJudge(record, warm, end)).toMatchObject({ ended: "end", endMs: end });
      expect(outcomes).toContain(baraatRules.outcomeOf(record, WARMUP));
      expect(() => baraatRules.rate!(record, WARMUP)).not.toThrow();
    }
    expect(baraatRules.outcomeOf({ taps: [], stopMs: null }, WARMUP)).toBe("stood_still");
    expect(baraatRules.outcomeOf({ taps: warm.beats, stopMs: null }, WARMUP)).toBe("in_step");
    expect(baraatRules.outcomeOf({ taps: mashed, stopMs: null }, WARMUP)).toBe("stumble");
    for (const outcome of outcomes) {
      const record = baraatRules.autoRecord(outcome, WARMUP);
      expect(baraatRules.outcomeOf(record, WARMUP), outcome).toBe(outcome);
      expect(Math.max(0, ...record.taps)).toBeLessThan(end);
    }
    expect(baraatRules.rate!({ taps: warm.beats, stopMs: null }, WARMUP)).toEqual({ stars: 3, scoreJa: "ぴったり 5拍・5拍中5拍" });
  });

  it("forgives: an average player, and mostly a careless one, dances it in step", () => {
    const play = (bot: (typeof RHYTHM_TAP_BOTS)[number], seed: number) => {
      const random = rhythmTapBotRandom(seed);
      return rhythmTapBotTally(Array.from({ length: 300 }, () => {
        const record = { taps: rhythmTapBotTaps({ beats: warm.beats, leadGapMs: 750 }, bot, random), stopMs: null };
        return { outcome: baraatRules.outcomeOf(record, WARMUP), stars: null };
      }));
    };
    const [, average, careless] = RHYTHM_TAP_BOTS;
    expect(play(average, 21).outcomes.in_step).toBeGreaterThan(0.95);
    expect(play(careless, 22).outcomes.in_step).toBeGreaterThan(0.7);
  });

  it("leaves the dance's rules as they were without the key (the story's tag, the real play)", () => {
    const records: RhythmTapRecord[] = [
      { taps: [], stopMs: null }, { taps: BARAAT_TUNING.beats, stopMs: null }, { taps: warm.beats, stopMs: null },
      { taps: BARAAT_TUNING.beats.slice(0, 9), stopMs: null }, ...outcomes.map((outcome) => BARAAT_GAME.rules.autoRecord(outcome, DANCE)),
    ];
    for (const record of records) {
      expect(baraatRules.outcomeOf(record, DANCE)).toBe(BARAAT_GAME.rules.outcomeOf(record, DANCE));
      expect(baraatRules.rate!(record, DANCE)).toEqual(BARAAT_GAME.rules.rate!(record, DANCE));
    }
    for (const outcome of outcomes) expect(baraatRules.autoRecord(outcome, DANCE)).toEqual(BARAAT_GAME.rules.autoRecord(outcome, DANCE));
    expect(baraatRules.rate!({ taps: BARAAT_TUNING.beats, stopMs: null }, DANCE)).toEqual({ stars: 3, scoreJa: "ぴったり 20拍・20拍中20拍" });
    expect(baraatSkin.tuning).toBe(BARAAT_TUNING);
  });

  it("is the same warm-up in Debug's room, whatever the dance's numbers there", () => {
    const room = retune({ ...BARAAT_NUMBERS, bpm: 88, fastBpm: 100 });
    expect(typeof room.Play).toBe("function");
    expect(room.rules.autoRecord("in_step", WARMUP)).toEqual(baraatRules.autoRecord("in_step", WARMUP));
    expect(room.rules.outcomeOf({ taps: warm.beats, stopMs: null }, WARMUP)).toBe("in_step");
    const slower = room.rules.autoRecord("in_step", DANCE);
    expect(slower.taps).not.toEqual(baraatRules.autoRecord("in_step", DANCE).taps);
    expect(room.rules.outcomeOf(slower, DANCE)).toBe("in_step");
  });
});

describe("the baraat dance's practice, drawn", () => {
  const clock: PlayClock = { now: () => 0, at: () => 0, onFrame: () => () => undefined, after: () => () => undefined };
  const draw = (params: BaraatParams, PlayOf = Play) => {
    const props: MiniGamePlayProps<BaraatParams, BaraatOutcome> = {
      params, auto: null, available: outcomes, still: false, seed: 1, clock, cast: { heroine: null }, names: { player: "主人公", heroine: "ヒロイン" },
      art: {}, sound: () => undefined, vibrate: () => undefined, status: () => undefined, decided: () => undefined, end: () => undefined,
      practice: params.warmup === "yes", juice: NO_JUICE, react: () => undefined,
    };
    return renderToStaticMarkup(createElement(PlayOf, props));
  };
  const marks = (html: string) => html.match(/class="mg-rhythm-tap-mark"/gu)?.length ?? 0;

  it("plays the warm-up's lane and words with practice's params, the dance's without them (and in Debug's room)", () => {
    const warmup = draw(WARMUP);
    expect(marks(warmup)).toBe(BARAAT_WARMUP_GAME.countIn.length + warm.beats.length);
    expect(warmup).not.toContain("data-rest");
    expect(warmup).not.toContain("data-big");
    expect(warmup).toContain(baraatWarmupSkin.hintJa);
    expect(baraatWarmupSkin.hintJa).not.toContain("休み");
    const dance = draw(DANCE);
    expect(marks(dance)).toBe(BARAAT_GAME.countIn.length + (BARAAT_TUNING.rests?.at.length ?? 0) + BARAAT_TUNING.beats.length);
    expect(dance).toContain(baraatSkin.hintJa);
    const room = retune(BARAAT_NUMBERS).Play;
    expect(marks(draw(WARMUP, room))).toBe(marks(warmup));
    expect(marks(draw(DANCE, room))).toBe(marks(dance));
  });

  it("counts down only its own beats in the band", () => {
    expect(baraatWarmupSkin.statusJa(rhythmTapJudge({ taps: [], stopMs: null }, warm, warm.beats[1]))).toBe("のこり3拍");
    expect(baraatSkin.statusJa(rhythmTapJudge({ taps: [], stopMs: null }, BARAAT_TUNING, BARAAT_TUNING.beats[1]))).toBe("のこり18拍");
  });
});
