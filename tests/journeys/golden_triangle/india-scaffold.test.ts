import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildJourneyFragments, journeyRequirements, loadJourneyScaffold } from "../../../scripts/journey-scaffold";

// The Golden Triangle's own travel data and observations through the scaffold.
// The scaffold's shared rules (selection errors, finale and special events,
// missing scenarios) are checked on fictional cities in scripts/journey-authoring.test.ts.

const input = loadJourneyScaffold(process.cwd(), "golden_triangle");
const scene = { titleJa: "試験", descriptionJa: "試験用の場面", clearTitleJa: "試験完了", clearDescriptionJa: "試験用の記録",
  enemyNameJa: "試験人物", enemyTitleJa: "試験の人", enemyDescriptionJa: "試験用の人物" };
const date = { titleJa: "試験", descriptionJa: "試験用の場面", memoryTitleJa: "試験の思い出", memoryDescriptionJa: "試験用の記録" };
function narrative(city: string) {
  const plan = journeyRequirements(input, [city])[0];
  return { main: Object.fromEntries(plan.main.map((item) => [item.eventId, scene])),
    dates: Object.fromEntries(plan.dates.map((item) => [item.eventId, date])),
    finales: { [city]: { ...scene, placeId: plan.main[0].landmarkId, activityMinutes: 60 } } };
}

describe("Golden Triangle authoring scaffold", () => {
  it("derives isolated city fragments from existing travel data and verified observations", () => {
    const plan = journeyRequirements(input, ["delhi"])[0];
    const fragments = buildJourneyFragments(input, narrative("delhi"), ["delhi"]);
    expect([plan.main.length, plan.dates.length]).toEqual([4, 6]);
    expect([fragments.episodes.length, fragments.battles.length, fragments.landmarks.length, fragments.dates.length]).toEqual([5, 5, 4, 6]);
    expect(fragments.battles.every((battle) => battle.portrait === "abstract")).toBe(true);
    expect(fragments.effects).toHaveLength(60);
    expect(new Set(fragments.effects.map((effect) => effect.id)).size).toBe(60);
    expect(Object.keys(fragments.memories)).toHaveLength(6);
    expect(fragments.clues.map((clue) => clue.id)).toEqual(input.observations.filter((clue) => plan.main.some((main) => main.landmarkId === clue.landmarkId)).map((clue) => clue.id));
    expect(fragments.episodes.at(-1)?.requiredEpisodeIds).toEqual(plan.main.map((item) => item.eventId));
    expect(fragments.rewards.find((reward) => reward.trigger === "city_clear")?.ap).toBe(4);
    const finale = fragments.finaleEvents[0];
    const destinationEvent = input.cities.find((city) => city.cityId === "delhi")!.events.find((event) => event.placeId === finale.placeId)!;
    expect(finale.admissionCost ?? 0).toBe(destinationEvent.admissionCost ?? 0);
  });

  it("names the stories as the published catalogs do (docs/02 「IDの付け方」): the guide after the landmark (its knot in the landmark's place file), the battle after its event", () => {
    const catalog = (file: string) => JSON.parse(readFileSync(`content/journeys/golden_triangle/${file}`, "utf8"));
    const guides = new Map(catalog("tourism/catalog.json").landmarks.map((landmark: { id: string; guideStoryId: string }) => [landmark.id, landmark.guideStoryId]));
    const battles = new Map(catalog("battles/catalog.json").battles.map((battle: { id: string; storyId: string }) => [battle.id, battle.storyId]));
    for (const plan of journeyRequirements(input)) for (const main of plan.main) {
      expect(main.guideStoryId).toBe(`tourism/gt_${main.landmarkId}_guide`);
      // The published guide is the knot of the scaffold's name in the landmark's place file (GT-3a: form only).
      expect(guides.get(main.landmarkId)).toBe(`places/gt_${main.landmarkId}.${main.guideStoryId.split("/").at(-1)}`);
      expect(battles.get(main.battleId)).toBe(main.battleStoryId);
    }
  });
});
