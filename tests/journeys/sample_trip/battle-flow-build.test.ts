import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID } from "../../../scripts/content-layout";
import { contentSourcesFromTree, loadContentSources, selectJourneys, type ContentSources } from "../../../scripts/content-sources";
import { validateContent } from "../../../scripts/content-validation";

// content:build's checks of a battle's one flow (the unified event design, stage 5, 3.3), on the sample journey's
// battles (fictional) changed in memory: every path calls quiz 1..n once in order (A16), a special battle stops at
// -> reasoning -> after quiz(roundIndex) on every path and never only comes back there, the conversation may have choices
// (A15 lifted), and the flow's helper knots and modules.ink are where the game reads them.

const repository = path.resolve(".");
const prefix = `${SAMPLE_JOURNEY_DIRECTORY}/`;
const TOWER = "stories/places/smp_mihon_clock_tower.ink";
const MARKET = "stories/places/smp_mihon_market.ink";
/** The market's special battle as a one-scene file (a form content:build still accepts), made in memory by oneSceneMarket. */
const MARKET_FILE = "stories/battles/smp_mihon_special_b_market.ink";
const CATALOG = "battles/catalog.json";
let sample: ContentSources;

beforeAll(() => {
  sample = selectJourneys(loadContentSources(repository, { extraJourneyDirectories: [SAMPLE_JOURNEY_DIRECTORY] }), [SAMPLE_JOURNEY_ID]);
});

function sampleWith(changes: Record<string, (text: string) => string>, added: Record<string, string> = {}): ContentSources {
  const files = new Map(sample.tree.files);
  for (const [file, change] of Object.entries(changes)) {
    const before = files.get(`${prefix}${file}`)!.toString("utf8");
    const after = change(before);
    expect(after, `${file} unchanged`).not.toBe(before);
    files.set(`${prefix}${file}`, Buffer.from(after));
  }
  for (const [file, text] of Object.entries(added)) files.set(`${prefix}${file}`, Buffer.from(text));
  return contentSourcesFromTree({ ...sample.tree, files });
}
/** The text with one exact part replaced (the part must be there once). */
const swap = (before: string, after: string) => (text: string) => {
  expect(text.split(before).length, `"${before}" once`).toBe(2);
  return text.replace(before, after);
};
const battleEntry = (id: string, change: (battle: Record<string, unknown>) => void) => (text: string) => {
  const catalog = JSON.parse(text) as { battles: Record<string, unknown>[] };
  change(catalog.battles.find((battle) => battle.id === id)!);
  return JSON.stringify(catalog);
};
/**
 * The sample with the market's special battle as a one-scene file (MARKET_FILE): `top`, then the knot's lines (without its
 * # scene:) and its helper knots, changed by `change`; the catalog points at the file, and the place file keeps its guide only.
 */
function oneSceneMarket(top: string, change: (text: string) => string = (text) => text): ContentSources {
  const place = sample.tree.files.get(`${prefix}${MARKET}`)!.toString("utf8");
  const start = place.indexOf("=== smp_mihon_special_b_market ===\n");
  const body = place.slice(start).split("\n").slice(1).filter((line) => !/^\s*#\s*scene\s*:/u.test(line)).join("\n");
  return sampleWith({ [MARKET]: (text) => text.slice(0, start),
    [CATALOG]: battleEntry("smp_mihon_special_b_market", (battle) => { battle.storyId = "battles/smp_mihon_special_b_market"; }) },
  { [MARKET_FILE]: change(`${top}${body}`) });
}

describe("a battle's one flow (stage 5)", () => {
  it("builds the sample's four battles and walks every quiz answer and reasoning action", () => {
    const result = validateContent(sample);
    expect(result.battleScenarios).toBeGreaterThan(40);
  });

  it("stops a path that calls the quizzes out of order, leaves one out or calls one more than its quiz has (A16)", () => {
    expect(() => validateContent(sampleWith({ [TOWER]: (text) => text.replace("\n-> quiz(1) ->\n", "\n-> quiz(2) ->\n") })))
      .toThrow(/calls quiz\(2\) where quiz\(1\) comes next: call quiz 1\.\.3 once each, in order \(A16\)/u);
    expect(() => validateContent(sampleWith({ [TOWER]: (text) => text.replace("\n-> quiz(3) ->\n", "\n") })))
      .toThrow(/ends after quiz\(2\): every path calls quiz 1\.\.3 once each/u);
    expect(() => validateContent(sampleWith({ [TOWER]: (text) => text.replace("\n-> quiz(3) ->\n", "\n-> quiz(3) ->\n-> quiz(4) ->\n") })))
      .toThrow(/calls quiz\(4\), but its quiz has 3 questions \(A16\)/u);
    // One branch that leaves a quiz out is enough to stop.
    expect(() => validateContent(sampleWith({ [TOWER]: (text) => text.replace("\n-> quiz(2) ->\n", "\n{ quiz_correct: -> quiz(2) -> }\n") })))
      .toThrow(/calls quiz\(3\) where quiz\(2\) comes next/u);
  });

  it("stops a reasoning stop elsewhere than its catalog says, in a battle without reasoning, or missing on a path", () => {
    expect(() => validateContent(sampleWith({ [CATALOG]: battleEntry("smp_mihon_special_b_market", (battle) => {
      (battle.reasoning as { roundIndex: number }).roundIndex = 2;
    }) }))).toThrow(/meets -> reasoning -> after quiz\(1\): battles\/catalog\.json puts it after quiz\(2\) and before quiz\(3\)/u);
    expect(() => validateContent(sampleWith({ [TOWER]: (text) => text.replace("\n-> quiz(2) ->\n", "\n-> reasoning ->\n-> quiz(2) ->\n") })))
      .toThrow(/-> reasoning -> in .*: the battle has no reasoning in battles\/catalog\.json/u);
    expect(() => validateContent(sampleWith({ [MARKET]: swap("- (stop)\n-> reasoning ->\n", "- (stop)\n") })))
      .toThrow(/calls quiz\(2\) before -> reasoning ->: battles\/catalog\.json puts the reasoning before question 2/u);
  });

  it("stops a flow that never ends from its stop point (-> stop after the right evidence too), and lets a wrong evidence go on (decision 35)", () => {
    expect(() => validateContent(sampleWith({ [MARKET]: swap("「……これ、わたしのことじゃない。でも、まだ答えは聞いてないわよ」\n",
      "「……これ、わたしのことじゃない。でも、まだ答えは聞いてないわよ」\n-> stop\n") })))
      .toThrow(/never ends from the reasoning stop: every way on from there comes back to it/u);
    // The author decides: without -> stop a wrong evidence goes on to the next question (the score is the quizzes' only).
    const goesOn = sampleWith({ [MARKET]: swap("「この資料じゃ足りないみたい。時間を計る道具が書いてあるものを探そう」\n    -> stop\n",
      "「この資料じゃ足りないみたい。時間を計る道具が書いてあるものを探そう」\n") });
    expect(() => validateContent(goesOn)).not.toThrow();
  });

  it("lets the conversation have choices and their tags (A15 lifted), walked with the quizzes", () => {
    const withChoice = sampleWith({ [TOWER]: (text) => text.replace("\n-> quiz(1) ->\n",
      "\n* [「どうして直したいの？」 # option: ask_why]\n    # rel: trust +1\n    # speaker: enemy\n    「止まったままだと、番人の仕事がない気がして」\n" +
      "* [「先に言い伝えを」 # option: legend_first]\n- \n-> quiz(1) ->\n") });
    const result = validateContent(withChoice);
    expect(result.scenes.scenes.find((scene) => scene.id === "smp_mihon_main_clock_tower")!.options).toEqual([
      { id: "ask_why", knot: "smp_mihon_main_clock_tower", rel: { trust: 1 } }, { id: "legend_first", knot: "smp_mihon_main_clock_tower" }]);
    // A choice without # option: (no effects) in a special battle's knot: walked with the battle's calls answered.
    expect(() => validateContent(sampleWith({ [MARKET]: swap("-> quiz(1) ->\n", "* [「へえ」]\n    「へえ」\n* [「なるほど」]\n    「なるほど」\n- \n-> quiz(1) ->\n") }))).not.toThrow();
    // A one-scene battle's choices too (the market's battle as a one-scene file).
    const inFile = validateContent(oneSceneMarket("INCLUDE modules.ink\n", swap("-> quiz(1) ->\n", "+ [「パンの話を」 # option: bread]\n    # rel: affection +1\n- \n-> quiz(1) ->\n")));
    expect(inFile.scenes.scenes.find((scene) => scene.id === "smp_mihon_special_b_market")!.options).toEqual([{ id: "bread", knot: "smp_mihon_special_b_market", rel: { affection: 1 } }]);
    // Every choice needs something (here: an item it gives) at a choice point no head guarantees: A10 stops it.
    expect(() => validateContent(sampleWith({ [TOWER]: (text) => text.replace("\n-> quiz(1) ->\n",
      "\n* [「これを」 # option: give_bookmark]\n    # give: smp_mihon_three_bookmark heroine\n- \n-> quiz(1) ->\n") })))
      .toThrow(/No choice can be chosen at a choice point of .*smp_mihon_main_clock_tower/u);
  });

  it("finds the flow's helper knots and the game's calls where the game reads them", () => {
    expect(() => validateContent(sampleWith({ [MARKET]: (text) => text.replaceAll("smp_mihon_special_b_market_claim", "smp_mihon_special_b_market_statement") })))
      .toThrow(/The claim of the special battle smp_mihon_special_b_market is the helper knot smp_mihon_special_b_market_claim/u);
    expect(() => validateContent(sampleWith({ [MARKET]: swap("=== smp_mihon_special_b_market_claim ===\n",
      "=== smp_mihon_special_b_market_claim ===\n* [「えっ」 # option: huh]\n- \n") })))
      .toThrow(/The helper knot smp_mihon_special_b_market_claim reaches a choice \("「えっ」"\), read on its own as the clue book reads it/u);
    // A choice it reaches through a knot it calls, or a call of the game's (the stop point moved into the claim), stops it too.
    expect(() => validateContent(sampleWith({ [MARKET]: (text) => swap("「時計が止まってから、この街では誰も時間を守らなくなった。一人残らず、よ！」\n",
      "「時計が止まってから、この街では誰も時間を守らなくなった。一人残らず、よ！」\n-> smp_claim_more ->\n")(text) +
      "\n=== smp_claim_more ===\n# speaker: enemy\n「どう思う？」\n* [「そうかも」 # option: maybe]\n* [「本当に？」 # option: really]\n- ->->\n" }))).toThrow(/smp_mihon_special_b_market_claim reaches a choice \("「そうかも」"\)/u);
    expect(() => validateContent(sampleWith({ [MARKET]: swap("=== smp_mihon_special_b_market_press ===\n", "=== smp_mihon_special_b_market_press ===\n-> quiz(2) ->\n") })))
      .toThrow(/smp_mihon_special_b_market_press reaches a choice \("quiz"\)/u);
    // A plain choice (no # option:) in the claim stops it the same way.
    expect(() => validateContent(sampleWith({ [MARKET]: swap("=== smp_mihon_special_b_market_claim ===\n",
      "=== smp_mihon_special_b_market_claim ===\n* [「えっ」]\n- \n") })))
      .toThrow(/The helper knot smp_mihon_special_b_market_claim reaches a choice \("「えっ」"\), read on its own as the clue book reads it/u);
    // A one-scene battle file with its own VAR lines in place of INCLUDE modules.ink has no quiz to call; a place file starts with the include.
    expect(() => validateContent(oneSceneMarket("VAR player_name = \"\"\nVAR heroine_name = \"\"\n"))).toThrow(/quiz/u);
    expect(() => validateContent(sampleWith({ [MARKET]: swap("INCLUDE modules.ink\n", "VAR player_name = \"\"\nVAR heroine_name = \"\"\n") })))
      .toThrow(/A place file starts with the two lines "INCLUDE modules\.ink" and "-> DONE"/u);
    // A call outside a battle has nothing to answer it.
    expect(() => validateContent(sampleWith({ [TOWER]: swap("「見て、あの歯車。止まってるのに、油でぴかぴかだ」\n", "「見て、あの歯車。止まってるのに、油でぴかぴかだ」\n-> quiz(1) ->\n") })))
      .toThrow(/-> quiz\(n\) -> is a battle's call \(stage 5\): .* is not a battle/u);
  });

  it("reads the helper knots alone with every condition, quiz result, score and memory, as the clue book may read them", () => {
    const claimLine = "「時計が止まってから、この街では誰も時間を守らなくなった。一人残らず、よ！」\n";
    const pressHead = "=== smp_mihon_special_b_market_press ===\n";
    const more = () => "\n=== smp_market_more ===\n# speaker: enemy\n「どう思う？」\n* [「そうかも」 # option: maybe]\n* [「本当に？」 # option: really]\n- ->->\n";
    // A choice reached only under a condition (here: the bookmark held), only after a right answer, or only with a score.
    expect(() => validateContent(sampleWith({ [MARKET]: (text) => swap(pressHead,
      `${pressHead}{ cond("item smp_mihon_three_bookmark held"): -> smp_market_more -> }\n`)(text) + more() })))
      .toThrow(/The helper knot smp_mihon_special_b_market_press reaches a choice \("「そうかも」"\)/u);
    expect(() => validateContent(sampleWith({ [MARKET]: (text) => swap(claimLine, `${claimLine}{ quiz_correct: -> smp_market_more -> }\n`)(text) + more() })))
      .toThrow(/The helper knot smp_mihon_special_b_market_claim reaches a choice \("「そうかも」"\)/u);
    expect(() => validateContent(sampleWith({ [MARKET]: (text) => swap(claimLine, `${claimLine}{ battle_score >= 1: -> smp_market_more -> }\n`)(text) + more() })))
      .toThrow(/The helper knot smp_mihon_special_b_market_claim reaches a choice \("「そうかも」"\)/u);
    // has_memory read as in the game: in the flow and in the claim it builds; a choice reached only with the memory stops.
    const memory = { "romance/presentation.json": (text: string) => {
      const presentation = JSON.parse(text) as { memories?: Record<string, unknown> };
      presentation.memories = { ...presentation.memories, smp_mihon_test_memory: { titleJa: "検証の思い出", descriptionJa: "検証専用" } };
      return JSON.stringify(presentation);
    } };
    // A place file's top is its two lines: the declaration goes in a knot (Ink reads it anywhere).
    const external = swap("=== smp_mihon_special_b_market_claim ===\n", "=== smp_mihon_special_b_market_claim ===\nEXTERNAL has_memory(memory_id)\n");
    const remembered = '{ has_memory("smp_mihon_test_memory"): 「あのときの話ね」 }\n';
    expect(() => validateContent(sampleWith({ ...memory, [MARKET]: (text) => swap(claimLine, `${claimLine}${remembered}`)(
      swap("-> quiz(1) ->\n", `${remembered}-> quiz(1) ->\n`)(external(text))) }))).not.toThrow();
    expect(() => validateContent(sampleWith({ ...memory, [MARKET]: (text) => swap(claimLine,
      `${claimLine}{ has_memory("smp_mihon_test_memory"): -> smp_market_more -> }\n`)(external(text)) + more() })))
      .toThrow(/The helper knot smp_mihon_special_b_market_claim reaches a choice \("「そうかも」"\)/u);
    // ...and one reached only without it.
    expect(() => validateContent(sampleWith({ ...memory, [MARKET]: (text) => swap(claimLine,
      `${claimLine}{ not has_memory("smp_mihon_test_memory"): -> smp_market_more -> }\n`)(external(text)) + more() })))
      .toThrow(/The helper knot smp_mihon_special_b_market_claim reaches a choice \("「そうかも」"\)/u);
  });
});
