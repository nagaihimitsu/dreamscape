import type { Page } from "@playwright/test";
import { loadSnapshot } from "./helpers";

type CurrentScene =
  | "date" | "dateReaction" | "dateChoice" | "guide" | "castleGuide" | "observation" | "freeTime"
  | "battleDialogue" | "battleQuestion" | "supperQuestion" | "battleResult" | "pendingResult" | "freeTimeEarly" | "finaleDialogue"
  | "specialBDialogue" | "specialBReasoning" | "specialBPressed" | "specialBSelected" | "specialBAccepted" | "specialBQuestion" | "specialBResult"
  | "specialCDialogue" | "specialCReasoning" | "specialCSelected" | "specialCAccepted" | "specialCQuestion";

/** Create a current-version scene with the real game rules in the Vite browser. */
export async function loadCurrentScene(page: Page, target: CurrentScene): Promise<void> {
  await page.goto("/");
  const state = await page.evaluate(async (name) => {
    // Import through Vite, which handles the project's JSON and compiled Ink.
    const debugUrl = "/src/dev/debug-state.ts";
    const gameUrl = "/src/domain/game.ts";
    const battleUrl = "/src/domain/battle.ts";
    const tourismUrl = "/src/domain/tourism.ts";
    const { createDebugState } = await import(debugUrl);
    const { advanceDate } = await import(gameUrl);
    const { advanceBattle, answerBattle, getActiveBattleContent, leaveBattle, pressBattleClaim, selectReasoningClue, submitBattleEvidence } = await import(battleUrl);
    const { closeTourism, discoverClue, skipTourismGuide, startTourismBattle } = await import(tourismUrl);
    const special = name.startsWith("specialB") ? "B" : name.startsWith("specialC") ? "C" : null;
    const tourism = ["guide", "castleGuide", "observation", "freeTime", "supperQuestion"].includes(name);
    const battle = name.startsWith("battle") || name === "pendingResult" || name === "freeTimeEarly" || name === "finaleDialogue" || !!special;
    const scene = tourism ? "tourism" : battle ? "battle" : "date";
    const id = tourism ? (name === "castleGuide" ? "castello_sforzesco" : (name === "observation" || name === "supperQuestion") ? "last_supper" : "duomo_milano")
      : special === "B" ? "milano_la_scala_b01" : special === "C" ? "milano_brera_c01"
      : name === "finaleDialogue" ? "milano_city_boss_01" : battle ? "milano_duomo_01"
      : name === "dateReaction" ? "milano_walk_01" : "milano_cafe_01";
    let game = createDebugState({ scene, id, progress: ["battleResult", "pendingResult", "freeTimeEarly"].includes(name) ? "initial" : "completed", ap: name === "pendingResult" ? 12 : name === "battleResult" || name === "freeTimeEarly" ? 0 : 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
    if (name === "dateChoice") {
      while (!game.activeDate.frame.choices.length) game = advanceDate(game, game.revision);
    } else if (name === "battleQuestion") {
      while (game.activeBattle.phase !== "question") game = advanceBattle(game, game.revision);
    } else if (name === "observation" || name === "supperQuestion") {
      game = skipTourismGuide(game, game.revision);
      game = discoverClue(game, "last_supper_perspective", game.revision);
      if (name === "supperQuestion") {
        game = startTourismBattle(game, game.revision);
        while (game.activeBattle.phase !== "question") game = advanceBattle(game, game.revision);
      }
    } else if (name === "freeTime") {
      game = closeTourism(game, game.revision);
    } else if (name === "battleResult" || name === "pendingResult" || name === "freeTimeEarly" || (special && !name.endsWith("Dialogue"))) {
      const goal = special && !name.endsWith("Result") ? "reasoning" : "result";
      for (let count = 0; game.activeBattle.phase !== goal; count++) {
        if (count > 100) throw new Error("Current test battle could not reach its target");
        if (game.activeBattle.phase === "reasoning") {
          const { battle } = getActiveBattleContent(game.activeBattle);
          for (const clue of battle.reasoning.correctClueIds) game = selectReasoningClue(game, clue, game.revision);
          game = submitBattleEvidence(game, game.revision);
        } else if (game.activeBattle.phase === "question") {
          const { quiz } = getActiveBattleContent(game.activeBattle);
          game = answerBattle(game, quiz.questions[game.activeBattle.roundIndex].correctOptionId, game.revision);
        } else game = advanceBattle(game, game.revision);
      }
      if (name === "freeTimeEarly") game = leaveBattle(game, game.revision);
      if (name === "pendingResult") game = { ...game, ap: 6 };
      if (special && name.endsWith("Pressed")) game = pressBattleClaim(game, game.revision);
      if (special && (name.endsWith("Selected") || name.endsWith("Accepted") || name.endsWith("Question"))) {
        const { battle } = getActiveBattleContent(game.activeBattle);
        const clues: string[] = battle.reasoning.correctClueIds;
        const selected = name.endsWith("Selected") ? clues.slice(0, 1) : clues;
        for (const clue of selected) game = selectReasoningClue(game, clue, game.revision);
        if (!name.endsWith("Selected")) game = submitBattleEvidence(game, game.revision);
        if (name.endsWith("Question")) {
          while (game.activeBattle.phase !== "question") game = advanceBattle(game, game.revision);
        }
      }
    }
    return game;
  }, target);
  await loadSnapshot(page, state);
}
