// 「単語帳」 of the English notes (2026-11-11 user decision): a card per word of the answered questions' vocabularyJa,
// grouped by the place where they were met, with the place's photo (its card copy) and the sentence each word came
// from. No score and no mastery. Read with the sample journey (fictional; its words and places).
import { describe, expect, it } from "vitest";
import { battleQuizzes, battles } from "../../content";
import { getPlacePhoto } from "../../content/place-photo";
import { wordBookGroups, wordBookPhotos, type AnsweredWordSource } from "./word-book";

/** The answered questions of a battle, in the order given (as the notes list them). */
function answered(battleId: string, ...questionIds: string[]): AnsweredWordSource[] {
  const battle = battles.find((item) => item.id === battleId)!;
  const questions = battleQuizzes[battle.quizId].questions;
  return questionIds.map((id) => ({ battle, question: questions.find((question) => question.id === id)! }));
}

describe("the word book", () => {
  it("groups the words by place in the order met, each with its meaning and the sentence it came from", () => {
    const groups = wordBookGroups([
      ...answered("smp_mihon_main_clock_tower_battle", "smp_mihon_clock_tower_q1", "smp_mihon_clock_tower_q3"),
      ...answered("smp_mihon_special_b_market", "smp_mihon_market_b_q3"),
    ]);
    expect(groups.map((group) => [group.cityNameJa, group.placeNameJa])).toEqual([["見本の街", "見本の時計塔"], ["見本の街", "見本の朝市"]]);
    expect(groups[0].cards.map(({ word, meaningJa, sentenceEn }) => ({ word, meaningJa, sentenceEn }))).toEqual([
      // A word of an option: that option's sentence.
      { word: "kept", meaningJa: "（〜のまま）にしておいた", sentenceEn: "They kept it at three." },
      { word: "keeper", meaningJa: "番人", sentenceEn: "The keeper still rings the bell by hand. When?" },
      { word: "rings", meaningJa: "鳴らす", sentenceEn: "The keeper still rings the bell by hand. When?" },
    ]);
    // A phrase is found as the notes underline it.
    expect(groups[1].cards).toMatchObject([{ word: "keep time", sentenceEn: "So, do people here keep time?" }]);
  });

  it("shows the place's photo as free time does (its card copy), each photo's credit once", () => {
    const groups = wordBookGroups([
      ...answered("smp_mihon_main_clock_tower_battle", "smp_mihon_clock_tower_q1"),
      ...answered("smp_mihon_special_c_library", "smp_mihon_library_c_q3"),
    ]);
    expect(groups[0].photo).toEqual(getPlacePhoto("mihon", "mihon_clock_tower"));
    expect(groups[0].photo).not.toBeNull();
    expect(groups[1].photo).toEqual(getPlacePhoto("mihon", "mihon_library"));
    expect(wordBookPhotos(groups).map(({ asset, placeNameJa }) => [asset.id, placeNameJa]))
      .toEqual([[groups[0].photo!.id, "見本の時計塔"], [groups[1].photo!.id, "見本の図書室"]]);
    // The same word met at two places has a card at each.
    expect(groups.map((group) => group.cards.map((card) => card.word))).toEqual([["kept"], ["on purpose", "kept"]]);
  });

  it("puts the city finale's words at its map event's place, one card for a word met there again", () => {
    const groups = wordBookGroups([
      ...answered("smp_mihon_main_clock_tower_battle", "smp_mihon_clock_tower_q3"),
      ...answered("smp_mihon_finale_battle", "smp_mihon_finale_q4", "smp_mihon_finale_q2"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].placeNameJa).toBe("見本の時計塔");
    expect(groups[0].cards.map((card) => card.word)).toEqual(["keeper", "rings", "visitors"]);
  });

  it("has nothing before a question is answered", () => {
    expect(wordBookGroups([])).toEqual([]);
    expect(wordBookPhotos([])).toEqual([]);
  });
});
