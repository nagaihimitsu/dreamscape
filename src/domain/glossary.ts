import { glossaryTerms, type ListedTerm } from "../content";
import { getJourneyForCity } from "../content/journeys";
import { lineOnScreen } from "./album";
import type { GameState } from "./game-state-schema";

// 旅の図鑑 (2026-11-13 user decision): a line's `# term:` puts the terms it names in the save's 旅の図鑑 the first time the
// line is on screen in a game, as the album takes a line's photo (album.ts). Pure rules: the game's action
// (applyPlayerAction) and a new game's start record, so a term is met once per save: a re-read, a reload, a replayed
// guide, a resumed save or another line with the same tag (an author may tag every place a term can first appear) never
// adds it again. GameApp shows the card of what an action added (termsAdded). Debug plays in its own memory storage
// (src/dev/DebugMode.tsx), so nothing it records reaches the normal save.

/** The terms of the save's 旅の図鑑, in the order met (a save written before 旅の図鑑 has none). */
export const metTerms = (state: Pick<GameState, "glossary">): readonly string[] => state.glossary ?? [];

/** The journey of the save's city (its terms are the ones its 旅の図鑑 may hold). */
const journeyOf = (state: Pick<GameState, "currentCityId">) => getJourneyForCity(state.currentCityId)?.id;

/**
 * The state with the terms of the line on screen added to 旅の図鑑, in the line's order (two tags on a line: their cards
 * show one after the other in that order): a term of the save's journey not met before (`terms`: the content's). The
 * state comes back unchanged when the line names none, or only terms met already (or of no term of the journey). Called
 * on the snapshot an action leaves (no revision of its own).
 */
export function recordGlossaryTerms(state: GameState, terms: readonly Pick<ListedTerm, "id" | "journeyId">[] = glossaryTerms): GameState {
  const named = lineOnScreen(state)?.frame.termIds;
  if (!named?.length) return state;
  const met = metTerms(state);
  const journeyId = journeyOf(state);
  const fresh = [...new Set(named)].filter((id) => !met.includes(id) &&
    terms.some((term) => term.id === id && term.journeyId === journeyId));
  return fresh.length ? { ...state, glossary: [...met, ...fresh] } : state;
}

/**
 * The terms an action has just put in 旅の図鑑 (those of `next` that `previous` did not have, in order), for their card
 * (GameApp); none when it put none. Only an action adds a term once a game runs (a load, a new game or Debug's return is
 * no action).
 */
export function termsAdded(previous: Pick<GameState, "glossary">, next: Pick<GameState, "glossary">): string[] {
  const before = new Set(metTerms(previous));
  return metTerms(next).filter((id) => !before.has(id));
}

/**
 * The terms whose card shows after an action: those it added (termsAdded), none while 高速送り passes the line on screen
 * (`skipping`): they are in 旅の図鑑 all the same, without their card. GameApp asks once the line is drawn, so 高速送り
 * that stops at this (unread) line shows the card.
 */
export const termsToShow = (added: readonly string[], skipping: boolean): string[] => (skipping ? [] : [...added]);

/**
 * A saved 旅の図鑑 names only terms this build has for the save's journey, as the save's other references do. Otherwise
 * the save is not loaded and its data is kept (persistence loadGame).
 */
export function validateGlossary(state: GameState): void {
  const journeyId = journeyOf(state);
  for (const id of metTerms(state))
    if (!glossaryTerms.some((term) => term.id === id && term.journeyId === journeyId))
      throw new Error("旅の図鑑の言葉の参照先が見つかりません。");
}
