// The night's recap (2026-11-11 user decision; NightScreen, NightRest): today's headlines (save v23), today's route on a
// small map, its stops in words, and the heroine's line of the night from the city's optional nightLinesJa (the sample
// journey writes three).
import { describe, expect, it } from "vitest";
import { battleQuizzes, battles, episodes, getCityContent } from "../../content";
import { cityStart, finishEpisode } from "../../dev/scenario-builders";
import type { GameState } from "../../domain/game";
import { hasNightRecap, headlinesSentenceJa, nightRecap, nudgeMarksApart, restNightCard, routeMarks, routeSentenceJa, todayWord, type MarkBox } from "./night-recap";

const SAMPLE = "mihon";
const at = (state: GameState, day: number, todayPlaceIds: string[]): GameState =>
  ({ ...state, travel: { ...state.travel, day, todayPlaceIds } });

describe("what the night shows under its line", () => {
  it("names today's stops as the screens do (the hotel is 「滞在先のホテル」) and the night line of the day", () => {
    const start = cityStart(SAMPLE, ["航", "澪"]);
    const { travel } = getCityContent(SAMPLE);
    const lines = travel.nightLinesJa!;
    expect(lines.length).toBeGreaterThan(1);
    const recap = nightRecap(at(start, 1, ["mihon_clock_tower", "mihon_market"]));
    expect(recap.route.map((stop) => [stop.place.id, stop.nameJa])).toEqual([
      ["mihon_hotel", "滞在先のホテル"], ["mihon_clock_tower", "見本の時計塔"], ["mihon_market", "見本の朝市"],
    ]);
    expect(recap).toMatchObject({ line: lines[0], heroineName: "澪", cityId: SAMPLE });
    expect(nightRecap(at(start, 2, [])).line).toBe(lines[1]);
    expect(nightRecap(at(start, lines.length + 1, [])).line).toBe(lines[0]);
    expect(routeSentenceJa(recap.route)).toBe("今日の道のり：滞在先のホテル、見本の時計塔、見本の朝市。");
  });

  it("shows no map when the party stayed at the hotel, and no line in a city without night lines", () => {
    const stayed = nightRecap(cityStart(SAMPLE));
    expect(stayed.route).toEqual([]);
    expect(stayed.line).not.toBeNull();
    expect(hasNightRecap(stayed)).toBe(true);
    const milan = nightRecap(cityStart("milano"));
    expect(getCityContent("milano").travel.nightLinesJa).toBeUndefined();
    expect(milan).toMatchObject({ route: [], line: null });
    expect(hasNightRecap(milan)).toBe(false);
    expect(hasNightRecap(undefined)).toBe(false);
    expect(routeSentenceJa([])).toBe("");
  });

  it("fills the names set into a night line", () => {
    const { travel } = getCityContent(SAMPLE);
    const written = travel.nightLinesJa;
    travel.nightLinesJa = ["{player_name}、おやすみ。{heroine_name}は先に眠るね"];
    try {
      expect(nightRecap(cityStart(SAMPLE, ["航", "澪"])).line).toBe("航、おやすみ。澪は先に眠るね");
    } finally {
      travel.nightLinesJa = written;
    }
  });

  it("marks each place once on the map, with its stops' numbers, and rings the day's last place", () => {
    const recap = nightRecap(at(cityStart(SAMPLE), 1, ["mihon_clock_tower", "mihon_hotel", "mihon_library"]));
    expect(routeMarks(recap.route).map(({ place, label, last }) => [place.id, label, last])).toEqual([
      ["mihon_hotel", "1・3", false], ["mihon_clock_tower", "2", false], ["mihon_library", "4", true],
    ]);
  });

  it("lists today's headlines: the clear titles of the episodes completed today, in order, the names filled in", () => {
    const start = cityStart(SAMPLE, ["航", "澪"]);
    expect(nightRecap(start).headlines).toEqual([]);
    expect(headlinesSentenceJa([])).toBe("");
    const done = finishEpisode(start, "smp_mihon_main_clock_tower");
    const episode = episodes.find((item) => item.id === "smp_mihon_main_clock_tower")!;
    expect(done.travel.todayEpisodeIds).toEqual([episode.id]);
    const recap = nightRecap(done);
    expect(recap.headlines).toEqual([episode.clearTitleJa]);
    expect(hasNightRecap(recap)).toBe(true);
    expect(headlinesSentenceJa(recap.headlines)).toBe(`今日の見出し：${episode.clearTitleJa}。`);
    // Only today's: an episode completed on an earlier day is not a headline of this night.
    expect(nightRecap({ ...done, travel: { ...done.travel, todayEpisodeIds: [] } }).headlines).toEqual([]);
    // Headlines alone are something to show (a city without night lines, the party back at the hotel).
    const milan = finishEpisode(cityStart("milano"), "milano_duomo_episode");
    expect(nightRecap(milan)).toMatchObject({ route: [], line: null });
    expect(hasNightRecap(nightRecap(milan))).toBe(true);
    const written = episode.clearTitleJa;
    episode.clearTitleJa = "{heroine_name}と見上げた三時";
    try {
      expect(nightRecap(done).headlines).toEqual(["澪と見上げた三時"]);
    } finally {
      episode.clearTitleJa = written;
    }
  });
});

// Whenever the day ends by resting at the hotel, not only at 21:00, the night shows its recap (2026-11-13 user decision).
describe("the card of a night at the hotel", () => {
  const milan = cityStart("milano");
  const night = (state: GameState) => ({ cityId: state.currentCityId, day: state.travel.day });

  it("shows the recap for a rest before 21:00 after the party went out, in place of 「次の日」", () => {
    const out = at(milan, 1, ["p_duomo", "p_galleria"]);
    const card = restNightCard(out, { dayEnd: false, shown: null });
    expect(card).toEqual({ kind: "rest", recap: nightRecap(out) });
    expect(card.kind === "rest" && card.recap.route.map((stop) => stop.place.id)).toEqual(["p_hotel", "p_duomo", "p_galleria"]);
    // Headlines alone are a recap too (the same rule as at 21:00).
    expect(restNightCard(finishEpisode(milan, "milano_duomo_episode"), { dayEnd: false, shown: null }).kind).toBe("rest");
  });

  it("is the plain 「次の日」 for a rest before 21:00 with nothing to recap (the party stayed in, a city without night lines)", () => {
    expect(restNightCard(milan, { dayEnd: false, shown: null })).toEqual({ kind: "next_day" });
  });

  it("is the day's end card at 21:00 as before, with the recap when there is one", () => {
    const out = at(milan, 1, ["p_duomo"]);
    expect(restNightCard(out, { dayEnd: true, shown: null })).toEqual({ kind: "day_end", recap: nightRecap(out) });
    expect(restNightCard(milan, { dayEnd: true, shown: null })).toEqual({ kind: "day_end" });
  });

  it("shows a night's recap once: not again for the same night, again for the next", () => {
    const out = at(milan, 1, ["p_duomo"]);
    expect(restNightCard(out, { dayEnd: false, shown: night(out) })).toEqual({ kind: "next_day" });
    expect(restNightCard(out, { dayEnd: true, shown: night(out) })).toEqual({ kind: "day_end" });
    const nextDay = at(milan, 2, ["p_duomo"]);
    expect(restNightCard(nextDay, { dayEnd: false, shown: night(out) }).kind).toBe("rest");
    expect(restNightCard(out, { dayEnd: false, shown: { cityId: "delhi", day: 1 } }).kind).toBe("rest");
  });
});

describe("今日の一語 on the night screen", () => {
  const TOWER = "smp_mihon_main_clock_tower";
  const FINALE = "smp_mihon_finale";
  const quizOf = (episodeId: string) =>
    battleQuizzes[battles.find((battle) => battle.id === episodes.find((episode) => episode.id === episodeId)!.battleId)!.quizId];
  const firstWord = (episodeId: string) => quizOf(episodeId).questions.flatMap((question) => question.vocabularyJa)[0];
  const today = (state: GameState, todayEpisodeIds: string[]): GameState => ({ ...state, travel: { ...state.travel, todayEpisodeIds } });

  it("is the first word of the quiz of the first episode completed today, with its meaning there", () => {
    const start = cityStart(SAMPLE);
    expect(todayWord(start)).toBeNull();
    const done = finishEpisode(start, TOWER);
    const word = firstWord(TOWER);
    expect(word).toBeDefined();
    expect(todayWord(done)).toEqual({ word: word.word, meaningJa: word.meaning });
    // The same night always shows the same word: the first episode of the day gives it.
    expect(todayWord(today(done, [FINALE, TOWER]))).toEqual({ word: firstWord(FINALE).word, meaningJa: firstWord(FINALE).meaning });
    // Only today's: an episode of an earlier day gives none.
    expect(todayWord(today(done, []))).toBeNull();
  });

  it("goes on to the next episode of the day when a quiz has no vocabulary, and is none when no quiz has any", () => {
    const start = cityStart(SAMPLE);
    const questions = quizOf(TOWER).questions;
    const written = questions.map((question) => question.vocabularyJa);
    questions.forEach((question) => { question.vocabularyJa = []; });
    try {
      expect(todayWord(today(start, [TOWER]))).toBeNull();
      expect(todayWord(today(start, ["nowhere", TOWER, FINALE]))).toEqual({ word: firstWord(FINALE).word, meaningJa: firstWord(FINALE).meaning });
    } finally {
      questions.forEach((question, index) => { question.vocabularyJa = written[index]; });
    }
  });
});

// Marks of places close together on the route's map are drawn a little apart (2026-11-13); the line stays at the places.
describe("the marks of today's route on its map", () => {
  const box = (x: number, y: number, width = 28, height = 28): MarkBox => ({ x, y, width, height });
  const overlaps = (boxes: MarkBox[], nudges: { dx: number; dy: number }[], gap: number) => boxes.some((a, i) => boxes.some((b, j) => j > i &&
    Math.abs(b.x + nudges[j].dx - a.x - nudges[i].dx) < (a.width + b.width) / 2 + gap - 0.1 &&
    Math.abs(b.y + nudges[j].dy - a.y - nudges[i].dy) < (a.height + b.height) / 2 + gap - 0.1));

  it("leaves marks that do not touch where their places are", () => {
    expect(nudgeMarksApart([box(0, 0), box(40, 0), box(0, 40)], 4)).toEqual([{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 0, dy: 0 }]);
    expect(nudgeMarksApart([])).toEqual([]);
  });

  it("parts two marks along the shorter way, each half of it (Delhi: the Red Fort's 「2」 above the hotel's 「1・3・5」)", () => {
    // The hotel's wide pill (its last-place ring counted) and the Red Fort 19 px north and 14 px east of it.
    const hotel = box(100, 100, 62, 38);
    const fort = box(114, 81);
    const nudges = nudgeMarksApart([hotel, fort], 4);
    // Apart vertically (33 + 4 needed, 19 there: 18 more), the hotel down and the fort up by 9 each, none sideways.
    expect(nudges).toEqual([{ dx: 0, dy: 9 }, { dx: 0, dy: -9 }]);
    expect(overlaps([hotel, fort], nudges, 4)).toBe(false);
  });

  it("parts sideways when that is shorter, and marks at one spot vertically, the later one down", () => {
    expect(nudgeMarksApart([box(0, 0), box(20, 4)], 2)).toEqual([{ dx: -5, dy: 0 }, { dx: 5, dy: 0 }]);
    expect(nudgeMarksApart([box(50, 50), box(50, 50)], 2)).toEqual([{ dx: 0, dy: -15 }, { dx: 0, dy: 15 }]);
  });

  it("frees a cluster of marks, and always draws the same marks the same", () => {
    const cluster = [box(100, 100, 52, 28), box(104, 96), box(98, 106), box(110, 102), box(100, 100)];
    const nudges = nudgeMarksApart(cluster, 4);
    expect(overlaps(cluster, nudges, 4)).toBe(false);
    expect(nudgeMarksApart(cluster, 4)).toEqual(nudges);
  });
});
