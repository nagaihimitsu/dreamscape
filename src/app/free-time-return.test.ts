// Debug's 「移動画面に戻る（Debug）」 (user decision 2026-11-11): the last free-time state is remembered
// while Debug mode is on, offered from any other screen, and put back whole with a newer revision.
import { describe, expect, it } from "vitest";
import { landmarks, tourismClues } from "../content";
import { completedCity, openTourismScene } from "../dev/scenario-builders";
import { validateGameState } from "../domain/game";
import { screenFor } from "../domain/screen";
import { discoverClue, getReadableDocumentIds, skipTourismGuide } from "../domain/tourism";
import { canReturnToFreeTime, freeTimeReturnState, nextFreeTimeReturn } from "./free-time-return";

// A landmark with documents to read (as the clue book's test picks it), visited from free time after its city's clear.
const landmark = landmarks.find((item) => tourismClues.some((clue) => clue.landmarkId === item.id && clue.kind === "document"))!;
const journeyId = "this_journey";
const free = completedCity(landmark.cityId);
const guide = openTourismScene(free, landmark.id);
const exploring = skipTourismGuide(guide, guide.revision);
const observed = discoverClue(exploring, getReadableDocumentIds(exploring)[0], exploring.revision);

describe("Debug's return to the free-time screen", () => {
  it("remembers the free-time state on screen and keeps it through the scenes after it", () => {
    expect(screenFor(free)).toBe("free_time");
    const point = nextFreeTimeReturn(null, free, journeyId, true);
    expect(point).toEqual({ journeyId, state: free });
    expect(nextFreeTimeReturn(point, guide, journeyId, true)).toBe(point);
    expect(nextFreeTimeReturn(point, observed, journeyId, true)).toBe(point);
    // A later free-time state replaces it.
    expect(nextFreeTimeReturn(point, { ...free, revision: free.revision + 1 }, journeyId, true)?.state.revision).toBe(free.revision + 1);
  });

  it("remembers nothing while Debug mode is off, before the journey begins, or from another journey", () => {
    const point = nextFreeTimeReturn(null, free, journeyId, true);
    expect(nextFreeTimeReturn(point, guide, journeyId, false)).toBeNull();
    expect(nextFreeTimeReturn(null, free, journeyId, false)).toBeNull();
    expect(nextFreeTimeReturn(point, null, journeyId, true)).toBeNull();
    expect(nextFreeTimeReturn(point, guide, "another_journey", true)).toBeNull();
  });

  it("is offered on the other screens only, with Debug mode on and a point of this journey", () => {
    const point = nextFreeTimeReturn(null, free, journeyId, true);
    expect(canReturnToFreeTime(point, guide, journeyId, true)).toBe(true);
    expect(canReturnToFreeTime(point, observed, journeyId, true)).toBe(true);
    expect(canReturnToFreeTime(point, free, journeyId, true)).toBe(false);
    expect(canReturnToFreeTime(point, guide, journeyId, false)).toBe(false);
    expect(canReturnToFreeTime(point, guide, "another_journey", true)).toBe(false);
    expect(canReturnToFreeTime(null, guide, journeyId, true)).toBe(false);
    expect(canReturnToFreeTime(point, null, journeyId, true)).toBe(false);
  });

  it("puts the free-time state back whole, after the current revision", () => {
    const point = nextFreeTimeReturn(null, free, journeyId, true)!;
    const back = freeTimeReturnState(point, observed);
    expect(back.revision).toBe(observed.revision + 1);
    expect({ ...back, revision: free.revision }).toEqual(free);
    expect(back.activeTourism).toBeNull();
    expect(back.discoveredClueIds).toEqual(free.discoveredClueIds);
    expect(back.travel).toEqual(free.travel);
    expect(screenFor(back)).toBe("free_time");
    expect(validateGameState(back)).toEqual(back);
  });
});
