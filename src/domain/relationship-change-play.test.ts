import { describe, expect, it } from "vitest";
import { completedCity, rollTickets, startDateScene, withAp } from "../dev/scenario-builders";
import { advanceDate, chooseDate, finishDate, type GameState } from "./game";
import { describeRelationshipChange, relationshipChange } from "./relationship-change";

// The Debug-mode display on real dates (user decision 2026-11-08 ②): the change of a reply is
// exactly what the date saved for it (docs/03: the saved ticket fixes the reaction and the deltas).
const dateId = "milano_novecento_date_01";

/** Read the date on until it offers replies, or ends. */
function untilChoiceOrEnd(initial: GameState): GameState {
  let state = initial;
  for (let n = 0; n < 200 && state.activeDate && !state.activeDate.frame.choices.length && !state.activeDate.frame.ended; n++) {
    const previous = state;
    state = advanceDate(state, state.revision);
    // Reading on never changes the values or resolves a reply.
    expect(relationshipChange(previous, state)).toBeNull();
  }
  return state;
}

/** Play the whole date with the first reply each time; returns each reply's change and the finished state. */
function playDate(start: GameState) {
  const changes = [];
  let state = untilChoiceOrEnd(start);
  while (state.activeDate && !state.activeDate.frame.ended) {
    const before = state;
    state = chooseDate(state, state.activeDate.frame.choices[0].index, state.revision);
    changes.push({ before, after: state, change: relationshipChange(before, state) });
    state = untilChoiceOrEnd(state);
  }
  return { changes, last: state, finished: finishDate(state, state.revision) };
}

describe("relationship changes of a real date", () => {
  for (const [roll, ticket] of Object.entries(rollTickets)) {
    it(`equal the deltas, reaction and chance the date saved for each reply (${roll} ticket)`, () => {
      const start = startDateScene(withAp(completedCity("milano"), 12), dateId, ticket);
      const { changes, last, finished } = playDate(start);
      expect(changes.length).toBe(start.activeDate!.randomPlan.length);
      changes.forEach(({ after, change }, index) => {
        const saved = after.activeDate!.resolvedChoices[index];
        expect(change, `reply ${index + 1}`).not.toBeNull();
        expect(change!.reaction).toEqual({ result: saved.result, chancePercent: saved.chance });
        expect(change!.replay).toBe(false);
        const deltas = Object.entries(saved.deltas).filter(([, delta]) => delta !== 0);
        expect(change!.axes.map((item) => [item.axis, item.delta])).toEqual(deltas);
        for (const item of change!.axes) expect(item.after - item.before).toBe(item.delta);
        expect(describeRelationshipChange(change!)).toHaveLength(2);
      });
      // With ticket 0 every reply is positive and every positive range starts at +1: values change.
      if (roll === "positive") expect(changes.every(({ change }) => change!.axes.length > 0)).toBe(true);
      // Finishing the date changes stage or memories, never the three values.
      expect(relationshipChange(last, finished)).toBeNull();
    });
  }
});
