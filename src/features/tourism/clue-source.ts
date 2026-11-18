import { landmarks, sceneGivenClueIds, tourismClues, type TourismClue } from "../../content";
import type { GameState } from "../../domain/game-state-schema";
import { screenFor } from "../../domain/screen";

// Where 手がかり帳 says a clue came from (2026-11-18), and the word the game says when a clue is recorded. A clue some scene
// gives (`# clue:`, `# on_done: clue`) was heard in conversation: the book says so instead of the observation's words and
// shows no landmark photo with it (the photo stands for what an observation looked at). The saved records do not keep how a
// clue was recorded, so a clue a scene gives reads as heard even when an observation found it.

/** Whether 手がかり帳 shows the clue as heard in conversation (a scene gives it). */
export const isHeardClue = (clueId: string, given: ReadonlySet<string> = sceneGivenClueIds()) => given.has(clueId);

/** The small heading over a clue's title (ClueDetails): heard, a document card, or what an observation found. */
export const clueKindLabel = (clue: Pick<TourismClue, "kind">, heard: boolean) =>
  heard ? "会話で聞いたこと" : clue.kind === "document" ? "資料カード" : "観察での発見";

/** The mark on a clue in a reasoning battle's book: a case file not found yet, heard in conversation, or observed. */
export const caseProvenanceLabel = (discovered: boolean, heard: boolean) =>
  !discovered ? "ケース資料" : heard ? "会話で聞いた" : "観察済み";

/** Where a clue came from in a city finale's book (every landmark of the city): heard in conversation, or its landmark's name. */
export const cityProvenanceLabel = (clue: Pick<TourismClue, "landmarkId">, heard: boolean) =>
  heard ? "会話で聞いた" : landmarks.find((item) => item.id === clue.landmarkId)?.nameJa;

/**
 * Whether the observation is on screen (its own button gleams for a clue it finds), by the screen the state shows: no scene
 * runs over it, and a quiz the player left for it (「観光に戻って調べる」, its activeBattle kept underneath) stays behind it.
 */
const observing = (state: GameState) => screenFor(state) === "tourism" && state.activeTourism?.phase === "exploring";

/**
 * The word for the clues the player's last action recorded in 手がかり帳, outside the observation (3.11): a date, a walk or a
 * scene has no button that gleams, and a player without sound or vibration would learn nothing otherwise. Null when no clue
 * was recorded or the observation was on screen.
 */
export function clueRecordedNotice(previous: GameState, next: GameState): string | null {
  const added = next.discoveredClueIds.filter((id) => !previous.discoveredClueIds.includes(id));
  if (!added.length || observing(previous)) return null;
  if (added.length > 1) return `手がかり帳に${added.length}件を記録しました。`;
  const title = tourismClues.find((clue) => clue.id === added[0])?.titleJa;
  return title ? `手がかり帳に「${title}」を記録しました。` : "手がかり帳に記録しました。";
}
