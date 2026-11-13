// Milan's scene list. Its guides, battles, dates (but its confession), encounters and talks are knots of its place files;
// since the rewrite of 2026-11-13 (authoring/journeys/milano plan) no Milan encounter is left in the encounter catalog.
// This pins each inserted scene's moment, order, condition, money, items, people and 「また今度」 as the rewrite wrote
// them (the table below), and that the main parts do nothing of their own.
import { describe, expect, it } from "vitest";
import { scenes, sceneRewardRules } from "../../../src/content";
import type { Condition } from "../../../src/content/condition-schemas";
import type { SceneDone } from "../../../src/content/scene-schemas";
import { encounters } from "../../../src/content/encounters";
import { encounterEntryRule, landmarkVisitOrder } from "../../../src/domain/encounter";
import { visitOrder } from "../../../src/domain/encounter-moments";

const milan = encounters.encounters.filter((event) => event.cityId === "milano");
const episode = (id: string): Condition => ({ episodeCompleted: id });
const held = (id: string): Condition => ({ item: { id, is: "held" } });
type Inserted = { id: string; kind?: "talk"; title: string; landmark: string; file: string; when?: Condition; done?: SceneDone;
  repeat?: "always"; people?: string[]; options: { id: string; money?: number; give?: string; use?: string; later?: true }[] };
/** Milan's inserted scenes at a landmark's observation (`# priority: after observe`), in each file's written order. */
const inserted: Inserted[] = [
  { id: "duomo_string", title: "切れた三本目", landmark: "duomo_milano", file: "places/milano_duomo", when: episode("milano_duomo_episode"),
    done: { items: ["blue_pick"] }, options: [{ id: "coil" }, { id: "case" }, { id: "leave", later: true }] },
  { id: "supper_pantomime", title: "広場の無声映画", landmark: "last_supper", file: "places/milano_last_supper", when: episode("milano_last_supper_episode"),
    options: [{ id: "act" }, { id: "ask" }, { id: "leave", later: true }] },
  { id: "galleria_fortune", title: "回らない願掛け", landmark: "galleria_vittorio_emanuele_ii", file: "places/milano_galleria",
    done: { reward: "victory_galleria_first" }, repeat: "always", people: ["milano_galleria_boy", "milano_galleria_mother"],
    options: [{ id: "believe" }, { id: "doubt" }, { id: "leave" }] },
  { id: "milano_galleria_ticket_gift", kind: "talk", title: "", landmark: "galleria_vittorio_emanuele_ii", file: "places/milano_galleria",
    when: { encounterCompleted: "galleria_fortune" }, done: { items: ["galleria_ticket"] }, people: ["milano_galleria_mother"], options: [] },
  { id: "galleria_print", title: "版の実演、手はポケットに", landmark: "galleria_vittorio_emanuele_ii", file: "places/milano_galleria",
    when: episode("milano_last_supper_episode"), options: [{ id: "pay", money: -4 }, { id: "sample" }, { id: "leave", later: true }] },
  { id: "galleria_ticket_press", title: "券を一枚、手の中へ", landmark: "galleria_vittorio_emanuele_ii", file: "places/milano_galleria",
    when: { all: [episode("milano_last_supper_episode"), held("galleria_ticket")] },
    options: [{ id: "press", use: "galleria_ticket" }, { id: "watch", use: "galleria_ticket" }, { id: "later", later: true }] },
  { id: "scala_mint", title: "喉飴を噛む人", landmark: "la_scala_case", file: "places/milano_la_scala", when: { battlePlayed: "milano_la_scala_b01" },
    options: [{ id: "buy", money: -2 }, { id: "ask" }, { id: "leave", later: true }] },
  { id: "castello_pick", title: "弦を一本、余らせて", landmark: "castello_sforzesco", file: "places/milano_castello",
    when: { all: [episode("milano_castello_episode"), held("blue_pick")] },
    options: [{ id: "give", give: "blue_pick" }, { id: "ask", give: "blue_pick" }, { id: "later", later: true }] },
  { id: "brera_sitter", title: "モデルは五秒", landmark: "brera_case", file: "places/milano_brera", when: { battlePlayed: "milano_brera_c01" },
    options: [{ id: "pose" }, { id: "count" }, { id: "decline" }] },
];

describe("Milan's scene list", () => {
  it("lists its inserted scenes once each, all from its place files, and main parts that do nothing of their own", () => {
    const listed = scenes.filter((scene) => scene.cityId === "milano");
    expect(milan.map((event) => event.id).sort()).toEqual(inserted.map((item) => item.id).sort());
    expect(listed.filter((scene) => scene.origin === "catalog")).toEqual([]);
    expect(listed.filter((scene) => (scene.kind === "encounter" || scene.kind === "talk") && scene.origin === "place").map((scene) => scene.id).sort())
      .toEqual(inserted.map((item) => item.id).sort());
    // The guides, battles and epilogue: no choices, tags or moments. The dates' choices are their romance choices.
    const mains = listed.filter((scene) => scene.main && scene.kind !== "date");
    expect(mains.map((scene) => scene.kind).sort()).toEqual([...Array<string>(9).fill("battle"), "epilogue", ...Array<string>(6).fill("guide")]);
    for (const scene of mains) {
      expect([scene.origin, scene.at, scene.options, scene.done, scene.then, scene.when], scene.id).toEqual(["place", [], [], {}, undefined, undefined]);
    }
    expect(sceneRewardRules.filter((rule) => listed.some((scene) => scene.id === rule.sceneId))).toEqual([]);
  });

  it.each(inserted.map((item) => [item.id, item] as const))("%s: its moment, condition, money, items, people and repetition", (_, item) => {
    const scene = scenes.find((entry) => entry.id === item.id)!;
    expect(scene).toMatchObject({ origin: "place", kind: item.kind ?? "encounter", story: { storyId: item.file, knot: item.id },
      at: [{ visit: item.landmark }], priority: "after observe", repeat: item.repeat ?? "once", people: item.people ?? [] });
    if (item.title) expect(scene.title).toBe(item.title);
    expect(scene.when).toEqual(item.when);
    expect(encounterEntryRule(item.id)).toEqual({ encounterId: item.id, priority: "after observe", ...(item.when ? { when: item.when } : {}) });
    expect(scene.done).toEqual(item.done ?? {});
    expect(scene.options.map((option) => ({ id: option.id, ...(option.money ? { money: option.money } : {}), ...(option.give ? { give: option.give.item } : {}),
      ...(option.use ? { use: option.use } : {}), ...(option.later ? { later: option.later } : {}) }))).toEqual(item.options);
    expect(scene.options.every((option) => !option.requires && !option.profile && !option.rel && !option.set && !option.ap && !option.then)).toBe(true);
  });

  it("orders each landmark's visit the same from the list as the game does from the encounters", () => {
    for (const landmarkId of [...new Set(milan.map((event) => event.landmarkId!))])
      for (const slot of ["before", "observe", "after"] as const) {
        const fromList = visitOrder(scenes.filter((scene) => scene.cityId === "milano" && (scene.kind === "encounter" || scene.kind === "talk")).map((scene) => ({
          encounterId: scene.id, landmarkId: "visit" in scene.at[0] ? scene.at[0].visit : "", storyId: scene.story.knot ? `${scene.story.storyId}.${scene.story.knot}` : scene.story.storyId,
          priority: encounterEntryRule(scene.id)?.priority, order: scene.order,
        })), landmarkId, slot);
        expect(fromList, `${landmarkId} ${slot}`).toEqual(landmarkVisitOrder(landmarkId, slot));
      }
    // The Galleria's observation: the wish, its ticket, then the print stall's two, in written order.
    expect(landmarkVisitOrder("galleria_vittorio_emanuele_ii", "observe"))
      .toEqual(["galleria_fortune", "milano_galleria_ticket_gift", "galleria_print", "galleria_ticket_press"]);
  });
});
