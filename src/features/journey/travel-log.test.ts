// 旅の記録 (2026-11-19 user decision: 旅の記録 and アルバム made one; reshaped 2026-11-20; travel-log.ts): 「体験」, city by
// city (each thing lived with its place's photo and her few words looking back), and 「写真」 (the album, the newest first).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { episodes, getCityContent } from "../../content";
import { cityStart, finishEpisode, startDateScene, withAp } from "../../dev/scenario-builders";
import type { AlbumPhoto } from "../../domain/album-state";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "../../domain/player-action";
import { validateGameState, type GameState } from "../../domain/game";
import { formatTravelTime } from "./travel-time";
import { travelLogCities, travelLogPhotos } from "./travel-log";
import { TravelLogDialog } from "./TravelLog";

const roll = () => 0;
const place = (id: string) => getCityContent(id.split("_")[0]).travel.places.find((item) => item.id === id)!;
const JAMA_MASJID = "gt_delhi_main_jama_masjid";
const RED_FORT = "gt_delhi_main_red_fort";
const BAOLI = "gt_delhi_date_agrasen_baoli";
const delhiArrival: AlbumPhoto = { imageId: "gt_album_d01", caption: "路地の将軍カムラ", cityId: "delhi", day: 1, minute: 600,
  placeId: "delhi_hotel_hub", storyId: "places/gt_delhi_hotel_hub.gt_delhi_arrival" };

function playDate(state: GameState, dateId: string): GameState {
  let next = startDateScene(withAp(state, 12), dateId, 0);
  for (let step = 0; next.activeDate; step++) {
    expect(step, "the date did not end").toBeLessThan(300);
    next = applyPlayerAction(next, playerActionChange(listPlayerActions(next)[0], roll), roll);
  }
  return next;
}

describe("旅の記録's 「体験」 and 「写真」", () => {
  it("always has the city the party is in, even before anything is lived there", () => {
    expect(travelLogCities(cityStart("mihon"))).toEqual([{ cityId: "mihon", cityJa: "見本の街", experiences: [], people: [] }]);
  });

  it("keeps each city lived in, in the journey's order: its episodes as completed, with her line looking back", () => {
    const agra = cityStart("agra", ["航", "澪"]);
    const cities = travelLogCities(agra);
    expect(cities.map((city) => city.cityId)).toEqual(["delhi", "agra"]);
    const [delhi] = cities;
    const delhiDone = agra.completedEpisodeIds.filter((id) => episodes.find((item) => item.id === id)?.cityId === "delhi");
    expect(delhi.experiences.map((item) => item.id)).toEqual(delhiDone);
    expect(delhi.experiences.at(-1)?.kind).toBe("finale");
    const masjid = delhi.experiences.find((item) => item.id === JAMA_MASJID)!;
    expect(masjid).toMatchObject({
      kind: "visit", placeJa: place("delhi_jama_masjid").nameJa, titleJa: episodes.find((item) => item.id === JAMA_MASJID)!.clearTitleJa,
      heroine: { textJa: place("delhi_jama_masjid").recapLinesJa![0], cityId: "delhi" },
    });
  });

  it("shows the place's photo on a card even when its story took an album photo (2026-11-20)", () => {
    const state = playDate(finishEpisode(cityStart("delhi", ["航", "澪"]), JAMA_MASJID), BAOLI);
    const date = travelLogCities(state)[0].experiences.find((item) => item.id === BAOLI)!;
    expect(state.album.at(-1)?.storyId).toContain("gt_delhi_date_agrasen_baoli");
    expect(date.picture).toMatchObject({ captionJa: place("delhi_agrasen_baoli").nameJa, credit: expect.anything() });
    expect(date.picture?.path).toMatch(/\.recap\.webp$/u);
  });

  it("puts every album photo on 「写真」, the newest first", () => {
    const state = playDate(finishEpisode({ ...cityStart("delhi"), album: [delhiArrival] }, JAMA_MASJID), BAOLI);
    expect(state.album.map((photo) => photo.imageId)[0]).toBe("gt_album_d01");
    expect(travelLogPhotos(state).map((photo) => photo.imageId)).toEqual(state.album.map((photo) => photo.imageId).reverse());
  });
});

describe("旅の記録's times (save livedTimes)", () => {

  it("times an episode as completed and a date as first finished, and orders the city's cards by them", () => {
    const dated = playDate(finishEpisode(cityStart("delhi", ["航", "澪"]), JAMA_MASJID), BAOLI);
    const datedAt = dated.livedTimes?.find((item) => item.id === BAOLI);
    expect(datedAt).toEqual({ id: BAOLI, day: expect.any(Number), minute: expect.any(Number) });
    const state = finishEpisode(dated, RED_FORT);
    expect(validateGameState(state)).toEqual(state);
    expect(state.livedTimes?.map((item) => item.id).slice(-3)).toEqual([JAMA_MASJID, BAOLI, RED_FORT]);
    const [delhi] = travelLogCities(state);
    // The date came between the two episodes, though episodes come before dates when the save has no time.
    expect(delhi.experiences.map((item) => item.id).slice(-3)).toEqual([JAMA_MASJID, BAOLI, RED_FORT]);
    expect(delhi.experiences.find((item) => item.id === BAOLI)?.whenJa).toBe(`${datedAt!.day}日目 ${formatTravelTime(datedAt!.minute)}`);
  });

  it("puts what a save lived without times first, in the old order, and refuses a time of nothing lived", () => {
    const state = finishEpisode(playDate(finishEpisode(cityStart("delhi", ["航", "澪"]), JAMA_MASJID), BAOLI), RED_FORT);
    const { livedTimes: _times, ...untimed } = state;
    const [delhi] = travelLogCities(untimed);
    expect(delhi.experiences.map((item) => item.id).slice(-3)).toEqual([JAMA_MASJID, RED_FORT, BAOLI]);
    expect(delhi.experiences.every((item) => item.whenJa === undefined)).toBe(true);
    expect(() => validateGameState({ ...state, livedTimes: [{ id: "gt_agra_main_taj_mahal", day: 1, minute: 600 }] })).toThrow("旅の記録の時刻の参照先が見つかりません。");
  });
});

describe("旅の記録's dialog", () => {
  it("opens on the city the party is in, on 「体験」, with her words and no quiz score", () => {
    const html = renderToStaticMarkup(createElement(TravelLogDialog, { game: finishEpisode(cityStart("delhi", ["航", "澪"]), JAMA_MASJID), onClose: () => {} }));
    // No names line (2026-11-19 user decision).
    expect(html).not.toContain("航");
    expect(html).toContain('aria-pressed="true" data-testid="travel-log-lived"');
    expect(html).toContain(`data-testid="log-experience-${JAMA_MASJID}"`);
    expect(html).toContain(place("delhi_jama_masjid").recapLinesJa![0]);
    expect(html).not.toMatch(/挑戦|最高|手がかり \d/u);
  });

  it("seals a date too, folds a city by its name, and shows no progress line, credit or her name", () => {
    const state = playDate(finishEpisode(cityStart("delhi", ["航", "澪"]), JAMA_MASJID), BAOLI);
    const html = renderToStaticMarkup(createElement(TravelLogDialog, { game: state, onClose: () => {} }));
    expect(html.slice(html.indexOf(`log-experience-${BAOLI}`))).toContain("stop-seal");
    expect(html).toMatch(/aria-expanded="true" aria-controls="log-city-delhi"/u);
    expect(html).not.toMatch(/観光 \d|都市クリア|画像の出典/u);
    expect(html).not.toContain("heroine-note-name");
  });

  it("gives the people met their portrait when they have one", () => {
    const people = travelLogCities(cityStart("agra")).find((city) => city.cityId === "delhi")!.people;
    expect(people.length).toBeGreaterThan(0);
    expect(people.some((person) => person.characterId)).toBe(true);
  });
});
