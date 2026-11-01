import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import { describe, expect, it } from "vitest";
import { dates, effects, progression, trialMilestones } from "../content";
import {
  advanceDate,
  canConfessSuccessfully,
  chooseDate,
  claimTrialMilestone,
  createGame,
  evaluateProgression,
  finishDate,
  getDateAvailability,
  getMemoryCallback,
  getMilestoneAvailability,
  getPlayerAddress,
  setNames,
  startDate,
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
function toWalk() {
  return claimTrialMilestone(
    play(seedLegacyChapter(createGame("晴", "灯")), cafe, [0, 0]),
    trialMilestones[0].id,
  );
}
function toInvitation() {
  return play(toWalk(), walk, [0, 0]);
}
function toNight() {
  return claimTrialMilestone(
    play(toInvitation(), invitation, [0]),
    trialMilestones[1].id,
  );
}
function lowPath() {
  return play(toNight(), night, [0, 1]);
}

describe("Phase 2 relationship progression", () => {
  it("requires affection and completed history together, uses configured address suffixes", () => {
    const initial = createGame("晴", "灯");
    expect(
      evaluateProgression({ ...initial, affection: 100 }).romanceStage,
    ).toBe(1);
    expect(
      evaluateProgression({ ...initial, playedDateIds: [cafe] }).romanceStage,
    ).toBe(1);
    const afterCafe = play(seedLegacyChapter(initial), cafe, [0, 0]);
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
  it("makes finite trial rewards idempotent, locked until history, capped without wasting rewards", () => {
    const first = trialMilestones[0];
    const initial = seedLegacyChapter(createGame());
    expect(claimTrialMilestone(initial, first.id)).toBe(initial);
    const afterCafe = play(initial, cafe, [0, 0]);
    const awarded = claimTrialMilestone(afterCafe, first.id);
    expect(awarded.ap).toBe(afterCafe.ap + first.ap);
    expect(awarded.affection).toBe(afterCafe.affection);
    expect(claimTrialMilestone(awarded, first.id)).toBe(awarded);
    const full = { ...afterCafe, ap: 12 };
    expect(getMilestoneAvailability(full, first.id).available).toBe(false);
    expect(claimTrialMilestone(full, first.id)).toBe(full);
    const reloaded = validateGameState(JSON.parse(JSON.stringify(awarded)));
    expect(claimTrialMilestone(reloaded, first.id)).toBe(reloaded);
  });
  it("keeps the next date funded by refusing an already completed date", () => {
    let state = toWalk();
    expect(state.ap).toBe(6);
    expect(getDateAvailability(state, cafe).available).toBe(false);
    expect(startDate(state, cafe)).toBe(state);
    state = play(state, walk, [0, 0]);
    expect(state.ap).toBe(3);
    state = claimTrialMilestone(state, trialMilestones[1].id);
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
    const completed = play(state, invitation, [0], transcript);
    expect(completed.ap).toBe(state.ap);
    expect(completed.affection).toBe(state.affection + 2);
    expect(startDate(completed, invitation)).toBe(completed);
    expect(transcript.join("\n")).toContain("ここ、『ミラノの居間』");
    expect(completed.memories).toContain("milano_invitation_chosen_joke_refresh");
    const differentlyChosen = play(
      seedLegacyChapter(createGame()),
      cafe,
      [2, 2],
    );
    expect(getMemoryCallback(differentlyChosen)).not.toBe(
      getMemoryCallback(state),
    );
  });
  for (const id of [walk, night]) {
    for (let first = 0; first < 3; first++)
      for (let second = 0; second < 3; second++) {
        it(`${id}: completes choices ${first}/${second} and preserves each reload boundary`, () => {
          const state = id === walk ? toWalk() : toNight();
          const before = state.affection;
          const resolutions: NonNullable<GameState["activeDate"]>["resolvedChoices"] = [];
          const completed = play(state, id, [first, second], [], resolutions);
          const firstId = `${id.replace("_01", "")}_first_${["joke", "listen", "honest"][first]}_refresh`;
          const secondId = `${id.replace("_01", "")}_second_${["joke", "listen", "honest"][second]}_refresh`;
          const chosen = [firstId, secondId].map((effectId) => effects.find((effect) => effect.id === effectId)!);
          expect(resolutions.map((entry) => entry.effectId)).toEqual(chosen.map((effect) => effect.id));
          expect(completed.affection).toBe(before + resolutions.reduce((sum, entry) => sum + entry.deltas.affection, 0));
          expect(completed.trust).toBe(state.trust + resolutions.reduce((sum, entry) => sum + entry.deltas.trust, 0));
          expect(completed.spark).toBe(state.spark + resolutions.reduce((sum, entry) => sum + entry.deltas.spark, 0));
          expect(completed.memories.length).toBe(state.memories.length + 2);
          expect(completed.memories).toEqual(expect.arrayContaining(chosen.map((effect) => effect.memoryId)));
          expect(completed.ap).toBe(
            state.ap - dates.find((date) => date.id === id)!.apCost,
          );
        });
      }
  }
});

describe("confession and relationship ending", () => {
  it("offers confession from stage 2 even before success is guaranteed, without charging AP", () => {
    const early = toWalk();
    expect(getDateAvailability(early, confession).available).toBe(true);
    expect(canConfessSuccessfully(early)).toBe(false);
    const started = startDate(early, confession);
    expect(started.ap).toBe(early.ap);
    expect(startDate(started, confession)).toBe(started);
  });
  it("lets a deferred relationship grow and earn the ending exactly once", () => {
    let state = toInvitation();
    expect(canConfessSuccessfully(state)).toBe(false);
    const ap = state.ap;
    state = play(state, confession, [0]);
    expect(state.confessionStatus).toBe("deferred");
    expect(state.endingReached).toBe(false);
    expect(state.unlockedEventIds).toContain(reassurance);
    const before = state.affection;
    state = play(state, reassurance, [1]);
    expect(state.affection).toBe(before + 2);
    expect(startDate(state, reassurance)).toBe(state);
    expect(canConfessSuccessfully(state)).toBe(false);
    state = play(state, night, [0, 2]);
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
    let state = { ...toWalk(), trust: 0 };
    expect(canConfessSuccessfully(state)).toBe(false);
    const transcript: string[] = [];
    state = play(state, confession, [1], transcript);
    expect(state.confessionStatus).toBe("rejected");
    expect(state.memories).toContain("milano_cafe_first_joke_refresh");
    expect(transcript.join("\n")).toContain("豆に宛先を書く");
    expect(transcript.join("\n")).not.toContain("ブレラでは");
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
  it("commits the ending and promise together only after its final line", () => {
    let state = lowPath();
    expect(canConfessSuccessfully(state)).toBe(true);
    state = startDate(state, confession);
    while (!state.activeDate!.frame.choices.length)
      state = advanceDate(state, state.revision);
    const choiceRevision = state.revision;
    state = chooseDate(state, 0, choiceRevision);
    expect(chooseDate(state, 0, choiceRevision)).toBe(state);
    while (!state.activeDate!.frame.ended)
      state = advanceDate(state, state.revision);
    expect(state.endingReached).toBe(false);
    expect(state.memories).not.toContain("milano_confession_promise");
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
