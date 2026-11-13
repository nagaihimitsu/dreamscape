import { describe, expect, it } from "vitest";
import { contentSourcesFromTree, readContentTree, selectJourneys } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";
import { dates, scenes } from "../../../src/content";
import { cityStart, finishEpisode, newJourney, withAp, withRelationship } from "../../../src/dev/scenario-builders";
import { meets } from "../../../src/domain/conditions";
import { evaluateProgression } from "../../../src/domain/date-rules";
import { advanceDate, chooseDate, dateChoiceDisplay, finishDate, getDateAvailability, startDate, validateGameState, type GameState } from "../../../src/domain/game";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

/**
 * GT-3b: the dates in the new form. The rooftop confession takes its outcome from confession_result
 * (fixed when it starts; DA-1), the reassurance follows a deferral once per journey, and the dates'
 * head and choice tags give their items and pay their drafted prices once.
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

/** Delhi after one sightseeing and three dates, at stage 2 or more, with the given relationship values, at 19:00. */
function delhiEvening(values: Pick<GameState, "affection" | "trust" | "spark">): GameState {
  let state = finishEpisode(newJourney("golden_triangle"), "gt_delhi_main_red_fort");
  for (const dateId of normalDates("delhi").slice(0, 3)) state = playDate(state, dateId).state;
  // Reach stage 2 at least (the rooftop dates' minRomanceStage), then set the values the confession reads.
  state = evaluateProgression(withRelationship(state, { affection: 2, trust: 1, spark: 0 }));
  expect(state.romanceStage).toBeGreaterThanOrEqual(2);
  return atNight(evaluateProgression(withRelationship(state, values)));
}

describe("Golden Triangle rooftop dates (GT-3b)", () => {
  it("has eight dates in each city: six at a destination and the two rooftop dates at the hotel", () => {
    for (const cityId of ["delhi", "agra", "jaipur"]) {
      const own = dates.filter((date) => date.chapterId === cityId);
      expect(own.map((date) => date.kind).sort()).toEqual(["confession", "normal", "normal", "normal", "normal", "normal", "normal", "reassurance"]);
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

  it("after a deferral, offers the reassurance once per journey; a rejection waits for another date", () => {
    const deferred = playDate(delhiEvening({ affection: 4, trust: 2, spark: 0 }), "gt_delhi_date_confession");
    expect(deferred.lines).toContain("うれしい。本当に、うれしい");
    expect(deferred.state.confessionStatus).toBe("deferred");
    const reassured = playDate(deferred.state, "gt_delhi_date_reassurance").state;
    expect(reassured.playedDateIds).toContain("gt_delhi_date_reassurance");
    for (const dateId of ["gt_agra_date_reassurance", "gt_jaipur_date_reassurance"])
      expect(meets(reassured, dates.find((date) => date.id === dateId)!.until)).toBe(true);
    // A second attempt after a deferral (retry): the outcome is read again from the values.
    expect(getDateAvailability(reassured, "gt_delhi_date_confession").available).toBe(true);

    const rejected = playDate(delhiEvening({ affection: 0, trust: 0, spark: 0 }), "gt_delhi_date_confession");
    expect(rejected.lines).toContain("ありがとう。言ってくれて、うれしかった。それは、本当");
    expect(rejected.state.confessionStatus).toBe("rejected");
    expect(getDateAvailability(rejected.state, "gt_delhi_date_confession").available).toBe(false);
    const another = atNight(playDate(rejected.state, normalDates("delhi")[3]).state);
    expect(getDateAvailability(another, "gt_delhi_date_confession").available).toBe(true);
  }, 60_000);

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
