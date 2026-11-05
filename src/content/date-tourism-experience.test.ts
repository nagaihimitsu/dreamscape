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
// Facts actually spoken in the new scripts, not just in background narration.
// Each is present in a shared passage so no choice silently removes it.
const currentPlaceDetails: Record<string, RegExp> = {
  milano_cafe_01: /透明な管、焙煎する前の豆/,
  milano_walk_01: /地下には昔の礼拝施設/,
  milano_night_01: /入口をつなぐ共同の廊下/,
  milano_city_date_01: /ドゥオモ広場とスカラ広場/,
  milano_la_scala_date_01: /昔のスカラ座では客が桟敷を好きに飾った/,
  milano_brera_date_01: /片方だけ階段にかかってる/,
  milano_navigli_date_01: /洗濯する人たちが水を引いて/,
  milano_san_satiro_date_01: /漆喰で作られた見せかけ/,
  milano_starbucks_roastery_date_01: /昔は郵便局だった/,
  milano_fondazione_prada_date_01: /昔の建物と新しく作った建物が並んでる/,
  milano_novecento_date_01: /ネオンの管を手で曲げて/,
  milano_maurizio_date_sound: /修道女たちがいた向こう側にも壁画が残ってる/,
};

beforeAll(async () => {
  content = await buildContent(path.resolve("."), false);
}, 120_000);

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

  it("includes a local observation in spoken dialogue on every path in the Milan scripts", () => {
    const normalDates = content.dates.filter((date) => date.chapterId === "milano" && date.kind === "normal");
    expect(Object.keys(currentPlaceDetails)).toHaveLength(normalDates.length);
    const tones = ["reserved", "strained", "comfortable", "guarded_attraction", "warm", "romantic_tension"];
    for (const [dateId, detail] of Object.entries(currentPlaceDetails)) {
      const date = normalDates.find((entry) => entry.id === dateId);
      expect(date, dateId).toBeDefined();
      for (const tone of tones) for (let first = 0; first < 3; first++) for (let second = 0; second < 3; second++)
        for (const firstResult of ["positive", "negative"]) for (const secondResult of ["positive", "negative"]) {
          const story = new Story(content.stories[date!.storyId]);
          story.BindExternalFunction("has_memory", () => false, true);
          const values: Record<string, string | number | boolean> = {
            player_name: "航", heroine_name: "りえ", player_address: "航さん",
            romance_stage: tone === "romantic_tension" ? 4 : 1,
            ending_reached: tone === "romantic_tension",
            relationship_tone: tone, relationship_tone_before: tone, relationship_tone_after: tone,
          };
          for (const [key, value] of Object.entries(values))
            if (story.variablesState.GlobalVariableExistsWithName(key)) story.variablesState.$(key, value);
          let speaker = "";
          let spoken = "";
          let choiceCount = 0;
          const backgrounds = new Set<string>();
          for (let guard = 0; guard < 300; guard++) {
            while (story.canContinue) {
              const line = story.Continue() ?? "";
              for (const tag of story.currentTags ?? []) {
                if (tag.startsWith("speaker:")) speaker = tag.slice("speaker:".length).trim();
                if (tag.startsWith("background:")) backgrounds.add(tag.slice("background:".length).trim());
              }
              if (speaker === "heroine" || speaker === "player") spoken += line;
            }
            if (!story.currentChoices.length) break;
            expect(story.currentChoices, `${dateId} choice ${choiceCount}`).toHaveLength(3);
            expect(choiceCount, `${dateId}: too many choices`).toBeLessThan(2);
            story.variablesState.$("romance_result", choiceCount === 0 ? firstResult : secondResult);
            story.ChooseChoiceIndex(choiceCount === 0 ? first : second);
            choiceCount++;
          }
          const context = `${dateId}, ${tone}, choices ${first}/${second}, ${firstResult}/${secondResult}`;
          expect(choiceCount, context).toBe(2);
          expect(story.canContinue, context).toBe(false);
          expect(backgrounds.has(date!.backgroundAssetId), context).toBe(true);
          expect(spoken, context).toMatch(detail);
        }
    }
  }, 120_000);

  it("keeps local conversation and the real backdrop in invitations and rain pauses for all three choices", () => {
    const cases = [
      { id: "milano_invitation_01", detail: /先を歩きたい/, effects: ["sound_invitation_01_1_1", "sound_invitation_01_1_2", "sound_invitation_01_1_3"] },
      { id: "milano_rain_pause_01", detail: /傘を開いたら/, effects: ["sound_rain_pause_01_1_1", "sound_rain_pause_01_1_2", "sound_rain_pause_01_1_3"] },
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
        let allLines = "";
        const backgrounds = new Set<string>();
        const effects = new Set<string>();
        let choiceCount = 0;
        for (let guard = 0; guard < 300; guard++) {
          while (story.canContinue) {
            const line = story.Continue() ?? "";
            allLines += line;
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
        expect(allLines, event.id).toContain("ガッレリア");
        expect(heroineLines, event.id).toMatch(event.detail);
        expect([...effects], event.id).toEqual([event.effects[choice]]);
      }
    }
  }, 30_000);

});
