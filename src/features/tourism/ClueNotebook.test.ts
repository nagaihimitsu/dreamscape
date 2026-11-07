// The clue book's 「資料を読む」 and the exploration tests' action list take the readable
// documents from one rule (getReadableDocumentIds), so the list never offers a document the
// screen does not show.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { landmarks, tourismClues } from "../../content";
import { completedCity, openTourismScene } from "../../dev/scenario-builders";
import { listPlayerActions } from "../../domain/player-action";
import { discoverClue, getReadableDocumentIds, skipTourismGuide } from "../../domain/tourism";
import type { GameState } from "../../domain/game";
import { ClueNotebook } from "./ClueNotebook";

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
    const exploring = skipTourismGuide(guide, guide.revision);
    expect(getReadableDocumentIds(exploring)).toEqual(
      tourismClues.filter((clue) => clue.landmarkId === landmark.id && clue.kind === "document").map((clue) => clue.id));
  });

  it("are what the notebook lists and what the action list offers, until each is read", () => {
    const guide = openTourismScene(completedCity(landmark.cityId), landmark.id);
    let state = skipTourismGuide(guide, guide.revision);
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
