import { describe, expect, it } from "vitest";
import { getCityShop, getOutfit, landmarks } from "../../../src/content";
import { cityStart, openTourismScene } from "../../../src/dev/scenario-builders";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { metTerms, termsAdded } from "../../../src/domain/glossary";
import { buyOutfit, canChangeOutfit, ownedOutfits, shopOutfits, wearOutfit, wornCostume } from "../../../src/domain/outfits";
import { applyPlayerAction, listPlayerActions, playerActionChange } from "../../../src/domain/player-action";
import { usableMoney } from "../../../src/domain/reservations";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

// The heroine's outfits (2026-11-20 user decision): Delhi's cloth shop sells the blue sari, the navy salwar kameez and the jade anarkali (shop/catalog.json); bought once
// with the travel budget, it stays the party's, and 「服」 changes between it and 普段の服 in free time only.

const SAREE = "gt_saree_blue";
const SALWAR_KAMEEZ = "gt_salwar_kameez_navy";
const ANARKALI = "gt_anarkali_jade";
const price = getOutfit(SAREE)!.price;

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

/** Delhi's free time with the money to spend set (the rest kept back as before). */
const delhi = (money?: number): GameState => {
  const state = cityStart("delhi");
  return money === undefined ? state : { ...state, travelBudget: state.travelBudget - usableMoney(state) + money };
};

describe("the shop's outfits", () => {
  it("sells the blue sari in every city of the journey, at Delhi in free time", () => {
    for (const cityId of ["delhi", "agra", "jaipur"]) expect(getCityShop(cityId)?.outfitIds).toContain(SAREE);
    const state = delhi();
    expect(canChangeOutfit(state)).toBe(true);
    expect(shopOutfits(state)).toEqual([SAREE, SALWAR_KAMEEZ, ANARKALI].map((id) => ({ outfit: getOutfit(id), owned: false, available: true, reason: "" })));
    expect(listPlayerActions(state)).toContainEqual({ kind: "buy_outfit", outfitId: SAREE });
    // Nothing to change into before something is bought.
    expect(listPlayerActions(state).some((action) => action.kind === "wear_outfit")).toBe(false);
  });

  it("pays once, keeps her in 普段の服 until she changes, and never sells the same outfit twice", () => {
    const state = delhi();
    const bought = validateGameState(applyPlayerAction(state, playerActionChange({ kind: "buy_outfit", outfitId: SAREE }, () => 0)));
    expect(bought.travelBudget).toBe(state.travelBudget - price);
    expect(ownedOutfits(bought).map((outfit) => outfit.id)).toEqual([SAREE]);
    expect(wornCostume(bought)).toBeUndefined();
    expect(buyOutfit(bought, SAREE, bought.revision)).toBe(bought);
    expect(shopOutfits(bought)[0]).toMatchObject({ owned: true, available: false });
    expect(listPlayerActions(bought)).not.toContainEqual({ kind: "buy_outfit", outfitId: SAREE });
    // The shop's other outfit is still for sale.
    expect(listPlayerActions(bought)).toContainEqual({ kind: "buy_outfit", outfitId: SALWAR_KAMEEZ });
    // A stale revision (a double press) changes nothing.
    expect(buyOutfit(state, SAREE, state.revision - 1)).toBe(state);
  });

  it("puts the sari in 旅の図鑑 as it is bought (once: a term met already is not added again)", () => {
    const state = delhi();
    expect(getOutfit(SAREE)?.termId).toBe("gt_term_saree");
    expect(getOutfit(SALWAR_KAMEEZ)?.termId).toBe("gt_term_salwar_kameez");
    const bought = validateGameState(applyPlayerAction(state, playerActionChange({ kind: "buy_outfit", outfitId: SAREE }, () => 0)));
    expect(termsAdded(state, bought)).toEqual(["gt_term_saree"]);
    // The term is kept through a save and a load, as a line's # term: is.
    const storage = memoryStorage();
    expect(saveGame(storage, bought).ok).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded.status === "loaded" && metTerms(loaded.state)).toContain("gt_term_saree");
    const metBefore = { ...state, glossary: ["gt_term_saree"] };
    expect(metTerms(buyOutfit(metBefore, SAREE, metBefore.revision))).toEqual(["gt_term_saree"]);
    // A refused purchase meets nothing.
    expect(metTerms(buyOutfit(state, SAREE, state.revision - 1))).toEqual([]);
  });

  it("refuses a purchase the money that can be spent now does not cover, saying why", () => {
    const short = delhi(price - 1);
    expect(shopOutfits(short)[0]).toMatchObject({ available: false });
    expect(shopOutfits(short)[0].reason).not.toBe("");
    expect(buyOutfit(short, SAREE, short.revision)).toBe(short);
    expect(buyOutfit(delhi(price), SAREE, delhi(price).revision).travelBudget).toBe(delhi(price).travelBudget - price);
  });

  it("changes into the sari and back to 普段の服, through a save and a load", () => {
    const bought = buyOutfit(delhi(), SAREE, delhi().revision);
    expect(listPlayerActions(bought)).toContainEqual({ kind: "wear_outfit", outfitId: SAREE });
    const worn = validateGameState(wearOutfit(bought, SAREE, bought.revision));
    expect(wornCostume(worn)).toBe("saree_01");
    expect(wearOutfit(worn, SAREE, worn.revision)).toBe(worn);
    expect(listPlayerActions(worn)).toContainEqual({ kind: "wear_outfit", outfitId: null });
    const storage = memoryStorage();
    expect(saveGame(storage, worn).ok).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    expect(loaded.status === "loaded" && loaded.state.outfit).toBe(SAREE);
    const usual = validateGameState(wearOutfit(worn, null, worn.revision));
    expect(usual.outfit).toBeUndefined();
    expect(usual.outfits).toEqual([SAREE]);
  });

  it("neither sells nor changes while a scene is open", () => {
    const bought = buyOutfit(delhi(), SAREE, delhi().revision);
    const landmark = landmarks.find((item) => item.cityId === "delhi" && item.guideStoryId)!;
    const scene = openTourismScene(bought, landmark.id);
    expect(canChangeOutfit(scene)).toBe(false);
    expect(wearOutfit(scene, SAREE, scene.revision)).toBe(scene);
    const fresh = openTourismScene(delhi(), landmark.id);
    expect(buyOutfit(fresh, SAREE, fresh.revision)).toBe(fresh);
  });

  it("refuses a save naming an outfit no shop of its journey sells, or one she wears without having bought it", () => {
    const state = delhi();
    expect(() => validateGameState({ ...state, outfits: ["no_such_outfit"] })).toThrow("服の参照先");
    expect(() => validateGameState({ ...state, outfit: SAREE })).toThrow("着ている服");
  });
});
