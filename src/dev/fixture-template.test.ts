import { describe, expect, it } from "vitest";
import {
  battles, cityContents, dateDestinations, dates, episodes, journeyConfig, landmarks, tourismClues,
} from "../content";
import { encounters } from "../content/encounters";
import { journeys } from "../content/journeys";
import { SAMPLE_JOURNEY_ID } from "../../scripts/content-layout";
import { findDebugTemplate, noTemplateMessage, sampleJourneyId, type DebugTemplate, type DebugTemplateContent } from "./fixture-template";

const sampleMissing = "見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してから、もう一度テストしてください。";

/** The generated content limited to some journeys, as if the other journey folders were removed. */
function contentOf(journeyIds: readonly string[]): DebugTemplateContent {
  const kept = journeys.filter((journey) => journeyIds.includes(journey.id));
  const cityIds = new Set(kept.flatMap((journey) => journey.cities.map((city) => city.id)));
  const keptLandmarks = landmarks.filter((item) => cityIds.has(item.cityId));
  const keptBattles = battles.filter((item) => keptLandmarks.some((landmark) => landmark.id === item.landmarkId) || cityIds.has(item.cityId ?? ""));
  const dateEvents = new Set([...cityIds].flatMap((id) => cityContents[id]?.travel.events.map((event) => event.id) ?? []));
  return {
    journeys: structuredClone(kept),
    cityContents: Object.fromEntries(Object.entries(cityContents).filter(([id]) => cityIds.has(id)).map(([id, city]) => [id, structuredClone(city)])),
    episodes: episodes.filter((item) => cityIds.has(item.cityId)),
    battles: keptBattles,
    landmarks: keptLandmarks,
    tourismClues: tourismClues.filter((item) => keptLandmarks.some((landmark) => landmark.id === item.landmarkId)),
    storyBattles: journeyConfig.storyBattles.filter((item) => keptBattles.some((battle) => battle.id === item.battleId)),
    encounters: { items: encounters.items.filter((item) => cityIds.has(item.cityId)), encounters: encounters.encounters.filter((item) => cityIds.has(item.cityId)) },
    dates: dates.filter((item) => dateEvents.has(item.id)),
    dateDestinations: dateDestinations.filter((item) => cityIds.has(item.cityId)),
  };
}
const repositoryJourneys = ["milano", "golden_triangle", "uzbekistan", "luang_prabang"];
const roleIds = (template: DebugTemplate) => ({
  city: template.city.city.id, journey: template.journey.id,
  normal: [template.normal.episode.id, template.normal.landmark.id, template.normal.battle.id, template.normal.place.id],
  finale: template.finale.episode.id, specialB: template.special_b?.battle.id, specialC: template.special_c?.battle.id,
  encounter: template.encounter && [template.encounter.encounter.id, template.encounter.item.id],
  date: template.date && [template.date.date.id, template.date.destination.id], missing: template.missing, note: template.note,
});
function requireSample() {
  if (!journeys.some((journey) => journey.id === sampleJourneyId)) throw new Error(sampleMissing);
}

describe("the template city of Debug's 仮の場面", () => {
  it("names the same sample journey as the content tools", () => {
    expect(sampleJourneyId).toBe(SAMPLE_JOURNEY_ID);
  });

  it("is Milan with every role when the sample is not loaded", () => {
    expect(roleIds(findDebugTemplate(contentOf(repositoryJourneys)))).toEqual({
      city: "milano", journey: "milano",
      normal: ["milano_duomo_episode", "duomo_milano", "milano_duomo_01", "p_duomo"], finale: "milano_finale",
      specialB: "milano_la_scala_b01", specialC: "milano_brera_c01", encounter: ["duomo_string", "blue_pick"],
      date: ["milano_cafe_01", "milano_starbucks_roastery"], missing: [], note: "",
    });
  });

  it("prefers the loaded sample journey, although its order puts it last", () => {
    requireSample();
    expect(journeys.at(-1)?.id).toBe(sampleJourneyId);
    const sample = {
      city: "mihon", journey: sampleJourneyId,
      normal: ["smp_mihon_main_clock_tower", "mihon_clock_tower", "smp_mihon_main_clock_tower_battle", "mihon_clock_tower"], finale: "smp_mihon_finale",
      specialB: "smp_mihon_special_b_market", specialC: "smp_mihon_special_c_library", encounter: ["smp_mihon_bookmark_stall", "smp_mihon_three_bookmark"],
      date: ["smp_mihon_date_tower_square", "mihon_tower_square"], missing: [], note: "",
    };
    expect(roleIds(findDebugTemplate(contentOf([...repositoryJourneys, sampleJourneyId])))).toEqual(sample);
    // The sample alone has every role, too.
    expect(roleIds(findDebugTemplate(contentOf([sampleJourneyId])))).toEqual(sample);
  });

  it("falls back to Delhi without Milan and says which scenes are missing", () => {
    const template = findDebugTemplate(contentOf(["golden_triangle", "uzbekistan", "luang_prabang"]));
    expect(roleIds(template)).toEqual({
      city: "delhi", journey: "golden_triangle",
      normal: ["gt_delhi_main_red_fort", "delhi_red_fort", "gt_delhi_main_red_fort_battle", "delhi_red_fort"], finale: "gt_delhi_finale",
      specialB: undefined, specialC: undefined, encounter: undefined,
      date: ["gt_delhi_date_india_gate", "delhi_india_gate"], missing: ["special_b", "special_c", "encounter"],
      note: "元にしたデリーに特殊戦B（矛盾追及）・特殊戦C（証拠連結）・品物をくれる道中交流がないため、仮の場面にもありません。",
    });
  });

  it("explains that no city can be copied", () => {
    expect(() => findDebugTemplate(contentOf(["uzbekistan", "luang_prabang"]))).toThrow(noTemplateMessage);
    expect(noTemplateMessage).toBe("仮の場面の元になる都市がありません。公開中の旅行編のどれかに、案内と対決のある観光地の通常エピソード、" +
      "その出来事の地点と徒歩の経路、エピローグのある都市フィナーレを持つ都市が必要です。");
  });

  it("skips preparing journeys and cities missing a required role", () => {
    const preparing = contentOf(repositoryJourneys);
    preparing.journeys.find((journey) => journey.id === "milano")!.status = "preparing";
    expect(findDebugTemplate(preparing).city.city.id).toBe("delhi");

    const withoutEvent = contentOf(repositoryJourneys);
    const travel = withoutEvent.cityContents.milano.travel;
    travel.events.splice(travel.events.findIndex((event) => event.id === "milano_duomo_episode"), 1);
    expect(findDebugTemplate(withoutEvent).normal.episode.id).toBe("milano_galleria_episode");

    const withoutEpilogue = contentOf(repositoryJourneys);
    withoutEpilogue.episodes = withoutEpilogue.episodes.map((episode) => episode.id === "milano_finale" ? { ...episode, epilogueStoryId: undefined } : episode);
    expect(findDebugTemplate(withoutEpilogue).city.city.id).toBe("delhi");

    const withoutWalk = contentOf(repositoryJourneys);
    const milan = withoutWalk.cityContents.milano.travel;
    milan.routes = milan.routes.filter((route) => route.mode !== "walk");
    expect(findDebugTemplate(withoutWalk).city.city.id).toBe("delhi");
  });

  it("leaves out an optional role whose data cannot be copied as it is", () => {
    const content = contentOf(repositoryJourneys);
    // A case clue that is not on the special battle's own landmark.
    content.battles = content.battles.map((battle) => battle.id === "milano_la_scala_b01" && battle.reasoning
      ? { ...battle, reasoning: { ...battle.reasoning, caseClueIds: [...battle.reasoning.caseClueIds.slice(1), "brera_clue_elsewhere"] } } : battle);
    // The only plain item encounter needs an item to choose.
    content.encounters = { ...content.encounters, encounters: content.encounters.encounters.map((event) => event.id === "duomo_string"
      ? { ...event, options: event.options.map((option) => ({ ...option, requiresItemId: "galleria_ticket" })) } : event) };
    const template = findDebugTemplate(content);
    expect(template.city.city.id).toBe("milano");
    expect(template.missing).toEqual(["special_b", "encounter"]);
    expect(template.note).toBe("元にしたミラノに特殊戦B（矛盾追及）・品物をくれる道中交流がないため、仮の場面にもありません。");
  });

  it("uses a named city as the template when it has the required roles", () => {
    expect(findDebugTemplate(contentOf(repositoryJourneys), "delhi").city.city.id).toBe("delhi");
    expect(findDebugTemplate(contentOf(repositoryJourneys), "milano").missing).toEqual([]);
    expect(() => findDebugTemplate(contentOf(repositoryJourneys), "tashkent")).toThrow(
      "都市「tashkent」は仮の場面の元にできません。元にする都市には、案内と対決のある観光地の通常エピソード、その出来事の地点と徒歩の経路、エピローグのある都市フィナーレが必要です。");
    expect(() => findDebugTemplate(contentOf(repositoryJourneys), "atlantis")).toThrow("都市「atlantis」は仮の場面の元にできません。");
  });
});
