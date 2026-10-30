import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import { describe, expect, it } from "vitest";
import { dates, progression, trialMilestones } from "../content";
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
) {
  expect(getDateAvailability(state, dateId), dateId).toMatchObject({
    available: true,
  });
  state = startDate(state, dateId);
  let steps = 0;
  while (state.activeDate) {
    if (++steps > 100) throw Error("Runaway story");
    const before = state;
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    expect(state).toEqual(before);
    const active = state.activeDate!;
    transcript.push(active.frame.text);
    if (active.frame.ended) state = finishDate(state, state.revision);
    else if (active.frame.choices.length)
      state = chooseDate(state, selections[active.choiceCount], state.revision);
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
  return play(toWalk(), walk, [0, 1]);
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
  it("keeps the next date funded rather than counting inaccessible future milestones", () => {
    let state = toWalk();
    expect(state.ap).toBe(6);
    state = play(state, cafe, [2, 2]);
    expect(state.ap).toBe(4);
    expect(getDateAvailability(state, cafe).available).toBe(false);
    expect(startDate(state, cafe)).toBe(state);
    state = play(state, walk, [0, 1]);
    expect(state.ap).toBe(1);
    state = claimTrialMilestone(state, trialMilestones[1].id);
    state = play(state, invitation, [0]);
    state = play(state, night, [0, 1]);
    expect(state.romanceStage).toBe(4);
  });
  it("unlocks a single heroine invitation for free and recalls earlier choices", () => {
    const initial = toWalk();
    expect(startDate(initial, invitation)).toBe(initial);
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
    expect(completed.affection).toBe(state.affection + 1);
    expect(startDate(completed, invitation)).toBe(completed);
    expect(transcript.join("\n")).toContain(getMemoryCallback(state));
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
          const completed = play(state, id, [first, second]);
          expect(completed.affection).toBeGreaterThanOrEqual(before + 2);
          expect(completed.memories.length).toBe(state.memories.length + 2);
          expect(completed.ap).toBe(
            state.ap - dates.find((date) => date.id === id)!.apCost,
          );
        });
      }
  }
});

describe("confession and relationship ending", () => {
  it("keeps confession locked until stage and required events, without charging AP", () => {
    const incomplete = toInvitation();
    expect(startDate(incomplete, confession)).toBe(incomplete);
    const ready = lowPath();
    expect(getDateAvailability(ready, confession).available).toBe(true);
    expect(canConfessSuccessfully(ready)).toBe(false);
    const started = startDate(ready, confession);
    expect(started.ap).toBe(ready.ap);
    expect(startDate(started, confession)).toBe(started);
  });
  it("lets the lowest-affection route recover from deferral and earn the ending exactly once", () => {
    let state = lowPath();
    expect(state.affection).toBe(7);
    const ap = state.ap;
    state = play(state, confession, [0]);
    expect(state.confessionStatus).toBe("deferred");
    expect(state.endingReached).toBe(false);
    expect(state.unlockedEventIds).toContain(reassurance);
    const before = state.affection;
    state = play(state, reassurance, [2]);
    expect(state.affection).toBe(before + 1);
    expect(startDate(state, reassurance)).toBe(state);
    expect(canConfessSuccessfully(state)).toBe(true);
    state = play(state, confession, [0]);
    expect(state.confessionStatus).toBe("accepted");
    expect(state.endingReached).toBe(true);
    expect(
      state.memories.filter((id) => id === "milano_confession_promise"),
    ).toHaveLength(1);
    expect(state.ap).toBe(ap);
    expect(finishDate(state, state.revision)).toBe(state);
    expect(startDate(state, confession)).toBe(state);
    expect(validateGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it("requires sincere expression even when affection is sufficient, then permits free retry", () => {
    let state = play(seedLegacyChapter(createGame()), cafe, [2, 1]);
    state = claimTrialMilestone(state, trialMilestones[0].id);
    state = play(state, walk, [1, 0]);
    state = play(state, invitation, [1]);
    state = claimTrialMilestone(state, trialMilestones[1].id);
    state = play(state, night, [1, 0]);
    expect(canConfessSuccessfully(state)).toBe(true);
    const transcript: string[] = [];
    state = play(state, confession, [1], transcript);
    expect(state.confessionStatus).toBe("deferred");
    expect(transcript.join("\n")).toContain(getMemoryCallback(state));
    state = play(state, confession, [2]);
    expect(state.endingReached).toBe(true);
    expect(
      state.memories.filter((id) => id === "milano_confession_promise"),
    ).toHaveLength(1);
  });
  it("commits the ending and promise together only after its final line", () => {
    let state = lowPath();
    state = play(state, confession, [0]);
    state = play(state, reassurance, [0]);
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
