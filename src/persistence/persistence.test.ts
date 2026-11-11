import { seedCurrentFreeTime } from "../../tests/fixtures/current-game";
import { describe, expect, it, vi } from "vitest";
import { advanceDate, chooseDate, createGame, startDate, validateGameState, type GameState } from "../domain";
import { cityStart, completedCity } from "../dev/scenario-builders";
import { advanceEncounter, chooseEncounter, continueTourismEncounters, encounterCanFinish, finishEncounter } from "../domain/encounter";
import { beginTravelEvent, finishTravelEventIfComplete } from "../domain/travel-game";
import { meetEncounter } from "../../tests/fixtures/encounter-moment";
import { zodIssues } from "../../tests/fixtures/zod-issues";
// A date in progress saved in the first save format (schemaVersion 1).
import firstFormatSave from "../../tests/fixtures/save-format-v1.json";
import {
  backupAndCreate,
  deleteSaveData,
  LEARNING_KEY,
  loadGame,
  parseGameState,
  sameGameState,
  SAVE_KEY,
  saveGame,
  SUPPORTED_SAVE_VERSION,
  type StorageLike,
} from "./index";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

/** Play the stall with its first choice (ask: the bookmark) to its end; the trip goes on to the tower's guide. */
function finishStall(state: GameState): GameState {
  let next = state;
  for (let step = 0; next.activeEncounter && !next.activeEncounter.frame.choices.length && !next.activeEncounter.frame.ended; step++)
    next = advanceEncounter(next, next.revision);
  next = chooseEncounter(next, next.activeEncounter!.frame.choices[0].index, next.revision);
  for (let step = 0; !encounterCanFinish(next); step++) next = advanceEncounter(next, next.revision);
  return finishTravelEventIfComplete(next, continueTourismEncounters(next, finishEncounter(next, next.revision), () => 0));
}

describe("local save persistence", () => {
  it("round-trips negative trust and spark without changing game progress", () => {
    const storage = new MemoryStorage();
    const state = { ...createGame(), trust: -3, spark: -2 };
    expect(saveGame(storage, state).ok).toBe(true);
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
    expect(parseGameState(storage.getItem(SAVE_KEY)!)).toEqual(state);
  });

  it("distinguishes an empty slot from an unreadable save and preserves names", () => {
    const storage = new MemoryStorage();
    expect(loadGame(storage)).toEqual({ status: "empty" });
    const state = createGame("旅人", "小春");
    expect(saveGame(storage, state)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
    expect(parseGameState(storage.getItem(SAVE_KEY)!)).toEqual(state);
  });

  it.each([
    "{broken",
    "",
    "null",
    '{"schemaVersion":999}',
    JSON.stringify({ ...createGame(), ap: -1 }),
    JSON.stringify({ ...createGame(), ap: 999 }),
  ])("does not silently replace invalid data: %s", (raw) => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, raw);
    storage.setItem("unrelated.application", "keep me");
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    expect(storage.getItem("unrelated.application")).toBe("keep me");
  });

  it("distinguishes a newer version, malformed data, and unavailable storage", () => {
    const storage = new MemoryStorage();
    const newer = JSON.stringify({ ...createGame(), schemaVersion: createGame().schemaVersion + 1 });
    storage.setItem(SAVE_KEY, newer);
    expect(loadGame(storage)).toMatchObject({ status: "invalid", kind: "newer", raw: newer });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(newer);
    const malformed = JSON.stringify({ ...createGame(), revision: -1 });
    storage.setItem(SAVE_KEY, malformed);
    expect(loadGame(storage)).toMatchObject({ status: "invalid", kind: "corrupt", raw: malformed });
    expect(loadGame({ getItem: () => { throw new Error("unavailable"); }, setItem: () => {} }))
      .toMatchObject({ status: "invalid", kind: "storage", raw: null });
  });

  it("reports a journey-preparation draft in the game slot as unreadable, not as an old save", () => {
    const storage = new MemoryStorage();
    const draft = JSON.stringify({ kind: "journey_preparation", schemaVersion: 1, journeyId: "golden_triangle" });
    storage.setItem(SAVE_KEY, draft);
    expect(loadGame(storage)).toMatchObject({ status: "invalid", kind: "corrupt", raw: draft });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(draft);
  });

  it.each([
    ["the first", JSON.stringify({ ...firstFormatSave, activeDate: {
      ...firstFormatSave.activeDate, storyHash: "not-a-published-script",
    } })],
    ["the previous", JSON.stringify({ ...createGame(), schemaVersion: createGame().schemaVersion - 1 })],
  ])("keeps a save in %s older format without migrating or overwriting it", (_label, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, raw);
    const loaded = loadGame(storage);
    expect(loaded).toMatchObject({ status: "invalid", kind: "legacy", raw });
    expect(loaded.status === "invalid" && loaded.message).toContain("元のデータは残っています");
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });

  it("does not resume or overwrite a current-format date with a different story fingerprint", () => {
    const storage = new MemoryStorage();
    const started = startDate(seedCurrentFreeTime(createGame()), "milano_cafe_01");
    expect(started.activeDate).not.toBeNull();
    const raw = JSON.stringify({ ...started, activeDate: { ...started.activeDate, storyHash: "different-story" } });
    storage.setItem(SAVE_KEY, raw);
    expect(loadGame(storage)).toMatchObject({ status: "invalid", kind: "corrupt", raw });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });

  it("does not replace a newer tab's save while backing up a recovery snapshot", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "initial invalid save");
    const original = storage.getItem(SAVE_KEY);
    storage.setItem(SAVE_KEY, "updated in another tab");
    expect(backupAndCreate(storage, createGame(), original).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe("updated in another tab");
    expect([...storage.values.keys()].filter((key) => key.startsWith(`${SAVE_KEY}.backup.`))).toHaveLength(0);
  });

  it("backs up the exact raw save before explicit recovery, without touching unrelated data", () => {
    const storage = new MemoryStorage();
    const raw = '{"schemaVersion":2,"precious":"original data"}';
    storage.setItem(SAVE_KEY, raw);
    storage.setItem("another-game", "untouched");
    const replacement = createGame();
    expect(backupAndCreate(storage, replacement)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: replacement });
    const backups = [...storage.values.entries()].filter(([key]) =>
      key.startsWith(`${SAVE_KEY}.backup.`),
    );
    expect(backups).toHaveLength(1);
    expect(backups[0]?.[1]).toBe(raw);
    expect(storage.getItem("another-game")).toBe("untouched");
  });

  it("keeps both backups if recoveries share the same timestamp", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(123);
    try {
      const storage = new MemoryStorage();
      storage.setItem(SAVE_KEY, "first original");
      expect(backupAndCreate(storage, createGame()).ok).toBe(true);
      storage.setItem(SAVE_KEY, "second original");
      expect(backupAndCreate(storage, createGame()).ok).toBe(true);
      expect(storage.getItem(`${SAVE_KEY}.backup.123`)).toBe("first original");
      expect(storage.getItem(`${SAVE_KEY}.backup.123.1`)).toBe(
        "second original",
      );
    } finally {
      now.mockRestore();
    }
  });

  it("does not replace the active slot if the backup cannot be written", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "original");
    const blocked: StorageLike = {
      getItem: (key) => storage.getItem(key),
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(backupAndCreate(blocked, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe("original");
  });

  it("reports read permission errors without throwing or writing", () => {
    const setItem = vi.fn();
    const storage: StorageLike = {
      getItem: () => {
        throw new Error("access denied");
      },
      setItem,
    };
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw: null });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(backupAndCreate(storage, createGame()).ok).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("reports a failed save and leaves the previous snapshot intact", () => {
    const storage = new MemoryStorage();
    const previous = createGame();
    saveGame(storage, previous);
    const blocked: StorageLike = {
      getItem: (key) => storage.getItem(key),
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(
      saveGame(blocked, seedCurrentFreeTime(previous), previous),
    ).toMatchObject({
      ok: false,
      message: expect.stringContaining("空き容量"),
    });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: previous });
  });
});

describe("save format v22 (docs/07: one format per version, no migration)", () => {
  // A save as v13 wrote it: the same shape plus the completedChapters record v14 removed.
  const v13Save = () => JSON.stringify({ ...createGame(), schemaVersion: 13, completedChapters: ["milano"] });

  it("is the version every new game is written in", () => {
    expect(SUPPORTED_SAVE_VERSION).toBe(22);
    expect(createGame().schemaVersion).toBe(22);
  });

  it("round-trips a v22 save with a date in progress", () => {
    const storage = new MemoryStorage();
    const state = startDate(seedCurrentFreeTime(createGame("旅人", "小春")), "milano_cafe_01");
    expect(state.activeDate).not.toBeNull();
    expect(saveGame(storage, state)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({ schemaVersion: 22 });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
  });

  it("writes today's route of v21 (the night screen's map): empty in a new game, the places moved to today, and required", () => {
    const fresh = createGame();
    expect(fresh.travel.todayPlaceIds).toEqual([]);
    // The Duomo's episode walked to from the hotel: the route has the Duomo, and resumes with it.
    const moved = finishTravelEventIfComplete(fresh, beginTravelEvent(fresh, "milano_duomo_episode", "walk", fresh.revision));
    expect(moved.travel.currentPlaceId).not.toBe(fresh.travel.currentPlaceId);
    expect(moved.travel.todayPlaceIds).toEqual([moved.travel.currentPlaceId]);
    const storage = new MemoryStorage();
    expect(saveGame(storage, moved)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({ schemaVersion: 22, travel: { todayPlaceIds: moved.travel.todayPlaceIds } });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: moved });
    // A place of another city, or the same place twice in a row: refused.
    const route = (todayPlaceIds: string[]) => ({ ...fresh, travel: { ...fresh.travel, todayPlaceIds } });
    const there = moved.travel.currentPlaceId;
    expect(() => validateGameState(route(["delhi_red_fort"]))).toThrow("今日の行き先の記録が一致しません。");
    expect(() => validateGameState(route([there, there]))).toThrow("今日の行き先の記録が一致しません。");
    expect(validateGameState(route([there, fresh.travel.hotelPlaceId]))).toEqual(route([there, fresh.travel.hotelPlaceId]));
    // A save of this version without the field: not an old version, unreadable, kept as it is.
    const { todayPlaceIds: _today, ...olderTravel } = fresh.travel;
    const raw = JSON.stringify({ ...fresh, travel: olderTravel });
    const slot = new MemoryStorage();
    slot.setItem(SAVE_KEY, raw);
    expect(loadGame(slot)).toMatchObject({ status: "invalid", kind: "corrupt", raw });
    expect(slot.getItem(SAVE_KEY)).toBe(raw);
  });

  it("round-trips the condition records written in play, and keeps a save of this version without them as unreadable and untouched", () => {
    /** The encounter met in a new observation of its landmark and played with one option to its end. */
    const play = (initial: GameState, encounterId: string, optionId: string) => {
      let state = meetEncounter(initial, encounterId);
      for (let step = 0; state.activeEncounter; step++) {
        expect(step, `${encounterId}/${optionId}`).toBeLessThan(100);
        const active = state.activeEncounter;
        const choice = active.frame.choices.find((item) => item.optionId === optionId);
        state = choice ? chooseEncounter(state, choice.index, state.revision)
          : encounterCanFinish(state) ? finishEncounter(state, state.revision) : advanceEncounter(state, state.revision);
      }
      return state;
    };
    // Milan cleared; the Duomo's string put off, then taken (seen once, completed), the pick given at the Castello
    // (its use names the encounter and option), and tram rides counted (planted: the writer is pinned in
    // tests/journeys/milano/transport.test.ts).
    let state = play(play(play(completedCity("milano"), "duomo_string", "leave"), "duomo_string", "case"), "castello_pick", "give");
    expect(state.seenEncounterIds).toEqual(["duomo_string", "castello_pick"]);
    expect(state.completedEncounterIds).toEqual(["duomo_string", "castello_pick"]);
    expect(state.itemUses).toEqual({ blue_pick: { encounterId: "castello_pick", optionId: "give" } });
    state = { ...state, travel: { ...state.travel, rideCounts: { tram: 2 } } };
    const storage = new MemoryStorage();
    expect(saveGame(storage, state)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({ schemaVersion: 22, seenEncounterIds: state.seenEncounterIds,
      itemUses: state.itemUses, travel: { rideCounts: { tram: 2 } } });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
    // The shape development builds of v14 wrote before these records, with this version's number: not an old version, unreadable, kept as it is.
    const { seenEncounterIds: _seen, itemUses: _uses, ...older } = state;
    const { rideCounts: _rides, ...olderTravel } = state.travel;
    const raw = JSON.stringify({ ...older, travel: olderTravel });
    const slot = new MemoryStorage();
    slot.setItem(SAVE_KEY, raw);
    expect(loadGame(slot)).toMatchObject({ status: "invalid", kind: "corrupt", raw });
    expect(saveGame(slot, createGame()).ok).toBe(false);
    expect(slot.getItem(SAVE_KEY)).toBe(raw);
  });

  it("holds only declared flags in the story state (stage 3a), no lines, and an encounter's moment matching its slot", () => {
    const fresh = createGame();
    expect(fresh.storyProgress).toEqual({ lines: {}, flags: [] });
    expect(fresh.travel.temporaryFlags).toEqual([]);
    expect(validateGameState(JSON.parse(JSON.stringify(fresh)))).toEqual(fresh);
    const story = (storyProgress: unknown) => ({ ...fresh, storyProgress });
    expect(() => validateGameState(story({ lines: { smp_mihon_lili_line: "met" }, flags: [] }))).toThrow("物語の進行の記録が一致しません。");
    expect(() => validateGameState(story({ lines: {}, flags: ["smp_mihon_lili_drawing_talk"] }))).toThrow("物語の進行の記録が一致しません。");
    expect(() => validateGameState({ ...fresh, travel: { ...fresh.travel, temporaryFlags: ["smp_mihon_lili_just_met"] } }))
      .toThrow("この都市での物語の印の記録が一致しません。");
    // Malformed shapes are refused by the schema itself (pinned to its issues), before the emptiness rule above.
    for (const [shape, issue] of [
      [undefined, { code: "invalid_type", path: ["storyProgress"] }],
      [{ lines: {} }, { code: "invalid_type", path: ["storyProgress", "flags"] }],
      [{ lines: {}, flags: [], steps: {} }, { code: "unrecognized_keys", path: ["storyProgress"], keys: ["steps"] }],
      [{ lines: { a: "Bad" }, flags: [] }, { code: "invalid_format", path: ["storyProgress", "lines", "a"] }],
      [{ lines: { Bad: "a" }, flags: [] }, { code: "invalid_key", path: ["storyProgress", "lines", "Bad"] }],
      [{ lines: {}, flags: ["a", "a"] }, { code: "custom", path: ["storyProgress", "flags"] }],
      [{ lines: {}, flags: [""] }, { code: "too_small", path: ["storyProgress", "flags", 0] }],
    ] as const)
      expect(() => validateGameState(story(shape)), JSON.stringify(shape)).toThrow(zodIssues(issue));
    // An encounter in progress belongs to the moment record (stage 3b): started in it, at its landmark's visit, its
    // current step (or, met while observing, from the observation).
    const meeting = meetEncounter(completedCity("milano"), "duomo_string");
    expect(meeting.occasion).toMatchObject({ landmarkId: "duomo_milano", at: "main:observe", started: ["duomo_string"] });
    expect(validateGameState(JSON.parse(JSON.stringify(meeting)))).toEqual(meeting);
    const moment = (fields: object) => ({ ...meeting, occasion: { ...meeting.occasion!, ...fields } });
    // No moment at all: the shape of the removed free-time start.
    expect(() => validateGameState({ ...meeting, occasion: null })).toThrow("道中交流の時点の記録が一致しません。");
    expect(() => validateGameState(moment({ started: [] }))).toThrow("道中交流の時点の記録が一致しません。");
    expect(() => validateGameState(moment({ landmarkId: "galleria_vittorio_emanuele_ii" }))).toThrow(/一致しません。/u);
    expect(() => validateGameState(moment({ at: "left:observe" }))).toThrow("道中交流の時点の記録が一致しません。");
    // The record's shape is strict: refused by the schema before the moment check.
    expect(() => validateGameState(moment({ detour: { eventId: "milano_duomo_episode" } })))
      .toThrow(zodIssues({ code: "unrecognized_keys", path: ["occasion"], keys: ["detour"] }));
  });

  it("saves and resumes the sample tower's encounters before and after its main part when the event, battle and encounter match", () => {
    const resumed = (state: GameState) => {
      const storage = new MemoryStorage();
      expect(saveGame(storage, state).ok).toBe(true);
      expect(loadGame(storage)).toEqual({ status: "loaded", state });
    };
    // Before the main part (priority -1): the occasion of the trip to the tower's episode, with the map event still running.
    const stall = meetEncounter(cityStart("mihon"), "smp_mihon_bookmark_stall");
    expect(stall.occasion).toMatchObject({ eventId: "smp_mihon_main_clock_tower", landmarkId: "mihon_clock_tower", at: "smp_mihon_bookmark_stall", ran: [] });
    resumed(stall);
    const with_ = (state: GameState, fields: object) => ({ ...state, occasion: { ...state.occasion!, ...fields } });
    // Another event than the running one (the travel record refuses it first), a step not of this visit, another landmark.
    expect(() => validateGameState(with_(stall, { eventId: "smp_mihon_special_b_market" }))).toThrow("旅行の時間枠と進行中の場面が一致しません。");
    expect(() => validateGameState(with_(stall, { at: "main:battle" }))).toThrow("道中交流の時点の記録が一致しません。");
    expect(() => validateGameState(with_(stall, { ran: ["date"] }))).toThrow(/一致しません。/u);
    // After the main part (priority +1): the tower battle played, this encounter the occasion's step.
    const gift = meetEncounter(finishStall(stall), "smp_mihon_bookmark_gift");
    expect(gift.occasion).toMatchObject({ at: "smp_mihon_bookmark_gift" });
    expect(gift.occasion?.ran).toContain("battle");
    resumed(gift);
    expect(() => validateGameState(with_(gift, { started: ["smp_mihon_bookmark_stall"] }))).toThrow("道中交流の時点の記録が一致しません。");
    expect(() => validateGameState(with_(gift, { at: "smp_mihon_bookmark_stall" }))).toThrow("道中交流の時点の記録が一致しません。");
  });

  it("writes the tour records of v18 (tour stage 2a): empty in a new game, and required", () => {
    // The tour booked or running and the tours finished (src/persistence/tour-save.test.ts plays them through save and load).
    const fresh = createGame();
    expect(fresh.tour).toBeNull();
    expect(fresh.completedTourIds).toEqual([]);
    const storage = new MemoryStorage();
    expect(saveGame(storage, fresh)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({ schemaVersion: 22, tour: null, completedTourIds: [] });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: fresh });
    // A record of the wrong shape, or of a tour no content has, is refused.
    expect(() => validateGameState({ ...fresh, tour: { status: "planned", tourId: "milano_tour_none", offerId: "web", pricePaid: 0, bookedDay: 1 } }))
      .toThrow(/"path": \[\s*"tour",\s*"status"\s*\]|"tour"/u);
    expect(() => validateGameState({ ...fresh, tour: { status: "booked", tourId: "milano_tour_none", offerId: "web", pricePaid: 0, bookedDay: 1 } }))
      .toThrow("ツアーの記録が一致しません。");
    expect(() => validateGameState({ ...fresh, completedTourIds: ["milano_tour_none"] })).toThrow("ツアーの記録が一致しません。");
    // A save of this version without the fields: not an old version, unreadable, kept as it is.
    const { tour: _tour, completedTourIds: _finished, ...older } = fresh;
    const raw = JSON.stringify(older);
    const slot = new MemoryStorage();
    slot.setItem(SAVE_KEY, raw);
    expect(loadGame(slot)).toMatchObject({ status: "invalid", kind: "corrupt", raw });
    expect(saveGame(slot, createGame()).ok).toBe(false);
    expect(slot.getItem(SAVE_KEY)).toBe(raw);
  });

  it("writes the album of v22: empty in a new game, kept through save and load, and required", () => {
    // The photos the lines' # photo: took (src/domain/album.test.ts holds the recording rule and what an album may name).
    const fresh = createGame();
    expect(fresh.album).toEqual([]);
    const photo = { imageId: "smp_bg_mihon_market", cityId: "mihon", day: 1, minute: 600, placeId: "mihon_market", storyId: "tourism/smp_mihon_market_guide" };
    const state: GameState = { ...cityStart("mihon"), album: [photo, { ...photo, imageId: "smp_img_mihon_clock_tower", caption: "三時のまま",
      placeId: "mihon_clock_tower", storyId: "places/smp_mihon_clock_tower.smp_mihon_date_tower_square" }] };
    const storage = new MemoryStorage();
    expect(saveGame(storage, state)).toEqual({ ok: true });
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({ schemaVersion: 22, album: state.album });
    expect(loadGame(storage)).toEqual({ status: "loaded", state });
    // A photo this build cannot show (its image gone from the content): unreadable, kept as it is, never overwritten.
    const lost = JSON.stringify({ ...state, album: [{ ...photo, imageId: "smp_img_mihon_gone" }] });
    const lostSlot = new MemoryStorage();
    lostSlot.setItem(SAVE_KEY, lost);
    expect(loadGame(lostSlot)).toMatchObject({ status: "invalid", kind: "corrupt", raw: lost });
    expect(saveGame(lostSlot, state).ok).toBe(false);
    expect(lostSlot.getItem(SAVE_KEY)).toBe(lost);
    // A save of this version without the field: not an old version, unreadable, kept as it is.
    const { album: _album, ...older } = fresh;
    const raw = JSON.stringify(older);
    const slot = new MemoryStorage();
    slot.setItem(SAVE_KEY, raw);
    expect(loadGame(slot)).toMatchObject({ status: "invalid", kind: "corrupt", raw });
    expect(saveGame(slot, createGame()).ok).toBe(false);
    expect(slot.getItem(SAVE_KEY)).toBe(raw);
  });

  it("reports a v13 save as an identified old version, never migrates, overwrites or deletes it", () => {
    const storage = new MemoryStorage();
    const raw = v13Save();
    storage.setItem(SAVE_KEY, raw);
    expect(loadGame(storage)).toEqual({
      status: "invalid", kind: "legacy", raw,
      message: "保存データの形式はバージョン13です。現在のバージョンでは読み込めません。データの破損によって読み込めない場合もあります。元のデータは残っています。",
    });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    // Starting over is an explicit choice that keeps the old save as a backup.
    expect(backupAndCreate(storage, createGame(), raw)).toEqual({ ok: true });
    const backups = [...storage.values.entries()].filter(([key]) => key.startsWith(`${SAVE_KEY}.backup.`));
    expect(backups.map(([, value]) => value)).toEqual([raw]);
  });

  it("reports a v14 to v21 save of any journey as an identified old version and keeps it byte-identical", () => {
    // v15 switched the Golden Triangle's in-city transport (modes, routes, the Agra inn); v16 is the unified events' stage 3
    // (place files, tag effects, the dates' Ink turn); v17 is stage 5 (a battle as one flow: its Ink turns and the choices it
    // applied); v18 is the tour (its records filled, Fatehpur Sikri reached only on a tour); v19 is one battle form only (the
    // battle in progress has no scene name); v20 is a tour's leg moments (a running tour at a leg, its narration and the
    // occasion's tour step); v21 is today's route (the night screen's map); v22 is the album (the photos the lines' # photo:
    // took): a v14 to v21 save of every journey is old now (not migrated).
    for (const [journeyId, version] of [["milano", 14], ["golden_triangle", 14], ["milano", 15], ["golden_triangle", 15],
      ["milano", 16], ["golden_triangle", 16], ["milano", 17], ["golden_triangle", 17], ["milano", 18], ["golden_triangle", 18],
      ["milano", 19], ["golden_triangle", 19], ["milano", 20], ["golden_triangle", 20], ["milano", 21], ["golden_triangle", 21]] as const) {
      const storage = new MemoryStorage();
      const raw = JSON.stringify({ ...createGame(undefined, undefined, { journeyId }), schemaVersion: version });
      storage.setItem(SAVE_KEY, raw);
      expect(loadGame(storage)).toEqual({
        status: "invalid", kind: "legacy", raw,
        message: `保存データの形式はバージョン${version}です。現在のバージョンでは読み込めません。データの破損によって読み込めない場合もあります。元のデータは残っています。`,
      });
      expect(saveGame(storage, createGame()).ok).toBe(false);
      expect(storage.getItem(SAVE_KEY)).toBe(raw);
    }
  });

  it("leaves an unknown newer version (v23) unchanged", () => {
    const storage = new MemoryStorage();
    const raw = JSON.stringify({ ...createGame(), schemaVersion: 23 });
    storage.setItem(SAVE_KEY, raw);
    expect(loadGame(storage)).toMatchObject({ status: "invalid", kind: "newer", raw });
    expect(saveGame(storage, createGame()).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
  });
});

describe("multiple tabs sharing a save slot", () => {
  it("protects a newly created save when another tab started from an empty slot", () => {
    const storage = new MemoryStorage();
    const otherTab = createGame("先に保存", "あゆみ");
    const pending = { ...createGame("未保存", "あゆみ"), revision: 1 };
    expect(saveGame(storage, otherTab, null)).toEqual({ ok: true });
    expect(saveGame(storage, pending, null).ok).toBe(false);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: otherTab });
  });

  it("rejects an older manual save without restoring spent AP", () => {
    const storage = new MemoryStorage();
    const menu = seedCurrentFreeTime(createGame());
    saveGame(storage, menu);
    const started = startDate(menu, "milano_cafe_01");
    expect(saveGame(storage, started, menu)).toEqual({ ok: true });
    expect(saveGame(storage, menu)).toMatchObject({
      ok: false,
      message: expect.stringContaining("ロード"),
    });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: started });
    expect(started.ap).toBe(2);
  });

  it("rejects conflicting choices at the same revision and retains the first branch", () => {
    const storage = new MemoryStorage();
    let choice = startDate(seedCurrentFreeTime(createGame()), "milano_cafe_01");
    while (!choice.activeDate!.frame.choices.length)
      choice = advanceDate(choice, choice.revision);
    saveGame(storage, choice);
    const first = chooseDate(choice, 0, choice.revision);
    const second = chooseDate(choice, 1, choice.revision);
    expect(first.revision).toBe(second.revision);
    expect(saveGame(storage, first, choice)).toEqual({ ok: true });
    expect(saveGame(storage, second, choice).ok).toBe(false);
    expect(saveGame(storage, second).ok).toBe(false);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: first });
  });

  it("rejects a higher-revision branch whose expected prior snapshot is stale", () => {
    const storage = new MemoryStorage();
    const menu = seedCurrentFreeTime(createGame());
    saveGame(storage, menu);
    const first = startDate(menu, "milano_cafe_01");
    const staleNext = advanceDate(first, first.revision);
    saveGame(storage, first, menu);
    expect(saveGame(storage, staleNext, menu).ok).toBe(false);
    expect(loadGame(storage)).toEqual({ status: "loaded", state: first });
  });

  it("allows unchanged manual saves and repeated identical commits", () => {
    const storage = new MemoryStorage();
    const initial = createGame();
    saveGame(storage, initial);
    const completed = seedCurrentFreeTime(initial);
    expect(saveGame(storage, completed, initial)).toEqual({ ok: true });
    expect(saveGame(storage, completed)).toEqual({ ok: true });
    expect(saveGame(storage, completed, initial)).toEqual({ ok: true });
    expect(loadGame(storage)).toEqual({ status: "loaded", state: completed });
  });

  it("does not silently recreate a slot removed since the previous snapshot", () => {
    const storage = new MemoryStorage();
    const initial = createGame();
    expect(saveGame(storage, seedCurrentFreeTime(initial), initial).ok).toBe(
      false,
    );
    expect(loadGame(storage)).toEqual({ status: "empty" });
  });
});

describe("explicit save deletion", () => {
  it("compares the actual game contents independently of property order", () => {
    const state = createGame("旅人", "小春");
    const reordered = Object.fromEntries(Object.entries(state).reverse()) as typeof state;
    expect(JSON.stringify(state)).not.toBe(JSON.stringify(reordered));
    expect(sameGameState(state, reordered)).toBe(true);
    expect(sameGameState(state, { ...reordered, revision: state.revision + 1 })).toBe(false);
    expect(sameGameState(state, { ...reordered, trust: state.trust - 1 })).toBe(false);
  });

  it("removes only the confirmed game and learning slots", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "game");
    storage.setItem(LEARNING_KEY, "notes");
    storage.setItem(`${SAVE_KEY}.backup.123`, "backup");
    storage.setItem("unrelated", "keep");
    expect(
      deleteSaveData(storage, { game: "game", learning: "notes" }),
    ).toEqual({ ok: true });
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(LEARNING_KEY)).toBeNull();
    expect(storage.getItem(`${SAVE_KEY}.backup.123`)).toBe("backup");
    expect(storage.getItem("unrelated")).toBe("keep");
  });
  it.each([SAVE_KEY, LEARNING_KEY])("refuses a changed snapshot: %s", (key) => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "game");
    storage.setItem(LEARNING_KEY, "notes");
    storage.setItem(key, "changed");
    expect(
      deleteSaveData(storage, { game: "game", learning: "notes" }).ok,
    ).toBe(false);
    expect(storage.getItem(key)).toBe("changed");
    expect(
      storage.getItem(key === SAVE_KEY ? LEARNING_KEY : SAVE_KEY),
    ).not.toBeNull();
  });
  it("restores learning data if deleting the game slot fails", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, "game");
    storage.setItem(LEARNING_KEY, "notes");
    const blocked = {
      getItem: (key: string) => storage.getItem(key),
      setItem: (key: string, value: string) => storage.setItem(key, value),
      removeItem: (key: string) => {
        if (key === SAVE_KEY) throw new Error("blocked");
        storage.removeItem(key);
      },
    };
    expect(
      deleteSaveData(blocked, { game: "game", learning: "notes" }).ok,
    ).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe("game");
    expect(storage.getItem(LEARNING_KEY)).toBe("notes");
  });
});
