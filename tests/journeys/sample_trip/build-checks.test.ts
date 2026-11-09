import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "../../../scripts/content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";

// content:build's checks of the stage-4 moments on the sample journey (fictional), with its files changed in memory:
// check 9's author-started epilogue (3.3, 3.9 (d)) reaches a then: epilogue at a moment only by that moment's real
// opening rule (2.3, 4.2), and the warnings of 2.5/2.6 read every moment, not only a landmark's visit.

const repository = path.resolve(".");
const prefix = `${SAMPLE_JOURNEY_DIRECTORY}/`;
const CITY_END = "stories/places/smp_mihon_city_end.ink";
let sample: ContentSources;

beforeAll(() => {
  sample = selectJourneys(loadContentSources(repository, { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), [SAMPLE_JOURNEY_ID]);
});

/** The sample's sources with some of its files changed (path inside the sample folder → new text, null: removed). */
function sampleWith(changes: Record<string, (text: string) => string>, added: Record<string, string> = {}): ContentSources {
  const files = new Map(sample.tree.files);
  for (const [file, change] of Object.entries(changes)) files.set(`${prefix}${file}`, Buffer.from(change(files.get(`${prefix}${file}`)!.toString("utf8"))));
  for (const [file, text] of Object.entries(added)) files.set(`${prefix}${file}`, Buffer.from(text));
  return contentSourcesFromTree({ ...sample.tree, files });
}
/** The city end without its own then: epilogue lines, and with the given knots: their then: epilogue is the only way to the epilogue. */
const onlyStarter = (knots: string) => (text: string) => `${text.split("\n").filter((line) => line.trim() !== "# then: epilogue").join("\n")}\n${knots}`;
const talk = (at: string, extra = "") => `\n=== smp_mihon_zz_starter ===\n# scene: talk\n# at: ${at}\n# priority: -1\n${extra}# then: epilogue\n# sources: none\n# speaker: heroine\n「行こうか」\n-> END\n`;
const NO_WAY = /No way to start the epilogue of city mihon/u;
/** A city arrival for mihon (the sample has none), its conversation's head given. */
const arrival = (head: string) => ({
  "cities/mihon.json": (text: string) => JSON.stringify({ ...JSON.parse(text), arrivalStoryId: "arrivals/mihon" }),
  added: { "stories/arrivals/mihon.ink": "// 見本の到着（架空）。\nVAR player_name = \"\"\nVAR heroine_name = \"\"\nVAR player_address = \"\"\n" +
    `VAR romance_stage = 1\nVAR ending_reached = false\n\n${head}# background: smp_bg_mihon_hotel\n# speaker: heroine\n「着いたね」\n-> END\n` },
});

describe("check 9: a then: epilogue at a stage-4 moment (3.3, 3.9 (d))", () => {
  it("stops a then: epilogue only at a moment that never opens: an arrival of a city without one, a counter without admission, a trip that goes nowhere", () => {
    expect(() => validateContent(sampleWith({ [CITY_END]: onlyStarter(talk("arrive mihon")) }))).toThrow(NO_WAY);
    expect(() => validateContent(sampleWith({ [CITY_END]: onlyStarter(talk("ticket mihon_clock_tower")) }))).toThrow(NO_WAY);
    expect(() => validateContent(sampleWith({ [CITY_END]: onlyStarter(talk("trip walk from mihon_library to mihon_library")) }))).toThrow(NO_WAY);
    // The hotel's moment and a trip on a route of its mode come again whenever the player rests or travels.
    expect(() => validateContent(sampleWith({ [CITY_END]: onlyStarter(talk("hotel")) }))).not.toThrow();
    expect(() => validateContent(sampleWith({ [CITY_END]: onlyStarter(talk("trip walk from mihon_library")) }))).not.toThrow();
  });

  it("reaches an arrival's own then: epilogue, and an arrival's scene whose condition holds as the city starts", () => {
    const { added, ...city } = arrival("# then: epilogue\n");
    expect(() => validateContent(sampleWith({ ...city, [CITY_END]: onlyStarter("") }, added))).not.toThrow();
    const plain = arrival("");
    expect(() => validateContent(sampleWith({ "cities/mihon.json": plain["cities/mihon.json"], [CITY_END]: onlyStarter(talk("arrive mihon")) }, plain.added))).not.toThrow();
    // The arrival comes once, as the city starts: a condition that only later play makes true never holds there.
    expect(() => validateContent(sampleWith({ "cities/mihon.json": plain["cities/mihon.json"],
      [CITY_END]: onlyStarter(talk("arrive mihon", "# when: visited mihon_clock_tower\n")) }, plain.added))).toThrow(NO_WAY);
  });
});
