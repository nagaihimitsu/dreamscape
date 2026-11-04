import type { TravelRoute } from "../../content/travel-schemas";
export { isTravelEventVisible as showTravelEvent } from "../../domain/travel-game";

export const travelModeLabels: Record<TravelRoute["mode"], string> = {
  walk: "徒歩", rail: "鉄道・地下鉄", tram: "路面電車", bus: "バス", taxi: "タクシー",
};
