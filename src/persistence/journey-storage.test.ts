import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGame } from "../domain";
import { cityContents, getCityContent } from "../content";
import { getJourney } from "../content/journeys";
import { backupAndCreate, deleteSaveData, LEARNING_KEY, loadGame, SAVE_KEY, saveGame } from "./index";
import { journeyStorage, storagePhysicalKey } from "./journey-storage";
import { journeyDraftStartParameters, loadJourneyDraft, promoteJourneyDraft, saveJourneyDraft } from "./journey-preparation";

function memoryStorage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); } };
}

describe("independent journey saves", () => {
  let restorePreparation: () => void;
  beforeEach(() => {
    // Preparation semantics use an explicit unfinished fixture even after the
    // authored India journey becomes available to actual players.
    const journey = getJourney("golden_triangle")!;
    const journeyStatus = journey.status;
    const city = getCityContent("delhi").city;
    const cityStatus = city.productionStatus;
    journey.status = "preparing";
    city.productionStatus = "prototype";
    restorePreparation = () => { journey.status = journeyStatus; city.productionStatus = cityStatus; };
  });
  afterEach(() => restorePreparation());
  it("rejects wrong-journey or unknown-city saves in either slot without replacing or deleting them", () => {
    const base = memoryStorage();
    const milan = journeyStorage(base, "milano");
    const india = journeyStorage(base, "golden_triangle");
    const milanState = createGame("ミラノ", "あゆみ");
    const hotel = getCityContent("delhi").travelSettings.hotelPlaceId;
    const indiaState = { ...createGame("旅人", "小春"), currentCityId: "delhi", travelBudget: 30_000,
      travel: { ...milanState.travel, currentPlaceId: hotel, hotelPlaceId: hotel } };
    for (const [slot, wrong, right] of [[india, milanState, indiaState], [milan, indiaState, milanState]] as const) {
      const raw = JSON.stringify(wrong);
      slot.setItem(SAVE_KEY, raw);
      slot.setItem(LEARNING_KEY, "notes");
      expect(loadGame(slot)).toMatchObject({ status: "invalid", kind: "journey", raw });
      expect(saveGame(slot, wrong).ok).toBe(false);
      expect(saveGame(slot, right).ok).toBe(false);
      expect(backupAndCreate(slot, right, raw).ok).toBe(false);
      expect(deleteSaveData(slot, { game: raw, learning: "notes" }).ok).toBe(false);
      expect(slot.getItem(SAVE_KEY)).toBe(raw);
      expect(slot.getItem(LEARNING_KEY)).toBe("notes");
    }
    const unknown = JSON.stringify({ ...indiaState, currentCityId: "unknown_city" });
    india.setItem(SAVE_KEY, unknown);
    expect(loadGame(india)).toMatchObject({ status: "invalid", kind: "journey", raw: unknown });
    expect(saveGame(india, { ...indiaState, currentCityId: "unknown_city" }).ok).toBe(false);
    expect(backupAndCreate(india, indiaState, unknown).ok).toBe(false);
    expect(india.getItem(SAVE_KEY)).toBe(unknown);
  });

  it("gives Milan its own journey slots and leaves unprefixed keys untouched", () => {
    const base = memoryStorage();
    const milan = journeyStorage(base, "milano");
    base.setItem(SAVE_KEY, "unprefixed save");
    base.setItem(LEARNING_KEY, "unprefixed notes");
    expect(storagePhysicalKey(milan, SAVE_KEY)).toBe("dreamscape.journey.milano.save.v1");
    expect(storagePhysicalKey(milan, LEARNING_KEY)).toBe("dreamscape.journey.milano.learning.v1");
    expect(storagePhysicalKey(milan, `${SAVE_KEY}.backup.1`)).toBe("dreamscape.journey.milano.save.v1.backup.1");
    expect(loadGame(milan)).toEqual({ status: "empty" });
    const state = createGame("ミラノ", "あゆみ");
    expect(saveGame(milan, state)).toEqual({ ok: true });
    expect(base.getItem("dreamscape.journey.milano.save.v1")).not.toBeNull();
    expect(deleteSaveData(milan, { game: milan.getItem(SAVE_KEY), learning: null }).ok).toBe(true);
    expect(base.getItem(SAVE_KEY)).toBe("unprefixed save");
    expect(base.getItem(LEARNING_KEY)).toBe("unprefixed notes");
    // Milan has no preparation stage; its slot never holds a draft.
    expect(saveJourneyDraft(milan, "旅人", "小春").ok).toBe(false);
    expect(loadGame(milan)).toEqual({ status: "empty" });
  });

  it("preserves the Milan save and learning slots while creating the India preparation", () => {
    const base = memoryStorage();
    const milan = journeyStorage(base, "milano");
    const india = journeyStorage(base, "golden_triangle");
    const state = createGame("ミラノ", "あゆみ");
    expect(saveGame(milan, state)).toEqual({ ok: true });
    milan.setItem(LEARNING_KEY, "milan notes");
    const original = milan.getItem(SAVE_KEY);
    expect(saveJourneyDraft(india, "  旅人  ", "小春")).toEqual({ ok: true });
    expect(milan.getItem(SAVE_KEY)).toBe(original);
    expect(loadGame(milan)).toEqual({ status: "loaded", state });
    expect(milan.getItem(LEARNING_KEY)).toBe("milan notes");
    const loaded = loadJourneyDraft(india);
    expect(loaded.status).toBe("loaded");
    if (loaded.status !== "loaded") throw new Error("Expected India draft");
    expect(loaded.draft).toMatchObject({ currentCityId: "delhi", travelBudget: null, ap: 0, affection: 0,
      trust: 0, spark: 0, confessionStatus: "none", memories: [], claimedRewardIds: [],
      travel: { day: 1, minute: 540, hotelPlaceId: null, currentPlaceId: null } });
    expect(journeyDraftStartParameters(loaded.draft)).toMatchObject({ journeyId: "golden_triangle", cityId: "delhi", playerName: "旅人", heroineName: "小春",
      initialState: { ap: 0, pendingAp: 0, affection: 0, trust: 0, spark: 0 } });
    expect(promoteJourneyDraft(india, loaded.raw).ok).toBe(false);
    expect(india.getItem(SAVE_KEY)).toBe(loaded.raw);
    expect(() => createGame("旅人", "小春", { journeyId: "golden_triangle" })).toThrow("Journey is not ready: golden_triangle");
    india.setItem(LEARNING_KEY, "india notes");
    expect(milan.getItem(LEARNING_KEY)).toBe("milan notes");
    expect(india.getItem(LEARNING_KEY)).toBe("india notes");
    expect(storagePhysicalKey(milan, LEARNING_KEY)).not.toBe(storagePhysicalKey(india, LEARNING_KEY));
  });

  it("never overwrites a corrupt, newer, or concurrently created preparation", () => {
    const base = memoryStorage();
    const india = journeyStorage(base, "golden_triangle");
    for (const raw of ["broken", '{"kind":"journey_preparation","schemaVersion":2}', '{"schemaVersion":999}']) {
      india.setItem(SAVE_KEY, raw);
      expect(loadJourneyDraft(india)).toMatchObject({ status: "invalid", raw });
      expect(saveJourneyDraft(india, "名前", "名前").ok).toBe(false);
      expect(india.getItem(SAVE_KEY)).toBe(raw);
    }
    india.removeItem(SAVE_KEY);
    expect(saveJourneyDraft(india, "一人目", "名前").ok).toBe(true);
    const first = india.getItem(SAVE_KEY);
    expect(saveJourneyDraft(india, "二人目", "名前").ok).toBe(false);
    expect(india.getItem(SAVE_KEY)).toBe(first);
    expect(saveJourneyDraft(base, "名前", "名前").ok).toBe(false);
  });

  it("isolates backups, deletion, and concurrent snapshot checks", () => {
    const base = memoryStorage();
    const milan = journeyStorage(base, "milano");
    const india = journeyStorage(base, "golden_triangle");
    expect(saveGame(milan, createGame()).ok).toBe(true);
    expect(saveJourneyDraft(india, "旅人", "小春").ok).toBe(true);
    const indiaSnapshot = india.getItem(SAVE_KEY);
    india.setItem(LEARNING_KEY, "india notes");
    expect(backupAndCreate(milan, createGame("別名", "小春"), milan.getItem(SAVE_KEY)).ok).toBe(true);
    expect(india.getItem(SAVE_KEY)).toBe(indiaSnapshot);
    expect(deleteSaveData(india, { game: "stale", learning: "india notes" }).ok).toBe(false);
    expect(deleteSaveData(india, { game: indiaSnapshot, learning: "india notes" }).ok).toBe(true);
    expect(loadGame(milan).status).toBe("loaded");
    expect([...base.data.keys()].some((key) => key.startsWith("dreamscape.journey.milano.save.v1.backup."))).toBe(true);
  });

  it("promotes saved names and initial values only after real city registration is available", () => {
    const base = memoryStorage();
    const india = journeyStorage(base, "golden_triangle");
    const journey = getJourney("golden_triangle")!;
    const previousStatus = journey.status;
    const previousBudget = journey.initialBudget;
    const previousInitial = journey.initialState;
    const previousDelhi = cityContents.delhi;
    try {
      expect(saveJourneyDraft(india, "旅人", "小春").ok).toBe(true);
      const draft = loadJourneyDraft(india);
      if (draft.status !== "loaded") throw new Error("Expected a draft");
      // Fixture only: control city availability separately from release data.
      const fixture = structuredClone(getCityContent("milano"));
      fixture.city.id = "delhi";
      fixture.travel.cityId = "delhi";
      cityContents.delhi = fixture;
      journey.status = "available";
      journey.initialState = { ...previousInitial!, ap: 5 };
      expect(promoteJourneyDraft(india, "stale").ok).toBe(false);
      expect(india.getItem(SAVE_KEY)).toBe(draft.raw);
      expect(promoteJourneyDraft(india, draft.raw)).toEqual({ ok: true });
      const result = loadGame(india);
      expect(result.status).toBe("loaded");
      if (result.status !== "loaded") throw new Error("Expected a game");
      expect(result.state).toMatchObject({ currentCityId: "delhi", playerName: "旅人", heroineName: "小春",
        travelBudget: 30_000, ap: 0, memories: [], claimedRewardIds: [], completedCityIds: [] });
      expect(result.state.travel.calendar).toEqual({ journeyDay: 1, cityStartJourneyDay: 1, startWeekday: 0 });
      expect(promoteJourneyDraft(india, draft.raw).ok).toBe(false);
    } finally {
      if (previousDelhi) cityContents.delhi = previousDelhi;
      else delete cityContents.delhi;
      journey.status = previousStatus;
      journey.initialBudget = previousBudget;
      journey.initialState = previousInitial;
    }
  });

  it("validates journey IDs and names", () => {
    const base = memoryStorage();
    expect(() => journeyStorage(base, "../milano")).toThrow("Invalid journey ID");
    const india = journeyStorage(base, "golden_triangle");
    expect(saveJourneyDraft(india, "  ", "名前").ok).toBe(false);
    expect(saveJourneyDraft(india, "あ".repeat(25), "名前").ok).toBe(false);
    expect(loadJourneyDraft(india).status).toBe("empty");
  });
});
