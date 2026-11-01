import { describe, expect, it } from "vitest";
import eea1157 from "../../tests/fixtures/eea1157-v10-encounters.json";
import published from "../../tests/fixtures/fa0e7e0-v10-mid-scene.json";
import { battles, dates, dialogueExpressions, dialogueReactions, landmarks, stories } from "../content";
import { legacyDates, presentationStoryId } from "../content/legacy-milano";
import { resolveDialogueExpression } from "../content/dialogue-expressions";
import { resolveDialogueReaction } from "../content/dialogue-reactions";
import { encounters } from "../content/encounters";
import { activeDateStoryId, advanceDate, chooseDate, finishDate, getDateAvailability, isEventVisible, validateGameState } from "../domain/game";
import { activeGuideStoryId, advanceTourismGuide } from "../domain/tourism";
import { answerBattle, getActiveBattleContent, selectReasoningClue } from "../domain/battle";
import { chooseEncounter } from "../domain/encounter";
import { resolveRomancePresentation } from "../features/romance/romance-presentation";

describe("published Milan scenario compatibility", () => {
  it("uses the published story ID for old battle and guide annotations", () => {
    const battle = validateGameState(published.normal).activeBattle!;
    const guide = validateGameState(published.guide).activeTourism!;
    for (const archivedId of [getActiveBattleContent(battle).battle.storyId, activeGuideStoryId(guide)!]) {
      expect(archivedId).toMatch(/^legacy_fa0e7e0\//);
      const id = presentationStoryId(archivedId);
      const entry = dialogueExpressions.entries.find((item) => item.storyId === id);
      expect(entry).toBeDefined();
      const frame = { text: entry!.text, speaker: entry!.speaker, emotion: "neutral" };
      expect(resolveDialogueExpression(dialogueExpressions, id, frame)).toBe(entry!.emotion);
      const reaction = dialogueReactions.entries.find((item) => item.storyId === id);
      if (reaction) expect(resolveDialogueReaction(dialogueReactions, id, reaction, reaction.targetCharacterId)).toEqual({ expression: reaction.expression, mark: reaction.mark });
    }
  });
  it("continues a published regular battle with the original quiz and scoring", () => {
    const restored = validateGameState(published.normal);
    const active = restored.activeBattle!;
    const content = getActiveBattleContent(active);
    const question = content.quiz.questions[active.roundIndex];
    const next = answerBattle(restored, question.correctOptionId, restored.revision);
    expect(next.activeBattle?.answers.at(-1)?.correct).toBe(true);
    expect(validateGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
  });
  it.each(["b", "c"] as const)("resumes %s with its original proof after battle content changes", (fixture) => {
    const original = validateGameState(published[fixture]);
    const battle = battles.find((entry) => entry.id === original.activeBattle!.battleId)!;
    const oldName = battle.enemyNameJa;
    try {
      battle.enemyNameJa = `${oldName} (revised)`;
      const restored = validateGameState(published[fixture]);
      const content = getActiveBattleContent(restored.activeBattle!);
      expect(content.legacy).toBe(true);
      expect(content.battle.enemyNameJa).toBe(oldName);
      const selected = restored.activeBattle!.reasoning!.selectedClueIds[0];
      const next = selectReasoningClue(restored, selected, restored.revision);
      expect(next.activeBattle!.reasoning!.selectedClueIds).not.toContain(selected);
      expect(validateGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
    } finally { battle.enemyNameJa = oldName; }
  });

  it("resumes the original tourism guide when its current Ink is edited", () => {
    const old = validateGameState(published.guide);
    const landmark = landmarks.find((item) => item.id === old.activeTourism!.landmarkId)!;
    const id = landmark.guideStoryId;
    const source = stories[id];
    try {
      stories[id] = `${source} `;
      const restored = validateGameState(published.guide);
      const next = advanceTourismGuide(restored, restored.revision);
      expect(next).not.toBe(restored);
      expect(validateGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
    } finally { stories[id] = source; }
  });

  it("continues an earlier date at its original destination after a rewrite", () => {
    const state = published.date;
    const date = dates.find((entry) => entry.id === "milano_cafe_01")!;
    const original = legacyDates.find((entry) => entry.id === date.id)!;
    const id = original.storyId;
    const source = stories[id];
    const destination = date.destinationId;
    try {
      stories[id] = `${source} `;
      date.destinationId = "milano_la_scala";
      const restored = validateGameState(JSON.parse(JSON.stringify(state)));
      expect(activeDateStoryId(date, restored.activeDate!)).toBe(`legacy_fa0e7e0/${id}`);
      expect(resolveRomancePresentation(date, restored.activeDate!).destinationId).toBe(original.destinationId);
      const next = advanceDate(restored, restored.revision);
      expect(next).not.toBe(restored);
      expect(validateGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
    } finally { stories[id] = source; date.destinationId = destination; }
  });

  it("finishes an actual old LOVE date while preventing a new start", () => {
    let state = validateGameState(published.love);
    expect(state.activeDate?.dateId).toBe("milano_love_date_01");
    expect(isEventVisible(state, "milano_love_date_01")).toBe(false);
    expect(getDateAvailability({ ...state, activeDate: null }, "milano_love_date_01").available).toBe(false);
    const ap = state.ap;
    for (let count = 0; state.activeDate && count < 100; count++) {
      const frame = state.activeDate.frame;
      state = frame.ended ? finishDate(state, state.revision)
        : frame.choices.length ? chooseDate(state, 0, state.revision)
        : advanceDate(state, state.revision);
      state = validateGameState(JSON.parse(JSON.stringify(state)));
    }
    expect(state.activeDate).toBeNull();
    expect(state.playedDateIds).toContain("milano_love_date_01");
    expect(state.ap).toBe(ap);
  });

  it("loads and plays the published in-progress gift using its original event definition", () => {
    const event = encounters.encounters.find((entry) => entry.id === "galleria_gift")!;
    const title = event.titleJa;
    try {
      event.titleJa = `${title} (revised)`;
      const restored = validateGameState(eea1157.giftChoice);
      const next = chooseEncounter(restored, 0, restored.revision);
      expect(next.inventory.galleria_souvenir).toBe("gifted");
      expect(validateGameState(JSON.parse(JSON.stringify(next)))).toEqual(next);
    } finally { event.titleJa = title; }
  });
});
