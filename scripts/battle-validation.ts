import { Story } from "inkjs";
import type { BattleDefinition } from "../src/content/schemas";
import type { TourismClue } from "../src/content/tourism-schemas";
import { checkLinesWithoutChoice } from "./ink-validation";
import { condWalk, forEachCondAssignment } from "./scene-conditions";
import { parseStoryTags, type TagContext } from "../src/content/tags";
import type { DialogueObserver } from "./dialogue-expression-validation";

/** A scene-form battle's reasoning scenes (stages 3–4; the one-flow form names none). */
export function reasoningScenes(battle: BattleDefinition): string[] {
  const reasoning = battle.reasoning;
  if (!reasoning || !battle.scenes) return [];
  return [
    reasoning.claimScene!,
    ...(reasoning.kind === "contradiction" ? [reasoning.pressScene!] : []),
    reasoning.successScene!,
    reasoning.failureScene!,
  ];
}

/**
 * A one-flow special battle's helper knot (<battle>_claim, <battle>_press; stage 5) read on its own, as the clue book reads it
 * (src/story/runtime.ts readStoryKnotLines): from the knot to its `->->`, for every cond assignment and each quiz result before it.
 * Stops the build when the read reaches a choice (its own or one in a knot it calls, a quiz's or the reasoning's call included)
 * or an error, which would leave the clue book without its text.
 */
export function checkHelperKnot(compiled: string, knot: string, conds: readonly string[]): void {
  for (const assignment of condWalk(conds).assignments) for (const correct of [false, true]) for (const score of [0, 1, 2, 3]) {
    const story = new Story(compiled);
    let ended = false;
    story.onError = (message) => {
      if (!/tunnel onwards/u.test(message)) throw new Error(`The helper knot ${knot}, read on its own as the clue book reads it, stops with an error: ${message}`);
      ended = true;
    };
    story.BindExternalFunction("cond", (text: unknown) => assignment[String(text)] ?? false, true);
    for (const [name, value] of Object.entries({ player_name: "検証主人公", heroine_name: "検証ヒロイン", player_address: "検証主人公さん",
      quiz_correct: correct, answer_correct: correct, battle_score: score }))
      if (story.variablesState.GlobalVariableExistsWithName(name)) story.variablesState.$(name, value);
    story.ChoosePathString(knot);
    for (let lines = 0; story.canContinue && !ended; lines++) {
      checkLinesWithoutChoice(lines);
      story.Continue();
    }
    if (story.currentChoices.length)
      throw new Error(`The helper knot ${knot} reaches a choice ("${story.currentChoices[0].text.trim()}"), read on its own as the clue book reads it: ` +
        `write the choices in the battle's flow, not in its claim or press (nor in a knot they call)`);
  }
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

/**
 * Exercise every reachable scene/last-answer/score input of a scene-form battle (stages 3–4) with the official Ink runtime.
 * A battle in the one-flow form (stage 5) is walked as a scene instead (scene-walk.ts, its calls answered).
 */
export function validateBattleStory(
  compiled: string,
  battle: BattleDefinition,
  context: TagContext,
  observe?: DialogueObserver,
  /** The battle's knot in a place file (the stitch form, stages 3–4): each scene starts at <knot>.<scene>, without battle_scene. */
  knot?: string,
): number {
  const scenes = battle.scenes;
  if (!scenes) throw new Error(`The battle ${battle.id} is in the one-flow form (no scenes): walk it as a scene`);
  const inputs = [{ scene: scenes.intro, correct: false, score: 0 }];
  const afterAnswers = [...scenes.afterRounds, scenes.outro];
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
  return forEachCondAssignment(compiled, (bind) => {
    for (const input of inputs) {
      const story = new Story(compiled);
      bind(story);
      story.onError = (message) => {
        throw new Error(message);
      };
      const variables = {
        player_name: "検証主人公",
        heroine_name: "検証ヒロイン",
        player_address: "検証主人公さん",
        ...(knot ? {} : { battle_scene: input.scene }),
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
      if (knot) story.ChoosePathString(`${knot}.${input.scene}`);
      let lines = 0;
      let hasText = false;
      let speaker: string = "narrator";
      let explicitEmotion = false;
      while (story.canContinue) {
        checkLinesWithoutChoice(++lines);
        const line = story.Continue()?.trim() ?? "";
        const tags = parseStoryTags(story.currentTags ?? [], context);
        if (tags.speaker) speaker = tags.speaker;
        if (tags.emotion !== undefined) explicitEmotion = true;
        if (tags.effects.length)
          throw new Error("Battle story cannot apply effects");
        if (line) {
          hasText = true;
          observe?.(line, speaker, explicitEmotion);
          explicitEmotion = false;
        }
      }
      if (story.currentChoices.length)
        throw new Error(
          "A battle in the scene form (scenes in battles/catalog.json) cannot contain choices; quiz choices belong in JSON, " +
          "and a battle in the one-flow form (stage 5) may have the conversation's choices (A15)",
        );
      if (!hasText) throw new Error(`Empty battle scene: ${input.scene}`);
    }
    return inputs.length;
  });
}
