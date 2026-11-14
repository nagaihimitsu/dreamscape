import { describe, expect, it } from "vitest";
import { RHYTHM_TAP_BOTS, rhythmTapBotRandom, rhythmTapBotReaction, rhythmTapBotTally, rhythmTapBotTaps } from "../engines/rhythm_tap/bot";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapJudge, rhythmTapRecordOf, rhythmTapWindow } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { golgappaDuel } from "./definition";
import {
  GOLGAPPA_GAME, GOLGAPPA_HER_BLUFF, GOLGAPPA_HER_HAND_MS, GOLGAPPA_HER_STOP, GOLGAPPA_NUMBERS, GOLGAPPA_TUNING, golgappaGame, golgappaRules,
} from "./rules";

const { beats } = GOLGAPPA_TUNING;
const feints = GOLGAPPA_TUNING.rests?.at ?? [];
const end = rhythmTapEnd(GOLGAPPA_TUNING);
const { herLandings, bluffMs, moves } = GOLGAPPA_GAME;
const gapsOf = (times: readonly number[]) => times.slice(1).map((time, index) => time - times[index]);

describeMiniGameRules(golgappaDuel, golgappaRules, { records: [
  { taps: [], stopMs: null }, { taps: [], stopMs: 0 }, { taps: beats, stopMs: null }, { taps: beats, stopMs: end },
  { taps: [Number.NaN], stopMs: Number.NaN }, { taps: [end + 1], stopMs: end + 1 }, { taps: [...beats, ...feints], stopMs: null },
] });

describe("the golgappa duel", () => {
  const outcome = (plan: Parameters<typeof rhythmTapRecordOf>[0]) => golgappaRules.outcomeOf(rhythmTapRecordOf(plan, GOLGAPPA_TUNING), {});
  const all = () => true;
  /** Taps every `gap` ms from `from` to the end (mashing). */
  const mash = (gap: number, from = 500, to = end) => Array.from({ length: Math.floor((to - from) / gap) }, (_, index) => from + index * gap);

  it("is fair on a phone, about 17 seconds, its pace changing: slow, faster, held, doubled, a jump to her hand, a faster climax", () => {
    expect(rhythmTapFairness(GOLGAPPA_TUNING)).toEqual([]);
    expect(GOLGAPPA_GAME.fairness()).toEqual([]);
    expect(beats).toHaveLength(20);
    expect(end).toBeGreaterThan(15500);
    expect(end).toBeLessThan(18000);
    const gaps = gapsOf(beats);
    // No one steady speed: the gaps go up as well as down, a double, a long hold, many different paces.
    expect(new Set(gaps).size).toBeGreaterThanOrEqual(8);
    expect(gaps.filter((gap, index) => index > 0 && gap > gaps[index - 1] + 200).length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...gaps.slice(0, GOLGAPPA_HER_STOP - 1))).toBeLessThanOrEqual(400);
    expect(Math.max(...gaps.slice(2, GOLGAPPA_HER_STOP - 1))).toBeGreaterThanOrEqual(1200);
    // The climax (after her hand) is the fastest run, with a hold in it; its windows are narrower.
    const climax = gaps.slice(GOLGAPPA_HER_STOP);
    expect(Math.min(...climax)).toBeLessThan(Math.min(...gaps.slice(0, GOLGAPPA_HER_STOP - 1)));
    expect(Math.max(...climax)).toBeGreaterThan(800);
    expect(rhythmTapWindow(GOLGAPPA_TUNING, GOLGAPPA_HER_STOP - 1).lateMs).toBeGreaterThan(rhythmTapWindow(GOLGAPPA_TUNING, GOLGAPPA_HER_STOP).lateMs);
  });

  it("feints twice over the player's bowl, once before her hand and once in the climax, a step before the player's", () => {
    expect(feints).toHaveLength(2);
    expect(feints[0]).toBeLessThan(GOLGAPPA_HER_HAND_MS);
    expect(feints[1]).toBeGreaterThan(GOLGAPPA_HER_HAND_MS);
    expect(moves.filter((move) => move.feint).every((move) => move.to === "you")).toBe(true);
    for (const feint of feints) {
      const after = beats.find((beat) => beat > feint)!;
      expect(after - feint).toBeLessThanOrEqual(400);
    }
    // Its tell comes long enough before it to see it, never before the drop before it has landed.
    expect(GOLGAPPA_NUMBERS.feintTellMs).toBeGreaterThanOrEqual(250);
  });

  it("drops one at a time, hers too (14 of them), bluffs at her 12th, and her hand goes up just before the player's 14th", () => {
    expect(herLandings).toHaveLength(GOLGAPPA_HER_STOP);
    const drops = moves.filter((move) => !move.feint).map((move) => move.at);
    for (const [index, gap] of gapsOf(drops).entries()) expect(gap, `drop ${index + 2}`).toBeGreaterThan(GOLGAPPA_NUMBERS.fallMs);
    expect(drops[0]).toBeGreaterThan(GOLGAPPA_NUMBERS.fallMs);
    expect(GOLGAPPA_HER_HAND_MS).toBeGreaterThan(beats[GOLGAPPA_HER_STOP - 2]);
    expect(GOLGAPPA_HER_HAND_MS).toBeLessThan(beats[GOLGAPPA_HER_STOP - 1]);
    expect(bluffMs).toBe(herLandings[GOLGAPPA_HER_BLUFF - 1] + GOLGAPPA_NUMBERS.herEatMs);
    // Her bluff comes a while before her warning (her 13th) and her hand: time to tell them apart.
    expect(herLandings[GOLGAPPA_HER_STOP - 2] + GOLGAPPA_NUMBERS.herEatMs - bluffMs).toBeGreaterThanOrEqual(500);
  });

  it("raises together from just before her hand until the player's 16th lands, first before that (her bluff's trap), outlasts after it", () => {
    expect(outcome({ hit: all, stopAfter: 14 })).toBe("together");
    expect(outcome({ hit: all, stopAfter: 15 })).toBe("together");
    expect(outcome({ hit: all, stopAfter: 12 })).toBe("you_first");
    expect(outcome({ hit: all, stopAfter: 0 })).toBe("you_first");
    expect(outcome({ hit: all, stopAfter: 16 })).toBe("outlast");
    expect(outcome({ hit: all })).toBe("outlast");
    const at = (stopMs: number) => golgappaRules.outcomeOf({ taps: beats.filter((beat) => beat < stopMs), stopMs }, {});
    // Pressed at her bluff (a reaction to her half-raised hand): first.
    expect(at(bluffMs + 400)).toBe("you_first");
    // After her 13th: together only when nobody could tell (within 0.15 s before her hand).
    expect(at(GOLGAPPA_HER_HAND_MS - GOLGAPPA_NUMBERS.togetherBeforeMs)).toBe("together");
    expect(at(GOLGAPPA_HER_HAND_MS - GOLGAPPA_NUMBERS.togetherBeforeMs - 1)).toBe("you_first");
    expect(at(GOLGAPPA_HER_HAND_MS + 400)).toBe("together");
    // One left in the bowl does not stop the duel.
    expect(outcome({ hit: (index) => index !== 3, stopAfter: 14 })).toBe("together");
    expect(outcome({ hit: (index) => index !== 3 })).toBe("outlast");
  });

  it("chokes on the second one left in the bowl, before any later 「バス」; doing nothing chokes early", () => {
    expect(outcome({ hit: (index) => index !== 3 && index !== 9, stopAfter: 14 })).toBe("choke");
    expect(outcome({})).toBe("choke");
    expect(outcome({ hit: (index) => index < 5, stopAfter: 6 })).toBe("you_first");
  });

  it("chokes on a single one missed in the climax (the vendor no longer waits), never with her 「バス」 before it", () => {
    for (let index = GOLGAPPA_HER_STOP; index < beats.length; index += 1)
      expect(outcome({ hit: (beat) => beat !== index }), `missing the ${index + 1}th`).toBe("choke");
    expect(outcome({ hit: (beat) => beat !== GOLGAPPA_HER_STOP - 1 })).toBe("outlast");
    expect(outcome({ hit: (beat) => beat < GOLGAPPA_HER_STOP, stopAfter: GOLGAPPA_HER_STOP })).toBe("together");
    // Late and a little early on the fast ones (inside the peak's window) is still eaten.
    const { earlyMs, lateMs } = rhythmTapWindow(GOLGAPPA_TUNING, GOLGAPPA_HER_STOP);
    expect([earlyMs, lateMs]).toEqual([GOLGAPPA_NUMBERS.peakEarlyMs, GOLGAPPA_NUMBERS.peakLateMs]);
    const edges = beats.map((beat, index) => (index < GOLGAPPA_HER_STOP ? beat : index % 2 ? beat + lateMs : beat - earlyMs));
    expect(golgappaRules.outcomeOf({ taps: edges, stopMs: null }, {})).toBe("outlast");
    const past = beats.map((beat, index) => (index === GOLGAPPA_HER_STOP ? beat + lateMs + 1 : beat));
    expect(golgappaRules.outcomeOf({ taps: past, stopMs: null }, {})).toBe("choke");
  });

  it("counts a bite at a feint: two drops of the choke gauge; seen through, it is kept; bitten in the climax with a slip, a choke", () => {
    const [first, second] = feints;
    expect(rhythmTapJudge({ taps: [...beats.filter((beat) => beat < first), first + 40], stopMs: null }, GOLGAPPA_TUNING, first + 200))
      .toMatchObject({ fooled: 1, gauge: GOLGAPPA_NUMBERS.feintWeight, rests: ["fooled"] });
    expect(rhythmTapJudge({ taps: beats, stopMs: null }, GOLGAPPA_TUNING)).toMatchObject({ fooled: 0, rests: ["kept", "kept"] });
    // Fooled by the first and eating cleanly after: the gauge drains, no harm but the ★.
    expect(golgappaRules.outcomeOf({ taps: [...beats, first], stopMs: null }, {})).toBe("outlast");
    // Fooled by the climax's feint after a double tap (one drop already): the gauge overflows in the peak: a choke.
    const doubled = beats[GOLGAPPA_HER_STOP + 2];
    expect(golgappaRules.outcomeOf({ taps: [...beats, doubled + 150, second + 30], stopMs: null }, {})).toBe("choke");
  });

  it("chokes a masher at any speed, with or without a 「バス」 after her; a double tap now and then is no fault", () => {
    for (const gap of [100, 150, 200, 250, 300, 350, 400]) {
      expect(golgappaRules.outcomeOf({ taps: mash(gap), stopMs: null }, {}), `every ${gap} ms`).toBe("choke");
      expect(golgappaRules.outcomeOf({ taps: mash(gap, 500, GOLGAPPA_HER_HAND_MS + 300), stopMs: GOLGAPPA_HER_HAND_MS + 300 }, {}), `every ${gap} ms, then バス`).toBe("choke");
    }
    expect(golgappaRules.outcomeOf({ taps: [...beats.slice(0, GOLGAPPA_HER_STOP), ...mash(150, beats[GOLGAPPA_HER_STOP - 1] + 200)], stopMs: null }, {})).toBe("choke");
    const doubled = beats.flatMap((beat, index) => (index % 3 === 0 && index < GOLGAPPA_HER_STOP ? [beat, beat + 110] : [beat]));
    expect(golgappaRules.outcomeOf({ taps: doubled, stopMs: null }, {})).toBe("outlast");
    // Taps while the vendor reaches for the first (before its window) are not counted.
    expect(rhythmTapJudge({ taps: [600, 900, 1100], stopMs: null }, GOLGAPPA_TUNING, 1200)).toMatchObject({ taps: 0, strays: 0, gauge: 0 });
  });

  it("rates the risk: a choke or an early バス ★1, with her ★2, past her ★3 only when nothing was left and no feint fooled", () => {
    const rate = (record: { taps: readonly number[]; stopMs: number | null }) => golgappaRules.rate!(record, {});
    const plan = (hit: (index: number) => boolean, stopAfter?: number) => rhythmTapRecordOf({ hit, ...(stopAfter === undefined ? {} : { stopAfter }) }, GOLGAPPA_TUNING);
    expect(rate(plan(all, 14))).toEqual({ stars: 2, scoreJa: "14個食べた・ぴったり14" });
    expect(rate(plan((index) => index !== 3, 14))).toMatchObject({ stars: 2 });
    expect(rate(plan(all))).toEqual({ stars: 3, scoreJa: "20個食べた・ぴったり20" });
    expect(rate(plan((index) => index !== 3))).toMatchObject({ stars: 2 });
    expect(rate({ taps: [...beats, feints[0]], stopMs: null })).toEqual({ stars: 2, scoreJa: "20個食べた・ぴったり20・つられた1" });
    expect(rate(plan(all, 10))).toMatchObject({ stars: 1, scoreJa: "10個食べた・ぴったり10" });
    expect(rate(plan((index) => index < 8))).toMatchObject({ stars: 1 });
    expect(rate({ taps: mash(150), stopMs: null })).toMatchObject({ stars: 1 });
    // Over many plays: no record of a better outcome has fewer ★ than one of a worse (choke, you_first < together, outlast).
    const random = rhythmTapBotRandom(7);
    const worst = { together: 3, outlast: 3, you_first: 1, choke: 1 } as Record<string, number>;
    const best = { together: 0, outlast: 0, you_first: 0, choke: 0 } as Record<string, number>;
    for (let play = 0; play < 400; play++) {
      const stopAt = random() < 0.7 ? Math.round(9000 + random() * 6000) : null;
      const record = { taps: beats.map((beat) => beat + 40 + (random() - 0.5) * 400).filter((tap) => stopAt === null || tap < stopAt), stopMs: stopAt };
      const given = golgappaRules.outcomeOf(record, {});
      const stars = rate(record)?.stars ?? 0;
      worst[given] = Math.min(worst[given], stars);
      best[given] = Math.max(best[given], stars);
    }
    expect(Math.max(best.choke, best.you_first)).toBeLessThanOrEqual(Math.min(worst.together, worst.outlast));
  });

  it("builds the same duel from its numbers, and another from edited ones (Debug's room), and says when an edit is unfair", () => {
    expect(golgappaGame(GOLGAPPA_NUMBERS).tuning).toEqual(GOLGAPPA_TUNING);
    const slower = golgappaGame({ ...GOLGAPPA_NUMBERS, teachStepMs: 750, peakLateMs: 200 });
    expect(slower.tuning.beats[1] - slower.tuning.beats[0]).toBe(1500);
    expect(slower.tuning.peak?.lateMs).toBe(200);
    expect(slower.fairness()).toEqual([]);
    expect(slower.handMs).toBeGreaterThan(GOLGAPPA_HER_HAND_MS);
    expect(golgappaGame({ ...GOLGAPPA_NUMBERS, fallMs: 400 }).fairness().join()).toContain("two would fall at once");
    expect(golgappaGame({ ...GOLGAPPA_NUMBERS, doubleStepMs: 300 }).fairness().join()).toContain("touches the one before");
    expect(golgappaGame({ ...GOLGAPPA_NUMBERS, herEatMs: 400 }).fairness().join()).toContain("comes after the player's 14th");
  });
});

// Round 3's seeded players (engines/rhythm_tap/bot.ts), 500 plays each: one who says バス with her (reacting to her hand,
// and falling for her bluff twice as often as they miss a tell), one who eats on to the end. The aims (common brief):
// the best outcome (★3: outlasting her cleanly) about a third of the time for the average player, most of the time for
// the skilled, rarely for the careless; going on past her is a real risk; her bluff and the feints catch some.
describe("the golgappa duel, played by round 3's bots", () => {
  const PLAYS = 500;
  const play = (bot: (typeof RHYTHM_TAP_BOTS)[number], goOn: boolean, seed: number) => {
    const random = rhythmTapBotRandom(seed);
    const scene = { beats, rests: feints.map((at) => ({ at, tellMs: GOLGAPPA_NUMBERS.feintTellMs })) };
    return rhythmTapBotTally(Array.from({ length: PLAYS }, () => {
      const stopMs = goOn ? null : (random() < bot.lapse * 2 ? bluffMs : GOLGAPPA_HER_HAND_MS) + rhythmTapBotReaction(bot, random) + 150;
      const record = { taps: rhythmTapBotTaps(scene, bot, random).filter((tap) => stopMs === null || tap < stopMs), stopMs };
      return { outcome: golgappaRules.outcomeOf(record, {}), stars: golgappaRules.rate!(record, {})?.stars ?? null };
    }));
  };
  const [skilled, average, careless] = RHYTHM_TAP_BOTS;

  it("eating on past her: ★3 for a third of average players, most skilled ones, few careless; the average one chokes now and then", () => {
    const goOn = { skilled: play(skilled, true, 1), average: play(average, true, 2), careless: play(careless, true, 3) };
    expect(goOn.average.stars["★3"]).toBeGreaterThan(0.2);
    expect(goOn.average.stars["★3"]).toBeLessThan(0.45);
    expect(goOn.skilled.stars["★3"]).toBeGreaterThan(0.55);
    expect(goOn.careless.stars["★3"] ?? 0).toBeLessThan(0.1);
    expect(goOn.average.outcomes.choke).toBeGreaterThan(0.15);
    expect(goOn.average.outcomes.outlast).toBeGreaterThan(0.5);
  });

  it("saying it with her: mostly together for the average player, her bluff and the bowl catching some; every outcome comes up", () => {
    const together = { skilled: play(skilled, false, 4), average: play(average, false, 5), careless: play(careless, false, 6) };
    expect(together.average.outcomes.together).toBeGreaterThan(0.75);
    expect(together.average.outcomes.you_first).toBeGreaterThan(0.03);
    expect(together.skilled.outcomes.together).toBeGreaterThan(0.9);
    expect(together.careless.outcomes.choke).toBeGreaterThan(0.2);
    for (const id of ["together", "you_first", "choke"]) expect(together.careless.outcomes[id], id).toBeGreaterThan(0);
  });
});
