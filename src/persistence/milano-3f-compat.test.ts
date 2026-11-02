import { describe, expect, it } from "vitest";
import oldEpilogue from "../../qa/old-saves/epilogue.json";
import oldDate from "../../qa/old-saves/date-after-first-choice.json";
import { activeEpilogueStoryId, advanceCityEpilogue } from "../domain/epilogue";
import { activeDateStoryId, advanceDate, validateGameState } from "../domain/game";
import { dates } from "../content";

describe("3f32b60 in-progress stories", () => {
  it("resumes the published epilogue until completion without changing its fingerprint", () => {
    let state = validateGameState(oldEpilogue);
    expect(activeEpilogueStoryId(state.activeEpilogue!)).toBe("milano/city_epilogue_rewrite");
    const hash = state.activeEpilogue!.contentHash;
    const before = { ap: state.ap, budget: state.travelBudget, inventory: state.inventory };
    for (let i = 0; state.activeEpilogue && i < 80; i++) {
      const next = advanceCityEpilogue(state, state.revision);
      expect(next.revision).toBeGreaterThan(state.revision);
      state = validateGameState(JSON.parse(JSON.stringify(next)));
      if (state.activeEpilogue) expect(state.activeEpilogue.contentHash).toBe(hash);
    }
    expect(state.activeEpilogue).toBeNull();
    expect(state.viewedEpilogueCityIds).toContain("milano");
    expect({ ap: state.ap, budget: state.travelBudget, inventory: state.inventory }).toEqual(before);
  });

  it("rejects an unknown epilogue fingerprint rather than replacing the save", () => {
    const broken = structuredClone(oldEpilogue);
    broken.activeEpilogue!.contentHash = "unrecognized";
    expect(() => validateGameState(broken)).toThrow();
  });

  it("resumes the actual saved date against its original Ink", () => {
    const state = validateGameState(oldDate);
    const active = state.activeDate!;
    const date = dates.find((item) => item.id === active.dateId)!;
    expect(activeDateStoryId(date, active)).toBe("milano/novecento_date_01_rewrite");
    const next = advanceDate(state, state.revision);
    expect(next.revision).toBeGreaterThan(state.revision);
    const restored = validateGameState(JSON.parse(JSON.stringify(next)));
    expect(restored.activeDate?.storyHash).toBe(active.storyHash);
    expect(restored.ap).toBe(state.ap);
  });
});
