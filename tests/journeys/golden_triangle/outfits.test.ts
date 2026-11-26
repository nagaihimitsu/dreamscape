import { describe, expect, it } from "vitest";
import { getCityShop, getOutfit, landmarks } from "../../../src/content";
import { cityStart, openTourismScene } from "../../../src/dev/scenario-builders";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { metTerms, termsAdded } from "../../../src/domain/glossary";
import { buyOutfit, canChangeOutfit, ownedOutfits, shopOutfits, shopTalks, wearOutfit, wornCostume } from "../../../src/domain/outfits";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../../../src/domain/player-action";
import { encounterChoiceDisplay, getEncounterOptionAvailability } from "../../../src/domain/encounter";
import { enterShop } from "../../../src/domain/occasion";
import { usableMoney } from "../../../src/domain/reservations";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

// The heroine's outfits (2026-11-20 user decision): each city's cloth shop sells its own cloth (2026-11-26: Delhi weaves, Agra sews,
// Jaipur prints; shop/catalog.json), and each is a talking shop: 「店に入る」 opens the shop's scenes (# at: shop), where the price is
// agreed with its keeper and the outfit is got (# outfit:, # money:). Got once, it stays the party's, and 「服」 changes between it and
// 普段の服 in free time only.

const SAREE = "gt_saree_blue";
const SALWAR_KAMEEZ = "gt_salwar_kameez_navy";

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

/** Delhi's free time with the money to spend set (the rest kept back as before). */
const delhi = (money?: number): GameState => {
  const state = cityStart("delhi");
  return money === undefined ? state : { ...state, travelBudget: state.travelBudget - usableMoney(state) + money };
};

/** Play the open scenes of the shop (their lines) until a choice waits or free time comes back. */
function readOn(initial: GameState): GameState {
  let state = initial;
  for (let guard = 0; guard < 400; guard++) {
    const actions = listPlayerActions(state);
    if (!state.activeEncounter || actions.some((action) => action.kind === "encounter_choose")) return state;
    const next = actions.find((action) => action.kind === "encounter_next" || action.kind === "encounter_finish");
    if (!next) return state;
    state = validateGameState(applyPlayerAction(state, playerActionChange(next, () => 0)));
  }
  throw new Error("お店の場面が終わりません。");
}
const act = (state: GameState, action: PlayerAction) => validateGameState(applyPlayerAction(state, playerActionChange(action, () => 0)));
/** The index of the open choice with that option ID. */
const choiceIndex = (state: GameState, optionId: string) => state.activeEncounter!.frame.choices.find((choice) => choice.optionId === optionId)!.index;
/** Into Delhi's shop, through its first visit's talk, to the haggle's choices. */
const atHaggle = (state: GameState) => readOn(act(state, { kind: "enter_shop" }));
/** Delhi's shop with the sari got by her own words (ask_her, ₹2,400), back in free time. */
const withSari = (state = delhi()) => {
  const choosing = atHaggle(state);
  return readOn(act(choosing, { kind: "encounter_choose", index: choiceIndex(choosing, "ask_her") }));
};

describe("the shops' outfits", () => {
  it("sells each city's own cloth: the sari at Delhi, the embroidered pair at Agra, the block print at Jaipur", () => {
    expect(getCityShop("delhi")?.outfitIds).toEqual([SAREE]);
    expect(getCityShop("agra")?.outfitIds).toEqual(["gt_anarkali_jade", SALWAR_KAMEEZ]);
    expect(getCityShop("jaipur")?.outfitIds).toEqual(["gt_kurta_block_print"]);
  });

  it("has no 「買う」 at a talking shop: 「店に入る」 opens it, and the catalog's price is only what it first asks", () => {
    const state = delhi();
    expect(shopTalks("gt_delhi_cloth_shop")).toBe(true);
    expect(shopOutfits(state)).toEqual([{ outfit: getOutfit(SAREE), owned: false, available: false, reason: "" }]);
    expect(buyOutfit(state, SAREE, state.revision)).toBe(state);
    expect(listPlayerActions(state)).toContainEqual({ kind: "enter_shop" });
    expect(listPlayerActions(state).some((action) => action.kind === "buy_outfit")).toBe(false);
    // Nothing to change into before something is got.
    expect(listPlayerActions(state).some((action) => action.kind === "wear_outfit")).toBe(false);
  });

  it("runs the first visit's talk, then the haggle, where the agreed price pays once and the sari and its words come", () => {
    const state = delhi();
    const choosing = atHaggle(state);
    expect(choosing.occasion).toMatchObject({ kind: "shop", shop: "gt_delhi_cloth_shop", started: ["gt_delhi_cloth_shop_intro", "gt_delhi_cloth_shop_haggle"] });
    expect(choosing.travel.minute).toBe(state.travel.minute);
    // The haggle's choices: Kamla's way only after Delhi's finale (# requires:).
    const shown = (at: GameState) => at.activeEncounter!.frame.choices.filter((choice) => encounterChoiceDisplay(at, choice.index).show !== "hidden")
      .map((choice) => choice.optionId);
    expect(shown(choosing)).toEqual(["haggle_hard", "pay_asking", "ask_her", "think_later"]);
    // A save inside the shop loads and goes on.
    const storage = memoryStorage();
    expect(saveGame(storage, choosing).ok).toBe(true);
    expect(loadGame(storage).status).toBe("loaded");
    const got = readOn(act(choosing, { kind: "encounter_choose", index: choiceIndex(choosing, "ask_her") }));
    expect(got.occasion).toBeNull();
    expect(got.travelBudget).toBe(state.travelBudget - 2400);
    expect(ownedOutfits(got).map((outfit) => outfit.id)).toEqual([SAREE]);
    expect(wornCostume(got)).toBeUndefined();
    expect(termsAdded(state, got)).toContain("gt_term_saree");
    expect(got.trust).toBe(state.trust + 1);
    // Got once: the haggle runs no more (its # when:), and the first visit's talk was once, so the shop opens no more.
    expect(listPlayerActions(got)).not.toContainEqual({ kind: "enter_shop" });
    expect(shopOutfits(got)[0]).toMatchObject({ owned: true, available: false });
  });

  it("goes back to free time with nothing paid on 「また今度」, and opens the haggle alone next time", () => {
    const state = delhi();
    const choosing = atHaggle(state);
    const left = readOn(act(choosing, { kind: "encounter_choose", index: choiceIndex(choosing, "think_later") }));
    expect(left.occasion).toBeNull();
    expect(left.travelBudget).toBe(state.travelBudget);
    expect(left.outfits ?? []).toEqual([]);
    const again = atHaggle(left);
    expect(again.occasion?.started).toEqual(["gt_delhi_cloth_shop_haggle"]);
  });

  it("greys out a price the money that can be spent now does not cover, saying why", () => {
    const choosing = atHaggle(delhi(2399));
    expect(getEncounterOptionAvailability(choosing, choiceIndex(choosing, "ask_her"))).toMatchObject({ available: false });
    expect(getEncounterOptionAvailability(choosing, choiceIndex(choosing, "haggle_hard")).available).toBe(true);
  });

  it("changes into the sari and back to 普段の服, through a save and a load", () => {
    const bought = withSari();
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
    expect(loaded.status === "loaded" && metTerms(loaded.state)).toContain("gt_term_saree");
    const usual = validateGameState(wearOutfit(worn, null, worn.revision));
    expect(usual.outfit).toBeUndefined();
    expect(usual.outfits).toEqual([SAREE]);
  });

  it("neither opens the shop nor changes while a scene is open", () => {
    const bought = withSari();
    const landmark = landmarks.find((item) => item.cityId === "delhi" && item.guideStoryId)!;
    const scene = openTourismScene(bought, landmark.id);
    expect(canChangeOutfit(scene)).toBe(false);
    expect(wearOutfit(scene, SAREE, scene.revision)).toBe(scene);
    const fresh = openTourismScene(delhi(), landmark.id);
    expect(enterShop(fresh, fresh.revision)).toBe(fresh);
  });

  it("refuses a save naming an outfit no shop of its journey sells, or one she wears without having got it", () => {
    const state = delhi();
    expect(() => validateGameState({ ...state, outfits: ["no_such_outfit"] })).toThrow("服の参照先");
    expect(() => validateGameState({ ...state, outfit: SAREE })).toThrow("着ている服");
  });
});
