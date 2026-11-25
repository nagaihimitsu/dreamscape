// The clue book's 「資料を読む」 and the exploration tests' action list take the readable
// documents from one rule (getReadableDocumentIds), so the list never offers a document the
// screen does not show.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { battles, landmarks, tourismClues } from "../../content";
import { completedCity, openTourismScene } from "../../dev/scenario-builders";
import { readGuide } from "../../../tests/fixtures/read-guide";
import { listPlayerActions } from "../../domain/player-action";
import { discoverClue, getReadableDocumentIds } from "../../domain/tourism";
import type { GameState } from "../../domain/game";
import { ClueNotebook } from "./ClueNotebook";
import { shownNotebookClues } from "./notebook-clues";

const landmark = landmarks.find((item) => tourismClues.some((clue) => clue.landmarkId === item.id && clue.kind === "document"))!;
const isDocument = (id: string) => tourismClues.find((clue) => clue.id === id)?.kind === "document";
/** The documents the action list offers to read. */
const offeredDocuments = (state: GameState) =>
  listPlayerActions(state).flatMap((action) => action.kind === "discover" && isDocument(action.clueId) ? [action.clueId] : []);
/** The notebook as GameApp renders it for `state`: the clues it lists and the documents with 「資料を読む」. */
function notebook(state: GameState) {
  const markup = renderToStaticMarkup(createElement(ClueNotebook, {
    landmarkId: state.activeTourism?.landmarkId, discoveredIds: state.discoveredClueIds,
    readableDocumentIds: getReadableDocumentIds(state), onDiscoverDocument: () => true, onClose: () => {},
  }));
  return {
    listed: [...markup.matchAll(/<option value="([^"]+)"/gu)].map((match) => match[1]),
    readButtons: [...markup.matchAll(/data-testid="read-document-([^"]+)"/gu)].map((match) => match[1]),
  };
}

describe("the documents a player can read in an observation", () => {
  it("are the landmark's documents while it is observed, and none during the guide", () => {
    const guide = openTourismScene(completedCity(landmark.cityId), landmark.id);
    expect(guide.activeTourism?.phase).toBe("guide");
    expect(getReadableDocumentIds(guide)).toEqual([]);
    expect(offeredDocuments(guide)).toEqual([]);
    const exploring = readGuide(guide);
    expect(getReadableDocumentIds(exploring)).toEqual(
      tourismClues.filter((clue) => clue.landmarkId === landmark.id && clue.kind === "document").map((clue) => clue.id));
  });

  it("are what the notebook lists and what the action list offers, until each is read", () => {
    const guide = openTourismScene(completedCity(landmark.cityId), landmark.id);
    let state = readGuide(guide);
    state = { ...state, discoveredClueIds: state.discoveredClueIds.filter((id) => !isDocument(id)) };
    const readable = getReadableDocumentIds(state);
    expect(readable.length).toBeGreaterThan(0);
    const shown = notebook(state);
    expect(shown.listed.filter(isDocument)).toEqual(readable);
    expect(offeredDocuments(state)).toEqual(readable);
    // The notebook opens on its first clue: 「資料を読む」 when that is an unread document.
    expect(shown.readButtons).toEqual(isDocument(shown.listed[0]) ? [shown.listed[0]] : []);

    state = discoverClue(state, readable[0], state.revision);
    expect(notebook(state).listed.filter(isDocument)).toEqual(readable);
    expect(offeredDocuments(state)).toEqual(readable.slice(1));
  });
});

describe("a reasoning quiz's clue book (2026-11-20 user decision)", () => {
  const battle = battles.find((item) => item.reasoning && item.landmarkId)!;
  const caseClueIds = battle.reasoning!.caseClueIds;
  const markup = renderToStaticMarkup(createElement(ClueNotebook, {
    landmarkId: battle.landmarkId!, discoveredIds: [], onClose: () => {},
    reasoning: { caseClueIds, claimText: "今朝、決まった運休です", selectedIds: [], maxSelections: 1, selectionEnabled: true,
      canToggle: () => true, onSelect: () => {} },
  }));

  it("quotes the claim with no question after it (no English, nothing naming the clue that answers it)", () => {
    expect(markup).toContain("相手の主張");
    expect(markup).toContain("今朝、決まった運休です");
    expect(markup).not.toContain('lang="en"');
  });

  it("leaves its clues' sources to 「画面の出典」, which lists those of the whole case file, found or not", () => {
    expect(markup).not.toContain("根拠と解釈");
    expect(markup).not.toContain("<a ");
    expect(shownNotebookClues({ landmarkId: battle.landmarkId!, discoveredIds: [], caseClueIds }).map((clue) => clue.id).sort())
      .toEqual([...caseClueIds].sort());
    // Outside a reasoning quiz, an unread document shows only its title: its sources are not listed.
    expect(shownNotebookClues({ landmarkId: battle.landmarkId!, discoveredIds: [], readableDocumentIds: caseClueIds })).toEqual([]);
  });
});
