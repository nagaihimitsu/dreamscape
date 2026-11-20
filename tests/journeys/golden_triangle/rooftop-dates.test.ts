import { describe, expect, it, onTestFinished } from "vitest";
import { contentSourcesFromTree, readContentTree, selectJourneys } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";
import { dates, scenes } from "../../../src/content";
import { cityStart, clearCity, departFromClearedCity, finishEpisode, newJourney, nextMorning, withAp, withRelationship } from "../../../src/dev/scenario-builders";
import type { Condition } from "../../../src/content/condition-schemas";
import { completedDateCount, meets } from "../../../src/domain/conditions";
import { evaluateProgression } from "../../../src/domain/date-rules";
import { advanceDate, chooseDate, dateChoiceDisplay, finishDate, getDateAvailability, isEventVisible, startDate, validateGameState, type GameState } from "../../../src/domain/game";
import { closeRomanceEnding } from "../../../src/domain/occasion";
import { applyPlayerAction } from "../../../src/domain/player-action";
import { screenFor } from "../../../src/domain/screen";
import { beginTravelEvent, isCompletedTravelEvent, isTravelEventUnlocked } from "../../../src/domain/travel-game";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";
import { installRepeatableDate } from "../../fixtures/repeatable-date";

/**
 * GT-3b: the dates in the new form. The rooftop confession takes its outcome from confession_result
 * (fixed when it starts; DA-1) and is played once in each city, whatever its outcome (2026-11-13), the
 * reassurance follows a deferral once per journey, and the dates' head and choice tags give their items
 * and pay their drafted prices once.
 */

const roundtrip = (state: GameState): GameState => {
  const values = new Map<string, string>();
  const storage: StorageLike = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  expect(saveGame(storage, state).ok).toBe(true);
  const loaded = loadGame(storage);
  expect(loaded).toEqual({ status: "loaded", state });
  if (loaded.status !== "loaded") throw new Error("Expected a current-version save");
  return loaded.state;
};

/** Play a date to its end (each step saved and loaded), choosing the first open option of `prefer`, else the first open one. */
function playDate(initial: GameState, dateId: string, prefer: readonly string[] = []): { state: GameState; lines: string[]; chosen: string[] } {
  const apCost = dates.find((date) => date.id === dateId)!.apCost;
  let state = startDate(apCost ? withAp(initial, apCost) : initial, dateId, () => 4500);
  expect(state.activeDate?.dateId).toBe(dateId);
  const lines: string[] = [];
  const chosen: string[] = [];
  for (let step = 0; state.activeDate; step++) {
    expect(step).toBeLessThan(200);
    state = roundtrip(state);
    const active = state.activeDate!;
    lines.push(active.frame.text);
    if (active.frame.ended) state = finishDate(state, state.revision);
    else if (active.frame.choices.length) {
      const open = active.frame.choices.filter((choice) => dateChoiceDisplay(state, choice.index).show === "open");
      const choice = open.find((item) => prefer.includes(item.optionId ?? "")) ?? open[0];
      chosen.push(choice.optionId ?? "");
      state = chooseDate(state, choice.index, state.revision);
    } else state = advanceDate(state, state.revision);
  }
  return { state: roundtrip(state), lines, chosen };
}

const atNight = (state: GameState): GameState => validateGameState({ ...state, travel: { ...state.travel, minute: 19 * 60 } });
const normalDates = (cityId: string) => dates.filter((date) => date.chapterId === cityId && date.kind === "normal").map((date) => date.id);

type Values = Pick<GameState, "affection" | "trust" | "spark">;
/** The values that give each outcome of a confession after three dates (romance/progression.json). */
const outcomeValues = {
  accepted: { affection: 8, trust: 4, spark: 4 },
  deferred: { affection: 4, trust: 2, spark: 0 },
  rejected: { affection: 0, trust: 0, spark: 0 },
} as const satisfies Record<string, Values>;

/** `state` with the relationship values the confession reads, at 19:00. */
const evening = (state: GameState, values: Values): GameState => atNight(evaluateProgression(withRelationship(state, values)));
/** Agra (the journey's first confession, 2026-11-20) after one sightseeing and three dates, at stage 2 or more; made once. */
let agraDates: GameState | undefined;
function agraAfterDates(): GameState {
  return agraDates ??= (() => {
    let state = finishEpisode(cityStart("agra"), "gt_agra_main_taj_mahal");
    for (const dateId of normalDates("agra").slice(0, 3)) state = playDate(state, dateId).state;
    state = evaluateProgression(withRelationship(state, { affection: 2, trust: 1, spark: 0 }));
    expect(state.romanceStage).toBeGreaterThanOrEqual(2);
    return state;
  })();
}
/** Agra after one sightseeing and three dates, at stage 2 or more, with the given relationship values, at 19:00. */
const agraEvening = (values: Values): GameState => evening(agraAfterDates(), values);
const AGRA = "gt_agra_date_confession";
/** The reason a date already played gives (date-rules.ts getDateAvailability). */
const played = { available: false, reason: "このひとときは、もう思い出になりました。" };
/** The reason a confession gives after a rejection, until a new date or a recovery, when its writer wrote the wait (# when: date_since_rejection). */
const waiting = { available: false, reason: "新しいひとときを過ごしてから、もう一度話せます。" };
/** The wait after a rejection, as a part of a date's `when` (2026-11-15: written per date; the game makes no confession wait by itself). */
const WAIT: Condition = { dateSinceRejection: true };
/** The top-level parts of a date's `when`. */
const whenParts = (dateId: string): Condition[] => {
  const when = dates.find((date) => date.id === dateId)!.when;
  return !when ? [] : "all" in when ? when.all : [when];
};

describe("Golden Triangle rooftop dates (GT-3b)", () => {
  it("has no confession in Delhi (2026-11-20); Agra has the first, Jaipur two (hers and the player's) and her answer", () => {
    // Delhi: the six dates at its destinations only.
    expect(dates.filter((date) => date.chapterId === "delhi").map((date) => date.kind)).toEqual(Array(6).fill("normal"));
    for (const cityId of ["agra", "jaipur"]) {
      const own = dates.filter((date) => date.chapterId === cityId);
      // Jaipur, the last city, has her answer after a deferral there too (no later confession can follow; 2026-11-13) and
      // her own confession, where she confesses first (2026-11-20).
      expect(own.map((date) => date.kind).sort()).toEqual([...(cityId === "jaipur" ? ["answer", "confession"] : []),
        "confession", "normal", "normal", "normal", "normal", "normal", "normal", "reassurance"]);
      for (const date of own.filter((item) => item.kind === "confession" || item.kind === "reassurance")) {
        // Each city's own rooftop at night.
        expect(date).toMatchObject({ apCost: 0, minRomanceStage: 2, choiceCount: 1, backgroundId: `gt_bg_${cityId}_hotel_rooftop_night`,
          storyId: `places/gt_${cityId}_hotel_hub_dates.${date.id}` });
        expect(date.destinationId).toBeUndefined();
      }
      // No # profile: in a confession (B2): its own choices are the one direct choice (the player's confession: three that
      // confess and two that withhold; hers: three that accept, and the one that withholds on the path she gives up, in a stitch of the same knot).
      for (const confession of own.filter((date) => date.kind === "confession")) {
        const scene = scenes.find((item) => item.id === confession.id)!;
        const profiles = scene.options.filter((option) => option.knot === scene.id).map((option) => option.profile);
        expect(profiles.every((profile) => profile === undefined)).toBe(true);
        expect(profiles).toHaveLength(confession.id === "gt_jaipur_date_her_confession" ? 4 : 5);
      }
    }
  });

  it("is offered only at night, and takes the accepted outcome from confession_result", () => {
    const evening = agraEvening({ affection: 8, trust: 4, spark: 4 });
    expect(getDateAvailability(validateGameState({ ...evening, travel: { ...evening.travel, minute: 12 * 60 } }), AGRA).available).toBe(false);
    const started = startDate(evening, AGRA);
    expect(started.activeDate).toMatchObject({ pendingOutcome: "accepted", resolutionMode: "fixed", randomPlan: [] });
    const { state, lines } = playDate(evening, AGRA);
    expect(lines).toContain("……うん。わたしも、好き");
    expect(state).toMatchObject({ confessionStatus: "accepted", endingReached: true });
    expect(getDateAvailability(state, AGRA).available).toBe(false);
  }, 60_000);

  it.each(["accepted", "deferred", "rejected"] as const)("plays the city's confession once: after %s, it is not offered again", (outcome) => {
    const { state } = playDate(agraEvening(outcomeValues[outcome]), AGRA);
    expect(state.confessionStatus).toBe(outcome);
    // After an acceptance, the ending is the reason it gives first.
    expect(getDateAvailability(state, AGRA)).toEqual(outcome === "accepted"
      ? { available: false, reason: "ふたりの物語は、交際エンディングを迎えました。" } : played);
    expect(isCompletedTravelEvent(state, AGRA)).toBe(true);
    expect(startDate(state, AGRA)).toBe(state);
    // Nor after what would let a repeatable one be played again (the reassurance, another date), the next evening.
    if (outcome === "accepted") return;
    const later = atNight(playDate(state, outcome === "deferred" ? "gt_agra_date_reassurance" : normalDates("agra")[3]).state);
    expect(getDateAvailability(later, AGRA)).toEqual(played);
  }, 60_000);

  it("after a deferral, offers the reassurance once per journey", () => {
    const deferred = playDate(agraEvening(outcomeValues.deferred), AGRA);
    expect(deferred.lines).toContain("うれしい。本当に、うれしい");
    expect(deferred.state.confessionStatus).toBe("deferred");
    const reassured = playDate(deferred.state, "gt_agra_date_reassurance").state;
    expect(reassured.playedDateIds).toContain("gt_agra_date_reassurance");
  }, 60_000);

  it("plays a confession its writer made repeatable again: at once after a deferral, after another date after a rejection", () => {
    // The repeat mechanism, on Agra's confession made repeatable for the test with the wait after a rejection its writer
    // would write (# when: date_since_rejection; the journey's own is played once).
    onTestFinished(installRepeatableDate(AGRA, { waitsAfterRejection: true }));
    const deferred = playDate(agraEvening(outcomeValues.deferred), AGRA).state;
    expect(deferred.confessionStatus).toBe("deferred");
    // A second attempt after a deferral (retry): the outcome is read again from the values.
    expect(getDateAvailability(deferred, AGRA)).toEqual({ available: true, reason: "" });

    const rejected = playDate(agraEvening(outcomeValues.rejected), AGRA);
    expect(rejected.lines).toContain("ありがとう。言ってくれて、うれしかった。それは、本当");
    expect(rejected.state.confessionStatus).toBe("rejected");
    expect(getDateAvailability(rejected.state, AGRA)).toEqual(waiting);
    const another = atNight(playDate(rejected.state, normalDates("agra")[3]).state);
    expect(getDateAvailability(another, AGRA)).toEqual({ available: true, reason: "" });
  }, 60_000);

  it("makes no confession wait by itself: one its writer made repeatable without the wait is offered right after a rejection", () => {
    // 2026-11-15: the wait after a rejection is the writer's part (# when: date_since_rejection), not a rule of the game.
    // Agra's confession writes the wait itself now, so the copy is made without it.
    onTestFinished(installRepeatableDate(AGRA));
    const index = dates.findIndex((date) => date.id === AGRA);
    dates[index] = { ...dates[index], when: { all: whenParts(AGRA).filter((part) => !("dateSinceRejection" in part)) } };
    expect(whenParts(AGRA)).not.toContainEqual(WAIT);
    const rejected = atNight(playDate(agraEvening(outcomeValues.rejected), AGRA).state);
    expect(rejected.confessionStatus).toBe("rejected");
    expect(meets(rejected, WAIT)).toBe(false);
    expect(getDateAvailability(rejected, AGRA)).toEqual({ available: true, reason: "" });
    expect(isTravelEventUnlocked(rejected, AGRA)).toBe(true);
  }, 60_000);

  it("writes the wait after a rejection on Agra's and Jaipur's confessions, not on her confession (2026-11-15, 2026-11-20)", () => {
    for (const dateId of [AGRA, "gt_jaipur_date_confession"])
      expect(whenParts(dateId)).toContainEqual(WAIT);
    // No other date of the journey writes it.
    expect(dates.filter((date) => date.chapterId && ["delhi", "agra", "jaipur"].includes(date.chapterId) &&
      whenParts(date.id).some((part) => "dateSinceRejection" in part)).map((date) => date.id).sort())
      .toEqual([AGRA, "gt_jaipur_date_confession"]);
  });

  it("opens Agra's confession, the journey's first, at night after a sightseeing there, with nothing recorded before", () => {
    // Delhi cleared (no confession there; 2026-11-20), then the departure to Agra.
    const agra = departFromClearedCity(clearCity(newJourney("golden_triangle")));
    expect(agra.currentCityId).toBe("agra");
    expect(agra.confessionStatus).toBe("none");
    // Not yet: Agra's confession opens after a sightseeing there (# when: episodes agra >= 1), at night.
    expect(getDateAvailability(atNight(agra), AGRA).available).toBe(false);
    let afterTaj = finishEpisode(agra, "gt_agra_main_taj_mahal");
    for (const dateId of normalDates("agra").slice(0, 3)) afterTaj = playDate(afterTaj, dateId).state;
    afterTaj = evaluateProgression(withRelationship(afterTaj, { affection: 2, trust: 1, spark: 0 }));
    const noon = validateGameState({ ...afterTaj, travel: { ...afterTaj.travel, minute: 12 * 60 } });
    expect(getDateAvailability(noon, AGRA).available).toBe(false);
    const night = evening(afterTaj, outcomeValues.accepted);
    expect(getDateAvailability(night, AGRA)).toEqual({ available: true, reason: "" });
    expect(isTravelEventUnlocked(night, AGRA)).toBe(true);
    // The first confession: its recorded lines, as written.
    expect(playDate(night, AGRA).state).toMatchObject({ confessionStatus: "accepted", endingReached: true });
  }, 300_000);

  it("breaks the attar at Akbar's tomb, and gives the lac bangles and charges Johari Bazaar once", () => {
    const agra = finishEpisode(cityStart("agra"), "gt_agra_main_taj_mahal");
    expect(agra.inventory.gt_delhi_rain_attar).toBe("held");
    // The monkey drops it whatever the player did about it; the catch (# minigame: monkey_catch) decides: a fumble breaks it.
    const akbar = playDate(agra, "gt_agra_date_akbar_tomb", ["attar_wait", "fumbled"]);
    expect(akbar.chosen).toEqual(expect.arrayContaining(["attar_wait", "fumbled"]));
    expect(akbar.state.inventory.gt_delhi_rain_attar).toBe("used");
    expect(akbar.state.storyProgress.flags).toContain("gt_agra_rain_on_lawn");
    expect(akbar.lines).toContain("……鹿が、雨だと思ってる");
    expect(akbar.state.memories).toContain("gt_agra_date_akbar_tomb_memory");
    // A catch keeps it, after any way of dealing with the monkey (here the chase, not the trade).
    const caught = playDate(agra, "gt_agra_date_akbar_tomb", ["attar_chase", "caught"]);
    expect(caught.chosen).toEqual(expect.arrayContaining(["attar_chase", "caught"]));
    expect(caught.state.inventory.gt_delhi_rain_attar).toBe("held");
    expect(caught.state.storyProgress.flags).not.toContain("gt_agra_rain_on_lawn");
    expect(caught.lines).not.toContain("……鹿が、雨だと思ってる");

    const jaipur = finishEpisode(cityStart("jaipur"), "gt_jaipur_main_hawa_mahal");
    const johari = playDate(jaipur, "gt_jaipur_date_johari_bazaar");
    expect(johari.state.inventory.gt_jaipur_lac_bangles).toBe("held");
    expect(johari.state.travelBudget).toBe(withAp(jaipur, 2).travelBudget - 500);
    expect(johari.state.memories).toContain("gt_jaipur_date_johari_bazaar_memory");
  }, 120_000);

  it("is found by the build from the catalog's address, also when its knot is not named after the date", () => {
    // The Agra confession's knot renamed in memory (a knot name need not be its date ID): its own choices still take
    // no # profile: (B2), and its # title: is still compared with that date's titleJa (DA-5).
    const tree = readContentTree(process.cwd());
    const validate = (change: (ink: string) => string) => {
      const files = new Map(tree.files);
      const edit = (file: string, edited: (text: string) => string) => {
        const before = files.get(file)!.toString("utf8");
        const after = edited(before);
        expect(after).not.toBe(before);
        files.set(file, Buffer.from(after));
      };
      edit("content/journeys/golden_triangle/stories/places/gt_agra_hotel_hub_dates.ink", (text) =>
        change(text.replace("=== gt_agra_date_confession ===\n# scene: date\n# title: 屋上の、言いたいこと\n",
          "=== gt_agra_rooftop_talk ===\n# scene: date\n# title: 屋上で\n")));
      edit("content/journeys/golden_triangle/romance/date_catalog.json", (text) => {
        const catalog = JSON.parse(text) as { dates: { id: string; storyId: string }[] };
        catalog.dates.find((date) => date.id === "gt_agra_date_confession")!.storyId = "places/gt_agra_hotel_hub_dates.gt_agra_rooftop_talk";
        return JSON.stringify(catalog);
      });
      return () => validateContent(selectJourneys(contentSourcesFromTree({ ...tree, files }), ["golden_triangle"]));
    };
    const result = validate((ink) => ink)();
    expect(result.dateRoutes.gt_agra_date_confession).toBeGreaterThan(0);
    expect(result.warnings).toContainEqual({ kind: "scene-tag", message: expect.stringContaining(
      "(gt_agra_rooftop_talk, the date gt_agra_date_confession): # title: 「屋上で」 differs from titleJa 「屋上の、言いたいこと」") });
    expect(validate((ink) => ink.replace("# option: stay_together]\n", "# option: stay_together]\n    # profile: attentive\n")))
      .toThrow("A confession date takes no # profile: (its outcome is never random; B2)");
  }, 120_000);
});

/**
 * Her answer (2026-11-13): Jaipur is the last city, so after a deferral at its confession no later confession can follow;
 * she gives her answer herself, by day (the next day at the earliest: the confession is at night), at the street before
 * Hawa Mahal. The answer is the relationship state's when it starts (deferralAnswer): yes, or a final "not now".
 */
describe("her answer in Jaipur after a deferral there (2026-11-13)", () => {
  const answer = "gt_jaipur_date_answer";
  /** Jaipur after a sightseeing and three dates, deferred at its rooftop confession at 19:00; made once. */
  let jaipurDeferred: GameState | undefined;
  function deferredInJaipur(): GameState {
    return jaipurDeferred ??= (() => {
      let state = finishEpisode(cityStart("jaipur"), "gt_jaipur_main_hawa_mahal");
      for (const dateId of normalDates("jaipur").slice(0, 3)) state = playDate(state, dateId).state;
      const deferred = playDate(evening(state, outcomeValues.deferred), "gt_jaipur_date_confession");
      expect(deferred.lines).toContain("待たせるの、ずるいって分かってる。でも、軽く返したくない。……少しだけ、待ってくれる？");
      expect(deferred.state.confessionStatus).toBe("deferred");
      return deferred.state;
    })();
  }
  /** `state` after a night at the hotel, with the given relationship values. */
  const morningAfter = (state: GameState, values: Values): GameState => evaluateProgression(withRelationship(nextMorning(state), values));

  it("waits for the day: not on the night of the deferral, then at the hotel the next morning", () => {
    const deferred = deferredInJaipur();
    expect(isEventVisible(deferred, answer)).toBe(false);
    expect(getDateAvailability(deferred, answer).available).toBe(false);
    const morning = morningAfter(deferred, outcomeValues.deferred);
    expect(morning.travel.minute).toBe(9 * 60);
    expect(isEventVisible(morning, answer)).toBe(true);
    expect(getDateAvailability(morning, answer)).toEqual({ available: true, reason: "" });
    // Without a deferral there is nothing to answer.
    expect(getDateAvailability(validateGameState({ ...morning, confessionStatus: "none", playedDateIds: morning.playedDateIds
      .filter((id) => id !== "gt_jaipur_date_confession"),
    livedTimes: morning.livedTimes?.filter((item) => item.id !== "gt_jaipur_date_confession") }), answer).available).toBe(false);
  }, 300_000);

  it("says not now when the confession's condition is not met: a final rejection, after keeping her promise", () => {
    // The reassurance on the night of the deferral (her promise: 「答えは、わたしから言うね」).
    const reassured = playDate(deferredInJaipur(), "gt_jaipur_date_reassurance");
    expect(reassured.lines).toContain("答えは、わたしから言うね。ちゃんと決めたら。それまでは、いつもどおりでいて。いつもどおりが、いちばん助かる");
    const morning = morningAfter(reassured.state, outcomeValues.deferred);
    const started = startDate(morning, answer);
    expect(started.activeDate).toMatchObject({ pendingOutcome: "rejected", resolutionMode: "fixed", randomPlan: [], responseSnapshot: null });
    const { state, lines } = playDate(morning, answer);
    expect(lines).toContain("答えは、わたしから言うって約束したもんね。だから、今日はわたしから");
    expect(lines).toContain("恋人としては、今は、一緒にいられない。これが、わたしの答え。待たせたのに、ごめんなさい");
    expect(lines).not.toContain("好き。……付き合いたい。旅が終わっても、一緒にいたい");
    expect(state).toMatchObject({ confessionStatus: "rejected", endingReached: false });
    expect(state.memories).not.toContain("gt_jaipur_date_answer_memory");
    // Answered: her answer is a memory, and nothing waits for the deferral any more (the reassurance, had it not been played).
    expect(getDateAvailability(state, answer)).toEqual(played);
    const unreassured = playDate(morningAfter(deferredInJaipur(), outcomeValues.deferred), answer);
    expect(unreassured.lines).not.toContain("答えは、わたしから言うって約束したもんね。だから、今日はわたしから");
    expect(unreassured.state.confessionStatus).toBe("rejected");
    expect(isEventVisible(atNight(unreassured.state), "gt_jaipur_date_reassurance")).toBe(false);
  }, 300_000);

  it("says yes when it is met: the couple ending, its memory and the 「交際開始」 screen, from the map", () => {
    const morning = morningAfter(deferredInJaipur(), outcomeValues.accepted);
    let state = applyPlayerAction(morning, (current) => beginTravelEvent(current, answer, "walk", current.revision, () => 0), () => 0);
    expect(state.occasion).toMatchObject({ kind: "date", parts: ["date", "ending"] });
    expect(state.activeDate).toMatchObject({ dateId: answer, pendingOutcome: "accepted", resolutionMode: "fixed" });
    const lines: string[] = [];
    for (let step = 0; state.activeDate; step++) {
      expect(step).toBeLessThan(200);
      state = roundtrip(state);
      const active = state.activeDate!;
      lines.push(active.frame.text);
      const change = active.frame.ended ? (current: GameState) => finishDate(current, current.revision)
        : active.frame.choices.length ? (current: GameState) => chooseDate(current, active.frame.choices[1].index, current.revision)
          : (current: GameState) => advanceDate(current, current.revision);
      state = applyPlayerAction(state, change, () => 0);
    }
    expect(lines).toContain("好き。……付き合いたい。旅が終わっても、一緒にいたい");
    expect(lines).toContain("だめ。一日一回まで。……うそ。好き。はい、二回目。三回目は、夜に取っておく");
    expect(state).toMatchObject({ confessionStatus: "accepted", endingReached: true });
    expect(state.memories).toContain("gt_jaipur_date_answer_memory");
    expect(state.occasion).toMatchObject({ at: "main:ending", romanceEnding: true });
    expect(screenFor(roundtrip(state))).toBe("romance_ending");
    const free = roundtrip(closeRomanceEnding(state, state.revision, () => 0));
    expect(free.occasion).toBeNull();
    expect(free.endingReached).toBe(true);
    expect(getDateAvailability(free, answer)).toEqual({ available: false, reason: "ふたりの物語は、交際エンディングを迎えました。" });
  }, 300_000);

  it("is checked by the build: it answers a deferral, and is decided like a confession", () => {
    const tree = readContentTree(process.cwd());
    const validate = (change: (catalog: { dates: Record<string, unknown>[] }) => void, ink: (text: string) => string = (text) => text) => {
      const files = new Map(tree.files);
      const catalogFile = "content/journeys/golden_triangle/romance/date_catalog.json";
      const catalog = JSON.parse(files.get(catalogFile)!.toString("utf8")) as { dates: Record<string, unknown>[] };
      change(catalog);
      files.set(catalogFile, Buffer.from(JSON.stringify(catalog)));
      const inkFile = "content/journeys/golden_triangle/stories/places/gt_jaipur_hotel_hub_dates.ink";
      files.set(inkFile, Buffer.from(ink(files.get(inkFile)!.toString("utf8"))));
      return () => validateContent(selectJourneys(contentSourcesFromTree({ ...tree, files }), ["golden_triangle"]));
    };
    const own = (catalog: { dates: Record<string, unknown>[] }) => catalog.dates.find((date) => date.id === answer)!;
    expect(validate((catalog) => { own(catalog).needsDeferred = false; })).toThrow("it needs needsDeferred: true");
    expect(validate((catalog) => { (own(catalog).validationContexts as Record<string, unknown>[])[0].confessionResult = "deferred"; }))
      .toThrow(`Her answer ${answer} is never another deferral`);
    expect(validate(() => undefined, (text) => text.replace("# option: same_by_day]\n", "# option: same_by_day]\n    # profile: attentive\n")))
      .toThrow("A date of her answer takes no # profile: (its outcome is never random; B2)");
  }, 120_000);
});

/**
 * Withholding a confession (# withhold, 2026-11-20): the choices that leave the confession unsaid decide nothing. The
 * date is still played (so that city's confession is not offered again), the flag of a confessing choice is not set.
 */
describe("withholding a confession in Agra (2026-11-20)", () => {
  it.each(["hear_her_out", "night_breeze"])("choosing %s decides nothing, and the date is played", (optionId) => {
    const night = agraEvening(outcomeValues.accepted);
    const started = startDate(night, AGRA);
    expect(started.activeDate).toMatchObject({ pendingOutcome: "accepted" });
    const { state, chosen } = playDate(night, AGRA, [optionId]);
    expect(chosen).toContain(optionId);
    expect(state).toMatchObject({ confessionStatus: "none", endingReached: false });
    expect(state.activeDate).toBeNull();
    expect(state.playedDateIds).toContain(AGRA);
    expect(state.storyProgress.flags).not.toContain("gt_agra_confessed");
    expect(getDateAvailability(state, AGRA)).toEqual(played);
    expect(startDate(state, AGRA)).toBe(state);
    // Played, not repeated the next evening either, however the values stand.
    expect(getDateAvailability(evening(state, outcomeValues.accepted), AGRA)).toEqual(played);
  }, 120_000);

  it("a confessing choice sets the flag and gives the outcome", () => {
    const { state, chosen } = playDate(agraEvening(outcomeValues.accepted), AGRA, ["stay_together"]);
    expect(chosen).toContain("stay_together");
    expect(state).toMatchObject({ confessionStatus: "accepted", endingReached: true });
    expect(state.storyProgress.flags).toContain("gt_agra_confessed");
    // Also when she says no or asks to wait: the flag says what the player did, not what she answered.
    const waited = playDate(agraEvening(outcomeValues.deferred), AGRA, ["ask_her_heart"]);
    expect(waited.state).toMatchObject({ confessionStatus: "deferred" });
    expect(waited.state.storyProgress.flags).toContain("gt_agra_confessed");
  }, 120_000);
});

/**
 * A confession after one in an earlier city (2026-11-15): Jaipur's answers to a second confession
 * remember the earlier night instead of repeating Agra's speech word for word (read from the flag gt_agra_confessed, which the
 * Agra confession's confessing choices set; 2026-11-20); the first confession of a journey keeps the recorded lines. The outcome is still the
 * relationship state's (confession_result), never the earlier one's.
 */
describe("a confession after one in an earlier city (2026-11-15)", () => {
  const firstNo = "ありがとう。言ってくれて、うれしかった。それは、本当";
  const firstWait = "うれしい。本当に、うれしい";
  const lead = "話、あるんでしょ。いいよ。最後まで、ちゃんと聞く";
  const firstLead = "ん？　どうしたの、改まった顔して";
  /** The city after a sightseeing and three dates, at stage 2 or more; made once per city. */
  const made = new Map<string, GameState>();
  const afterDates = (cityId: "agra" | "jaipur", episodeId: string): GameState => made.get(cityId) ?? (() => {
    let state = finishEpisode(cityStart(cityId), episodeId);
    for (const dateId of normalDates(cityId).slice(0, 3)) state = playDate(state, dateId).state;
    state = evaluateProgression(withRelationship(state, { affection: 2, trust: 1, spark: 0 }));
    expect(state.romanceStage).toBeGreaterThanOrEqual(2);
    made.set(cityId, state);
    return state;
  })();
  /**
   * `state` as if Agra's confession had been played before on the journey, answered `status` (a rejection long enough ago):
   * with `confessed`, one of its confessing choices (the flag gt_agra_confessed, which Jaipur's lines read), else a withholding
   * one (the date played, nothing decided; then the status stays "none").
   */
  const confessedBefore = (state: GameState, status: "deferred" | "rejected" | "none", confessed = true): GameState =>
    validateGameState({ ...state, confessionStatus: status, lastRejectedDateCount: status === "rejected" ? 0 : null,
      playedDateIds: [...state.playedDateIds, "gt_agra_date_confession"],
      storyProgress: { ...state.storyProgress, flags: confessed ? [...state.storyProgress.flags, "gt_agra_confessed"] : state.storyProgress.flags } });

  it("in Agra, the journey's first confession: a no or a wait as recorded, with no earlier night remembered", () => {
    const agra = afterDates("agra", "gt_agra_main_taj_mahal");
    const no = playDate(evening(agra, outcomeValues.rejected), "gt_agra_date_confession");
    expect(no.state.confessionStatus).toBe("rejected");
    expect(no.lines).toEqual(expect.arrayContaining([firstLead, firstNo]));
    const wait = playDate(evening(agra, outcomeValues.deferred), "gt_agra_date_confession");
    expect(wait.state.confessionStatus).toBe("deferred");
    expect(wait.lines).toContain(firstWait);
    for (const lines of [no.lines, wait.lines]) expect(lines).not.toContain(lead);
  }, 300_000);

  it("in Jaipur, after confessing in Agra: answers that remember the earlier rooftop, and her answer by day still follows", () => {
    const jaipur = afterDates("jaipur", "gt_jaipur_main_hawa_mahal");
    const no = playDate(evening(confessedBefore(jaipur, "deferred"), outcomeValues.rejected), "gt_jaipur_date_confession");
    expect(no.state.confessionStatus).toBe("rejected");
    expect(no.lines).toEqual(expect.arrayContaining([lead, "前の屋上のことも、ちゃんと覚えてる。だから、今夜は、ぼかさずに言うね",
      "あれは、よその人のお祝い。……でも、ここまで一緒に来た旅は、わたしたちのだよ"]));
    expect(no.lines).not.toContain(firstLead);
    expect(no.lines).not.toContain(firstNo);

    // The lead she has not said before, then the wait.
    const wait = playDate(evening(confessedBefore(jaipur, "rejected"), outcomeValues.deferred), "gt_jaipur_date_confession");
    expect(wait.state.confessionStatus).toBe("deferred");
    expect(wait.lines).toEqual(expect.arrayContaining([lead, "でも、今夜答えたら、楽隊と灯りのせいにしちゃう。……こんなに、にぎやかなんだもん",
      "だから、明るいところで、わたしから言う。今度は、答えを持っていくから"]));
    expect(wait.lines).not.toContain(firstWait);
    // Her answer the next day picks up 「楽隊と、灯りのせいに」.
    const answer = playDate(evaluateProgression(withRelationship(nextMorning(wait.state), outcomeValues.deferred)), "gt_jaipur_date_answer");
    expect(answer.lines).toContain("屋上で、夜のせいにしたくないって言ったでしょ。楽隊と、灯りのせいに。だから、昼にしたの。いちばん普通の時間に");
    expect(answer.state.confessionStatus).toBe("rejected");
  }, 300_000);

  it("in Jaipur, after only withholding in Agra (no flag): the lines of a first confession, as recorded", () => {
    const jaipur = afterDates("jaipur", "gt_jaipur_main_hawa_mahal");
    const no = playDate(evening(confessedBefore(jaipur, "none", false), outcomeValues.rejected), "gt_jaipur_date_confession");
    expect(no.lines).toContain("ありがとう。言ってくれて、うれしかった。それは、本当");
    expect(no.lines).not.toContain("前の屋上のことも、ちゃんと覚えてる。だから、今夜は、ぼかさずに言うね");
  }, 300_000);

  it("in Jaipur, right after a rejection in Agra: waits for a new date, as its writer wrote (# when: date_since_rejection)", () => {
    const jaipur = afterDates("jaipur", "gt_jaipur_main_hawa_mahal");
    // Rejected in Agra with no date since (the count when she said no is the count now).
    const justRejected = validateGameState({ ...confessedBefore(jaipur, "rejected"),
      lastRejectedDateCount: completedDateCount(jaipur) });
    const night = evening(justRejected, outcomeValues.accepted);
    expect(getDateAvailability(night, "gt_jaipur_date_confession")).toEqual(waiting);
    expect(isTravelEventUnlocked(night, "gt_jaipur_date_confession")).toBe(false);
    const another = evening(playDate(justRejected, normalDates("jaipur")[3]).state, outcomeValues.accepted);
    expect(getDateAvailability(another, "gt_jaipur_date_confession")).toEqual({ available: true, reason: "" });
    expect(isTravelEventUnlocked(another, "gt_jaipur_date_confession")).toBe(true);
  }, 300_000);

  it("in Jaipur, she confesses first at night after a sightseeing when the player has not confessed; the player's own confession waits", () => {
    const her = "gt_jaipur_date_her_confession";
    const jaipur = afterDates("jaipur", "gt_jaipur_main_hawa_mahal");
    const night = evening(jaipur, outcomeValues.accepted);
    expect(getDateAvailability(night, her)).toEqual({ available: true, reason: "" });
    expect(isEventVisible(night, her)).toBe(true);
    expect(isEventVisible(night, "gt_jaipur_date_confession")).toBe(false);
    // By day it is not offered, nor before a sightseeing in Jaipur.
    expect(getDateAvailability(validateGameState({ ...night, travel: { ...night.travel, minute: 12 * 60 } }), her).available).toBe(false);
    expect(getDateAvailability(atNight(evaluateProgression(withRelationship(cityStart("jaipur"), outcomeValues.accepted))), her).available).toBe(false);
    const { state, lines } = playDate(night, her);
    expect(lines).toContain("だから、言うね。……好き");
    expect(state).toMatchObject({ confessionStatus: "accepted", endingReached: true });
    expect(state.playedDateIds).toContain(her);
  }, 300_000);

  it("in Jaipur, after confessing in Agra, only the player's confession is offered; none after hers", () => {
    const her = "gt_jaipur_date_her_confession";
    const jaipur = afterDates("jaipur", "gt_jaipur_main_hawa_mahal");
    const afterAgra = evening(confessedBefore(jaipur, "none"), outcomeValues.accepted);
    expect(getDateAvailability(afterAgra, her).available).toBe(false);
    expect(isEventVisible(afterAgra, her)).toBe(false);
    expect(getDateAvailability(afterAgra, "gt_jaipur_date_confession")).toEqual({ available: true, reason: "" });
    // Hers played (accepted): the couple, so the player's confession is not offered.
    const played1 = playDate(evening(jaipur, outcomeValues.accepted), her).state;
    expect(getDateAvailability(played1, her).available).toBe(false);
    expect(isEventVisible(atNight(played1), "gt_jaipur_date_confession")).toBe(false);
  }, 300_000);
});
