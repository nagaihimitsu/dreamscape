// The sample's clock tower place file at play (the unified event design, stage 3a): the tags' effects
// applied once with the choice or the scene's end, the AP of a tag (its scene_tag rule, stored as
// "<rule>@<revision>" over the cap), hidden and greyed-out choices (decision 43), the story state
// (flags, met, a named condition), a date written with tags (its in-scene choice in a helper knot),
// the guide's skip stopping before a choice (decision 37) and the epilogue's choice (decision 36).
// Every state goes through the save's own checks.
import { beforeAll, describe, expect, it } from "vitest";
import { allRewardRules, balance } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { cityStart, rollTickets, startEncounterScene, withAp } from "../../../src/dev/scenario-builders";
import { meets } from "../../../src/domain/conditions";
import { advanceEncounter, chooseEncounter, continueTourismEncounters, encounterCanFinish, encounterChoiceDisplay, finishEncounter } from "../../../src/domain/encounter";
import { advanceDate, chooseDate, finishDate, validateGameState, type GameState } from "../../../src/domain/game";
import { choiceDisplay } from "../../../src/domain/scene-effects";
import { chooseTourismGuide, guideChoiceDisplay, openTourism, skipTourismGuide } from "../../../src/domain/tourism";
import { beginTravelEvent, finishTravelEventIfComplete } from "../../../src/domain/travel-game";
import { advanceCityEpilogue, chooseCityEpilogue } from "../../../src/domain/epilogue";
import { earnSceneTagAp, validateRewardState } from "../../../src/domain/rewards";
import { openEpilogueScene, completedCity } from "../../../src/dev/scenario-builders";

const BOOKMARK = "smp_mihon_three_bookmark";
const saved = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

/** Read the open encounter on, choosing `optionIds` in turn, until it closes (its moment goes on); every step saved. */
function play(state: GameState, ...optionIds: string[]): GameState {
  let s = state;
  const id = s.activeEncounter!.encounterId;
  for (let step = 0; s.activeEncounter?.encounterId === id; step++) {
    expect(step).toBeLessThan(60);
    const choices = s.activeEncounter.frame.choices;
    const choice = choices.find((item) => item.optionId === optionIds[0]);
    if (choices.length) { optionIds.shift(); s = saved(chooseEncounter(s, choice!.index, s.revision, () => 0)); continue; }
    const next = encounterCanFinish(s) ? finishEncounter(s, s.revision) : advanceEncounter(s, s.revision);
    s = saved(finishTravelEventIfComplete(s, continueTourismEncounters(s, next, () => 0)));
  }
  return s;
}

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the clock tower's place file at play", () => {
  it("gives the talk's # on_done: ap +1 once, stored as <rule>@<revision> over the cap", () => {
    expect(allRewardRules.find((rule) => rule.id === "smp_mihon_clock_gears__on_done"))
      .toMatchObject({ trigger: "scene_tag", sceneId: "smp_mihon_clock_gears", ap: 1, titleJa: "見本の時計塔" });
    const talk = startEncounterScene(withAp(cityStart("mihon"), balance.apCap), "smp_mihon_clock_gears", rollTickets.positive);
    expect(talk.activeEncounter).toMatchObject({ encounterId: "smp_mihon_clock_gears" });
    const done = play(talk);
    expect(done.ap).toBe(balance.apCap);
    expect(done.pendingApRewards).toEqual([{ rewardId: expect.stringMatching(/^smp_mihon_clock_gears__on_done@\d+$/u), earnedAp: 1, remainingAp: 1 }]);
    expect(done.claimedRewardIds).not.toContain("smp_mihon_clock_gears__on_done");
    expect(done.completedEncounterIds).toContain("smp_mihon_clock_gears");
    // A stored tag AP is checked by its shape only; one without @ naming a tag's rule is refused.
    expect(() => validateRewardState({ ...done, pendingApRewards: [{ rewardId: "gone_rule@3", earnedAp: 1, remainingAp: 1 }] })).not.toThrow();
    expect(() => validateRewardState({ ...done, pendingApRewards: [{ rewardId: "smp_mihon_clock_gears__on_done", earnedAp: 1, remainingAp: 1 }] }))
      .toThrow("未受取の報酬記録が一致しません。");
    // Two plays of a repeated tag store two records (other revisions).
    const twice = earnSceneTagAp(earnSceneTagAp(done, "smp_mihon_clock_gears__on_done", done.revision + 1), "smp_mihon_clock_gears__on_done", done.revision + 2);
    expect(twice.pendingApRewards).toHaveLength(3);
  });

  it("greys the bell's AP choice out when AP runs short, spends it once and changes spark with it", () => {
    const gift = startEncounterScene(cityStart("mihon"), "smp_mihon_bookmark_gift", rollTickets.positive);
    const bell = play(gift, "later");
    expect(bell.activeEncounter?.encounterId).toBe("smp_mihon_clock_bell");
    let s = bell;
    for (let step = 0; !s.activeEncounter!.frame.choices.length; step++) { expect(step).toBeLessThan(20); s = saved(advanceEncounter(s, s.revision)); }
    const climb = s.activeEncounter!.frame.choices.find((choice) => choice.optionId === "climb")!;
    expect(encounterChoiceDisplay(withAp(s, 0), climb.index)).toMatchObject({ show: "grey", ap: 1 });
    expect(chooseEncounter(withAp(s, 0), climb.index, s.revision)).toEqual(withAp(s, 0));
    const rich = withAp(s, 2);
    const chosen = saved(chooseEncounter(rich, climb.index, rich.revision));
    expect(chosen).toMatchObject({ ap: 1, spark: rich.spark + 1 });
    expect(chooseEncounter(chosen, climb.index, rich.revision)).toBe(chosen);
  });

  it("hides a choice whose item is not held and greys one that cannot be paid (decision 43)", () => {
    const state = cityStart("mihon");
    const give = { id: "give", knot: "k", give: { item: BOOKMARK, to: "heroine" } };
    expect(choiceDisplay(state, give)).toEqual({ show: "hidden" });
    expect(choiceDisplay({ ...state, inventory: { [BOOKMARK]: "held" } }, give)).toEqual({ show: "open" });
    expect(choiceDisplay(state, { id: "flag", knot: "k", requires: [{ flag: "smp_mihon_lili_told_why" }] })).toEqual({ show: "hidden" });
    expect(choiceDisplay(state, { id: "pay", knot: "k", money: -(state.travelBudget + 1) })).toMatchObject({ show: "grey" });
    // Hiding comes first.
    expect(choiceDisplay(state, { ...give, money: -(state.travelBudget + 1) })).toEqual({ show: "hidden" });
  });

  it("sets the stall's flag, meets Lili (also with 「また今度」) and reads the named condition", () => {
    const start = cityStart("mihon");
    const trip = saved(beginTravelEvent(start, "smp_mihon_main_clock_tower", "walk", start.revision, () => 0));
    const putOff = play(trip, "later");
    expect(meets(putOff, { met: "smp_mihon_lili" })).toBe(true);
    expect(meets(putOff, { encounterCompleted: "smp_mihon_bookmark_stall" })).toBe(false);
    expect(meets(putOff, { flag: "smp_mihon_lili_told_why" })).toBe(false);
    const again = saved(beginTravelEvent(start, "smp_mihon_main_clock_tower", "walk", start.revision, () => 0));
    const told = play(again, "drawn");
    expect(told.storyProgress.flags).toEqual(["smp_mihon_lili_told_why"]);
    expect(told.inventory[BOOKMARK]).toBe("held");
    expect(meets(told, { condition: "smp_mihon_lili_heard" })).toBe(true);
    // An undeclared flag cannot be loaded.
    expect(() => saved({ ...told, storyProgress: { lines: {}, flags: ["smp_mihon_no_such_flag"] } })).toThrow("物語の進行の記録が一致しません。");
  });

  it("plays the date written with tags: its in-scene choice gives the bookmark without a ticket, its romance choices use theirs", () => {
    // The stall (bookmark), the battle and the gift put off, the bell: the bookmark is still held at the date.
    const gift = startEncounterScene(cityStart("mihon"), "smp_mihon_bookmark_gift", rollTickets.positive);
    const afterBell = play(play(gift, "later"), "stay_below");
    expect(afterBell.inventory[BOOKMARK]).toBe("held");
    let s = saved(beginTravelEvent(afterBell, "smp_mihon_date_tower_square", "walk", afterBell.revision, () => 0));
    expect(s.activeDate).toMatchObject({ dateId: "smp_mihon_date_tower_square", choiceCount: 0, turnCount: 0 });
    const before = { affection: s.affection, trust: s.trust };
    for (let step = 0; s.activeDate; step++) {
      expect(step).toBeLessThan(80);
      const frame = s.activeDate.frame;
      if (frame.choices.length) {
        const choice = frame.choices.find((item) => item.optionId === "give_bookmark") ?? frame.choices[0];
        const next = saved(chooseDate(s, choice.index, s.revision));
        if (choice.optionId === "give_bookmark") {
          expect(next.inventory[BOOKMARK]).toBe("gifted");
          expect(next.itemUses[BOOKMARK]).toEqual({ encounterId: "smp_mihon_date_tower_square", optionId: "give_bookmark" });
          expect(next.storyProgress.flags).toContain("smp_mihon_bookmark_to_heroine");
          expect(next.affection).toBe(before.affection + 1);
          expect(next.activeDate).toMatchObject({ choiceCount: 0, turnCount: 1, resolvedChoices: [] });
        }
        s = next;
      } else s = saved(finishTravelEventIfComplete(s, frame.ended ? finishDate(s, s.revision) : advanceDate(s, s.revision)));
      if (s.activeDate) expect(s.activeDate.turnCount).toBeGreaterThanOrEqual(s.activeDate.choiceCount);
    }
    expect(s.playedDateIds).toEqual(["smp_mihon_date_tower_square"]);
    expect(s.trust).toBeGreaterThanOrEqual(before.trust - 10);
  });

  it("stops the guide's skip before its choice, and a skipped guide is not read (decision 37)", () => {
    const start = cityStart("mihon");
    const trip = saved(beginTravelEvent(start, "smp_mihon_main_clock_tower", "walk", start.revision, () => 0));
    const guide = play(trip, "ask");
    expect(guide.activeTourism?.phase).toBe("guide");
    const atChoice = saved(skipTourismGuide(guide, guide.revision));
    expect(atChoice.activeTourism?.phase).toBe("guide");
    expect(atChoice.activeTourism?.frame?.choices.map((choice) => choice.optionId)).toEqual(["look_around", "ask_keeper"]);
    expect(skipTourismGuide(atChoice, atChoice.revision)).toBe(atChoice);
    expect(guideChoiceDisplay(atChoice, atChoice.activeTourism!.frame!.choices[0].index).show).toBe("open");
    const chosen = saved(chooseTourismGuide(atChoice, atChoice.activeTourism!.frame!.choices[0].index, atChoice.revision));
    const closed = saved(skipTourismGuide(chosen, chosen.revision));
    expect(closed.activeTourism?.phase).toBe("exploring");
    expect(closed.completedGuideIds).not.toContain("mihon_clock_tower");
    expect(closed.claimedRewardIds).not.toContain("smp_mihon_main_clock_tower_guide_read");
    expect(closed.visitedLandmarkIds).toContain("mihon_clock_tower");
    // Opened again from the observation, the guide is read to its end: now it counts (and its choices apply nothing).
    expect(openTourism(closed, "mihon_clock_tower")).toBe(closed);
  });

  it("applies the epilogue's choice once, with a save in between (decision 36)", () => {
    let s = openEpilogueScene(completedCity("mihon"));
    const affection = s.affection;
    for (let step = 0; !s.activeEpilogue!.frame.choices.length; step++) { expect(step).toBeLessThan(40); s = saved(advanceCityEpilogue(s, s.revision)); }
    const wave = s.activeEpilogue!.frame.choices.find((choice) => choice.optionId === "wave_back")!;
    const chosen = saved(chooseCityEpilogue(s, wave.index, s.revision));
    expect(chosen.affection).toBe(affection + 1);
    expect(chooseCityEpilogue(chosen, wave.index, s.revision)).toBe(chosen);
    let end = chosen;
    for (let step = 0; end.activeEpilogue; step++) { expect(step).toBeLessThan(40); end = saved(advanceCityEpilogue(end, end.revision)); }
    expect(end.viewedEpilogueCityIds).toContain("mihon");
    expect(end.affection).toBe(affection + 1);
  });
});
