import { balance, city } from "../content";
import { createGame, startDate, validateGameState, type GameState } from "../domain/game";
import { getNextEpisode, getNextStoryBattle, startEpisode } from "../domain/chapter";
import { openTourism, replayTourismGuide, skipTourismGuide, startTourismBattle } from "../domain/tourism";
import { advanceBattle, answerBattle, getActiveBattleContent, leaveBattle, selectReasoningClue, startBattle, submitBattleEvidence } from "../domain/battle";
import { startEncounter } from "../domain/encounter";

export type DebugScene = "tourism" | "battle" | "encounter" | "date";
export type DebugSettings = {
  scene: DebugScene;
  id: string;
  progress: "initial" | "completed";
  ap: number;
  affection: number;
  trust: number;
  spark: number;
  roll: "positive" | "negative";
};

/** Generate a consistent completed journey using the actual game rules. */
function completedJourney(): GameState {
  let state = createGame();
  for (let count = 0; !state.completedCityIds.includes(city.id); count++) {
    if (count > 30) throw new Error("旅の準備を完了できませんでした。");
    const special = getNextStoryBattle(state);
    const episode = getNextEpisode(state);
    if (!special && !episode) throw new Error("次の旅が見つかりません。");
    state = special ? startBattle(state, special.battleId) : startEpisode(state, episode!.id);
    if (state.activeTourism?.phase === "guide") state = skipTourismGuide(state, state.revision);
    if (state.activeTourism) state = startTourismBattle(state, state.revision);
    for (let step = 0; state.activeBattle?.phase !== "result"; step++) {
      if (!state.activeBattle || step > 250) throw new Error("バトルの準備を完了できませんでした。");
      const active = state.activeBattle;
      const { battle, quiz } = getActiveBattleContent(active);
      if (active.phase === "reasoning") {
        for (const id of battle.reasoning!.correctClueIds) state = selectReasoningClue(state, id, state.revision);
        state = submitBattleEvidence(state, state.revision);
      } else if (active.phase === "question") {
        state = answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision);
      } else state = advanceBattle(state, state.revision);
    }
    state = leaveBattle(state, state.revision);
  }
  return validateGameState(state);
}
let complete: GameState | undefined;

/** Build only states the real game functions can start; never alter player data. */
export function createDebugState(settings: DebugSettings): GameState {
  const base = settings.progress === "initial" ? createGame() : (complete ??= completedJourney());
  let state: GameState = {
    ...base,
    // The requested AP value is the whole debug balance; retained pending
    // credits would otherwise be paid immediately after a date starts.
    pendingApRewards: [],
    ap: Math.min(balance.apCap, Math.max(0, settings.ap)),
    affection: settings.affection,
    trust: settings.trust,
    spark: settings.spark,
  };
  const nextRoll = () => settings.roll === "positive" ? 0 : 9999;
  switch (settings.scene) {
    case "tourism":
      state = openTourism(state, settings.id);
      if (state.activeTourism?.phase === "exploring") state = replayTourismGuide(state, state.revision);
      if (!state.activeTourism) throw new Error("この進行状態では場所を開けません。都市クリア後を選んでください。");
      break;
    case "battle":
      state = startBattle(state, settings.id);
      if (!state.activeBattle) throw new Error("この進行状態ではバトルを始められません。");
      break;
    case "encounter":
      state = startEncounter(state, settings.id, nextRoll);
      if (!state.activeEncounter) throw new Error("この進行状態では交流を始められません。必要な進行や品物を確認してください。");
      break;
    case "date":
      state = startDate(state, settings.id, nextRoll);
      if (!state.activeDate) throw new Error("この進行状態ではデートを始められません。APや解放条件を確認してください。");
      break;
  }
  return validateGameState(state);
}
