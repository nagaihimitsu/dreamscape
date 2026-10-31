import { beforeAll, describe, expect, it } from "vitest";
import { Story } from "inkjs";
import path from "node:path";
import { buildContent } from "../../scripts/content-pipeline";
import presentationData from "../../content/romance/presentation.json";
import { presentationSchema } from "./schemas";

type Content = Awaited<ReturnType<typeof buildContent>>;
let content: Content;
const presentation = presentationSchema.parse(presentationData);

// Editorially reviewed place-specific details spoken by the heroine. These
// are examples of tourist conversation, not automatic proof of historical
// accuracy; their accompanying sources still require human review.
const placeDetails: Record<string, RegExp> = {
  milano_cafe_01: /AUF/,
  milano_walk_01: /像の写し/,
  milano_night_01: /同じ廊下/,
  milano_city_date_01: /ドゥオモ広場とスカラ広場/,
  milano_la_scala_date_01: /桟敷席/,
  milano_brera_date_01: /足.*階段/,
  milano_navigli_date_01: /洗濯に使ってた石/,
  milano_san_satiro_date_01: /漆喰.*遠近法/,
  milano_starbucks_roastery_date_01: /郵便局/,
  milano_fondazione_prada_date_01: /蒸留所/,
  milano_love_date_01: /二週間/,
};

beforeAll(async () => {
  content = await buildContent(path.resolve("."), false);
}, 30_000);

describe("tourism in normal dates", () => {
  it("connects every normal date to a real destination, sources, and a registered background", () => {
    const normalDates = content.dates.filter((date) => date.kind === "normal");
    expect(normalDates.length).toBeGreaterThanOrEqual(11);
    for (const date of normalDates) {
      const destination = content.destinations.find((item) => item.id === date.destinationId);
      expect(destination, date.id).toBeDefined();
      expect(destination!.cityId, date.id).toBe(date.chapterId);
      expect(destination!.facts.length, date.id).toBeGreaterThan(0);
      expect(destination!.backgroundAssetId, date.id).toBe(date.backgroundAssetId);
      const background = presentation.backgrounds[date.backgroundAssetId];
      expect(background, date.id).toBeDefined();
      if (background.imageAssetId) {
        const asset = content.tourism.assets.find((item) => item.id === background.imageAssetId);
        expect(asset, date.id).toBeDefined();
        expect(asset!.sourceUrl, date.id).toMatch(/^https:\/\//);
        expect(asset!.licenseUrl, date.id).toMatch(/^https:\/\//);
        expect(asset!.creditJa, date.id).toBeTruthy();
        expect(asset!.modificationJa, date.id).toBeTruthy();
      } else {
        // An explicitly neutral fallback cannot be mistaken for a real photo.
        expect(background.fallback, date.id).toBe("neutral");
      }
    }
  });

  it("preserves the original Ink for dates whose scripts were replaced", () => {
    for (const date of content.dates.filter((entry) => entry.legacyStoryIds?.length)) {
      for (const storyId of date.legacyStoryIds!) {
        expect(storyId, date.id).not.toBe(date.storyId);
        expect(content.stories[storyId], `${date.id}: ${storyId}`).toBeDefined();
      }
    }
  });

  it("lets both early and close relationships hear a local detail on every choice path", () => {
    const normalDates = content.dates.filter((date) => date.kind === "normal");
    for (const [dateId, detail] of Object.entries(placeDetails)) {
      const date = normalDates.find((entry) => entry.id === dateId);
      expect(date, dateId).toBeDefined();
      for (const stage of [1, 4]) for (let first = 0; first < 3; first++) for (let second = 0; second < 3; second++) {
        const story = new Story(content.stories[date!.storyId]);
        story.BindExternalFunction("has_memory", () => stage === 4, true);
        const values: Record<string, string | number | boolean> = {
          player_name: "航", heroine_name: "りえ", player_address: "航さん",
          romance_stage: stage, ending_reached: stage === 4, has_cafe_memory: stage === 4,
          confession_ready: stage === 4, memory_callback: "以前の話",
        };
        for (const [key, value] of Object.entries(values)) {
          if (story.variablesState.GlobalVariableExistsWithName(key)) story.variablesState.$(key, value);
        }
        let speaker = "";
        let heroineLines = "";
        const backgrounds = new Set<string>();
        let choiceCount = 0;
        for (let guard = 0; guard < 300; guard++) {
          while (story.canContinue) {
            const line = story.Continue() ?? "";
            for (const tag of story.currentTags ?? []) {
              if (tag.startsWith("speaker:")) speaker = tag.slice("speaker:".length).trim();
              if (tag.startsWith("background:")) backgrounds.add(tag.slice("background:".length).trim());
            }
            if (speaker === "heroine") heroineLines += line;
          }
          if (!story.currentChoices.length) break;
          expect(story.currentChoices, `${dateId} choice ${choiceCount}`).toHaveLength(3);
          story.ChooseChoiceIndex(choiceCount === 0 ? first : second);
          choiceCount++;
          expect(choiceCount, `${dateId}: too many choices`).toBeLessThanOrEqual(2);
        }
        expect(choiceCount, dateId).toBe(2);
        expect(story.canContinue, dateId).toBe(false);
        expect(backgrounds.has(date!.backgroundAssetId), dateId).toBe(true);
        expect(heroineLines, `${dateId}, stage ${stage}, choices ${first}/${second}`).toMatch(detail);
      }
    }
  }, 30_000);

  it("keeps local conversation and the real backdrop in invitations and rain pauses for all three choices", () => {
    const cases = [
      { id: "milano_invitation_01", detail: /ミラノの居間/, effects: ["milano_invitation_chosen_joke", "milano_invitation_chosen_listen", "milano_invitation_chosen_honest"] },
      { id: "milano_rain_pause_01", detail: /ガラスを鉄で支えた屋根/, effects: ["milano_rain_pause_music", "milano_rain_pause_watch", "milano_rain_pause_hurry"] },
    ];
    for (const event of cases) {
      const date = content.dates.find((entry) => entry.id === event.id);
      expect(date, event.id).toBeDefined();
      expect(date!.kind, event.id).toBe("special");
      const background = presentation.backgrounds[date!.backgroundAssetId];
      expect(background.imageAssetId, event.id).toBeTruthy();
      expect(content.tourism.assets.find((asset) => asset.id === background.imageAssetId), event.id).toBeDefined();
      for (const stage of [1, 4]) for (let choice = 0; choice < 3; choice++) {
        const story = new Story(content.stories[date!.storyId]);
        const values: Record<string, string | number | boolean> = {
          player_name: "航", heroine_name: "りえ", player_address: "航さん",
          romance_stage: stage, ending_reached: stage === 4, confession_ready: stage === 4,
          memory_callback: "以前の話",
        };
        for (const [key, value] of Object.entries(values)) {
          if (story.variablesState.GlobalVariableExistsWithName(key)) story.variablesState.$(key, value);
        }
        let speaker = "";
        let heroineLines = "";
        const backgrounds = new Set<string>();
        const effects = new Set<string>();
        let choiceCount = 0;
        for (let guard = 0; guard < 300; guard++) {
          while (story.canContinue) {
            const line = story.Continue() ?? "";
            for (const tag of story.currentTags ?? []) {
              if (tag.startsWith("speaker:")) speaker = tag.slice("speaker:".length).trim();
              if (tag.startsWith("background:")) backgrounds.add(tag.slice("background:".length).trim());
              if (tag.startsWith("effect:")) effects.add(tag.slice("effect:".length).trim());
            }
            if (speaker === "heroine") heroineLines += line;
          }
          if (!story.currentChoices.length) break;
          expect(story.currentChoices, event.id).toHaveLength(3);
          story.ChooseChoiceIndex(choice);
          choiceCount++;
          expect(choiceCount, event.id).toBeLessThanOrEqual(1);
        }
        expect(choiceCount, event.id).toBe(1);
        expect(story.canContinue, event.id).toBe(false);
        expect(backgrounds.has(date!.backgroundAssetId), event.id).toBe(true);
        expect(heroineLines, event.id).toMatch(event.detail);
        expect([...effects], event.id).toEqual([event.effects[choice]]);
      }
    }
  }, 30_000);

});
