import { describe, expect, it } from "vitest";
import {
  codeWords, formatUnusedReport, jsonKeyCounts, maskCode, namedKnots, readingText, schemaKeys, unreachedKnots, unreadSchemaKeys, unusedEntries,
  type CatalogEntry,
} from "./content-unused";

const place = [
  "INCLUDE modules.ink",
  "-> DONE",
  "",
  "=== alpha_talk ===",
  "# scene: talk",
  "# at: visit alpha_gate",
  "{greet()} 会話。",
  "-> alpha_helper ->",
  "-> END",
  "",
  "=== alpha_helper ===",
  "手伝いの行。",
  "-> alpha_deeper.part",
  "",
  "=== alpha_deeper ===",
  "= part",
  "深い行。",
  "->->",
  "",
  "=== alpha_orphan ===",
  "// -> alpha_lost (a comment points nowhere)",
  "誰も来ない行。",
  "-> END",
  "",
  "=== alpha_lost ===",
  "迷子の行。",
  "-> END",
  "",
  "=== alpha_battle ===",
  "# scene: battle",
  "-> DONE",
  "",
  "=== alpha_battle_press ===",
  "追及の行。",
  "->->",
  "",
  "=== alpha_named ===",
  "データが指す行。",
  "-> END",
  "",
  "=== function greet() ===",
  "~ return \"やあ\"",
  "",
  "=== function unused_fn() ===",
  "~ return 1",
].join("\n");

describe("unreachedKnots", () => {
  it("follows scenes, diverts, tunnels, the knots data names and the functions reached knots call", () => {
    const named = namedKnots(["places/alpha_place.alpha_named", "not an address", "places/alpha_place.alpha_talk.stitch"], ["places/alpha_place.alpha_battle"]);
    expect(named).toContainEqual({ storyId: "places/alpha_place", knot: "alpha_battle_press" });
    const found = unreachedKnots([{ storyId: "places/alpha_place", file: "content/journeys/alpha/stories/places/alpha_place.ink", journey: "alpha", source: place }], named);
    expect(found.map((item) => [item.knot, item.line, item.isFunction])).toEqual([["alpha_orphan", 20, false], ["alpha_lost", 25, false], ["unused_fn", 44, true]]);
  });

  it("reaches a one-scene file's knots from its top", () => {
    const source = "VAR x = 1\n開始。\n-> next\n=== next ===\n次。\n-> END\n=== spare ===\n余り。\n-> END\n";
    const found = unreachedKnots([{ storyId: "dates/beta_date", file: "beta.ink", journey: "beta", source }], []);
    expect(found.map((item) => item.knot)).toEqual(["spare"]);
  });
});

describe("unusedEntries", () => {
  const entry = (value: Record<string, unknown>, where: string): CatalogEntry => ({ value, file: "content/journeys/alpha/x.json", journey: "alpha", where });
  it("finds a date destination no date names, a battle off the map, a landmark no visit opens and a person no line names", () => {
    const found = unusedEntries({
      destinations: [entry({ id: "alpha_cafe" }, "destinations[0]"), entry({ id: "alpha_park" }, "destinations[1]")],
      dates: [entry({ id: "alpha_date", destinationId: "alpha_park" }, "dates[0]")],
      battles: [entry({ id: "alpha_q1", landmarkId: "alpha_gate" }, "battles[0]"), entry({ id: "alpha_q2" }, "battles[1]")],
      episodes: [entry({ id: "alpha_ep", battleId: "alpha_q1", landmarkId: "alpha_gate" }, "episodes[0]")],
      storyBattles: [],
      landmarks: [entry({ id: "alpha_gate" }, "landmarks[0]"), entry({ id: "alpha_tower" }, "landmarks[1]")],
      people: [entry({ id: "alpha_kamla" }, "people[0]"), entry({ id: "alpha_ghost" }, "people[1]")],
      inkSources: ["# speaker: alpha_kamla\nこんにちは。\n// alpha_ghost only in a comment"],
    });
    expect(found.map((item) => [item.id, item.where])).toEqual([
      ["alpha_cafe", "destinations[0]"], ["alpha_q2", "battles[1]"], ["alpha_tower", "landmarks[1]"], ["alpha_ghost", "people[1]"],
    ]);
  });
});

describe("schema keys and the code that reads them", () => {
  const schema = [
    "import { z } from \"zod\";",
    "const id = z.string();",
    "export const dateSchema = z.object({",
    "  id,",
    "  titleJa: z.string().regex(/^[^{}]+$/u), // a } in a regular expression",
    "  \"eventLabelJa\": z.string().optional(),",
    "  ...base.shape,",
    "  nested: z.object({ innerKey: z.number() }).strict(),",
    "  label: `a ${\"}\"} b`,",
    "}).strict();",
    "export const more = dateSchema.extend({ extraKey: z.string() });",
    "export function show(date: { titleJa: string }) { return date.titleJa; }",
  ].join("\n");

  it("masks comments, strings and regular expressions so the brackets match", () => {
    expect(maskCode("a /* } */ b // }\nx = \"}\" + /}/u;", { strings: true })).toBe("a         b     \nx = \" \" + / /u;");
    expect(maskCode("x = \"}\" // c", { strings: false })).toBe("x = \"}\"     ");
  });

  it("reads the keys of each object literal with its line and schema", () => {
    expect(schemaKeys("src/content/x.ts", schema).map((key) => [key.key, key.line, key.schema])).toEqual([
      ["id", 4, "dateSchema"], ["titleJa", 5, "dateSchema"], ["eventLabelJa", 6, "dateSchema"], ["nested", 8, "dateSchema"], ["label", 9, "dateSchema"],
      ["innerKey", 8, "dateSchema"], ["extraKey", 11, "more"],
    ]);
  });

  it("lists the keys the game's code never names (its own schema literals left out), with the tools and the data that use them", () => {
    const keys = schemaKeys("src/content/x.ts", schema);
    const game = codeWords([readingText(schema), readingText("const shown = entry.id; // eventLabelJa in a comment\nconst y = pick(\"label\");")]);
    const tools = codeWords([readingText("if (value.nested) check(value.innerKey);")]);
    const data = new Map([["alpha", jsonKeyCounts([{ eventLabelJa: "a", nested: { innerKey: 1 } }, { eventLabelJa: "b" }])]]);
    const unread = unreadSchemaKeys(keys, game, tools, data);
    expect(unread.map((item) => [item.key, item.readByTools, item.dataUses])).toEqual([
      ["eventLabelJa", false, [{ journey: "alpha", count: 2 }]],
      ["nested", true, [{ journey: "alpha", count: 1 }]],
      ["innerKey", true, [{ journey: "alpha", count: 1 }]],
      ["extraKey", false, []],
    ]);
    const lines = formatUnusedReport({ journeys: [{ id: "alpha", nameJa: "アルファ編", status: "available" }], knots: [], entries: [], keys: unread });
    expect(lines).toContain("- アルファ編（alpha）、available：届かない knot 0、場面に届かないデータ 0、画面が読まないかもしれない欄（データで使っている欄）3");
    expect(lines).toContain("  src/content/x.ts:6（dateSchema） eventLabelJa：この名前の欄をデータで使う：alpha 2か所。scripts/ も読まない。");
    expect(lines.some((line) => line.includes("推定です"))).toBe(true);
  });
});
