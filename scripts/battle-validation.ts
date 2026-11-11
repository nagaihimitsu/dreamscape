import { Story } from "inkjs";
import type { BattleDefinition, QuizDefinition } from "../src/content/schemas";
import type { TourismCatalog, TourismClue } from "../src/content/tourism-schemas";
import { checkLinesWithoutChoice } from "./ink-validation";
import { condWalk } from "./scene-conditions";
import { bindItemReader } from "../src/story/items";
import { bindMemoryReader } from "../src/story/memory";

/**
 * A special battle's helper knot (<battle>_claim, <battle>_press) read on its own, as the clue book reads it
 * (src/story/runtime.ts readStoryKnotLines): from the knot to its `->->`, for each cond assignment of condWalk, a wrong and a right quiz result,
 * and no memory and every memory held (has_memory; has_item_status reads no item held, as the battle walk reads them).
 * Stops the build when the read reaches a choice (its own or one in a knot it calls, a quiz's or the reasoning's call included)
 * or an error, which would leave the clue book without its text.
 */
export function checkHelperKnot(compiled: string, knot: string, conds: readonly string[],
  known: { memoryIds: readonly string[]; itemIds: readonly string[] }): void {
  const memorySets = known.memoryIds.length ? [[], known.memoryIds] : [[]];
  const { assignments } = condWalk(conds);
  for (const memories of memorySets) {
    // One story per memory set (its reader is bound once); reset for each read.
    const story = new Story(compiled);
    let assignment: Record<string, boolean> = {};
    let ended = false;
    story.onError = (message) => {
      if (!/tunnel onwards/u.test(message)) throw new Error(`The helper knot ${knot}, read on its own as the clue book reads it, stops with an error: ${message}`);
      ended = true;
    };
    bindMemoryReader(story, memories, known.memoryIds);
    bindItemReader(story, {}, known.itemIds);
    story.BindExternalFunction("cond", (text: unknown) => assignment[String(text)] ?? false, true);
    // Representative quiz results only: a wrong answer with no score, a right one with every point.
    for (const current of assignments) for (const [correct, score] of [[false, 0], [true, 3]] as const) {
      story.ResetState();
      assignment = current;
      ended = false;
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
 * A question's revealRegion is drawn on its battle's landmark photo (the answer's feedback zooms toward it): the quiz
 * names a landmark (a city finale has none; a battle's landmark is its quiz's) whose photo (`imageAssetId`) is an asset
 * of tourism/catalog.json. A placeholder photo counts (journey:new marks every copied one so; the battle shows it).
 * The problem, for the first question that has one (`file`: how the message names the quiz file), or undefined.
 */
export function revealRegionProblem(quiz: Pick<QuizDefinition, "landmarkId" | "questions">,
  tourism: Pick<TourismCatalog, "landmarks" | "assets">, file: string): string | undefined {
  const question = quiz.questions.find((item) => item.revealRegion);
  if (!question) return undefined;
  const head = `写真の種明かし（revealRegion）は、対決の観光地の写真に重ねて出します：${file} の問い ${question.id} は`;
  if (quiz.landmarkId === null)
    return `${head}都市フィナーレの問いなので、写真がありません。revealRegion（と revealCaptionJa）を消してください` +
      `（A city finale's question has no landmark photo for its revealRegion: ${question.id}）`;
  const landmark = tourism.landmarks.find((item) => item.id === quiz.landmarkId);
  if (landmark && tourism.assets.some((asset) => asset.id === landmark.imageAssetId)) return undefined;
  return `${head}観光地 ${quiz.landmarkId} の問いですが、tourism/catalog.json にその写真がありません` +
    `（landmarks の imageAssetId と、同じIDの assets を登録してください）` +
    `（No landmark photo for the revealRegion of ${question.id}: ${quiz.landmarkId}）`;
}
