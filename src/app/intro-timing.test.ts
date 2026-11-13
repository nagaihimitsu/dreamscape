import { describe, expect, it } from "vitest";
import type { GameState } from "../domain/game";
import { durationJa, introTimingJa } from "./IntroTimingNote";
import { endIntroMovie, introChange, recordIntro, startIntroTiming } from "./intro-timing";

// 最初の3分の計測 (2026-11-13, Debug mode only): the time and the lines read from 「旅をはじめる」 to the first choice, quiz
// answer, free time and date, with and without the opening movie.

const frame = (text: string, choices: { call?: "quiz" }[] = []) => ({ text, choices });
const state = (extra: Record<string, unknown> = {}) =>
  ({ activeEncounter: null, activeEpilogue: null, activeTourism: null, activeBattle: null, activeDate: null, ...extra }) as unknown as GameState;

describe("the first minutes' measure", () => {
  it("records each milestone's time, the movie's share and the lines read, its first time only", () => {
    let timing = startIntroTiming(1000, true);
    timing = endIntroMovie(timing, 31_000);
    expect(timing.movieMs).toBe(30_000);
    timing = recordIntro(timing, 40_000, { lines: 3 });
    timing = recordIntro(timing, 61_000, { lines: 1, milestones: ["choice"] });
    expect(timing.marks.choice).toEqual({ atMs: 60_000, movieMs: 30_000, lines: 4 });
    const again = recordIntro(timing, 90_000, { milestones: ["choice"] });
    expect(again).toBe(timing);
    // Without a movie, its share is none; the movie's end is then nothing.
    const plain = startIntroTiming(0, false);
    expect(endIntroMovie(plain, 5000)).toBe(plain);
  });

  it("reads a new line, the first choice, a quiz answered and a date started from a saved change", () => {
    const line = (text: string, choices: { call?: "quiz" }[] = []) => state({ activeEncounter: { phase: "dialogue", frame: frame(text, choices) } });
    expect(introChange(line("一"), line("二"))).toEqual({ lines: 1, milestones: [] });
    expect(introChange(line("一"), line("一"))).toEqual({ lines: 0, milestones: [] });
    expect(introChange(line("一"), line("一", [{}]))).toEqual({ lines: 0, milestones: ["choice"] });
    // A battle's call is the game's own, not a choice.
    const battle = (answers: number, choices: { call?: "quiz" }[] = []) =>
      state({ activeBattle: { phase: answers ? "feedback" : "dialogue", answers: Array.from({ length: answers }), frame: frame("問い", choices) } });
    expect(introChange(battle(0), battle(0, [{ call: "quiz" }])).milestones).toEqual([]);
    expect(introChange(battle(0), battle(1)).milestones).toEqual(["quiz"]);
    expect(introChange(state(), state({ activeDate: { dateId: "x_date", frame: frame("デート") } })))
      .toEqual({ lines: 1, milestones: ["date"] });
  });

  it("says each milestone in one line, with the time without the movie when there was one", () => {
    expect(durationJa(130_400)).toBe("2分10秒");
    expect(durationJa(45_000)).toBe("45秒");
    let timing = recordIntro(startIntroTiming(0, false), 130_000, { lines: 34, milestones: ["choice"] });
    expect(introTimingJa(timing)).toBe("導入の計測：最初の選択 2分10秒・34行、最初のクイズの答え まだ、最初の自由時間 まだ、最初のデート まだ");
    timing = recordIntro(endIntroMovie(startIntroTiming(0, true), 30_000), 160_000, { lines: 34, milestones: ["choice"] });
    expect(introTimingJa(timing)).toContain("最初の選択 2分40秒（ムービーを除く 2分10秒）・34行");
  });
});
