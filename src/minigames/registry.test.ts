import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MINI_GAME_ID, MINI_GAME_OUTCOME_ID } from "./contract";
import { fallbackProblems } from "./fallback";
import { MINI_GAME_ENGINES, MINI_GAME_IDS, MINI_GAMES } from "./registry";
import { MINI_GAME_HOST_KEYS, MINI_GAME_KEY, miniGameParamKeys } from "./tag";

// The registry's contract (docs/13 6.1), for every game: adding a game adds nothing here.

const folder = (path: string) => new URL(path, import.meta.url);
/** The folders that are not games (the shared parts of src/minigames/). */
const SHARED = new Set(["engines", "host", "testing"]);
const gameFolders = readdirSync(folder("./"), { withFileTypes: true }).filter((entry) => entry.isDirectory() && !SHARED.has(entry.name)).map((entry) => entry.name);
const sounds = (JSON.parse(readFileSync(folder("../../content/presentation/sounds.json"), "utf8")) as { sounds: { id: string }[] }).sounds.map((sound) => sound.id);
const ownArtwork = (JSON.parse(readFileSync(folder("../../content/presentation/own-artwork.json"), "utf8")) as { artworks: { paths: string[] }[] })
  .artworks.flatMap((group) => group.paths);
const context = { effectIds: [], backgroundIds: [], emotionIds: [] };
const japanese = /[぀-ヿ一-鿿]/u;
/** What a game's and an engine's rules may never read (docs/13 2.4): randomness, the clock, the page, React, the generated content. */
const BANNED = ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated", "requestAnimationFrame", "setTimeout", "document.", "window.location"];

describe("the mini-game registry", () => {
  it("registers every game folder once, each under its folder's name", () => {
    expect(new Set(MINI_GAME_IDS).size).toBe(MINI_GAME_IDS.length);
    expect([...MINI_GAME_IDS].sort()).toEqual([...gameFolders].sort());
    // One line each, in alphabetical order (docs/13 2.1: fewer conflicts between builders).
    const lines = [...readFileSync(folder("./registry-list.ts"), "utf8").matchAll(/from "\.\/([a-z0-9_]+)\/definition"/gu)].map((match) => match[1]);
    expect(lines).toEqual([...MINI_GAME_IDS].sort());
  });

  it("lists only engines that have their folder and pure rules", () => {
    for (const engine of MINI_GAME_ENGINES) {
      expect(existsSync(folder(`./engines/${engine}/engine.ts`)), engine).toBe(true);
      const source = readFileSync(folder(`./engines/${engine}/engine.ts`), "utf8");
      for (const banned of BANNED) expect(source, `${engine}: ${banned}`).not.toContain(banned);
    }
  });
});

describe.each(MINI_GAME_IDS)("the mini-game %s", (id) => {
  const definition = MINI_GAMES[id];

  it("has an ID, two or more outcomes with Japanese labels and 「おまかせ」's among them", () => {
    expect(id).toMatch(MINI_GAME_ID);
    expect(definition.id).toBe(id);
    expect(definition.outcomes.length).toBeGreaterThanOrEqual(2);
    const outcomeIds = definition.outcomes.map((outcome) => outcome.id);
    expect(new Set(outcomeIds).size).toBe(outcomeIds.length);
    for (const outcome of definition.outcomes) {
      expect(outcome.id).toMatch(MINI_GAME_OUTCOME_ID);
      expect(outcome.labelJa).toMatch(japanese);
    }
    expect(outcomeIds).toContain(definition.defaultAuto);
    for (const text of [definition.titleJa, definition.howToJa, definition.startJa, definition.hintJa]) expect(text).toMatch(japanese);
  });

  it("declares fallbacks (for an outcome whose choice may be greyed) only to its other outcomes, never in a loop", () => {
    expect(fallbackProblems(definition)).toEqual([]);
  });

  it("reads its own keys with a strict zod object, each described, never a host key, and its examples with it", () => {
    const schema = definition.params(context);
    expect(schema).toBeInstanceOf(z.ZodObject);
    for (const { key, descriptionJa } of miniGameParamKeys(definition, context)) {
      expect(key).toMatch(MINI_GAME_KEY);
      expect(MINI_GAME_HOST_KEYS as readonly string[]).not.toContain(key);
      expect(key.startsWith("art")).toBe(false);
      expect(descriptionJa, key).toMatch(japanese);
    }
    expect(definition.examples.length).toBeGreaterThan(0);
    for (const example of definition.examples) expect(() => schema.parse(example), JSON.stringify(example)).not.toThrow();
    expect(() => schema.parse({ unknown_key: "1" })).toThrow();
  });

  it("writes the host's card, finish and reactions in Japanese (names as placeholders), and practice keys its zod reads", () => {
    if (definition.goalJa !== undefined) expect(definition.goalJa).toMatch(japanese);
    if (definition.durationSec !== undefined) expect(definition.durationSec).toBeGreaterThan(0);
    if (definition.practice) expect(() => definition.params(context).parse({ ...definition.examples[0], ...definition.practice && definition.practice.params })).not.toThrow();
    for (const outcome of definition.outcomes) {
      if (typeof outcome.finishJa === "string") expect(outcome.finishJa, outcome.id).toMatch(japanese);
      for (const line of outcome.reaction?.linesJa ?? []) {
        expect(line, outcome.id).toMatch(japanese);
        // Names are the player's: only {heroine_name} and {player_name} (AGENTS).
        expect(line.replaceAll("{heroine_name}", "").replaceAll("{player_name}", ""), outcome.id).not.toMatch(/[{}]/u);
      }
    }
  });

  it("rings only shared sounds, uses only its own listed art, and names its art slots", () => {
    for (const sound of definition.sounds) expect(sounds, sound).toContain(sound);
    for (const path of definition.art) {
      expect(existsSync(folder(`../../public/${path}`)), path).toBe(true);
      expect(ownArtwork, path).toContain(path);
    }
    const slots = definition.artSlots.map((slot) => slot.id);
    expect(new Set(slots).size).toBe(slots.length);
    for (const slot of definition.artSlots) {
      expect(slot.id).toMatch(MINI_GAME_KEY);
      expect(slot.labelJa).toMatch(japanese);
    }
  });

  it("is a skin of a registered engine, with pure rules, its rules test and its play in files of their own", () => {
    expect(existsSync(folder(`./engines/${definition.engine}/engine.ts`))).toBe(true);
    const rules = readFileSync(folder(`./${id}/rules.ts`), "utf8");
    for (const banned of BANNED) expect(rules, banned).not.toContain(banned);
    expect(readFileSync(folder(`./${id}/rules.test.ts`), "utf8")).toContain("describeMiniGameRules(");
    // The definition (in the title page's load) names its play only through load().
    expect(readFileSync(folder(`./${id}/definition.ts`), "utf8")).toMatch(/load: \(\) => import\("\.\/play"\)/u);
  });

  it("loads its play and rules", async () => {
    const module = await definition.load();
    expect(typeof module.Play).toBe("function");
    expect(typeof module.rules.outcomeOf).toBe("function");
    expect(typeof module.rules.autoRecord).toBe("function");
  });
});
