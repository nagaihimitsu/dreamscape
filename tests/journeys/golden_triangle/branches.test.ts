import { Story } from "inkjs";
import { describe, expect, it } from "vitest";
import { battles, battleQuizzes, dates, encounters, presentation, scenes, stories, tagContext } from "../../../src/content";
import { splitStoryAddress } from "../../../src/content/story-address";
import { parseStoryTags, type StoryTags } from "../../../src/content/tags";
import { bindItemReader } from "../../../src/story/items";
import { bindMemoryReader } from "../../../src/story/memory";

const indiaCities = ["delhi", "agra", "jaipur"];
const indiaDates = dates.filter((date) => indiaCities.includes(date.chapterId));
const indiaBattles = battles.filter((battle) => battle.id.startsWith("gt_"));

function runtime(storyId: string, variables: Record<string, string | boolean | number>, cond?: (text: string) => boolean) {
  const story = new Story(stories[storyId]);
  story.onError = (message) => { throw new Error(`${storyId}: ${message}`); };
  // Every route is exercised without memories or items from optional dates.
  bindMemoryReader(story, [], Object.keys(presentation.memories));
  bindItemReader(story, {}, encounters.items.map((item) => item.id));
  // A place file's cond("…"): every text read the same way (all true, then all false).
  if (cond) story.BindExternalFunction("cond", (text: unknown) => cond(String(text)), true);
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
    expect(indiaDates).toHaveLength(24);
    expect(indiaBattles).toHaveLength(15);
    const normal = indiaDates.filter((date) => date.kind === "normal");
    expect(normal).toHaveLength(18);
    for (const date of normal) {
      // The map condition is the knot head's # when: (GT-3b; one place only).
      expect(date.when).toEqual({ episodesCompleted: { city: date.chapterId, atLeast: 1 } });
      expect(date.until).toBeUndefined();
      expect(date.allowAfterEnding).toBe(true);
      expect(date.choiceCount).toBe(2);
      expect(date.storyId).toMatch(new RegExp(`^places/gt_${date.chapterId}_[a-z_]+\\.${date.id}$`));
    }
    expect(indiaDates.filter((date) => date.kind !== "normal").map((date) => date.kind).sort())
      .toEqual(["confession", "confession", "confession", "reassurance", "reassurance", "reassurance"]);
  });

  // The 18 normal dates (place-file knots with tags, GT-3b): every path, with every cond text true and false and both
  // reaction results, ends; meets the two romance choices; keeps exactly one memory; and each romance choice reacts to the roll.
  for (const date of indiaDates.filter((item) => item.kind === "normal")) {
    it(`${date.id}: every path ends with two romance choices and one memory, and each romance choice reacts to the roll`, () => {
      const scene = scenes.find((item) => item.id === date.id)!;
      const { storyId, path } = splitStoryAddress(date.storyId);
      const options = new Map(scene.options.map((option) => [option.id, option]));
      let endings = 0;
      for (const truth of [false, true]) for (const dating of [false, true]) {
        const story = runtime(storyId, { romance_stage: dating ? 4 : 1, ending_reached: dating,
          relationship_tone: "warm", relationship_tone_before: "warm", relationship_tone_after: "warm" }, () => truth);
        story.ChoosePathString(path!);
        const intro = segment(story);
        expect(intro.effects).toEqual([]);
        const walk = (snapshot: string, speaker: StoryTags["speaker"], romance: number, memories: string[]) => {
          story.state.LoadJson(snapshot);
          const choices = story.currentChoices;
          const context = `${date.id}/${truth}/${dating}/${romance}`;
          if (!choices.length) {
            expect(story.canContinue, context).toBe(false);
            expect(romance, context).toBe(2);
            expect(memories, context).toEqual([`${date.id}_memory`]);
            endings++;
            return;
          }
          for (let index = 0; index < choices.length; index++) {
            const option = options.get(parseStoryTags(choices[index].tags ?? [], tagContext).optionId ?? "");
            const own = option?.knot === scene.story.knot;
            const responses: string[] = [];
            for (const result of own ? (["positive", "negative"] as const) : (["positive"] as const)) {
              story.state.LoadJson(snapshot);
              const next = choose(story, index, result, speaker);
              expect(next.effects, context).toEqual([]);
              responses.push(next.text);
              walk(story.state.ToJson(), next.speaker, romance + (own ? 1 : 0), [...memories, ...(option?.memory ?? [])]);
            }
            if (own) expect(responses[0], `${context}: ${option!.id} must react to the saved roll`).not.toBe(responses[1]);
          }
        };
        walk(story.state.ToJson(), intro.speaker, 0, []);
      }
      expect(endings).toBeGreaterThan(0);
    }, 60_000);
  }

  for (const battle of indiaBattles) {
    it(`${battle.id}: every combination of correct and incorrect answers leaves the one flow playable to its end`, () => {
      // -> quiz(n) -> calls the quiz, which comes back with quiz_correct and battle_score (stage 5).
      // The battle is a knot of its landmark's place file (#116): the flow starts there, as the game starts it.
      const { storyId, path } = splitStoryAddress(battle.storyId);
      expect(storyId, battle.id).toMatch(/^places\/gt_[a-z_]+$/u);
      expect(path).toBe(battle.id);
      const quiz = battleQuizzes[battle.quizId];
      const total = quiz.questions.length;
      for (let mask = 0; mask < 1 << total; mask++) {
        const story = runtime(storyId, {});
        story.ChoosePathString(path!);
        let score = 0;
        for (let round = 0; round <= total; round++) {
          const part = segment(story);
          expect(part.text, `${battle.id}/${mask}/${round}`).not.toBe("");
          expect(part.effects).toEqual([]);
          if (round === total) break;
          expect(story.currentChoices.map((choice) => choice.tags), `${battle.id}/${mask}/${round}`).toEqual([["call: quiz"]]);
          expect(story.variablesState.$("call_arg")).toBe(round + 1);
          const correct = !!(mask & (1 << round));
          score += Number(correct);
          story.variablesState.$("quiz_correct", correct);
          story.variablesState.$("battle_score", score);
          story.ChooseChoiceIndex(0);
        }
        expect(story.currentChoices).toHaveLength(0);
        expect(story.canContinue).toBe(false);
      }
    });
  }
});
