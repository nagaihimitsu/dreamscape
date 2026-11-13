import { describe, expect, it } from "vitest";
import { cityStart, openTourismScene } from "../dev/scenario-builders";
import { lineWordsOnScreen } from "../features/learning/local-words";
import { validateGameState, type GameState } from "./game";
import { metTerms, recordGlossaryTerms, termsAdded, termsToShow } from "./glossary";
import { applyPlayerAction, playerActionChange, type PlayerAction } from "./player-action";

// 旅の図鑑's recording rule (src/domain/glossary.ts, 2026-11-13): the terms a line's # term: names go into the save's
// 旅の図鑑 the first time the line is on screen, once per save, and the card shows only for what an action added, not
// while 高速送り passes the line. On the sample journey's market guide (fictional): its second line names the
// fictional 三時パン.

const TERM = "smp_term_mihon_sanji_pan";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const act = (state: GameState, action: PlayerAction) => applyPlayerAction(state, playerActionChange(action, () => 0), () => 0);
/** The market's guide at its first line (no term yet). */
const guideStart = () => openTourismScene(cityStart("mihon"), "mihon_market");
/** A state whose line on screen (the market guide's) names these terms. */
function lineNaming(termIds: string[] | undefined, state = guideStart()): GameState {
  const active = state.activeTourism!;
  const { termIds: _terms, ...frame } = active.frame!;
  return { ...state, activeTourism: { ...active, frame: termIds ? { ...frame, termIds } : frame } };
}

describe("旅の図鑑's recording rule", () => {
  it("starts empty in a new game; the guide's first line names no term", () => {
    const start = guideStart();
    expect(start.glossary).toEqual([]);
    expect(start.activeTourism?.frame?.termIds).toBeUndefined();
  });

  it("puts the term of the line an action brings in 旅の図鑑, and the card shows it, the first time only", () => {
    const start = guideStart();
    const named = act(start, { kind: "guide_next" });
    expect(named.activeTourism?.frame?.termIds).toEqual([TERM]);
    expect(named.glossary).toEqual([TERM]);
    expect(termsAdded(start, named)).toEqual([TERM]);
    // Saved and resumed, the term stays and the line on screen adds nothing again.
    const resumed = restore(named);
    expect(resumed.glossary).toEqual([TERM]);
    expect(recordGlossaryTerms(resumed)).toBe(resumed);
    // Read again (the guide from its start): the same line comes back, 旅の図鑑 is unchanged, no card.
    let again = act(named, { kind: "guide_next" });
    while (again.activeTourism?.phase === "guide") again = act(again, { kind: "guide_next" });
    again = act(again, { kind: "guide_again" });
    const before = again;
    again = act(again, { kind: "guide_next" });
    expect(again.activeTourism?.frame?.termIds).toEqual([TERM]);
    expect(again.glossary).toEqual([TERM]);
    expect(termsAdded(before, again)).toEqual([]);
  });

  it("adds a term once wherever else it is tagged, keeps the order met, and takes no revision of its own", () => {
    const first = recordGlossaryTerms(lineNaming([TERM]));
    expect(first.glossary).toEqual([TERM]);
    expect(first.revision).toBe(guideStart().revision);
    // The same term tagged on another line, twice on a line: nothing new.
    const other = lineNaming([TERM, TERM], first);
    expect(recordGlossaryTerms(other)).toBe(other);
  });

  it("puts nothing in without a term on screen, nor a term the save's journey does not have", () => {
    const plain = lineNaming(undefined);
    expect(recordGlossaryTerms(plain)).toBe(plain);
    const free = cityStart("mihon");
    expect(recordGlossaryTerms(free)).toBe(free);
    const foreign = lineNaming(["gt_term_golgappa"]);
    expect(recordGlossaryTerms(foreign)).toBe(foreign);
  });

  it("is applied to the snapshot an action leaves, never after an action that changed nothing", () => {
    const plain = lineNaming(undefined);
    const shown = lineNaming([TERM]);
    expect(applyPlayerAction(plain, () => ({ ...shown, revision: plain.revision + 1 }), () => 0).glossary).toEqual([TERM]);
    expect(applyPlayerAction(shown, (current) => current, () => 0)).toBe(shown);
  });

  it("takes two terms of one line in the tags' order, so their cards show one after the other in that order", () => {
    // A second term of the sample journey for this case (the sample's catalog has one).
    const terms = [{ id: TERM, journeyId: "sample_trip" }, { id: "smp_term_mihon_braid", journeyId: "sample_trip" }];
    const start = lineNaming(undefined);
    const both = recordGlossaryTerms(lineNaming(["smp_term_mihon_braid", TERM], start), terms);
    expect(both.glossary).toEqual(["smp_term_mihon_braid", TERM]);
    expect(termsToShow(termsAdded(start, both), false)).toEqual(["smp_term_mihon_braid", TERM]);
    // One of them met before: only the other is added and shown.
    const one = recordGlossaryTerms(lineNaming(["smp_term_mihon_braid", TERM], recordGlossaryTerms(lineNaming([TERM]), terms)), terms);
    expect(one.glossary).toEqual([TERM, "smp_term_mihon_braid"]);
  });

  it("takes the term of a line that also teaches a word of the country, and leaves the word to its own record", () => {
    const start = guideStart();
    const active = start.activeTourism!;
    const line = { ...start, activeTourism: { ...active, frame: { ...active.frame!, termIds: [TERM], localWordIds: ["smp_mihon_word_trisol"] } } };
    const recorded = recordGlossaryTerms(line);
    expect(recorded.glossary).toEqual([TERM]);
    // The word is learned from the line on screen as before (this device's record, not the save); its notice waits for
    // the card to close (src/features/learning/local-words.test.ts).
    expect(lineWordsOnScreen(recorded)).toEqual(["smp_mihon_word_trisol"]);
    expect(termsToShow(termsAdded(start, recorded), false)).toEqual([TERM]);
  });

  it("shows the card of what an action added, but not while 高速送り passes the line (the term is in 旅の図鑑 all the same)", () => {
    const start = guideStart();
    const named = act(start, { kind: "guide_next" });
    const added = termsAdded(start, named);
    expect(termsToShow(added, false)).toEqual([TERM]);
    expect(termsToShow(added, true)).toEqual([]);
    expect(named.glossary).toEqual([TERM]);
    expect(termsToShow([], false)).toEqual([]);
  });
});

describe("a saved 旅の図鑑", () => {
  it("is optional: a save written before 旅の図鑑 loads with nothing met", () => {
    const { glossary: _glossary, ...older } = guideStart();
    const loaded = restore(older as GameState);
    expect(loaded.glossary).toBeUndefined();
    expect(metTerms(loaded)).toEqual([]);
    // Its first term starts the field.
    expect(recordGlossaryTerms(lineNaming([TERM], loaded)).glossary).toEqual([TERM]);
  });

  it("names only terms of the save's journey, each once", () => {
    const met = recordGlossaryTerms(lineNaming([TERM]));
    expect(() => restore({ ...met, glossary: ["smp_term_gone"] })).toThrow("旅の図鑑の言葉の参照先が見つかりません。");
    expect(() => restore({ ...met, glossary: [TERM, TERM] })).toThrow();
    expect(() => restore({ ...met, glossary: ["Not An ID"] })).toThrow();
  });
});
