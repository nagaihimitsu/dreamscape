import { seedCurrentFreeTime } from "../../tests/fixtures/current-game";
import { describe, expect, it, onTestFinished } from "vitest";
import { installRepeatableDate } from "../../tests/fixtures/repeatable-date";
import { dates, progression } from "../content";
import { beginStory, continueStory } from "../story/runtime";
import {
  advanceDate,
  canConfessSuccessfully,
  chooseDate,
  createGame,
  evaluateProgression,
  finishDate,
  getDateAvailability,
  getMemoryCallback,
  getPlayerAddress,
  setNames,
  startDate,
  taggedDateScene,
  validateGameState,
  type GameState,
} from "./game";

const cafe = "milano_cafe_01",
  walk = "milano_walk_01",
  invitation = "milano_invitation_01",
  night = "milano_night_01",
  confession = "milano_confession_01",
  reassurance = "milano_reassurance_01";
function play(
  state: GameState,
  dateId: string,
  selections: number[],
  transcript: string[] = [],
  resolutions: NonNullable<GameState["activeDate"]>["resolvedChoices"] = [],
) {
  expect(getDateAvailability(state, dateId), dateId).toMatchObject({
    available: true,
  });
  state = startDate(state, dateId, stableRolls());
  let steps = 0;
  while (state.activeDate) {
    if (++steps > 100) throw Error("Runaway story");
    const before = state;
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    expect(state).toEqual(before);
    const active = state.activeDate!;
    transcript.push(active.frame.text);
    if (active.frame.ended) state = finishDate(state, state.revision);
    else if (active.frame.choices.length) {
      state = chooseDate(state, selections[active.choiceCount], state.revision);
      if (state.activeDate!.resolutionMode === "random_v1") resolutions.push(state.activeDate!.resolvedChoices.at(-1)!);
    }
    else state = advanceDate(state, state.revision);
  }
  return state;
}
/** Stand-in for AP earned elsewhere on the journey (sightseeing rewards). */
function withTravelAp(state: GameState, ap = 4): GameState {
  return validateGameState({ ...state, ap: state.ap + ap });
}
function toWalk() {
  return withTravelAp(play(seedCurrentFreeTime(createGame("晴", "灯")), cafe, [0, 0]));
}
function toInvitation() {
  return play(toWalk(), walk, [0, 0]);
}
function toNight() {
  return withTravelAp(play(toInvitation(), invitation, [0]));
}
function lowPath() {
  return play(toNight(), night, [0, 1]);
}

describe("relationship progression", () => {
  it("requires affection and completed history together, uses configured address suffixes", () => {
    const initial = createGame("晴", "灯");
    expect(
      evaluateProgression({ ...initial, affection: 100 }).romanceStage,
    ).toBe(1);
    expect(
      evaluateProgression({ ...initial, playedDateIds: [cafe] }).romanceStage,
    ).toBe(1);
    const afterCafe = play(seedCurrentFreeTime(initial), cafe, [0, 0]);
    expect(afterCafe.romanceStage).toBe(2);
    const afterWalk = toInvitation();
    expect(afterWalk.romanceStage).toBe(3);
    expect(getPlayerAddress(afterWalk)).toBe(
      "晴" + progression.stages[2].playerSuffix,
    );
    expect(getPlayerAddress(setNames(afterWalk, "海", "雪"))).toBe(
      "海" + progression.stages[2].playerSuffix,
    );
    expect(lowPath().romanceStage).toBe(4);
  });
  it("keeps the next date funded by refusing an already completed date", () => {
    let state = toWalk();
    expect(state.ap).toBe(6);
    expect(getDateAvailability(state, cafe).available).toBe(false);
    expect(startDate(state, cafe)).toBe(state);
    state = play(state, walk, [0, 0]);
    expect(state.ap).toBe(3);
    state = withTravelAp(state);
    state = play(state, invitation, [0]);
    state = play(state, night, [0, 1]);
    expect(state.romanceStage).toBe(4);
  });
  it("unlocks a single heroine invitation for free and recalls earlier choices", () => {
    const initial = toWalk();
    expect(getDateAvailability(initial, invitation).available).toBe(true);
    const state = toInvitation();
    expect(state.unlockedEventIds).toContain(invitation);
    expect(
      evaluateProgression(evaluateProgression(state)).unlockedEventIds.filter(
        (id) => id === invitation,
      ),
    ).toHaveLength(1);
    const transcript: string[] = [];
    const resolutions: NonNullable<GameState["activeDate"]>["resolvedChoices"] = [];
    const completed = play(state, invitation, [0], transcript, resolutions);
    expect(completed.ap).toBe(state.ap);
    expect(completed.affection).toBe(state.affection + resolutions[0].deltas.affection);
    expect(startDate(completed, invitation)).toBe(completed);
    expect(transcript.join("\n")).toContain("ガッレリアの中央");
    expect(completed.memories).toContain("sound_memory_invitation_01");
    expect(getMemoryCallback(completed)).not.toBe(getMemoryCallback(createGame()));
  });
  for (const id of [walk, night]) {
    for (let first = 0; first < 3; first++)
      for (let second = 0; second < 3; second++) {
        it(`${id}: completes choices ${first}/${second} and preserves each reload boundary`, () => {
          const state = id === walk ? toWalk() : toNight();
          const before = state.affection;
          const resolutions: NonNullable<GameState["activeDate"]>["resolvedChoices"] = [];
          const completed = play(state, id, [first, second], [], resolutions);
          const firstProfiles = id === walk ? ["playful", "attentive", "bold"] : ["playful", "attentive", "honest"];
          // The date's choices as its knot writes them (# option:, # profile:, # memory:): the first moment's three, then the second's.
          const options = taggedDateScene(id)!.options;
          const chosen = [options.find((option) => option.id === `first_${firstProfiles[first]}`)!, options[3 + second]];
          expect(chosen.every(Boolean)).toBe(true);
          expect(chosen[1].id.startsWith("second_")).toBe(true);
          expect(resolutions.map((entry) => entry.optionId)).toEqual(chosen.map((option) => option.id));
          expect(completed.affection).toBe(before + resolutions.reduce((sum, entry) => sum + entry.deltas.affection, 0));
          expect(completed.trust).toBe(state.trust + resolutions.reduce((sum, entry) => sum + entry.deltas.trust, 0));
          expect(completed.spark).toBe(state.spark + resolutions.reduce((sum, entry) => sum + entry.deltas.spark, 0));
          expect(completed.memories.length).toBe(state.memories.length + 1);
          expect(chosen[1].memory).toHaveLength(1);
          expect(completed.memories).toContain(chosen[1].memory![0]);
          expect(completed.ap).toBe(
            state.ap - dates.find((date) => date.id === id)!.apCost,
          );
        });
      }
  }
});

describe("confession and relationship ending", () => {
  it("recalls the San Maurizio date only when it was played", () => {
    // The confession is a knot of the Darsena's place file; it reads cond("date milano_maurizio_date_sound").
    const storyId = "places/milano_darsena.milano_confession_01";
    const opening = (played: string[]) => {
      const conditions = (text: string) => text.startsWith("date ") && played.includes(text.slice("date ".length));
      let step = beginStory(storyId, "晴", "灯", {}, [], {}, undefined, conditions);
      const lines: string[] = [];
      for (let i = 0; !step.frame.choices.length && i < 100; i++) {
        lines.push(step.frame.text);
        step = continueStory(storyId, step.storyState, step.frame, [], {}, {}, conditions);
      }
      expect(step.frame.choices).toHaveLength(3);
      lines.push(step.frame.text);
      return lines.join("\n");
    };
    expect(opening(["milano_maurizio_date_sound"]))
      .toContain("あの教会で、別々に見て戻ったときも思った");
    expect(opening(["milano_cafe_01"]))
      .not.toContain("あの教会で、別々に見て戻ったときも思った");
  });
  it("offers confession from stage 2 even before success is guaranteed, without charging AP", () => {
    const early = toWalk();
    expect(getDateAvailability(early, confession).available).toBe(true);
    expect(canConfessSuccessfully(early)).toBe(false);
    const started = startDate(early, confession);
    expect(started.ap).toBe(early.ap);
    expect(startDate(started, confession)).toBe(started);
  });
  it("lets a deferred relationship grow and earn the ending exactly once", () => {
    // A second confession after a deferral, on Milan's confession made repeatable for the test (the journey's own is played once).
    onTestFinished(installRepeatableDate(confession));
    let state = toInvitation();
    expect(canConfessSuccessfully(state)).toBe(false);
    const ap = state.ap;
    state = play(state, confession, [0]);
    expect(state.confessionStatus).toBe("deferred");
    expect(state.endingReached).toBe(false);
    expect(state.unlockedEventIds).toContain(reassurance);
    const before = state.affection;
    const reassuranceResolutions: NonNullable<GameState["activeDate"]>["resolvedChoices"] = [];
    state = play(state, reassurance, [1], [], reassuranceResolutions);
    expect(state.affection).toBe(before + reassuranceResolutions[0].deltas.affection);
    expect(startDate(state, reassurance)).toBe(state);
    expect(canConfessSuccessfully(state)).toBe(false);
    state = play(state, night, [0, 1]);
    expect(canConfessSuccessfully(state)).toBe(true);
    state = play(state, confession, [0]);
    expect(state.confessionStatus).toBe("accepted");
    expect(state.endingReached).toBe(true);
    expect(
      state.memories.filter((id) => id === "milano_confession_promise"),
    ).toHaveLength(1);
    expect(state.ap).toBe(ap - dates.find((date) => date.id === night)!.apCost);
    expect(finishDate(state, state.revision)).toBe(state);
    expect(startDate(state, confession)).toBe(state);
    expect(validateGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it("requires another shared date after rejection and can eventually accept without the invitation", () => {
    // The wait after a rejection, on Milan's confession made repeatable for the test (the journey's own is played once).
    onTestFinished(installRepeatableDate(confession));
    let state = { ...toWalk(), trust: 0 };
    expect(canConfessSuccessfully(state)).toBe(false);
    const transcript: string[] = [];
    state = play(state, confession, [1], transcript);
    expect(state.confessionStatus).toBe("rejected");
    expect(state.memories).toContain("sound_memory_cafe_01");
    expect(transcript.join("\n")).toContain("恋人としては、今は会えません");
    expect(transcript.join("\n")).not.toContain("あの教会で、別々に見て");
    expect(startDate(state, confession)).toBe(state);
    state = play(state, walk, [0, 0]);
    expect(getDateAvailability(state, confession).available).toBe(true);
    state = play(state, night, [0, 1]);
    expect(canConfessSuccessfully(state)).toBe(true);
    state = play(state, confession, [2]);
    expect(state.endingReached).toBe(true);
    expect(
      state.memories.filter((id) => id === "milano_confession_promise"),
    ).toHaveLength(1);
  });
  it("records the confession's memory with the choice, and commits the ending only after its final line", () => {
    let state = lowPath();
    expect(canConfessSuccessfully(state)).toBe(true);
    state = startDate(state, confession);
    while (!state.activeDate!.frame.choices.length)
      state = advanceDate(state, state.revision);
    const choiceRevision = state.revision;
    expect(state.memories).not.toContain("milano_confession_promise");
    state = chooseDate(state, 0, choiceRevision);
    expect(chooseDate(state, 0, choiceRevision)).toBe(state);
    // The memory (that the confession was made) is the choice's # memory:, kept in the save that passes the choice to Ink.
    expect(state.memories.filter((id) => id === "milano_confession_promise")).toHaveLength(1);
    while (!state.activeDate!.frame.ended)
      state = advanceDate(state, state.revision);
    expect(state.endingReached).toBe(false);
    const finalRevision = state.revision;
    state = finishDate(
      validateGameState(JSON.parse(JSON.stringify(state))),
      finalRevision,
    );
    expect(state.endingReached).toBe(true);
    expect(state.memories).toContain("milano_confession_promise");
    expect(finishDate(state, finalRevision)).toBe(state);
  });
});

/** Reproducible positive outcomes with varied delta tickets for these progression tests. */
function stableRolls() {
  let index = 0;
  const tickets = [0, 5000, 5000, 0];
  return () => tickets[index++ % tickets.length];
}
