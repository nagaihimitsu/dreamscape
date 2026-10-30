import { Story } from "inkjs";
import type { BattleDefinition } from "../src/content/schemas";
import type { TourismClue } from "../src/content/tourism-schemas";
import { parseStoryTags, type TagContext } from "../src/content/tags";

export function reasoningScenes(battle: BattleDefinition): string[] {
  const reasoning = battle.reasoning;
  if (!reasoning) return [];
  return [
    reasoning.claimScene,
    ...(reasoning.kind === "contradiction" ? [reasoning.pressScene] : []),
    reasoning.successScene,
    reasoning.failureScene,
  ];
}

/** A single explicit answer set prevents order-dependent or ambiguous proof recipes. */
export function validateBattleEvidence(
  battle: BattleDefinition,
  clues: TourismClue[],
): void {
  if (!battle.reasoning) return;
  for (const id of battle.reasoning.caseClueIds) {
    const clue = clues.find((item) => item.id === id);
    if (!clue || clue.landmarkId !== battle.landmarkId)
      throw new Error(`Unknown or mismatched battle evidence: ${id}`);
  }
}

/** Exercise every reachable scene/last-answer/score input with the official Ink runtime. */
export function validateBattleStory(
  compiled: string,
  battle: BattleDefinition,
  context: TagContext,
): number {
  const inputs = [{ scene: battle.scenes.intro, correct: false, score: 0 }];
  const afterAnswers = [...battle.scenes.afterRounds, battle.scenes.outro];
  afterAnswers.forEach((scene, index) => {
    const answered = index + 1;
    for (const correct of [false, true]) {
      // Last answer constrains the possible total (e.g. a wrong third answer cannot score 3).
      for (
        let score = Number(correct);
        score < answered + Number(correct);
        score++
      ) {
        inputs.push({ scene, correct, score });
      }
    }
  });
  if (battle.reasoning) {
    const answered = battle.reasoning.roundIndex;
    for (const scene of reasoningScenes(battle)) {
      if (answered === 0) inputs.push({ scene, correct: false, score: 0 });
      else {
        for (const correct of [false, true]) {
          for (
            let score = Number(correct);
            score < answered + Number(correct);
            score++
          ) {
            inputs.push({ scene, correct, score });
          }
        }
      }
    }
  }
  for (const input of inputs) {
    const story = new Story(compiled);
    story.onError = (message) => {
      throw new Error(message);
    };
    const variables = {
      player_name: "検証主人公",
      heroine_name: "検証ヒロイン",
      player_address: "検証主人公さん",
      battle_scene: input.scene,
      answer_correct: input.correct,
      battle_score: input.score,
    };
    for (const [key, value] of Object.entries(variables)) {
      if (!story.variablesState.GlobalVariableExistsWithName(key)) {
        if (key === "player_address") continue;
        throw new Error(`Missing required battle Ink variable: ${key}`);
      }
      story.variablesState.$(key, value);
    }
    let lines = 0;
    let hasText = false;
    while (story.canContinue) {
      if (++lines > 200)
        throw new Error("Battle story contains a loop or too many lines");
      const line = story.Continue()?.trim() ?? "";
      const tags = parseStoryTags(story.currentTags ?? [], context);
      if (tags.effects.length)
        throw new Error("Battle story cannot apply effects");
      if (line) {
        hasText = true;
        if (
          !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(line)
        )
          throw new Error(`Battle dialogue must be Japanese: ${line}`);
      }
    }
    if (story.currentChoices.length)
      throw new Error(
        "Battle story cannot contain choices; quiz choices belong in JSON",
      );
    if (!hasText) throw new Error(`Empty battle scene: ${input.scene}`);
  }
  return inputs.length;
}
