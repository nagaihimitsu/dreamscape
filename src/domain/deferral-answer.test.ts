import { describe, expect, it } from "vitest";
import { dates, progression } from "../content";
import { decidesConfession } from "../content/schemas";
import { canConfessSuccessfully, confessionResult, createGame, deferralAnswer, validateGameState, type GameState } from "./game";
import { decidingOutcome } from "./date-rules";

/**
 * Her answer to a deferred confession (a date of kind `answer`; 2026-11-13): a pure rule of the relationship state.
 * She says yes exactly when the confession's success condition holds (romance/progression.json), else a final
 * "not as lovers, for now" (`rejected`): never random, never another deferral.
 */

const need = progression.confession;
/** Milan's first ordinary dates, recorded as played: the experience the confession counts. */
const ordinary = dates.filter((date) => date.kind === "normal" && date.chapterId === "milano").map((date) => date.id);
function relationship(values: Pick<GameState, "affection" | "trust" | "spark">, completed = need.minCompletedDates): GameState {
  return validateGameState({ ...createGame(), ...values, playedDateIds: ordinary.slice(0, completed) });
}
const enough = { affection: need.minAffection, trust: need.minTrust, spark: need.minSpark };

describe("her answer to a deferral (deferralAnswer)", () => {
  it("says yes exactly when the confession would succeed: each value and the shared dates at their minimum", () => {
    expect(deferralAnswer(relationship(enough))).toBe("accepted");
    expect(deferralAnswer(relationship({ ...enough, affection: need.minAffection - 1 }))).toBe("rejected");
    expect(deferralAnswer(relationship({ ...enough, trust: need.minTrust - 1 }))).toBe("rejected");
    expect(deferralAnswer(relationship({ ...enough, spark: need.minSpark - 1 }))).toBe("rejected");
    expect(deferralAnswer(relationship(enough, need.minCompletedDates - 1))).toBe("rejected");
  });

  it("is never another deferral: where a confession would defer, she says not now", () => {
    const deferring = relationship({ affection: 4, trust: 2, spark: 0 });
    expect(confessionResult(deferring)).toBe("deferred");
    expect(deferralAnswer(deferring)).toBe("rejected");
  });

  it("follows the success condition over the whole range, the same every time (no randomness)", () => {
    for (let affection = -2; affection <= need.minAffection + 2; affection++)
      for (let trust = -2; trust <= need.minTrust + 2; trust++)
        for (let spark = -2; spark <= need.minSpark + 2; spark++) {
          const state = relationship({ affection, trust, spark });
          const answer = deferralAnswer(state);
          expect(answer).toBe(canConfessSuccessfully(state) ? "accepted" : "rejected");
          expect(deferralAnswer(state)).toBe(answer);
        }
  });

  it("is the outcome her answer fixes when it starts; a confession fixes its own (decidingOutcome)", () => {
    const deferring = relationship({ affection: 4, trust: 2, spark: 0 });
    expect(decidingOutcome(deferring, { kind: "answer" })).toBe("rejected");
    expect(decidingOutcome(deferring, { kind: "confession" })).toBe("deferred");
    expect(decidingOutcome(relationship(enough), { kind: "answer" })).toBe("accepted");
  });

  it("is decided like a confession: a confession and her answer decide the confession status, no other date does", () => {
    expect(["confession", "answer"].every((kind) => decidesConfession({ kind }))).toBe(true);
    expect(["normal", "special", "reassurance"].some((kind) => decidesConfession({ kind }))).toBe(false);
  });
});
