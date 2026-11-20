import { landmarks, tourismClues, type TourismClue } from "../../content";

export interface NotebookClueScope {
  /** The landmark whose clues the book reads (a visit's, a battle's). */
  landmarkId?: string;
  /** A city finale's book: every landmark of the city. */
  cityId?: string;
  discoveredIds: readonly string[];
  /** The documents listed for reading now (getReadableDocumentIds). */
  readableDocumentIds?: readonly string[];
  /** A reasoning quiz's case file: listed and read whether found or not. */
  caseClueIds?: readonly string[];
  /** The clues to read from (a battle's own version of them); every journey's by default. */
  clues?: readonly TourismClue[];
}

/** The clues the clue book lists: its place's found ones, the documents listed for reading now and a reasoning quiz's case file. */
export function notebookClues({ landmarkId, cityId, discoveredIds, readableDocumentIds = [], caseClueIds, clues = tourismClues }: NotebookClueScope) {
  const places = cityId ? landmarks.filter((item) => item.cityId === cityId).map((item) => item.id) : [landmarkId];
  return clues.filter((clue) => places.includes(clue.landmarkId) &&
    (discoveredIds.includes(clue.id) || readableDocumentIds.includes(clue.id) || !!caseClueIds?.includes(clue.id)));
}

/**
 * Of those, the ones whose words the book shows (outside a reasoning quiz an unread document shows only its title and
 * 「資料を読む」): ≡メニュー's 「画面の出典」 lists their sources (2026-11-20 user decision).
 */
export function shownNotebookClues(scope: NotebookClueScope) {
  const listed = notebookClues(scope);
  return scope.caseClueIds ? listed : listed.filter((clue) => scope.discoveredIds.includes(clue.id));
}
