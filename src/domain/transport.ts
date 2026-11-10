import { getCityContent } from "../content";
import { formatMoneyForCity } from "../content/currency";
import { getTransportMode, type TransportMode } from "../content/transport";
import type { RentalOffer, TravelRoute } from "../content/travel-schemas";
import { hasActiveScene, type GameState } from "./game-state-schema";
import { tourKeepBack } from "./reservations";
import { DAY_END } from "./travel";

// In-city transport rules on the game state (pure): which modes the party may
// ride now, and renting a rental mode (manifest transportModes[].rental) at
// an offer of the city (travel settings `rentals`). A rental is paid once and
// lasts until the party leaves the city; there is no returning it earlier, so
// a mode that can be ridden stays usable within the city. That keeps every
// saved return reserve valid: game-state-validation.ts recomputes the
// smallest fare home from the usable routes on load.

/** Walking, a declared mode that needs no rental, or a rental mode the party has rented in this city. */
export function isTransportModeUsable(state: GameState, modeId: string): boolean {
  const mode = getTransportMode(state.currentCityId, modeId);
  return !!mode && (!mode.rental || state.travel.rentedModeIds.includes(modeId));
}

/** The current city's routes the party may ride now. Every route read for the player's state goes through this. */
export function getUsableRoutes(state: GameState): TravelRoute[] {
  return getCityContent(state.currentCityId).travel.routes.filter((route) => isTransportModeUsable(state, route.mode));
}

/** The city's offer for a rental mode, if any. */
function getRentalOffer(cityId: string, modeId: string): RentalOffer | undefined {
  return getCityContent(cityId).travelSettings.rentals?.find((offer) => offer.modeId === modeId);
}

/** Why a route of a not-yet-rented rental mode cannot be ridden: 「貸し自転車は滞在先で借りると乗れます。」 */
export function rentalReason(cityId: string, modeId: string): string {
  const mode = getTransportMode(cityId, modeId);
  const offer = getRentalOffer(cityId, modeId);
  const { travel, travelSettings } = getCityContent(cityId);
  const places = (offer?.placeIds ?? []).map((placeId) => placeId === travelSettings.hotelPlaceId ? "滞在先"
    : travel.places.find((place) => place.id === placeId)?.nameJa ?? placeId);
  return `${mode?.nameJa ?? modeId}は${places.length ? places.join("・") : "この街"}で借りると乗れます。`;
}

export type RentalChoice = { offer: RentalOffer; mode: TransportMode; available: boolean; reason: string };

/**
 * The rental offers at the party's place that are not rented yet, each with
 * whether it can be taken now (free time before the day ends, the price paid
 * without touching the money kept for the way back to the hotel).
 */
export function getRentalOffers(state: GameState): RentalChoice[] {
  const offers = getCityContent(state.currentCityId).travelSettings.rentals ?? [];
  return offers.flatMap((offer): RentalChoice[] => {
    const mode = getTransportMode(state.currentCityId, offer.modeId);
    if (!mode?.rental || !offer.placeIds.includes(state.travel.currentPlaceId) || state.travel.rentedModeIds.includes(offer.modeId)) return [];
    // (What a booked tour keeps back for its event steps is not spent here either; tour stage 2a.)
    const budget = state.travelBudget - tourKeepBack(state).money;
    const reason = hasActiveScene(state) ? "途中の場面を終えてから借りられます。"
      : state.travel.minute >= DAY_END ? "今日はもう借りられません。"
      : budget < offer.cost ? "旅行予算が足りません。"
      : budget - offer.cost < state.travel.returnReserve
        ? `帰りの交通費（${formatMoneyForCity(state.currentCityId, state.travel.returnReserve)}）を確保しているため、今は借りられません。` : "";
    return [{ offer, mode, available: !reason, reason }];
  });
}

/** Rent a mode at its offer here: pay once, ride it until leaving the city. No game time passes. */
export function rentTransport(state: GameState, modeId: string, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision) return state;
  const choice = getRentalOffers(state).find((item) => item.offer.modeId === modeId);
  if (!choice?.available) return state;
  return { ...state, revision: state.revision + 1, travelBudget: state.travelBudget - choice.offer.cost,
    travel: { ...state.travel, rentedModeIds: [...state.travel.rentedModeIds, modeId] } };
}
