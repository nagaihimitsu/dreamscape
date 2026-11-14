import { describe, expect, it } from "vitest";
import { parseConditionText } from "../src/content/condition-text";
import { headEntryRule, readEncounterHead } from "./encounter-head";

// The head tags of a catalog encounter's Ink (the unified event design, stage 1): what content:build reads, removes and refuses.
const names = 'VAR player_name = ""\nVAR heroine_name = ""\n';
const body = "# background: smp_bg\n# speaker: narrator\n時計塔の下で。\n* [Hello. # option: hello]\n    -> END\n";

describe("encounter head tags", () => {
  it("reads the head after the VAR lines and blanks its lines (the story and its line numbers stay)", () => {
    const source = `${names}\n# at: visit mihon_clock_tower\n# priority: -1\n# when: item smp_bookmark held\n# until: visited mihon_market\n# repeat: always\n${body}`;
    const { source: kept, head } = readEncounterHead(source);
    expect(head).toEqual({ landmarkId: "mihon_clock_tower", priority: -1, repeat: "always",
      when: { all: [{ item: { id: "smp_bookmark", is: "held" } }, { not: { landmarkVisited: "mihon_market" } }] } });
    expect(kept.split("\n")).toHaveLength(source.split("\n").length);
    expect(kept).toBe(`${names}\n\n\n\n\n\n${body}`);
    expect(headEntryRule("smp_stall", head!)).toEqual({ encounterId: "smp_stall", priority: -1, when: head!.when });
    for (const [priority, expected] of [["+1", 1], ["3", 3], ["after observe", "after observe"]] as const)
      expect(readEncounterHead(`${names}# at: visit x\n# priority: ${priority}\n${body}`).head?.priority).toBe(expected);
    // Without head tags nothing changes.
    expect(readEncounterHead(`${names}${body}`)).toEqual({ source: `${names}${body}` });
  });

  it.each([
    [`${body}# at: visit x\n`, "Head tag outside the head (line 8)"],
    ["# priority: -1\n", "An encounter's head needs # at: visit <landmark>"],
    ["# at: visit x\n", "An encounter's head needs # priority:"],
    ["# at: visit x\n# at: visit y\n# priority: -1\n", "A catalog encounter's head takes one # at:"],
    ["# at: place x\n# priority: -1\n", "# at: place x is written in a place file's scene"],
    ["# at: visit any\n# priority: -1\n", "# at: visit any is written in a place file's scene"],
    ["# at: visit x\n# priority: 0\n", "# priority: 0 is the main part itself"],
    ["# at: visit x\n# priority: after battle\n", "# priority: after battle is written in a place file's scene"],
    ["# at: visit x\n# priority: soon\n", "Unknown # priority: soon"],
    ["# at: visit x\n# priority: -1\n# priority: +1\n", "Write # priority: once"],
    ["# at: visit x\n# priority: -1\n# repeat: twice\n", "Unknown # repeat: twice"],
    ["# at: visit x\n# priority: -1\n# when: {flag_x}\n", "A head tag is plain text, without {…}"],
    ["# at: visit x # priority: -1\n# speaker: narrator # when: time day\n", "Write each head tag on its own line"],
  ])("refuses %j", (head, message) => {
    expect(() => readEncounterHead(`${names}${head}${body}`)).toThrow(message);
  });
});

describe("condition texts", () => {
  it.each([
    ["item smp_x held", { item: { id: "smp_x", is: "held" } }],
    ["not item smp_x gifted", { not: { item: { id: "smp_x", is: "gifted" } } }],
    ["seen smp_stall", { encounterSeen: "smp_stall" }],
    ["done smp_stall", { encounterCompleted: "smp_stall" }],
    ["visited mihon_clock_tower", { landmarkVisited: "mihon_clock_tower" }],
    ["guide mihon_clock_tower", { guideRead: "mihon_clock_tower" }],
    ["battle smp_b", { battlePlayed: "smp_b" }],
    ["episode smp_e", { episodeCompleted: "smp_e" }],
    ["city mihon", { cityCompleted: "mihon" }],
    ["episodes mihon >= 2", { episodesCompleted: { city: "mihon", atLeast: 2 } }],
    ["date smp_d", { datePlayed: "smp_d" }],
    ["epilogue mihon", { epilogueViewed: "mihon" }],
    ["time night", { time: "night" }],
    ["day >= 2", { cityDay: { atLeast: 2 } }],
    ["day <= 3", { cityDay: { atMost: 3 } }],
    ["journey_day >= 5", { journeyDay: { atLeast: 5 } }],
    ["weekday 5,6", { weekday: [5, 6] }],
    ["rides rental_bicycle >= 1", { rides: { mode: "rental_bicycle", atLeast: 1 } }],
    ["rented rental_bicycle", { rented: "rental_bicycle" }],
    // Stage 2a (decision 3): relationship values, money, the romance stage, the couple, a city's battles.
    ["battles mihon >= 2", { battlesPlayed: { city: "mihon", atLeast: 2 } }],
    ["rel affection >= 3", { relationship: { axis: "affection", atLeast: 3 } }],
    ["rel trust <= -1", { relationship: { axis: "trust", atMost: -1 } }],
    ["rel spark >= 0", { relationship: { axis: "spark", atLeast: 0 } }],
    ["money >= 300", { money: { atLeast: 300 } }],
    ["money <= 0", { money: { atMost: 0 } }],
    ["stage >= 2", { romanceStage: { atLeast: 2 } }],
    ["couple", { couple: true }],
    ["not couple", { not: { couple: true } }],
  ])("reads %s", (text, condition) => {
    expect(parseConditionText(text)).toEqual(condition);
  });

  it.each([
    ["", "Empty condition"], ["not", "Empty condition after not"], ["item smp_x sold", "Write the condition part \"item\""],
    ["time noon", "time day|night"], ["day > 2", "day >= N"], ["weekday 7", "weekday 5,6"], ["visited", "visited <landmark>"],
    ["ap >= -1", "Invalid condition"], ["met", "met <person>"], ["flag a b", "flag <flag>"], ["condition", "condition <name>"],
    ["rel charm >= 3", "rel affection|trust|spark"], ["rel affection > 3", "rel affection >= N"], ["rel affection >= 1.5", "rel affection >= N"],
    ["money >= -1", "Invalid condition"], ["stage >= 5", "Invalid condition"], ["couple yes", 'Write the condition part "couple" as: couple'],
    ["battles mihon <= 2", "battles <city> >= N"], ["wish upon a star", "Unknown condition part: wish"],
  ])("refuses %j", (text, message) => {
    expect(() => parseConditionText(text)).toThrow(message);
  });
});
