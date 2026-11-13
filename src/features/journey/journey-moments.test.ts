// The journey's moments (2026-11-11 user decision; journey-moments.ts): the title card as an episode begins, the recap of a
// resumed game, the packing of a departure and the credit roll at the end of a journey, as pure rules over the game.
import { describe, expect, it } from "vitest";
import { episodes, landmarks, scenes, storyState, tourismAssets } from "../../content";
import { cityStart, completedCity, finishEpisode, openEpilogueScene, playEpisodeToResult, readEpilogue } from "../../dev/scenario-builders";
import type { AlbumPhoto } from "../../domain/album-state";
import { leaveForNextCity } from "../../domain/city-travel";
import { startEpisode } from "../../domain/chapter";
import type { GameState } from "../../domain/game";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "../../domain/player-action";
import { advanceTourismGuide } from "../../domain/tourism";
import { beginTravelEvent } from "../../domain/travel-game";
import {
  chapterStampOf, completedEpisodeId, departureLuggage, endRollOf, episodeTitleCard, journeyEnded, openingEpisodeId, packingOf, resumeRecap,
} from "./journey-moments";
import { formatTravelTime } from "./travel-time";

const roll = () => 0;
const CLOCK_TOWER = "smp_mihon_main_clock_tower";
const DUOMO = "milano_duomo_episode";
const episode = (id: string) => episodes.find((item) => item.id === id)!;
/** Two photos of the sample's album, its illustrations (album.test.ts holds what an album may name). */
const photos: AlbumPhoto[] = [
  { imageId: "smp_album_market", cityId: "mihon", day: 1, minute: 600, placeId: "mihon_market", storyId: "places/smp_mihon_market.smp_mihon_market_guide" },
  { imageId: "smp_album_clock_tower", caption: "三時のまま", cityId: "mihon", day: 1, minute: 660, placeId: "mihon_clock_tower",
    storyId: "places/smp_mihon_clock_tower.smp_mihon_date_tower_square" },
];

describe("the title card as an episode begins", () => {
  it("shows once, as the episode's first part opens after the inserted scenes before it, never while they run", () => {
    // The sample tower: the trip's stall comes first (priority -1), then the guide; played with the first action each time.
    const start = cityStart("mihon");
    const go = listPlayerActions(start).find((action) => action.kind === "travel" && action.eventId === CLOCK_TOWER)!;
    expect(go).toBeDefined();
    let state = applyPlayerAction(start, playerActionChange(go, roll), roll);
    expect(state.activeEncounter?.encounterId).toBe("smp_mihon_bookmark_stall");
    expect(openingEpisodeId(start, state)).toBeNull();
    const opened: { id: string; screen: string }[] = [];
    for (let step = 0; !state.completedEpisodeIds.includes(CLOCK_TOWER); step++) {
      expect(step, "the tower's episode did not end").toBeLessThan(300);
      const next = applyPlayerAction(state, playerActionChange(listPlayerActions(state)[0], roll), roll);
      const id = openingEpisodeId(state, next);
      if (id) opened.push({ id, screen: next.activeTourism ? `tourism:${next.activeTourism.phase}` : next.activeBattle ? "battle" : "other" });
      state = next;
    }
    expect(opened).toEqual([{ id: CLOCK_TOWER, screen: "tourism:guide" }]);
  });

  it("shows for a map departure that opens the guide at once, and for an episode started without its moment", () => {
    const start = cityStart("milano");
    const there = beginTravelEvent(start, DUOMO, "walk", start.revision, roll);
    expect(there.activeTourism).toMatchObject({ landmarkId: episode(DUOMO).landmarkId, phase: "guide" });
    expect(openingEpisodeId(start, there)).toBe(DUOMO);
    // Reading on is no new start.
    expect(openingEpisodeId(there, advanceTourismGuide(there, there.revision))).toBeNull();
    const direct = startEpisode(start, DUOMO);
    expect(direct.activeTourism?.landmarkId).toBe(episode(DUOMO).landmarkId);
    expect(openingEpisodeId(start, direct)).toBe(DUOMO);
  });

  it("does not show for a completed episode (a replay or a retry), nor for a load (no change)", () => {
    const start = cityStart("milano");
    const there = beginTravelEvent(start, DUOMO, "walk", start.revision, roll);
    expect(openingEpisodeId(start, { ...there, completedEpisodeIds: [DUOMO] })).toBeNull();
    expect(openingEpisodeId(there, there)).toBeNull();
  });

  it("names the episode's title, its landmark and photo, or the city of a finale", () => {
    const start = cityStart("mihon", ["航", "澪"]);
    const tower = episode(CLOCK_TOWER);
    const landmark = landmarks.find((item) => item.id === tower.landmarkId)!;
    expect(episodeTitleCard(start, CLOCK_TOWER)).toEqual({
      episodeId: CLOCK_TOWER, titleJa: tower.titleJa, placeJa: landmark.nameJa, finale: false,
      photo: tourismAssets.find((asset) => asset.id === landmark.imageAssetId),
    });
    expect(episodeTitleCard(start, "smp_mihon_finale")).toMatchObject({ titleJa: episode("smp_mihon_finale").titleJa, placeJa: "見本の街", finale: true });
    expect(episodeTitleCard(start, "smp_mihon_none")).toBeNull();
    const written = tower.titleJa;
    tower.titleJa = "{player_name}と{heroine_name}の三時";
    try {
      expect(episodeTitleCard(start, CLOCK_TOWER)?.titleJa).toBe("航と澪の三時");
    } finally {
      tower.titleJa = written;
    }
  });
});

describe("the recap of a resumed game", () => {
  it("is none before an episode is completed", () => {
    expect(resumeRecap(cityStart("mihon"))).toBeNull();
  });

  it("tells where and when, the last episode completed and the album's latest photo, the author's illustration with no credit", () => {
    const done = finishEpisode(cityStart("mihon", ["航", "澪"]), CLOCK_TOWER);
    const tower = episode(CLOCK_TOWER);
    const recap = resumeRecap(done)!;
    expect(recap).toMatchObject({
      cityJa: "見本の街", whenJa: `${done.travel.day}日目 ${formatTravelTime(done.travel.minute)}`,
      chapter: { titleJa: tower.clearTitleJa, descriptionJa: tower.clearDescriptionJa },
    });
    expect(recap.chapter.cityJa).toBeUndefined();
    expect(resumeRecap({ ...done, album: [] })?.photo).toBeUndefined();
    const withPhotos = resumeRecap({ ...done, album: photos })!;
    expect(withPhotos.photo).toEqual({ imageId: "smp_album_clock_tower", path: "assets/album/smp_album_clock_tower.webp", altJa: "三時のまま",
      caption: "三時のまま", whenJa: "1日目 11:00", placeJa: expect.any(String), cityId: "mihon", cityJa: "見本の街" });
    // Without a caption, its alternative text is 「思い出の絵」.
    expect(resumeRecap({ ...done, album: [photos[0]] })?.photo).toMatchObject({ path: "assets/album/smp_album_market.webp", altJa: "思い出の絵" });
    // The names are filled in.
    const written = tower.clearDescriptionJa;
    tower.clearDescriptionJa = "{heroine_name}は三時の針を見上げた。";
    try {
      expect(resumeRecap(done)?.chapter.descriptionJa).toBe("澪は三時の針を見上げた。");
    } finally {
      tower.clearDescriptionJa = written;
    }
  });

  it("names the city of the last episode when the party has moved on since", () => {
    const agra = cityStart("agra");
    const last = episode(agra.completedEpisodeIds.at(-1)!);
    expect(last.cityId).toBe("delhi");
    expect(resumeRecap(agra)).toMatchObject({ cityJa: "アーグラ", chapter: { titleJa: last.clearTitleJa, cityJa: "デリー" } });
  });
});

describe("the packing of a departure", () => {
  it("puts the held items that go along in the suitcase and sets apart those left behind; nothing else", () => {
    const cleared = completedCity("agra");
    // Kamla's memo is carried through the journey; the petha stays in Agra; the photo was left in Delhi before; the attar was given.
    const leaving: GameState = { ...cleared, inventory: {
      gt_delhi_kamla_memo: "held", gt_agra_anwar_petha: "held", gt_delhi_family_photo: "left_behind", gt_delhi_rain_attar: "gifted",
    } };
    const arrived = leaveForNextCity(leaving);
    expect(arrived.currentCityId).toBe("jaipur");
    expect(packingOf(leaving, arrived)).toEqual({
      fromCityJa: "アーグラ", toCityJa: "ジャイプール",
      carried: [{ id: "gt_delhi_kamla_memo", nameJa: "カムラの段ボールのメモ" }],
      left: [{ id: "gt_agra_anwar_petha", nameJa: "ペーター" }],
    });
  });

  it("is none without a departure or without a held item", () => {
    const cleared = completedCity("delhi");
    const empty: GameState = { ...cleared, inventory: {} };
    expect(packingOf(empty, leaveForNextCity(empty))).toBeNull();
    expect(packingOf(cleared, cleared)).toBeNull();
  });
});

describe("the departure dialog's items (「{都市}へ出発」)", () => {
  it("lists before leaving what the packing will carry on and what it will leave in the city", () => {
    const cleared = completedCity("agra");
    const leaving: GameState = { ...cleared, inventory: {
      gt_delhi_kamla_memo: "held", gt_agra_anwar_petha: "held", gt_delhi_family_photo: "left_behind", gt_delhi_rain_attar: "gifted",
    } };
    const luggage = departureLuggage(leaving);
    expect(luggage).toEqual({
      carried: [{ id: "gt_delhi_kamla_memo", nameJa: "カムラの段ボールのメモ" }],
      left: [{ id: "gt_agra_anwar_petha", nameJa: "ペーター" }],
    });
    // The same split the departure makes (leaveForNextCity, then the packing).
    const packed = packingOf(leaving, leaveForNextCity(leaving))!;
    expect(luggage).toEqual({ carried: packed.carried, left: packed.left });
  });

  it("is empty when nothing is held, and keeps only the part that has an item", () => {
    const cleared = completedCity("agra");
    expect(departureLuggage({ ...cleared, inventory: {} })).toEqual({ carried: [], left: [] });
    expect(departureLuggage({ ...cleared, inventory: { gt_delhi_rain_attar: "gifted", gt_agra_anwar_petha: "held" } }))
      .toEqual({ carried: [], left: [{ id: "gt_agra_anwar_petha", nameJa: "ペーター" }] });
  });
});

describe("the stamp 「完」 as an episode ends", () => {
  it("names the episode the change completed, once; a change that completes nothing names none", () => {
    const start = cityStart("mihon", ["航", "澪"]);
    const result = playEpisodeToResult(start, CLOCK_TOWER);
    // Completed at the battle's result (the stamp waits for the next screen: useJourneyMoments).
    expect(result.completedEpisodeIds).toContain(CLOCK_TOWER);
    expect(completedEpisodeId(start, result)).toBe(CLOCK_TOWER);
    expect(completedEpisodeId(result, result)).toBeNull();
    // Leaving the result completes nothing more.
    const done = finishEpisode(start, CLOCK_TOWER);
    expect(completedEpisodeId(result, done)).toBeNull();
  });

  it("takes the last of several completed at once, and leaves out an ID that is no episode", () => {
    const before = { completedEpisodeIds: [] };
    expect(completedEpisodeId(before, { completedEpisodeIds: [CLOCK_TOWER, "smp_mihon_finale"] })).toBe("smp_mihon_finale");
    expect(completedEpisodeId(before, { completedEpisodeIds: [CLOCK_TOWER, "not_an_episode"] })).toBe(CLOCK_TOWER);
  });

  it("stamps the episode's title with the names filled in", () => {
    const game = cityStart("mihon", ["航", "澪"]);
    const tower = episode(CLOCK_TOWER);
    expect(chapterStampOf(game, CLOCK_TOWER)).toEqual({ episodeId: CLOCK_TOWER, titleJa: tower.titleJa });
    expect(chapterStampOf(game, "not_an_episode")).toBeNull();
    const written = tower.titleJa;
    tower.titleJa = "{heroine_name}と三時の塔";
    try {
      expect(chapterStampOf(game, CLOCK_TOWER)?.titleJa).toBe("澪と三時の塔");
    } finally {
      tower.titleJa = written;
    }
  });
});

describe("the credit roll at the end of a journey", () => {
  let played: { cleared: GameState; ended: GameState } | undefined;
  /** The sample's only city cleared, then its epilogue read: the end of the journey. */
  const journey = () => {
    if (!played) {
      const cleared = completedCity("mihon", { names: ["航", "澪"] });
      played = { cleared, ended: readEpilogue(openEpilogueScene(cleared)) };
    }
    return played;
  };

  it("starts as the journey ends, once", () => {
    const { cleared, ended } = journey();
    expect(journeyEnded(cleared, ended)).toBe(true);
    expect(journeyEnded(ended, ended)).toBe(false);
    expect(journeyEnded(cityStart("mihon"), cleared)).toBe(false);
  });

  it("names the two, then each city with its clear titles in the order completed, the people met and its photos", () => {
    const { ended } = journey();
    const lili = storyState.people.find((person) => person.id === "smp_mihon_lili")!;
    const liliScene = scenes.find((scene) => scene.people.includes(lili.id))!;
    expect(liliScene).toBeDefined();
    const state: GameState = { ...ended, album: photos, seenEncounterIds: [...ended.seenEncounterIds.filter((id) => id !== liliScene.id), liliScene.id] };
    const endRoll = endRollOf(state);
    expect(endRoll).toMatchObject({ journeyJa: "見本の旅", playerName: "航", heroineName: "澪" });
    expect(endRoll.cities.map((city) => city.id)).toEqual(["mihon"]);
    const [city] = endRoll.cities;
    expect(city.nameJa).toBe("見本の街");
    expect(city.chapters).toEqual(state.completedEpisodeIds.map((id) => episode(id).clearTitleJa));
    expect(city.chapters).toHaveLength(2);
    expect(city.people).toContain(lili.nameJa);
    expect(city.photos.map((photo) => photo.imageId)).toEqual(photos.map((photo) => photo.imageId));
    // A person whose scene was not seen is not in it.
    const unseen = { ...state, seenEncounterIds: state.seenEncounterIds.filter((id) => !scenes.some((scene) => scene.id === id && scene.people.includes(lili.id))) };
    expect(endRollOf(unseen).cities[0].people).not.toContain(lili.nameJa);
  });
});
