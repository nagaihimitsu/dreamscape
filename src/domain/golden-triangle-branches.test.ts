import { Story } from "inkjs";
import { describe, expect, it } from "vitest";
import { battles, battleQuizzes, dates, encounters, presentation, stories, tagContext } from "../content";
import { parseStoryTags, type StoryTags } from "../content/tags";
import { bindItemReader } from "../story/items";
import { bindMemoryReader } from "../story/memory";
import { RELATIONSHIP_TONES } from "./romance-tone";

const indiaCities = ["delhi", "agra", "jaipur"];
const indiaDates = dates.filter((date) => indiaCities.includes(date.chapterId));
const indiaBattles = battles.filter((battle) => battle.id.startsWith("gt_"));

function runtime(storyId: string, variables: Record<string, string | boolean | number>) {
  const story = new Story(stories[storyId]);
  story.onError = (message) => { throw new Error(`${storyId}: ${message}`); };
  // Every route is exercised without memories or items from optional dates.
  bindMemoryReader(story, [], Object.keys(presentation.memories));
  bindItemReader(story, {}, encounters.items.map((item) => item.id));
  for (const [key, value] of Object.entries({ player_name: "航", heroine_name: "澪", player_address: "航さん", ...variables })) {
    if (story.variablesState.GlobalVariableExistsWithName(key)) story.variablesState.$(key, value);
  }
  return story;
}

/** Read one authored segment up to its next choice/end, validating the actual
 * emitted tags (including branches that the usual happy-path smoke test misses). */
function segment(story: Story, initialSpeaker: StoryTags["speaker"] = "narrator") {
  const text: string[] = [];
  const effects: string[] = [];
  let speaker = initialSpeaker;
  for (let step = 0; story.canContinue; step++) {
    expect(step, "A scene must reach a choice or an ending").toBeLessThan(200);
    const line = story.Continue()?.trim() ?? "";
    const tags = parseStoryTags(story.currentTags ?? [], tagContext);
    speaker = tags.speaker ?? speaker;
    effects.push(...tags.effects);
    if (line) {
      expect(speaker, line).not.toBe("player");
      expect(line).not.toMatch(/\{(?:player_name|heroine_name|player_address)\}/);
      text.push(line);
    }
  }
  return { text: text.join("\n"), effects, speaker };
}

function choose(story: Story, index: number, result: "positive" | "negative", speaker: StoryTags["speaker"]) {
  const choice = story.currentChoices[index];
  const tags = parseStoryTags(choice.tags ?? [], tagContext);
  story.variablesState.$("romance_result", result);
  story.ChooseChoiceIndex(index);
  const next = segment(story, tags.speaker ?? speaker);
  return { ...next, effects: [...tags.effects, ...next.effects] };
}

describe("Golden Triangle authored branching contracts", () => {
  it("covers the complete published cast and independent date set", () => {
    expect(indiaDates).toHaveLength(18);
    expect(indiaBattles).toHaveLength(15);
    for (const date of indiaDates) {
      expect(date.kind).toBe("normal");
      expect(date.requiredPlayedDateIds).toEqual([]);
      expect(date.allowAfterEnding).toBe(true);
      expect(date.choiceCount).toBe(2);
      expect(date.effectCount).toBe(2);
    }
  });

  for (const date of indiaDates) {
    it(`${date.id}: all 9 choice paths, 4 outcome pairs and 12 relationship contexts finish independently`, () => {
      let endings = 0;
      for (const tone of RELATIONSHIP_TONES) for (const dating of [false, true]) {
        const story = runtime(date.storyId, {
          romance_stage: dating ? 4 : 1, ending_reached: dating,
          relationship_tone: tone, relationship_tone_before: tone, relationship_tone_after: tone,
        });
        const intro = segment(story);
        expect(intro.effects).toEqual([]);
        expect(story.currentChoices).toHaveLength(3);
        const firstSnapshot = story.state.ToJson();
        for (let first = 0; first < 3; first++) {
          const firstResponses: string[] = [];
          for (const firstResult of ["positive", "negative"] as const) {
            story.state.LoadJson(firstSnapshot);
            const middle = choose(story, first, firstResult, intro.speaker);
            firstResponses.push(middle.text);
            expect(middle.effects, `${date.id}/${tone}/${first}/${firstResult}`).toHaveLength(1);
            expect(story.currentChoices).toHaveLength(3);
            const secondSnapshot = story.state.ToJson();
            for (let second = 0; second < 3; second++) {
              const secondResponses: string[] = [];
              for (const secondResult of ["positive", "negative"] as const) {
                story.state.LoadJson(secondSnapshot);
                const ending = choose(story, second, secondResult, middle.speaker);
                secondResponses.push(ending.text);
                const context = `${date.id}/${tone}/${dating}/${first}:${firstResult}/${second}:${secondResult}`;
                expect(ending.text, context).not.toBe("");
                expect(story.currentChoices, context).toHaveLength(0);
                expect(story.canContinue, context).toBe(false);
                expect(ending.effects, context).toHaveLength(1);
                expect(new Set([...middle.effects, ...ending.effects]).size, context).toBe(2);
                // Bold dialogue is still an ordinary date, never a formal confession.
                expect(story.variablesState.$("ending_reached"), context).toBe(dating);
                expect(story.variablesState.$("romance_stage"), context).toBe(dating ? 4 : 1);
                endings++;
              }
              expect(secondResponses[0], `${date.id}: second choice ${second} must react to the saved roll`).not.toBe(secondResponses[1]);
            }
          }
          expect(firstResponses[0], `${date.id}: first choice ${first} must react to the saved roll`).not.toBe(firstResponses[1]);
        }
      }
      expect(endings).toBe(9 * 4 * RELATIONSHIP_TONES.length * 2);
    }, 60_000);
  }

  for (const battle of indiaBattles) {
    it(`${battle.id}: correct/incorrect responses and every final score leave the story playable`, () => {
      const quiz = battleQuizzes[battle.quizId];
      const intro = segment(runtime(battle.storyId, { battle_scene: battle.scenes.intro, battle_score: 0, answer_correct: false }));
      expect(intro.text).not.toBe("");
      expect(intro.effects).toEqual([]);
      for (const scene of battle.scenes.afterRounds) for (const correct of [false, true]) {
        const story = runtime(battle.storyId, { battle_scene: scene, battle_score: correct ? 1 : 0, answer_correct: correct });
        const response = segment(story);
        expect(response.text, `${battle.id}/${scene}/${correct}`).not.toBe("");
        expect(response.effects).toEqual([]);
        expect(story.currentChoices).toHaveLength(0);
      }
      for (let score = 0; score <= quiz.questions.length; score++) for (const correct of [false, true]) {
        // Only possible score/last-answer combinations are meaningful.
        if ((score === 0 && correct) || (score === quiz.questions.length && !correct)) continue;
        const story = runtime(battle.storyId, { battle_scene: battle.scenes.outro, battle_score: score, answer_correct: correct });
        const ending = segment(story);
        expect(ending.text, `${battle.id}/${score}/${correct}`).not.toBe("");
        expect(ending.effects).toEqual([]);
        expect(story.currentChoices).toHaveLength(0);
      }
    });
  }
});
