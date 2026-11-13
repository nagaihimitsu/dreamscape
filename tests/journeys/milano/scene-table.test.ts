// Milan at the unified event design's stage 3a: its encounters stay where they are (answer 3; its guides, battles and
// epilogue moved into place files on 2026-11-13 with their text and effects unchanged). content:build reads
// its encounter catalog and entry rules into the scene list (origin "catalog"); this pins that the list says
// the same as the catalogs (the same encounters, at the same visit moments and order, with the same
// conditions, money, items and 「また今度」), and that the game still runs Milan from the catalogs.
import { describe, expect, it } from "vitest";
import { scenes, sceneRewardRules } from "../../../src/content";
import { encounters } from "../../../src/content/encounters";
import { encounterEntryRule, landmarkVisitOrder } from "../../../src/domain/encounter";
import { visitOrder } from "../../../src/domain/encounter-moments";

const milan = encounters.encounters.filter((event) => event.cityId === "milano");

describe("Milan's scene list equals its catalogs", () => {
  it("lists every Milan encounter once, read from the catalog; Milan's other scenes are its main parts, which do nothing of their own", () => {
    const listed = scenes.filter((scene) => scene.cityId === "milano");
    expect(milan.length).toBe(8);
    const fromCatalog = listed.filter((scene) => scene.origin === "catalog");
    expect(fromCatalog.map((scene) => [scene.id, scene.origin, scene.kind])).toEqual(milan.map((event) => [event.id, "catalog", "encounter"]));
    // The guides, battles and epilogue are knots of the place files (2026-11-13): the same text, no choices, tags or moments.
    const mains = listed.filter((scene) => scene.origin !== "catalog");
    expect(mains.map((scene) => scene.kind).sort()).toEqual([...Array<string>(9).fill("battle"), "epilogue", ...Array<string>(6).fill("guide")]);
    for (const scene of mains) {
      expect([scene.origin, scene.at, scene.options, scene.done, scene.then, scene.when], scene.id).toEqual(["place", [], [], {}, undefined, undefined]);
      expect(scene.main, scene.id).toBeDefined();
    }
    expect(sceneRewardRules.filter((rule) => listed.some((scene) => scene.id === rule.sceneId))).toEqual([]);
  });

  it.each(milan.map((event) => [event.id, event] as const))("%s: the same moment, condition, money, items and repetition", (_, event) => {
    const scene = scenes.find((item) => item.id === event.id)!;
    const rule = encounterEntryRule(event.id);
    expect(scene).toMatchObject({ title: event.titleJa, story: { storyId: event.storyId }, at: [{ visit: event.landmarkId }],
      priority: rule?.priority ?? "after observe", repeat: event.repeatable ? "always" : "once" });
    expect(scene.when).toEqual(rule?.when);
    expect(scene.done).toEqual({ ...(event.completionItemId ? { items: [event.completionItemId] } : {}), ...(event.completionMoney ? { money: event.completionMoney } : {}) });
    expect(scene.options.map((option) => ({ id: option.id, money: option.money, requires: option.requires, give: option.give?.item, use: option.use,
      later: option.later, profile: option.profile }))).toEqual(event.options.map((option) => ({
      id: option.id, money: option.cost ? -option.cost : undefined,
      requires: option.requiresItemId ? [{ item: { id: option.requiresItemId, is: "held" } }] : undefined,
      give: option.giftItemId, use: option.consumeItemId, later: option.deferCompletion ? true : undefined, profile: option.responseProfileId,
    })));
  });

  it("orders each landmark's visit the same from the list as the game does from the catalogs", () => {
    for (const landmarkId of [...new Set(milan.map((event) => event.landmarkId!))])
      for (const slot of ["before", "observe", "after"] as const) {
        const fromList = visitOrder(scenes.filter((scene) => scene.cityId === "milano" && scene.kind === "encounter").map((scene) => ({
          encounterId: scene.id, landmarkId: "visit" in scene.at[0] ? scene.at[0].visit : "", storyId: scene.story.storyId,
          priority: encounterEntryRule(scene.id)?.priority, order: scene.order,
        })), landmarkId, slot);
        expect(fromList, `${landmarkId} ${slot}`).toEqual(landmarkVisitOrder(landmarkId, slot));
      }
  });
});
