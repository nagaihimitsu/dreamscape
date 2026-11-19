import { describe, expect, it } from "vitest";
import { allRewardRules, balance, battleQuizzes, battles, learningTranslations } from "../content";
import { getJourney } from "../content/journeys";
import { quizSchema } from "../content/schemas";
import { questionAtLevel } from "../content/english-levels";
import { cityStart, openBattleScene } from "../dev/scenario-builders";
import { getActiveBattleContent } from "./battle";
import { createGame, setEnglishLevel, validateGameState, type GameState } from "./game";
import { DEFAULT_DIFFICULTY, difficultyOf, startingBudget } from "./difficulty";
import { earnRewards } from "./rewards";

// The difficulty (2026-11-19 user decision; src/domain/difficulty.ts): the English of the quizzes and how tight money and AP
// are, chosen apart when a journey starts. The sample journey's clock tower (fictional) has its first question in B2 too.

const BATTLE = "smp_mihon_main_clock_tower_battle";
const QUESTION = "smp_mihon_clock_tower_q1";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const withDifficulty = (state: GameState, difficulty: GameState["difficulty"]) => validateGameState({ ...state, difficulty });

describe("the difficulty's money and AP", () => {
  const journey = getJourney("golden_triangle")!;
  const india = (economy: "relaxed" | "standard" | "tight") =>
    createGame("たいち", "あゆみ", { journeyId: "golden_triangle", difficulty: { english: "B1", economy } });

  it("starts at ふつう and ふつう, and keeps what was chosen in the save", () => {
    const state = createGame();
    expect(state.difficulty).toEqual(DEFAULT_DIFFICULTY);
    expect(restore(india("tight")).difficulty).toEqual({ english: "B1", economy: "tight" });
    const { difficulty: _none, ...older } = state;
    expect(difficultyOf(validateGameState(older))).toEqual(DEFAULT_DIFFICULTY);
  });

  it("starts the budget at the level's share, rounded down", () => {
    expect(india("standard").travelBudget).toBe(journey.initialBudget);
    expect(india("relaxed").travelBudget).toBe(Math.floor(journey.initialBudget! * balance.difficulty.economy.relaxed.budgetPercent / 100));
    expect(india("tight").travelBudget).toBe(Math.floor(journey.initialBudget! * balance.difficulty.economy.tight.budgetPercent / 100));
    expect(startingBudget(99, "tight")).toBe(Math.floor(99 * balance.difficulty.economy.tight.budgetPercent / 100));
  });

  it("adds the level's bonus to a reward's AP, once, keeping the rest above the cap as pending", () => {
    const rule = allRewardRules.find((item) => item.ap > 0 && item.trigger !== "scene_tag")!;
    const bonus = balance.difficulty.economy.relaxed.rewardApBonus;
    const relaxed = withDifficulty(createGame(), { english: "B1", economy: "relaxed" });
    const earned = earnRewards(relaxed, [rule.id]);
    expect(earned.state.ap).toBe(relaxed.ap + rule.ap + bonus);
    expect(earned.entries).toEqual([{ rewardId: rule.id, earnedAp: rule.ap + bonus, creditedAp: rule.ap + bonus, pendingAp: 0 }]);
    expect(earnRewards(earned.state, [rule.id]).state).toEqual(earned.state);
    expect(earnRewards(createGame(), [rule.id]).state.ap).toBe(rule.ap);
    const full = earnRewards({ ...relaxed, ap: balance.apCap }, [rule.id]).state;
    expect(full.pendingApRewards).toEqual([{ rewardId: rule.id, earnedAp: rule.ap + bonus, remainingAp: rule.ap + bonus }]);
  });
});

describe("the difficulty's English", () => {
  const quiz = battleQuizzes[battles.find((item) => item.id === BATTLE)!.quizId];
  const question = quiz.questions.find((item) => item.id === QUESTION)!;

  it("asks a question's other level when it has one, else as written; the answer stays", () => {
    const b2 = questionAtLevel(question, quiz.englishLevel, "B2");
    expect(b2).toMatchObject({ id: QUESTION, textKey: `${QUESTION}@B2`, askedLevel: "B2", correctOptionId: question.correctOptionId,
      questionEn: question.levels!.B2!.questionEn, hintJa: question.hintJa });
    expect(b2.options.map((option) => option.id)).toEqual(question.options.map((option) => option.id));
    expect(learningTranslations[b2.textKey].source.questionEn).toBe(b2.questionEn);
    expect(questionAtLevel(question, quiz.englishLevel, "B1")).toMatchObject({ textKey: QUESTION, questionEn: question.questionEn });
    expect(questionAtLevel(question, quiz.englishLevel, undefined).textKey).toBe(QUESTION);
  });

  it("refuses another level at the quiz's own level, or with the options' marks changed", () => {
    const own = structuredClone(quiz);
    own.questions[0].levels = { [quiz.englishLevel]: question.levels!.B2 };
    expect(quizSchema.safeParse(own).success).toBe(false);
    const reordered = structuredClone(quiz);
    reordered.questions[0].levels!.B2!.options.reverse();
    expect(quizSchema.safeParse(reordered).success).toBe(false);
    expect(quizSchema.safeParse(structuredClone(quiz)).success).toBe(true);
  });

  it("keeps a started quiz's English to its end, and asks the new level from the next quiz", () => {
    const b2 = withDifficulty(cityStart("mihon"), { english: "B2", economy: "standard" });
    const started = openBattleScene(b2, BATTLE);
    expect(started.activeBattle!.englishLevel).toBe("B2");
    expect(getActiveBattleContent(started.activeBattle!).quiz.questions[0].questionEn).toBe(question.levels!.B2!.questionEn);
    const changed = setEnglishLevel(started, "A2");
    expect(changed.revision).toBe(started.revision + 1);
    expect(difficultyOf(changed).english).toBe("A2");
    expect(restore(changed).activeBattle!.englishLevel).toBe("B2");
    expect(setEnglishLevel(changed, "A2")).toBe(changed);
    // At the quiz's own level the run keeps no level (the quiz's English as written).
    const own = withDifficulty(cityStart("mihon"), { english: quiz.englishLevel, economy: "standard" });
    expect(openBattleScene(own, BATTLE).activeBattle!.englishLevel).toBeUndefined();
  });
});
