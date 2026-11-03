import { getCityContent } from "../content";
import { getJourneyForCity } from "../content/journeys";
import { createGame, validateGameState, type GameState } from "../domain/game";

/** Isolated preview state: no Milan progress and no persistent player save. */
export function prototypePreviewState(cityId: string): GameState {
  const { city, travelSettings } = getCityContent(cityId);
  const journey = getJourneyForCity(cityId);
  if (city.productionStatus !== "prototype" || !journey) throw new Error("制作中の都市ではありません。");
  const base = createGame();
  const initial = journey.initialState;
  return validateGameState({ ...base, currentCityId: cityId,
    travelBudget: journey.initialBudget ?? travelSettings.initialBudget,
    ap: initial?.ap ?? 0, affection: initial?.affection ?? 0, trust: initial?.trust ?? 0,
    spark: initial?.spark ?? 0, romanceStage: initial?.romanceStage ?? 1,
    confessionStatus: initial?.confessionStatus ?? "none",
    travel: { ...base.travel, currentPlaceId: travelSettings.hotelPlaceId, hotelPlaceId: travelSettings.hotelPlaceId,
      ...(journey.startWeekday === undefined ? {} : { calendar: { journeyDay: 1, cityStartJourneyDay: 1, startWeekday: journey.startWeekday } }) },
  });
}
