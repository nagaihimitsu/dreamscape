import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MiniGamePlayProps } from "../contract";
import { RHYTHM_TAP_BOTS, rhythmTapBotRandom, rhythmTapBotTally, rhythmTapBotTaps } from "../engines/rhythm_tap/bot";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapJudge, rhythmTapRecordOf } from "../engines/rhythm_tap/engine";
import { NO_JUICE } from "../host/no-juice";
import { describeMiniGameRules } from "../testing/rules-contract";
import { golgappaDuel } from "./definition";
import { Play, fairness, retune } from "./play";
import {
  GOLGAPPA_GAME, GOLGAPPA_NUMBERS, GOLGAPPA_TUNING, GOLGAPPA_WARMUP_GAME, golgappaRules, type GolgappaOutcome, type GolgappaParams,
} from "./rules";
import { golgappaSkin, golgappaWarmupSkin } from "./Skin";

// The golgappa duel's practice (2026-11-16, the user's decision: 「練習は本番より簡単/単純・短く」, not the duel's preview):
// the host's practice reads `warmup yes` (definition.ts practice) and plays a short, simple play of its own; the real play
// (no `warmup`) is the duel as before.

const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
const practiceParams = golgappaDuel.params(context).parse(golgappaDuel.practice ? golgappaDuel.practice.params : {});
const practice = GOLGAPPA_WARMUP_GAME.tuning;
const practiceEnd = rhythmTapEnd(practice);
const duelEnd = rhythmTapEnd(GOLGAPPA_TUNING);
const gapsOf = (times: readonly number[]) => times.slice(1).map((time, index) => time - times[index]);
const outcomes = golgappaDuel.outcomes.map((outcome) => outcome.id);

// The rules template with the practice's params: every outcome by 「おまかせ」, every edge record a declared outcome.
describeMiniGameRules({ ...golgappaDuel, examples: [{ warmup: "yes" }] }, golgappaRules, { records: [
  { taps: [], stopMs: null }, { taps: [], stopMs: 0 }, { taps: practice.beats, stopMs: null }, { taps: practice.beats, stopMs: practiceEnd },
  { taps: [Number.NaN], stopMs: Number.NaN }, { taps: [practiceEnd + 1], stopMs: practiceEnd + 1 }, { taps: GOLGAPPA_TUNING.beats, stopMs: null },
] });

describe("the golgappa duel's practice", () => {
  it("is the host's practice's params only: the story's tag and the examples have no `warmup`", () => {
    expect(practiceParams).toEqual({ warmup: "yes" });
    expect(golgappaDuel.examples).toEqual([{}]);
    expect(golgappaDuel.params(context).parse({})).toEqual({});
    expect(() => golgappaDuel.params(context).parse({ warmup: "no" })).toThrow();
  });

  it("is short: five golgappa, about 5 s, a third of the duel or less", () => {
    expect(practice.beats).toHaveLength(5);
    expect(practice.beats.length * 3).toBeLessThanOrEqual(GOLGAPPA_TUNING.beats.length);
    expect(practiceEnd).toBeGreaterThanOrEqual(4000);
    expect(practiceEnd).toBeLessThanOrEqual(6000);
    expect(practiceEnd * 3).toBeLessThanOrEqual(duelEnd);
  });

  it("is simple: the player's bowl alone at one even, easy pace, wider windows, none of the duel's twists", () => {
    expect(rhythmTapFairness(practice)).toEqual([]);
    expect(GOLGAPPA_WARMUP_GAME.fairness()).toEqual([]);
    expect(GOLGAPPA_WARMUP_GAME.warmup).toBe(true);
    expect(GOLGAPPA_GAME.warmup).toBe(false);
    const gaps = new Set(gapsOf(practice.beats));
    expect(gaps.size).toBe(1);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(800);
    expect(practice.earlyMs).toBeGreaterThan(GOLGAPPA_TUNING.earlyMs);
    expect(practice.lateMs).toBeGreaterThan(GOLGAPPA_TUNING.lateMs);
    // No feint, no climax, no choke gauge, no miss limit, no her stop.
    for (const key of ["rests", "peak", "strayLimit", "missLimit", "partnerStop"] as const) expect(practice[key], key).toBeUndefined();
    expect(GOLGAPPA_WARMUP_GAME.moves.every((move) => move.to === "you" && !move.feint)).toBe(true);
    expect(GOLGAPPA_WARMUP_GAME.moves.map((move) => move.at)).toEqual(practice.beats);
    // Nothing of hers: no golgappa, no bluff, no hand.
    expect(GOLGAPPA_WARMUP_GAME.herLandings).toEqual([]);
    expect(GOLGAPPA_WARMUP_GAME.bluffMs).toBe(Number.POSITIVE_INFINITY);
    expect(GOLGAPPA_WARMUP_GAME.handMs).toBe(Number.POSITIVE_INFINITY);
    // Its skin: 「食べる」 only (no 「バス」, no flag), and words that name none of the twists.
    expect(golgappaWarmupSkin.actionJa).toBe("食べる");
    expect(golgappaWarmupSkin.stop).toBeNull();
    expect(golgappaWarmupSkin.partner).toBeUndefined();
    for (const text of [golgappaWarmupSkin.hintJa, golgappaWarmupSkin.actionHintJa]) {
      for (const word of ["フェイント", "旗", "バス", "むせ"]) expect(text).not.toContain(word);
    }
  });

  it("does not preview the duel: its own beats and pace, not the duel's first ones", () => {
    expect(practice.beats).not.toEqual(GOLGAPPA_TUNING.beats.slice(0, practice.beats.length));
    const [gap] = gapsOf(practice.beats);
    expect(gapsOf(GOLGAPPA_TUNING.beats)).not.toContain(gap);
    expect(practice.beats[0]).not.toBe(GOLGAPPA_TUNING.beats[0]);
  });

  it("plays on to its end by itself whatever the player does, and ends with a declared outcome (eaten: outlast)", () => {
    const records = [
      { taps: [], stopMs: null },
      { taps: practice.beats, stopMs: null },
      { taps: Array.from({ length: 50 }, (_, index) => 500 + index * 100), stopMs: null },
      { taps: practice.beats.filter((_, index) => index !== 2), stopMs: null },
    ];
    for (const record of records) {
      expect(rhythmTapJudge(record, practice)).toMatchObject({ ended: "end", endMs: practiceEnd });
      expect(outcomes).toContain(golgappaRules.outcomeOf(record, practiceParams));
    }
    expect(golgappaRules.outcomeOf({ taps: practice.beats, stopMs: null }, practiceParams)).toBe("outlast");
    expect(golgappaRules.outcomeOf({ taps: practice.beats.slice(1), stopMs: null }, practiceParams)).toBe("outlast");
    expect(golgappaRules.outcomeOf({ taps: [], stopMs: null }, practiceParams)).toBe("choke");
    // A tap at nothing (mashing) costs nothing here: no gauge.
    expect(rhythmTapJudge(records[2], practice)).toMatchObject({ hits: 5, misses: 0, overflows: 0 });
  });

  it("is forgiving: round 3's bots eat every one almost always, the careless one too", () => {
    const PLAYS = 300;
    for (const [index, bot] of RHYTHM_TAP_BOTS.entries()) {
      const random = rhythmTapBotRandom(20 + index);
      let clean = 0;
      const tally = rhythmTapBotTally(Array.from({ length: PLAYS }, () => {
        const record = { taps: rhythmTapBotTaps({ beats: practice.beats }, bot, random), stopMs: null };
        const summary = rhythmTapJudge(record, practice);
        expect(summary.ended).toBe("end");
        if (summary.misses === 0) clean += 1;
        return { outcome: golgappaRules.outcomeOf(record, practiceParams), stars: golgappaRules.rate!(record, practiceParams)?.stars ?? null };
      }));
      expect(tally.outcomes.outlast, bot.name).toBeGreaterThan(0.95);
      expect(tally.stars["-"], bot.name).toBeCloseTo(1);
      // Every one eaten (none left in the bowl).
      expect(clean / PLAYS, bot.name).toBeGreaterThan(bot.name === "careless" ? 0.8 : 0.95);
    }
  });

  it("is not rated, and its rules do not throw for any outcome", () => {
    for (const outcome of outcomes) {
      const record = golgappaRules.autoRecord(outcome, practiceParams);
      expect(golgappaRules.outcomeOf(record, practiceParams)).toBe(outcome);
      expect(golgappaRules.rate!(record, practiceParams)).toBeNull();
      expect(rhythmTapJudge(record, practice).endMs).toBeLessThanOrEqual(practiceEnd);
    }
  });

  it("leaves the duel as it was for params without `warmup`", () => {
    const records = [
      ...outcomes.map((outcome) => GOLGAPPA_GAME.rules.autoRecord(outcome, {})),
      rhythmTapRecordOf({ hit: (index) => index !== 3, stopAfter: 14 }, GOLGAPPA_TUNING),
      { taps: practice.beats, stopMs: null },
      { taps: [], stopMs: null },
    ];
    for (const record of records) {
      expect(golgappaRules.outcomeOf(record, {})).toBe(GOLGAPPA_GAME.rules.outcomeOf(record, {}));
      expect(golgappaRules.rate!(record, {})).toEqual(GOLGAPPA_GAME.rules.rate!(record, {}));
    }
    for (const outcome of outcomes) expect(golgappaRules.autoRecord(outcome, {})).toEqual(GOLGAPPA_GAME.rules.autoRecord(outcome, {}));
    expect(golgappaSkin.stop?.labelJa).toBe("バス");
    expect(golgappaSkin.partner?.atMs).toBe(GOLGAPPA_GAME.handMs);
  });

  it("is in Debug's room's retuned module too: the practice keeps its own beats, the duel takes the edit", () => {
    const edited = retune({ ...GOLGAPPA_NUMBERS, teachStepMs: 750 });
    const eaten = { taps: practice.beats, stopMs: null };
    expect(edited.rules.outcomeOf(eaten, practiceParams)).toBe("outlast");
    expect(edited.rules.rate!(eaten, practiceParams)).toBeNull();
    for (const outcome of outcomes) expect(edited.rules.outcomeOf(edited.rules.autoRecord(outcome, practiceParams), practiceParams)).toBe(outcome);
    expect(edited.rules.autoRecord("outlast", {})).not.toEqual(golgappaRules.autoRecord("outlast", {}));
    expect(fairness(GOLGAPPA_NUMBERS)).toEqual([]);
    expect(fairness({ ...GOLGAPPA_NUMBERS, fallMs: 1000 }).join()).toContain("practice: ");
  });

  it("plays the practice's field for `warmup yes` and the duel's without it (the module's Play)", () => {
    const render = (params: GolgappaParams) => {
      const props: MiniGamePlayProps<GolgappaParams, GolgappaOutcome> = {
        params, auto: null, available: outcomes, still: false, seed: 1,
        clock: { now: () => 0, at: () => 0, onFrame: () => () => undefined, after: () => () => undefined },
        cast: { heroine: createElement("i") }, names: { player: "主人公", heroine: "ヒロイン" }, art: {},
        sound: () => undefined, vibrate: () => undefined, status: () => undefined, end: () => undefined, decided: () => undefined,
        practice: params.warmup === "yes", juice: NO_JUICE, react: () => undefined,
      };
      return renderToStaticMarkup(createElement(Play, props));
    };
    const practiceHtml = render(practiceParams);
    const duelHtml = render({});
    expect(practiceHtml).not.toContain('data-testid="minigame-stop"');
    expect(practiceHtml).not.toContain("mg-rhythm-tap-flag");
    expect(practiceHtml).not.toContain("mg-golgappa-duel-gauge");
    expect(practiceHtml).not.toContain("ヒロイン");
    expect(practiceHtml.match(/data-state="coming"/gu)).toHaveLength(practice.beats.length);
    expect(practiceHtml).toContain("器に落ちたら「食べる」");
    expect(duelHtml).toContain('data-testid="minigame-stop"');
    expect(duelHtml).toContain("mg-rhythm-tap-flag");
    expect(duelHtml).toContain("mg-golgappa-duel-gauge");
    expect(duelHtml).toContain("ヒロイン");
  });
});
