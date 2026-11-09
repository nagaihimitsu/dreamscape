import { describe, expect, it } from "vitest";
import { episodes, getCityContent, landmarks } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { clearCity, departFromClearedCity, finishEpisode, newJourney } from "../../../src/dev/scenario-builders";
import { itemUsableIn } from "../../../src/domain/item-cities";

/**
 * GT-3a (the main story in the new form): the guides, arrivals and epilogues are knots of place files,
 * and the head `# on_done:` lines added to them and to four battle files give the decided items and pay
 * the drafted prices (provisional until the balance pass) once.
 */
describe("Golden Triangle main story in place files (GT-3a)", () => {
  it("points every guide, arrival and epilogue at a knot of a place file", () => {
    for (const landmark of landmarks.filter((item) => getJourney("golden_triangle")!.cities.some((city) => city.id === item.cityId)))
      expect(landmark.guideStoryId).toBe(`places/gt_${landmark.id}.gt_${landmark.id}_guide`);
    for (const cityId of ["delhi", "agra", "jaipur"]) {
      expect(getCityContent(cityId).city.arrivalStoryId).toBe(`places/gt_${cityId}_hotel_hub.gt_${cityId}_arrival`);
      expect(episodes.find((episode) => episode.cityId === cityId && episode.kind === "city_finale")?.epilogueStoryId)
        .toBe(`places/gt_${cityId}_hotel_hub.gt_${cityId}_epilogue`);
    }
  });

  it("gives the Jama Masjid attar and pays its price once, when the battle's first result is recorded", () => {
    let state = newJourney("golden_triangle");
    expect(state.inventory).toEqual({ gt_delhi_kamla_memo: "held" });
    const before = state.travelBudget;
    state = finishEpisode(state, "gt_delhi_main_jama_masjid");
    expect(state.inventory.gt_delhi_rain_attar).toBe("held");
    expect(state.travelBudget).toBe(before - 300);
    // Playing the landmark again records another result: nothing is given or paid again.
    const replayed = finishEpisode(state, "gt_delhi_main_jama_masjid");
    expect(replayed.battleRecords.find((record) => record.battleId === "gt_delhi_main_jama_masjid_battle")?.attempts).toBe(2);
    expect(replayed.travelBudget).toBe(state.travelBudget);
    expect(replayed.inventory).toEqual(state.inventory);
  });

  it("carries the Delhi items through the journey, eats the petha in the Agra epilogue and buys in Jaipur", () => {
    let state = newJourney("golden_triangle");
    const start = state.travelBudget;
    state = departFromClearedCity(clearCity(state));
    expect(state.currentCityId).toBe("agra");
    expect(state.inventory).toEqual({ gt_delhi_kamla_memo: "held", gt_delhi_rain_attar: "held", gt_delhi_aman_wedding_invitation: "held" });
    state = clearCity(state);
    expect(state.inventory.gt_agra_anwar_petha).toBe("held");
    state = departFromClearedCity(state);
    expect(state.currentCityId).toBe("jaipur");
    expect(state.inventory.gt_agra_anwar_petha).toBe("used");
    expect(state.itemUses.gt_agra_anwar_petha).toEqual({ encounterId: "gt_agra_epilogue" });
    for (const item of ["gt_delhi_kamla_memo", "gt_delhi_rain_attar", "gt_delhi_aman_wedding_invitation"]) {
      expect(state.inventory[item]).toBe("held");
      expect(itemUsableIn(state, item, "jaipur")).toBe(true);
    }
    expect(itemUsableIn(state, "gt_agra_anwar_petha", "jaipur")).toBe(false);
    state = clearCity(state);
    expect(state.inventory).toMatchObject({ gt_jaipur_salim_miniature: "held", gt_jaipur_sushma_lime_pickle: "held" });
    // The drafted prices: the attar (₹300) and the miniature with its print (₹900 + ₹300).
    expect(state.travelBudget).toBe(start - 300 - 1200);
  }, 120_000);
});
