// The background a battle draws while it shows no line (a quiz's question and answer, the reasoning, the result): the one
// its last line showed, kept over the call and in the save; the battle's own only when none was kept (2026-11-13 user
// decision). The Delhi finale moves from the Red Fort to the hotel's alley, Chandni Chowk and back between its quizzes.
import { describe, expect, it } from "vitest";
import { battles, getCities, getCityContent, presentation } from "../content";
import { completedCity, openBattleScene } from "../dev/scenario-builders";
import { hudPlaceName, placeDisplayName } from "../features/journey/travel-labels";
import { advanceBattle, answerBattle, battleBackgroundId, getActiveBattleContent } from "./battle";
import { validateGameState, type GameState } from "./game";

describe("battleBackgroundId", () => {
  const battle = { backgroundId: "bg_battle" };

  it("draws the line's background while a line shows", () => {
    expect(battleBackgroundId({ frame: { background: "bg_alley" } }, battle)).toBe("bg_alley");
    // A frame's own background wins over one kept from before (a save never has both; the frame is the line on screen).
    expect(battleBackgroundId({ frame: { background: "bg_alley" }, background: "bg_market" }, battle)).toBe("bg_alley");
  });

  it("keeps the last line's background while no line shows, and the battle's own only when none was kept", () => {
    expect(battleBackgroundId({ frame: null, background: "bg_alley" }, battle)).toBe("bg_alley");
    expect(battleBackgroundId({ frame: null }, battle)).toBe("bg_battle");
  });
});

describe("the Delhi finale's quizzes keep the story's background", () => {
  const FINALE = "gt_delhi_finale_battle";
  const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
  const background = (state: GameState) => {
    const active = state.activeBattle!;
    return battleBackgroundId(active, getActiveBattleContent(active).battle);
  };
  const cities = getCities().map((city) => {
    const { travel, travelSettings } = getCityContent(city.id);
    return { hotelPlaceId: travelSettings.hotelPlaceId, places: travel.places };
  });
  /** The header's place plate as JourneyHud names it, over this background (the finale has no landmark photo). */
  const plate = (state: GameState, backgroundId: string) => {
    const here = getCityContent(state.currentCityId).travel.places.find((place) => place.id === state.travel.currentPlaceId);
    return hudPlaceName(placeDisplayName(state, here), { backdrop: presentation.backgrounds[backgroundId] }, cities);
  };

  it("shows each quiz, its answer and the result on the background of the line before, also after a reload", () => {
    const battle = battles.find((item) => item.id === FINALE)!;
    expect(battle.landmarkId).toBeNull();
    expect(battle.backgroundId).toBe("gt_bg_delhi_red_fort");
    let state = openBattleScene(completedCity("delhi"), FINALE);
    const quizzes: string[] = [];
    let lastLine = "";
    for (let step = 0; state.activeBattle!.phase !== "result"; step++) {
      expect(step, "the finale does not end").toBeLessThan(400);
      const active = state.activeBattle!;
      if (active.phase === "dialogue") {
        lastLine = active.frame!.background;
        expect(background(state)).toBe(lastLine);
        state = restore(advanceBattle(state, state.revision));
        continue;
      }
      // No line shows: the last line's background, kept in the save (a reload in the middle of the quiz keeps it).
      expect(active.background).toBe(lastLine);
      expect(background(state)).toBe(lastLine);
      expect(background(restore(state))).toBe(lastLine);
      if (active.phase === "question") {
        quizzes.push(lastLine);
        const question = getActiveBattleContent(active).quiz.questions[active.roundIndex];
        state = restore(answerBattle(state, question.correctOptionId, state.revision));
        expect(background(state)).toBe(lastLine);
      } else {
        state = restore(advanceBattle(state, state.revision));
      }
    }
    expect(quizzes).toEqual([
      "gt_bg_delhi_hotel_alley", "gt_bg_delhi_hotel_alley", "gt_bg_delhi_chandni_chowk", "gt_bg_delhi_chandni_chowk", "gt_bg_delhi_red_fort",
    ]);
    expect(background(state)).toBe("gt_bg_delhi_red_fort");
    expect(background(restore(state))).toBe("gt_bg_delhi_red_fort");
    // The header's place follows the picture: the hotel's alley is 「滞在先のホテル」, Chandni Chowk its map place.
    expect(plate(state, "gt_bg_delhi_hotel_alley")).toBe("滞在先のホテル");
    expect(plate(state, "gt_bg_delhi_chandni_chowk")).toBe("チャンドニー・チョーク");
  });

  it("draws the battle's own background over a quiz saved before the battle kept one, and refuses a forged one", () => {
    let state = openBattleScene(completedCity("delhi"), FINALE);
    while (state.activeBattle!.phase === "dialogue") state = advanceBattle(state, state.revision);
    const active = state.activeBattle!;
    expect(active.phase).toBe("question");
    expect(active.background).toBe("gt_bg_delhi_hotel_alley");
    // A run saved in the same save version before the background was kept: it loads, on the battle's own.
    const { background: _kept, ...before } = active;
    const loaded = restore({ ...state, activeBattle: before });
    expect(loaded.activeBattle!.background).toBeUndefined();
    expect(background(loaded)).toBe("gt_bg_delhi_red_fort");
    // A background the content does not know, or one kept beside a line's frame, is not loaded.
    expect(() => restore({ ...state, activeBattle: { ...active, background: "gt_bg_nowhere" } })).toThrow("保存された場面の情報が一致しません。");
    const line = openBattleScene(completedCity("delhi"), FINALE);
    expect(() => restore({ ...line, activeBattle: { ...line.activeBattle!, background: "gt_bg_delhi_hotel_alley" } }))
      .toThrow("保存された場面の情報が一致しません。");
  });
});
