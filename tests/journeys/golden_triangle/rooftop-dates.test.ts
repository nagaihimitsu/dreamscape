import { describe, expect, it, onTestFinished } from "vitest";
import { contentSourcesFromTree, readContentTree, selectJourneys } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";
import { dates, scenes } from "../../../src/content";
import { cityStart, clearCity, departFromClearedCity, finishEpisode, newJourney, nextMorning, withAp, withRelationship } from "../../../src/dev/scenario-builders";
import { meets } from "../../../src/domain/conditions";
import { evaluateProgression } from "../../../src/domain/date-rules";
import { advanceDate, chooseDate, dateChoiceDisplay, finishDate, getDateAvailability, isEventVisible, startDate, validateGameState, type GameState } from "../../../src/domain/game";
import { closeRomanceEnding } from "../../../src/domain/occasion";
import { applyPlayerAction } from "../../../src/domain/player-action";
import { screenFor } from "../../../src/domain/screen";
import { beginTravelEvent, isCompletedTravelEvent } from "../../../src/domain/travel-game";
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

/** Delhi after one sightseeing and three dates, at stage 2 or more (the rooftop dates' minRomanceStage); made once. */
let delhiDates: GameState | undefined;
function delhiAfterDates(): GameState {
  return delhiDates ??= (() => {
    let state = finishEpisode(newJourney("golden_triangle"), "gt_delhi_main_red_fort");
    for (const dateId of normalDates("delhi").slice(0, 3)) state = playDate(state, dateId).state;
    state = evaluateProgression(withRelationship(state, { affection: 2, trust: 1, spark: 0 }));
    expect(state.romanceStage).toBeGreaterThanOrEqual(2);
    return state;
  })();
}
/** `state` with the relationship values the confession reads, at 19:00. */
const evening = (state: GameState, values: Values): GameState => atNight(evaluateProgression(withRelationship(state, values)));
/** Delhi after one sightseeing and three dates, at stage 2 or more, with the given relationship values, at 19:00. */
const delhiEvening = (values: Values): GameState => evening(delhiAfterDates(), values);
/** The reason a date already played gives (date-rules.ts getDateAvailability). */
const played = { available: false, reason: "このひとときは、もう思い出になりました。" };
/** The reason a confession gives after a rejection, until a new date or a recovery. */
const waiting = { available: false, reason: "新しいひとときを過ごしてから、もう一度話せます。" };

describe("Golden Triangle rooftop dates (GT-3b)", () => {
  it("has eight dates in each city: six at a destination and the two rooftop dates at the hotel; Jaipur also her answer", () => {
    for (const cityId of ["delhi", "agra", "jaipur"]) {
      const own = dates.filter((date) => date.chapterId === cityId);
      // Jaipur, the last city, has her answer after a deferral there too (no later confession can follow; 2026-11-13).
      expect(own.map((date) => date.kind).sort()).toEqual([...(cityId === "jaipur" ? ["answer"] : []),
        "confession", "normal", "normal", "normal", "normal", "normal", "normal", "reassurance"]);
      for (const kind of ["confession", "reassurance"]) {
        const date = own.find((item) => item.kind === kind)!;
        expect(date).toMatchObject({ apCost: 0, minRomanceStage: 2, choiceCount: 1, backgroundId: "gt_bg_hotel_rooftop_night",
          storyId: `places/gt_${cityId}_hotel_hub_dates.gt_${cityId}_date_${kind}` });
        expect(date.destinationId).toBeUndefined();
      }
      // No # profile: in a confession (B2): its own choices are the one direct choice.
      const confession = scenes.find((scene) => scene.id === `gt_${cityId}_date_confession`)!;
      expect(confession.options.filter((option) => option.knot === confession.id).map((option) => option.profile)).toEqual([undefined, undefined, undefined]);
    }
  });

  it("is offered only at night, and takes the accepted outcome from confession_result", () => {
    const evening = delhiEvening({ affection: 8, trust: 4, spark: 4 });
    expect(getDateAvailability(validateGameState({ ...evening, travel: { ...evening.travel, minute: 12 * 60 } }), "gt_delhi_date_confession").available).toBe(false);
    const started = startDate(evening, "gt_delhi_date_confession");
    expect(started.activeDate).toMatchObject({ pendingOutcome: "accepted", resolutionMode: "fixed", randomPlan: [] });
    const { state, lines } = playDate(evening, "gt_delhi_date_confession");
    expect(lines).toContain("……うん。わたしも、好き");
    expect(state).toMatchObject({ confessionStatus: "accepted", endingReached: true });
    expect(getDateAvailability(state, "gt_delhi_date_confession").available).toBe(false);
  }, 60_000);

  it.each(["accepted", "deferred", "rejected"] as const)("plays the city's confession once: after %s, it is not offered again", (outcome) => {
    const { state } = playDate(delhiEvening(outcomeValues[outcome]), "gt_delhi_date_confession");
    expect(state.confessionStatus).toBe(outcome);
    // After an acceptance, the ending is the reason it gives first.
    expect(getDateAvailability(state, "gt_delhi_date_confession")).toEqual(outcome === "accepted"
      ? { available: false, reason: "ふたりの物語は、交際エンディングを迎えました。" } : played);
    expect(isCompletedTravelEvent(state, "gt_delhi_date_confession")).toBe(true);
    expect(startDate(state, "gt_delhi_date_confession")).toBe(state);
    // Nor after what would let a repeatable one be played again (the reassurance, another date), the next evening.
    if (outcome === "accepted") return;
    const later = atNight(playDate(state, outcome === "deferred" ? "gt_delhi_date_reassurance" : normalDates("delhi")[3]).state);
    expect(getDateAvailability(later, "gt_delhi_date_confession")).toEqual(played);
  }, 60_000);

  it("after a deferral, offers the reassurance once per journey", () => {
    const deferred = playDate(delhiEvening(outcomeValues.deferred), "gt_delhi_date_confession");
    expect(deferred.lines).toContain("うれしい。本当に、うれしい");
    expect(deferred.state.confessionStatus).toBe("deferred");
    const reassured = playDate(deferred.state, "gt_delhi_date_reassurance").state;
    expect(reassured.playedDateIds).toContain("gt_delhi_date_reassurance");
    for (const dateId of ["gt_agra_date_reassurance", "gt_jaipur_date_reassurance"])
      expect(meets(reassured, dates.find((date) => date.id === dateId)!.until)).toBe(true);
  }, 60_000);

  it("plays a confession its writer made repeatable again: at once after a deferral, after another date after a rejection", () => {
    // The repeat mechanism, on Delhi's confession made repeatable for the test (the journey's own is played once).
    onTestFinished(installRepeatableDate("gt_delhi_date_confession"));
    const deferred = playDate(delhiEvening(outcomeValues.deferred), "gt_delhi_date_confession").state;
    expect(deferred.confessionStatus).toBe("deferred");
    // A second attempt after a deferral (retry): the outcome is read again from the values.
    expect(getDateAvailability(deferred, "gt_delhi_date_confession")).toEqual({ available: true, reason: "" });

    const rejected = playDate(delhiEvening(outcomeValues.rejected), "gt_delhi_date_confession");
    expect(rejected.lines).toContain("ありがとう。言ってくれて、うれしかった。それは、本当");
    expect(rejected.state.confessionStatus).toBe("rejected");
    expect(getDateAvailability(rejected.state, "gt_delhi_date_confession")).toEqual(waiting);
    const another = atNight(playDate(rejected.state, normalDates("delhi")[3]).state);
    expect(getDateAvailability(another, "gt_delhi_date_confession")).toEqual({ available: true, reason: "" });
  }, 60_000);

  it("opens Agra's confession after a deferral in Delhi once its own conditions hold; after a rejection, also a new date", () => {
    // Delhi cleared after its three dates; its confession on the last evening, then the departure to Agra.
    const cleared = clearCity(delhiAfterDates());
    const toAgra = (outcome: "deferred" | "rejected"): GameState => {
      const { state } = playDate(evening(cleared, outcomeValues[outcome]), "gt_delhi_date_confession");
      expect(state.confessionStatus).toBe(outcome);
      const agra = departFromClearedCity(state);
      expect(agra.currentCityId).toBe("agra");
      // Not yet: Agra's confession opens after a sightseeing there (# when: episodes agra >= 1), at night.
      expect(getDateAvailability(atNight(agra), "gt_agra_date_confession").available).toBe(false);
      return finishEpisode(agra, "gt_agra_main_taj_mahal");
    };

    const afterDeferral = toAgra("deferred");
    const noon = validateGameState({ ...afterDeferral, travel: { ...afterDeferral.travel, minute: 12 * 60 } });
    expect(getDateAvailability(noon, "gt_agra_date_confession").available).toBe(false);
    const agraNight = evening(afterDeferral, outcomeValues.accepted);
    expect(getDateAvailability(agraNight, "gt_agra_date_confession")).toEqual({ available: true, reason: "" });
    const accepted = playDate(agraNight, "gt_agra_date_confession");
    expect(accepted.state).toMatchObject({ confessionStatus: "accepted", endingReached: true });
    // Her lead remembers the confession in Delhi.
    expect(accepted.lines).toContain("今夜は、わたしが誘ったの。前に言ってくれたこと、あれからずっと考えてた");

    // After a rejection in Delhi, Agra's confession also waits for a new date (or a recovery).
    const afterRejection = atNight(toAgra("rejected"));
    expect(getDateAvailability(afterRejection, "gt_agra_date_confession")).toEqual(waiting);
    const another = atNight(playDate(afterRejection, normalDates("agra")[0]).state);
    expect(getDateAvailability(another, "gt_agra_date_confession")).toEqual({ available: true, reason: "" });
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
    // The Delhi confession's knot renamed in memory (a knot name need not be its date ID): its own choices still take
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
      edit("content/journeys/golden_triangle/stories/places/gt_delhi_hotel_hub_dates.ink", (text) =>
        change(text.replace("=== gt_delhi_date_confession ===\n# scene: date\n# title: 屋上の、言いたいこと\n",
          "=== gt_delhi_rooftop_talk ===\n# scene: date\n# title: 屋上で\n")));
      edit("content/journeys/golden_triangle/romance/date_catalog.json", (text) => {
        const catalog = JSON.parse(text) as { dates: { id: string; storyId: string }[] };
        catalog.dates.find((date) => date.id === "gt_delhi_date_confession")!.storyId = "places/gt_delhi_hotel_hub_dates.gt_delhi_rooftop_talk";
        return JSON.stringify(catalog);
      });
      return () => validateContent(selectJourneys(contentSourcesFromTree({ ...tree, files }), ["golden_triangle"]));
    };
    const result = validate((ink) => ink)();
    expect(result.dateRoutes.gt_delhi_date_confession).toBeGreaterThan(0);
    expect(result.warnings).toContainEqual({ kind: "scene-tag", message: expect.stringContaining(
      "(gt_delhi_rooftop_talk, the date gt_delhi_date_confession): # title: 「屋上で」 differs from titleJa 「屋上の、言いたいこと」") });
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
      .filter((id) => id !== "gt_jaipur_date_confession") }), answer).available).toBe(false);
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
