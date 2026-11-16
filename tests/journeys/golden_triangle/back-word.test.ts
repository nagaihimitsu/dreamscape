import { describe, expect, it } from "vitest";
import { dates } from "../../../src/content";
import { finishEpisode, newJourney, withAp, withRelationship } from "../../../src/dev/scenario-builders";
import { evaluateProgression } from "../../../src/domain/date-rules";
import { advanceDate, chooseDate, dateChoiceDisplay, finishDate, startDate, validateGameState, type GameState } from "../../../src/domain/game";

/**
 * The word she writes on the player's back at the Lotus Temple (2026-11-16, the user's decision): it cannot be read in
 * that scene, whatever the player answers; she tells it (『まだいたい』) on the rooftop on the night the relationship
 * begins. The player who answered 「読めなかった」 hears it as she promised (said aloud, not on the back); the others
 * hear it for the first time.
 */

/** Plays a date to its end, choosing the first open option of `prefer`, else the first open one; returns every line shown. */
function playDate(initial: GameState, dateId: string, prefer: readonly string[] = []): { state: GameState; lines: string[] } {
  const apCost = dates.find((date) => date.id === dateId)!.apCost;
  let state = startDate(apCost ? withAp(initial, apCost) : initial, dateId, () => 4500);
  expect(state.activeDate?.dateId).toBe(dateId);
  const lines: string[] = [];
  for (let step = 0; state.activeDate; step++) {
    expect(step).toBeLessThan(200);
    const active = state.activeDate;
    lines.push(active.frame.text, ...active.frame.choices.map((choice) => choice.text));
    if (active.frame.ended) state = finishDate(state, state.revision);
    else if (active.frame.choices.length) {
      const open = active.frame.choices.filter((choice) => dateChoiceDisplay(state, choice.index).show === "open");
      const choice = open.find((item) => prefer.includes(item.optionId ?? "")) ?? open[0];
      state = chooseDate(state, choice.index, state.revision);
    } else state = advanceDate(state, state.revision);
  }
  return { state, lines };
}

const LOTUS = "gt_delhi_date_lotus_temple";
/** The written word, or a reading of it, in any form. */
const WORD = /まだ、?いたい|また、?いたい/u;
/** The values that give an accepted confession (romance/progression.json; rooftop-dates.test.ts). */
const ACCEPTED = { affection: 8, trust: 4, spark: 4 };

/** Delhi after its first sightseeing, the given dates played (the Lotus Temple's with `answer`), the confession accepted at 19:00. */
function acceptedConfession(withLotus: boolean, answer?: string): { lotus: string[]; confession: string[] } {
  let state = finishEpisode(newJourney("golden_triangle"), "gt_delhi_main_red_fort");
  let lotus: string[] = [];
  if (withLotus) ({ state, lines: lotus } = playDate(state, LOTUS, answer ? [answer] : []));
  const others = dates.filter((date) => date.chapterId === "delhi" && date.kind === "normal" && date.id !== LOTUS).map((date) => date.id);
  for (const dateId of others.slice(0, withLotus ? 2 : 3)) state = playDate(state, dateId).state;
  state = evaluateProgression(withRelationship(state, ACCEPTED));
  state = validateGameState({ ...state, travel: { ...state.travel, minute: 19 * 60 } });
  const { state: after, lines: confession } = playDate(state, "gt_delhi_date_confession");
  expect(after.confessionStatus).toBe("accepted");
  return { lotus, confession };
}

describe("Golden Triangle: the word on the back (Lotus Temple)", () => {
  it("offers answers that never name the word", () => {
    const { lines } = playDate(finishEpisode(newJourney("golden_triangle"), "gt_delhi_main_red_fort"), LOTUS);
    expect(lines).toContain("……で。最後の、読めた？");
    for (const answer of ["「読めたよ。……でも、内緒」", "「『ひま』の続き？」", "「読めなかった」"]) expect(lines).toContain(answer);
  }, 60_000);

  it.each([
    ["bluff_read", "書いたときは、声に出す勇気がなかったの。……はい、言った。じゃあ、次はそっちの番"],
    ["guess_tease", "書いたときは、声に出す勇気がなかったの。……はい、言った。じゃあ、次はそっちの番"],
    ["couldnt_read", "背中じゃなくて、声で言うって約束したから。……はい、言った。じゃあ、次はそっちの番"],
  ])("cannot be read at the temple after %s, and is told on the rooftop the night it begins", (answer, told) => {
    const { lotus, confession } = acceptedConfession(true, answer);
    expect(lotus.filter((line) => WORD.test(line))).toEqual([]);
    expect(confession.some((line) => line.includes("『まだいたい』"))).toBe(true);
    expect(confession).toContain(told);
  }, 120_000);

  it("is not told on a rooftop by a player who never went to the Lotus Temple", () => {
    const { confession } = acceptedConfession(false);
    expect(confession.filter((line) => WORD.test(line))).toEqual([]);
  }, 120_000);
});
