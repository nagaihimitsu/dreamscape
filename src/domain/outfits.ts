import { getCityShop, getOutfit, shopCatalog, type Outfit, type Shop } from "../content";
import { formatMoneyForCity } from "../content/currency";
import { getJourneyForCity } from "../content/journeys";
import { hasActiveScene, type GameState } from "./game-state-schema";
import { usableMoney } from "./reservations";

// The heroine's outfits (2026-11-20 user decision): a city's shop (shop/catalog.json) sells outfits in free time; one bought
// is the party's for the rest of the journey (the save's `outfits`), and the header's 「服」 chooses what she wears (`outfit`;
// none: 普段の服, the outfit the scene, the city or the region gives her: src/content/character-assets.ts). Buying pays once
// from the travel budget and passes no game time; changing passes none and costs nothing. Both happen only in free time
// (no scene open), so a scene never changes her clothes halfway. Pure.

/** The outfits bought in this journey, in the order bought. */
export const ownedOutfitIds = (state: Pick<GameState, "outfits">): readonly string[] => state.outfits ?? [];

/** The outfits bought in this journey (their catalog entries), in the order bought. */
export function ownedOutfits(state: Pick<GameState, "outfits">): Outfit[] {
  return ownedOutfitIds(state).flatMap((id) => getOutfit(id) ?? []);
}

/** The outfit she wears, or undefined for 普段の服. */
export function wornOutfit(state: Pick<GameState, "outfit">): Outfit | undefined {
  return state.outfit === undefined ? undefined : getOutfit(state.outfit);
}

/** The heroine costume (presentation/characters.json) the worn outfit shows, or undefined for 普段の服. */
export const wornCostume = (state: Pick<GameState, "outfit">): string | undefined => wornOutfit(state)?.costume;

/** Whether she can change now: in free time only (no scene open, no trip under way). */
export const canChangeOutfit = (state: GameState): boolean => !hasActiveScene(state);

/** The shop of the city the party is in, or undefined. */
export const currentShop = (state: Pick<GameState, "currentCityId">): Shop | undefined => getCityShop(state.currentCityId);

/** An outfit of the shop here: whether it is bought already, and whether (or why not) it can be bought now. */
export type ShopOutfitChoice = { outfit: Outfit; owned: boolean; available: boolean; reason: string };

/**
 * The outfits of the shop here, in its order: one bought is owned (never sold twice); one not bought can be bought in free
 * time while the money that can be spent now (the fare home and the payments kept back left aside: usableMoney) covers it.
 */
export function shopOutfits(state: GameState): ShopOutfitChoice[] {
  const shop = currentShop(state);
  if (!shop) return [];
  const owned = ownedOutfitIds(state);
  const scene = hasActiveScene(state);
  return shop.outfitIds.flatMap((id): ShopOutfitChoice[] => {
    const outfit = getOutfit(id);
    if (!outfit) return [];
    if (owned.includes(id)) return [{ outfit, owned: true, available: false, reason: "" }];
    const reason = scene ? "今は買えません。"
      : state.travelBudget < outfit.price ? "旅行予算が足りません。"
      : usableMoney(state) < outfit.price ? `帰りの交通費（${formatMoneyForCity(state.currentCityId, state.travel.returnReserve)}）を確保しているため、今は買えません。`
      : "";
    return [{ outfit, owned: false, available: !reason, reason }];
  });
}

/** Buy an outfit at the shop here: its price is paid once, and it is the party's for the rest of the journey. She does not change by it. */
export function buyOutfit(state: GameState, outfitId: string, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision) return state;
  const choice = shopOutfits(state).find((item) => item.outfit.id === outfitId);
  if (!choice?.available) return state;
  return { ...state, revision: state.revision + 1, travelBudget: state.travelBudget - choice.outfit.price,
    outfits: [...ownedOutfitIds(state), outfitId] };
}

/** Change into an outfit bought in this journey, or into 普段の服 (`null`). Unchanged when it is worn already or she cannot change now. */
export function wearOutfit(state: GameState, outfitId: string | null, expectedRevision: number): GameState {
  if (state.revision !== expectedRevision || !canChangeOutfit(state) || (state.outfit ?? null) === outfitId) return state;
  if (outfitId === null) {
    const next: GameState = { ...state, revision: state.revision + 1 };
    delete next.outfit;
    return next;
  }
  if (!ownedOutfitIds(state).includes(outfitId) || !getOutfit(outfitId)) return state;
  return { ...state, revision: state.revision + 1, outfit: outfitId };
}

/**
 * A saved wardrobe names only outfits a shop of the save's journey sells (as the save's other references do), and she wears
 * one she bought. Otherwise the save is not loaded and its data is kept (persistence loadGame).
 */
export function validateOutfits(state: GameState): void {
  const cities = new Set(getJourneyForCity(state.currentCityId)?.cities.map((city) => city.id) ?? []);
  const sold = new Set(shopCatalog.shops.filter((shop) => cities.has(shop.cityId)).flatMap((shop) => shop.outfitIds));
  if (ownedOutfitIds(state).some((id) => !sold.has(id) || !getOutfit(id)))
    throw new Error("服の参照先が見つかりません。");
  if (state.outfit !== undefined && !ownedOutfitIds(state).includes(state.outfit))
    throw new Error("着ている服の記録が一致しません。");
}
