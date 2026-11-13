import { describe, expect, it } from "vitest";
import { compileInk } from "./ink-validation";
import { MODULES_FILE, MODULES_INK } from "./modules-ink";
import { readPlaceFile } from "./place-files";
import { placeScenes } from "./scene-table";
import { walkScene } from "./scene-walk";
import type { MiniGameUse } from "../src/minigames/uses";

// The build's checks of a line's # minigame: (docs/13 3.4): a choice set of the game's outcomes right after its line,
// each always choosable, 「おまかせ」 that leads on, and any scene the walk reads but a confession date.

const context = { effectIds: [], backgroundIds: [], emotionIds: ["neutral"] };
const top = "INCLUDE modules.ink\n-> DONE\n";
const outcomes = ["six", "over_wall", "edge", "bowled", "no_swing"];
const choices = (prefix = "", extra: Record<string, string> = {}) =>
  outcomes.map((outcome) => `* [Ball: ${outcome} # option: ${prefix}${outcome}]\n${extra[outcome] ?? ""}    ${outcome}\n`).join("");

function walk(body: string, extra: Partial<Parameters<typeof walkScene>[0]> = {}) {
  const source = `${top}\n=== smp_x_date ===\n# scene: talk\n# at: visit x\n# priority: +1\n${body}`;
  const file = readPlaceFile("places/smp_x_tower", source);
  const compiled = compileInk(file.source, "places/smp_x_tower.ink", { [MODULES_FILE]: MODULES_INK });
  const scene = placeScenes({ file, compiled, apCap: 12, mains: [], landmarkCity: () => "x" })[0].entry;
  return walkScene({ compiled, start: scene.story.knot, label: scene.id, context, variables: {}, conds: scene.conds, options: scene.options,
    ...(scene.when ? { when: scene.when } : {}), itemIds: [], memoryIds: [], ...extra });
}

describe("a line's # minigame: in the scene walk", () => {
  it("walks a choice set of the game's outcomes right after its line, as ordinary choices", () => {
    expect(walk(`# minigame: cricket_batting\nBowl.\n${choices()}- -> END\n`)).toBe(5);
    // A tag line of its own belongs to the next line, as the frame reads it.
    expect(walk(`# minigame: cricket_batting auto edge\nBowl.\n${choices()}- -> END\n`)).toBe(5);
  });

  it("walks a date's romance choice set of outcomes, and a replay in a helper knot with prefixed IDs and no second ticket", () => {
    const profiles = Object.fromEntries(outcomes.map((outcome) => [outcome, "    # profile: honest\n"]));
    profiles.no_swing += "    -> smp_x_again ->\n";
    const date = `# minigame: cricket_batting\nBowl.\n${choices("", profiles)}- -> END\n\n=== smp_x_again ===\n` +
      `# minigame: cricket_batting prefix again\nOnce more.\n${choices("again_")}- ->->\n`;
    // Each romance result: four outcomes, and the replay's five after no swing.
    expect(walk(date, { romanceChoices: { knot: "smp_x_date", count: 1 } })).toBe(2 * (4 + 5));
  });

  it("stops a choice set that is not one choice per outcome by option ID", () => {
    const four = choices().split("* ").slice(0, 5).join("* ");
    expect(() => walk(`# minigame: cricket_batting\nBowl.\n${four}- -> END\n`)).toThrow(/needs one choice per outcome.*missing: no_swing/u);
    expect(() => walk(`# minigame: cricket_batting\nBowl.\n${choices()}* [Leave]\n    l\n- -> END\n`)).toThrow(/not an outcome: 「Leave」 \(no # option:\)/u);
    expect(() => walk(`# minigame: cricket_batting prefix again\nBowl.\n${choices()}- -> END\n`)).toThrow(/missing: again_six/u);
  });

  it("stops a tag that a line or the scene's end comes after, and a tag on a choice", () => {
    expect(() => walk(`# minigame: cricket_batting\nBowl.\nThen a word.\n${choices()}- -> END\n`)).toThrow(/the line "Then a word\." comes after it/u);
    expect(() => walk("# minigame: cricket_batting\nBowl.\n-> END\n")).toThrow("is not followed by a choice set");
    expect(() => walk(`Bowl.\n* [Swing # option: six # minigame: cricket_batting]\n    s\n- -> END\n`)).toThrow("is written on a choice");
  });

  it("stops an outcome that may not be choosable there: the game takes it whatever the player has", () => {
    expect(() => walk(`# minigame: cricket_batting\nBowl.\n${choices("", { six: "    # money: -10\n" })}- -> END\n`))
      .toThrow(/may not be choosable \(six\)/u);
    // What the outcome gives, and a payment the head guarantees, are fine.
    expect(walk(`# minigame: cricket_batting\nBowl.\n${choices("", { six: "    # money: +10\n", edge: "    # rel: trust +1\n" })}- -> END\n`)).toBe(5);
  });

  describe("an outcome that may be greyed, with the game's fallbacks (raju_haggle: buy_map → fair_map → haggle_map → decline_map)", () => {
    const haggle = (pay: Record<string, string>, head = "", auto = "") =>
      `${head}# minigame: raju_haggle${auto}\nFifty.\n` +
      ["buy_map", "fair_map", "haggle_map", "decline_map"].map((outcome) => `* [Map: ${outcome} # option: ${outcome}]\n${pay[outcome] ?? ""}    ${outcome}\n`).join("") +
      "- -> END\n";
    const prices = { buy_map: "    # money: -50\n", fair_map: "    # money: -40\n", haggle_map: "    # money: -30\n" };

    it("lets an outcome pay what the player may lack when its fallbacks reach one that needs nothing", () => {
      expect(walk(haggle(prices))).toBe(4);
      // 「おまかせ」 on a price that may be greyed is fine: it takes the fallback then.
      expect(walk(haggle(prices, "", " auto buy_map"))).toBe(4);
    });

    it("stops when the fallbacks reach no outcome that is always choosable (so at least one always is)", () => {
      expect(() => walk(haggle({ ...prices, decline_map: "    # money: -1\n" })))
        .toThrow(/may not be choosable \(buy_map, fair_map, haggle_map, decline_map\), and the game's fallbacks \(buy_map → fair_map.*reach no outcome that always is/u);
      // A head that guarantees the money makes every outcome sure.
      expect(walk(`# when: money >= 60\n${haggle({ ...prices, decline_map: "    # money: -1\n" })}`)).toBe(4);
    });

    it("stops an outcome without a fallback that may be greyed, though another outcome has one", () => {
      expect(() => walk(`# minigame: cricket_batting\nBowl.\n${choices("", { six: "    # money: -10\n" })}- -> END\n`))
        .toThrow(/may not be choosable \(six\), and the game declares no fallback for it: /u);
    });

    it("follows 「おまかせ」 through the fallback it may take when it looks for a loop", () => {
      const sticky = (extra: Record<string, string>) => ["buy_map", "fair_map", "haggle_map", "decline_map"]
        .map((outcome) => `+ [Map: ${outcome} # option: ${outcome}]\n${extra[outcome] ?? ""}    ${outcome}\n`).join("");
      // おまかせ's buy_map may be greyed: then fair_map, which may be too, then haggle_map, which comes back.
      const loop = `-> game\n= game\n# minigame: raju_haggle auto buy_map\nFifty.\n${sticky({ ...prices, haggle_map: `${prices.haggle_map}    -> game\n` })}- -> END\n`;
      expect(() => walk(loop)).toThrow("「おまかせ」 never leaves # minigame: raju_haggle");
    });
  });

  it("reads a mini-game in any scene it walks, and refuses it in a confession date with the reason", () => {
    // A walk reads every scene with mini-games on (the readers outside the walk say false: tag.test.ts).
    expect(walk(`# minigame: cricket_batting\nBowl.\n${choices()}- -> END\n`, { context: { ...context, miniGames: false } })).toBe(5);
    expect(() => walk(`# minigame: cricket_batting\nBowl.\n${choices()}- -> END\n`, { context: { ...context, miniGames: "confession" } }))
      .toThrow("no mini-game in a confession date");
  });

  it("stops a mini-game whose 「おまかせ」 outcome comes back to it without another choice set", () => {
    // Sticky choices (+): a once-only one is gone when the game comes back.
    const sticky = (prefix = "", extra: Record<string, string> = {}) => choices(prefix, extra).replaceAll("* [", "+ [");
    const loop = `-> game\n= game\n# minigame: cricket_batting auto edge\nBowl.\n${sticky("", { edge: "    -> game\n" })}- -> END\n`;
    expect(() => walk(loop)).toThrow("「おまかせ」 never leaves # minigame: cricket_batting");
    // Another outcome may come back (the player plays again); and a choice set on the way breaks the loop.
    expect(walk(`-> game\n= game\n# minigame: cricket_batting auto six\nBowl.\n${sticky("", { edge: "    -> game\n" })}- -> END\n`)).toBeGreaterThan(0);
    const asked = `-> game\n= game\n# minigame: cricket_batting auto edge\nBowl.\n${sticky("", { edge: "    -> again\n" })}- -> END\n` +
      "= again\nAgain?\n+ [Yes]\n    -> game\n+ [No]\n    -> END\n";
    expect(walk(asked)).toBeGreaterThan(0);
  });

  it("warns when 「おまかせ」 takes a 「また今度」 choice", () => {
    const warnings: string[] = [];
    walk(`# minigame: cricket_batting auto edge\nBowl.\n${choices("", { edge: "    # later\n" })}- -> END\n`, { onWarning: (message) => warnings.push(message) });
    expect(warnings.join("\n")).toContain("its 「おまかせ」 outcome edge is a 「また今度」 choice");
  });

  it("stops a mini-game right before a quiz's call", () => {
    const source = `${top}\n=== smp_x_battle ===\n# minigame: cricket_batting\nBowl.\n-> quiz(1) ->\nDone.\n-> END\n`;
    const compiled = compileInk(source, "places/smp_x_arena.ink", { [MODULES_FILE]: MODULES_INK });
    expect(() => walkScene({ compiled, start: "smp_x_battle", label: "smp_x_battle", context, conds: [], options: [], itemIds: [], memoryIds: [],
      variables: { call_arg: 0, quiz_correct: false, answer_correct: false, battle_score: 0, reasoning_action: "", evidence_result: "" },
      battle: { quizzes: 1 } })).toThrow("comes right before a quiz's or reasoning's call");
  });

  it("reports each use it meets once per path, with its scene, knot and tag", () => {
    const uses: MiniGameUse[] = [];
    walk(`# minigame: cricket_batting auto edge\nBowl.\n${choices()}- -> END\n`, {
      scene: { id: "smp_x_date", kind: "talk", storyId: "places/smp_x_tower" }, onMiniGame: (use) => uses.push(use) });
    expect(uses[0]).toEqual({ sceneId: "smp_x_date", kind: "talk", storyId: "places/smp_x_tower", knot: "smp_x_date", game: "cricket_batting",
      auto: "edge", line: "Bowl." });
  });
});
