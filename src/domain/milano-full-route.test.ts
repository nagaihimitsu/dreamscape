// Integration route through the whole Milan journey with the game's real Ink and domain functions
// (formerly qa/full-route.ts): every battle with skipped guides and wrong answers, then with read guides
// and correct answers; the optional epilogue; every standard date and the three confession outcomes.
import { describe, expect, it } from "vitest";
import { dates } from "../content";
import { advanceBattle, answerBattle, getActiveBattleContent, getReasoningContext, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "./battle";
import { getNextEpisode, getNextStoryBattle, startEpisode } from "./chapter";
import { advanceCityEpilogue, startCityEpilogue } from "./epilogue";
import { advanceDate, chooseDate, confessionResult, createGame, finishDate, startDate, validateGameState, type GameState } from "./game";
import { claimPendingRewards } from "./rewards";
import { advanceTourismGuide, skipTourismGuide, startTourismBattle } from "./tourism";

const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

function playMilano(allCorrect: boolean): GameState {
  let s = createGame("ユウ", "ミオ");
  const seen: string[] = [];
  while (!s.completedCityIds.includes("milano")) {
    const storyBattle = getNextStoryBattle(s);
    s = storyBattle ? startBattle(s, storyBattle.battleId) : startEpisode(s, getNextEpisode(s)!.id);
    while (s.activeTourism?.phase === "guide")
      s = allCorrect ? advanceTourismGuide(s, s.revision) : skipTourismGuide(s, s.revision);
    if (s.activeTourism) s = startTourismBattle(s, s.revision);
    expect(s.activeBattle).toBeTruthy();
    seen.push(s.activeBattle!.battleId);
    for (let frame = 0; s.activeBattle?.phase !== "result"; frame++) {
      expect(frame, "battle stuck").toBeLessThan(220);
      const active = s.activeBattle!;
      const { battle, quiz } = getActiveBattleContent(active);
      if (active.phase === "reasoning") {
        // Evidence works without observing anything first.
        expect(getReasoningContext(s)!.claimText.length).toBeGreaterThan(0);
        for (const id of [...battle.reasoning!.correctClueIds].reverse()) s = selectReasoningClue(s, id, s.revision);
        s = submitBattleEvidence(s, s.revision);
      } else if (active.phase === "question") {
        const question = quiz.questions[active.roundIndex];
        const answer = allCorrect ? question.correctOptionId : question.options.find((option) => option.id !== question.correctOptionId)!.id;
        s = answerBattle(s, answer, s.revision);
      } else s = advanceBattle(s, s.revision);
    }
    s = leaveBattle(s, s.revision);
    s = restore(s);
  }
  expect(seen).toHaveLength(7);
  // Every battle pays its first completion and first clear (Last Supper +4 chapter, finale +3 city clear);
  // read guides and first wins add 1 each. Special battles start directly here, so their guides are not read.
  expect(s.ap + s.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0)).toBe(allCorrect ? 30 : 19);
  s = startCityEpilogue(s, "milano", s.revision);
  while (s.activeEpilogue) s = advanceCityEpilogue(s, s.revision);
  expect(s.viewedEpilogueCityIds).toContain("milano");
  expect(s.playedDateIds).toHaveLength(0);
  return s;
}

function playDate(initial: GameState, id: string, amount = 9999, picks = [0, 0]): GameState {
  let n = 0;
  let s = startDate(initial, id, () => (n++ % 4 === 0 ? 0 : amount));
  expect(s.activeDate?.dateId).toBe(id);
  for (let tick = 0; s.activeDate; tick++) {
    expect(tick, `${id} stuck`).toBeLessThan(100);
    const frame = s.activeDate.frame;
    if (frame.choices.length) s = chooseDate(s, frame.choices[picks[s.activeDate.choiceCount] ?? 0].index, s.revision);
    else if (frame.ended) s = finishDate(s, s.revision);
    else s = advanceDate(s, s.revision);
  }
  return restore(s);
}

describe("full Milan route", () => {
  it("clears all seven battles with skipped guides and wrong answers", () => {
    playMilano(false);
  });

  it("clears the city with read guides, plays every standard date and reaches each confession outcome", () => {
    let s = playMilano(true);
    const early = playDate(s, "milano_cafe_01", 5000);
    expect(confessionResult(early)).toBe("deferred");
    const postponed = playDate(early, "milano_confession_01");
    expect(postponed.confessionStatus).toBe("deferred");
    expect(playDate(postponed, "milano_reassurance_01").endingReached).toBe(false);
    const rejectedSeed = playDate(s, "milano_san_satiro_date_01", 0, [0, 2]);
    expect(confessionResult(rejectedSeed)).toBe("rejected");
    expect(playDate(rejectedSeed, "milano_confession_01").confessionStatus).toBe("rejected");

    const normal = dates.filter((date) => date.kind === "normal" && date.chapterId === "milano");
    expect(normal).toHaveLength(12);
    expect(normal.reduce((sum, date) => sum + date.apCost, 0)).toBe(24);
    for (const date of [...normal].reverse()) {
      s = claimPendingRewards(s, s.revision);
      s = playDate(s, date.id);
    }
    expect(s.ap + s.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0)).toBe(30 - 24);
    expect(confessionResult(s)).toBe("accepted");
    s = playDate(s, "milano_confession_01");
    expect(s.endingReached).toBe(true);
  });
});
