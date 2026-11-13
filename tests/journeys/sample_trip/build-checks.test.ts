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

describe("a date's # hint: (2026-11-13)", () => {
  const TOWER = "stories/places/smp_mihon_clock_tower.ink";
  const DATE = "smp_mihon_date_tower_square";

  it("goes into the date's hintJa, and stops one written in the catalog too", () => {
    expect(validateContent(sample).dates.find((date) => date.id === DATE)?.hintJa).toBe("時計塔の番人と話したあとで");
    const twice = sampleWith({ "romance/date_catalog.json": (text) => {
      const catalog = JSON.parse(text) as { dates: Record<string, unknown>[] };
      return JSON.stringify({ ...catalog, dates: catalog.dates.map((date) => (date.id === DATE ? { ...date, hintJa: "もう一つ" } : date)) });
    } });
    expect(() => validateContent(twice)).toThrow(`The hint of date ${DATE} is written twice`);
  });

  it("stops a hint at the head of a scene that is not a date (a place file's knot, a one-scene file), and warns for a date without a when", () => {
    expect(() => validateContent(sampleWith({ "stories/places/smp_mihon_market.ink": (text) =>
      text.replace("=== smp_mihon_market_guide ===\n# scene: guide\n", "=== smp_mihon_market_guide ===\n# scene: guide\n# hint: 朝市のあとで\n") })))
      .toThrow("# hint: is a date's head tag; smp_mihon_market_guide is a guide");
    // The sample has no one-scene file of its own: an arrival (a one-scene file) is added for this.
    const { added, ...city } = arrival("# hint: 朝市のあとで\n");
    expect(() => validateContent(sampleWith(city, added))).toThrow("# hint: is a date's head tag; arrivals/mihon is not a date");
    const withoutWhen = validateContent(sampleWith({ [TOWER]: (text) => text.replace("# when: episodes mihon >= 1\n", "") }));
    expect(withoutWhen.warnings).toContainEqual({ kind: "scene-tag", message: expect.stringContaining(`鍵の札が出ないデートです：${DATE}`) });
  });
});

describe("the warnings of every moment (2.5, 2.6)", () => {
  it("names a moment that never opens, and the sample's -1 of two files at the finale (they run in file name order)", () => {
    const knot = (name: string, at: string) => `\n=== ${name} ===\n# scene: talk\n# at: ${at}\n# priority: -1\n# sources: none\n# speaker: heroine\n「うん」\n-> END\n`;
    const result = validateContent(sampleWith({ [CITY_END]: (text) => `${text}${knot("smp_mihon_zz_arrive", "arrive mihon")}` +
      `${knot("smp_mihon_zz_trip", "trip walk from mihon_library to mihon_library")}` }));
    const notes = result.warnings.filter((warning) => warning.kind === "scene-tag").map((warning) => warning.message);
    expect(notes).toContainEqual(expect.stringMatching(/^smp_mihon_zz_arrive: # at: arrive mihon never runs/u));
    expect(notes).toContainEqual(expect.stringMatching(/^smp_mihon_zz_trip: # at: trip walk from mihon_library to mihon_library never runs/u));
    expect(result.warnings).toContainEqual({ kind: "same-priority",
      message: expect.stringContaining("smp_mihon_finale_sweets, smp_mihon_bookmark_stall have priority -1 at finale mihon") });
  });
});

describe("check 10: a scene that always moves elsewhere before a step the game needs (3.3, A12)", () => {
  const detour = (at: string, extra = "", to = "mihon_library") => `\n=== smp_mihon_zz_detour ===\n# scene: talk\n# at: ${at}\n# priority: -1\n# repeat: always\n${extra}` +
    `# then: move ${to}\n# sources: none\n# speaker: heroine\n「寄り道しよう」\n-> END\n`;
  const LOOP = /An endless then: loop: smp_mihon_zz_detour/u;
  const loopNotes = (sources: ContentSources) => validateContent(sources).warnings.filter((warning) => warning.kind === "then-loop").map((warning) => warning.message);

  it("stops one before the finale (the city could never be cleared), and with a condition warns", () => {
    expect(() => validateContent(sampleWith({ [CITY_END]: (text) => `${text}${detour("finale mihon")}` }))).toThrow(/before the finale of mihon/u);
    expect(() => validateContent(sampleWith({ [CITY_END]: (text) => `${text}${detour("finale mihon")}` }))).toThrow(LOOP);
    expect(loopNotes(sampleWith({ [CITY_END]: (text) => `${text}${detour("finale mihon", "# when: time day\n")}` })))
      .toContainEqual(expect.stringMatching(/^A then: loop left only conditionally: smp_mihon_zz_detour/u));
  });

  it("stops one on the way home of 「休む」 on foot; by bicycle (the player may walk home instead) it warns", () => {
    expect(() => validateContent(sampleWith({ [CITY_END]: (text) => `${text}${detour("trip walk to mihon_hotel", "", "mihon_market")}` }))).toThrow(/before the night/u);
    // Only from the library: the next 「休む」 leaves the market, where it does not run (the night comes).
    const fromLibrary = detour("trip walk from mihon_library to mihon_hotel", "", "mihon_market");
    expect(() => validateContent(sampleWith({ [CITY_END]: (text) => `${text}${fromLibrary}` }))).not.toThrow();
    // …unless another such scene runs there and moves the party back: library, market, library, … the night never comes.
    const fromMarket = detour("trip walk from mihon_market to mihon_hotel", "", "mihon_library").replace("smp_mihon_zz_detour", "smp_mihon_zz_back");
    expect(() => validateContent(sampleWith({ [CITY_END]: (text) => `${text}${fromLibrary}${fromMarket}` }))).toThrow(/smp_mihon_zz_back .*before the night/u);
    expect(loopNotes(sampleWith({ [CITY_END]: (text) => `${text}${detour("trip rental_bicycle to mihon_hotel")}` })))
      .toContainEqual(expect.stringMatching(/^A then: loop that may not end: smp_mihon_zz_detour/u));
  });
});

describe("A10 after a then: (3.3 check 6, 2.3)", () => {
  const TOWER_FILE = "stories/places/smp_mihon_clock_tower.ink";
  /** The first ride's scene with a head `# when: money >= 8`, both choices spending (「このままで行こう」 -8), and a head then: or not. */
  const ride = (head: string) => (text: string) => text
    .replace("# when: not rides rental_bicycle >= 1\n", `# when: money >= 8\n${head}`)
    .replace("* [「このままで行こう」 # option: as_is]\n", "* [「このままで行こう」 # option: as_is]\n    # money: -8\n");

  it("stops a choice point the head's money floor no longer guarantees once its head then: is decided", () => {
    expect(() => validateContent(sampleWith({ [TOWER_FILE]: ride("") }))).not.toThrow();
    expect(() => validateContent(sampleWith({ [TOWER_FILE]: ride("# then: move mihon_market\n") })))
      .toThrow(/No choice can be chosen at a choice point of .*smp_mihon_first_bicycle/u);
  });
});

describe("an epilogue's spending # on_done: (A21)", () => {
  const EPILOGUE = "stories/places/smp_mihon_hotel.ink";
  const spends = (text: string) => text.replace("# background: smp_bg_mihon_hotel\n", "# on_done: money -5\n# on_done: ap -1\n# background: smp_bg_mihon_hotel\n");
  const STOP = /An arrival or an epilogue the game starts by itself takes no # on_done: that spends money or AP/u;

  it("lets an epilogue its city starts by a then: epilogue spend, and stops one the game starts by itself, and an arrival's", () => {
    expect(() => validateContent(sampleWith({ [EPILOGUE]: spends }))).not.toThrow();
    // Without the city's then: epilogue lines, the game starts the epilogue by itself.
    expect(() => validateContent(sampleWith({ [EPILOGUE]: spends, [CITY_END]: onlyStarter("") }))).toThrow(STOP);
    const { added, ...city } = arrival("# on_done: money -5\n");
    expect(() => validateContent(sampleWith(city, added))).toThrow(STOP);
  });
});

describe("A10 and a then: move (3.3 check 6, 2.3, 4.2)", () => {
  it("stops a choice point whose only free choice is a then: move (it greys when no way home gets back in time)", () => {
    const TOWER_FILE = "stories/places/smp_mihon_clock_tower.ink";
    // The first ride's scene on the way home of 「休む」 on foot: 「直してもらおうか」 costs 50, 「このままで行こう」 moves on to the library.
    const ride = (then: string) => (text: string) => text
      .replace("# at: trip rental_bicycle from mihon_hotel\n", "# at: trip walk to mihon_hotel\n")
      .replace("# when: not rides rental_bicycle >= 1\n", "")
      .replace("* [「このままで行こう」 # option: as_is]\n", `* [「このままで行こう」 # option: as_is]\n${then}`);
    expect(() => validateContent(sampleWith({ [TOWER_FILE]: ride("") }))).not.toThrow();
    expect(() => validateContent(sampleWith({ [TOWER_FILE]: ride("    # then: move mihon_library\n") })))
      .toThrow(/No choice can be chosen at a choice point of .*smp_mihon_first_bicycle/u);
  });
});

describe("a question's reveal on its battle's landmark photo (revealRegion, 2026-11-11)", () => {
  const FINALE_QUIZ = "quizzes/smp_mihon_finale_quiz.json";
  const TOWER_QUIZ = "quizzes/smp_mihon_main_clock_tower_quiz.json";
  const withRegion = (index: number, region: unknown) => (text: string) => {
    const quiz = JSON.parse(text);
    quiz.questions[index].revealRegion = region;
    return JSON.stringify(quiz);
  };

  it("stops one on a city finale's question (no landmark photo) and one outside the photo, naming the file", () => {
    expect(() => validateContent(sampleWith({ [FINALE_QUIZ]: withRegion(0, { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }) })))
      .toThrow(/写真の種明かし（revealRegion）は、対決の観光地の写真に重ねて出します：.*smp_mihon_finale_quiz\.json の問い smp_mihon_finale_q1 は都市フィナーレの問い/u);
    expect(() => validateContent(sampleWith({ [TOWER_QUIZ]: withRegion(2, { x: 0.5, y: 0.5, width: 0.6, height: 0.2 }) })))
      .toThrow(/smp_mihon_main_clock_tower_quiz\.json[\s\S]*写真の種明かしの範囲（revealRegion）が写真の外にはみ出しています/u);
  });
});
