import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseStoryTags } from "../content/tags";
import { defineMiniGame, type AnyMiniGameDefinition } from "./contract";
import { cricketBatting } from "./cricket_batting/definition";
import { isValidMiniGameTag, miniGameArtPath, miniGameChoice, miniGameOptionId, miniGameTagText, parseMiniGameTag } from "./tag";

const context = { effectIds: [], backgroundIds: ["bg_pitch"], emotionIds: ["neutral"], miniGameArt: { pitch_x: "assets/minigames/pitch_x.jpg", girl: "assets/minigames/girl.webp" } };

// A game with keys of its own, to read the game keys through the same reader (the registry's games may have none).
const keyed: AnyMiniGameDefinition = defineMiniGame({
  ...cricketBatting,
  id: "keyed_game",
  params: (tagContext) => z.object({
    level: z.enum(["easy", "hard"]).optional().describe("難しさ（easy・hard）"),
    count: z.coerce.number().int().min(1).max(9).default(3).describe("回数（1〜9）"),
    target: z.string().refine((value) => tagContext.backgroundIds.length === 0 || tagContext.backgroundIds.includes(value)).optional().describe("背景のID"),
  }).strict(),
});
const games = { cricket_batting: cricketBatting, keyed_game: keyed };

// A line's # minigame: (docs/13 3.1): one form for every game.
describe("a line's # minigame:", () => {
  it("reads the game, the outcome 「おまかせ」 gives (the game's own unless the tag names one) and an option prefix", () => {
    expect(parseStoryTags(["speaker: heroine", "minigame: cricket_batting"], context)).toEqual({
      speaker: "heroine", minigame: { id: "cricket_batting", auto: cricketBatting.defaultAuto }, effects: [],
    });
    expect(parseMiniGameTag("cricket_batting auto over_wall")).toEqual({ id: "cricket_batting", auto: "over_wall" });
    expect(parseMiniGameTag("cricket_batting prefix again auto edge")).toEqual({ id: "cricket_batting", auto: "edge", prefix: "again" });
    expect(parseStoryTags(["speaker: heroine"], context)).not.toHaveProperty("minigame");
  });

  it("reads the host's bg and art.<slot>, and the game's own keys as written", () => {
    expect(parseMiniGameTag("cricket_batting bg bg_pitch art.pitch pitch_x art.bowler girl", context))
      .toEqual({ id: "cricket_batting", auto: "six", bg: "bg_pitch", art: { pitch: "pitch_x", bowler: "girl" } });
    expect(parseMiniGameTag("keyed_game count 5 level easy", context, games))
      .toEqual({ id: "keyed_game", auto: "six", params: { count: "5", level: "easy" } });
  });

  it("refuses an unknown game or outcome, a key without a value, a repeated or unknown key and a malformed prefix", () => {
    expect(() => parseMiniGameTag("tennis")).toThrow("Unknown minigame: tennis (write # minigame: <game>");
    expect(() => parseMiniGameTag("tennis")).toThrow("cricket_batting（クリケットの打席）");
    expect(() => parseMiniGameTag("cricket_batting auto home_run")).toThrow("Unknown outcome of the minigame cricket_batting: auto home_run (its outcomes: six, over_wall, edge, bowled, no_swing)");
    expect(() => parseMiniGameTag("cricket_batting auto")).toThrow("the key auto has no value");
    expect(() => parseMiniGameTag("cricket_batting prefix")).toThrow("the key prefix has no value");
    expect(() => parseMiniGameTag("cricket_batting auto six auto edge")).toThrow("the key auto is written twice");
    expect(() => parseMiniGameTag("cricket_batting fast yes")).toThrow("Unknown key of the minigame cricket_batting: fast (its keys: art.pitch:");
    expect(() => parseMiniGameTag("keyed_game speed 3", context, games)).toThrow("its keys: level: 難しさ（easy・hard）; count: 回数（1〜9）");
    expect(() => parseMiniGameTag("cricket_batting prefix Again")).toThrow("Invalid minigame prefix: Again");
    expect(() => parseMiniGameTag("cricket_batting prefix a_b")).toThrow("Invalid minigame prefix");
    expect(() => parseStoryTags(["minigame: cricket_batting", "minigame: cricket_batting"], context)).toThrow("Duplicate minigame tag");
  });

  it("refuses a game key its zod refuses, saying the key's description", () => {
    expect(() => parseMiniGameTag("keyed_game level medium", context, games)).toThrow(/Invalid level of the minigame keyed_game: .* \(level: 難しさ（easy・hard）\)/u);
    expect(() => parseMiniGameTag("keyed_game count 12", context, games)).toThrow("(count: 回数（1〜9）)");
    expect(() => parseMiniGameTag("keyed_game target other", context, games)).toThrow("(target: 背景のID)");
  });

  it("refuses a background, an art slot or a picture the context does not know, and a sprite that is no webp or png", () => {
    expect(() => parseMiniGameTag("cricket_batting bg nowhere", context)).toThrow("Unknown background of the minigame cricket_batting: bg nowhere");
    expect(() => parseMiniGameTag("cricket_batting art.sky pitch_x", context)).toThrow("Unknown art slot of the minigame cricket_batting: art.sky (its slots: art.pitch:");
    expect(() => parseMiniGameTag("cricket_batting art.pitch missing", context)).toThrow("Unknown minigame art: art.pitch missing");
    expect(() => parseMiniGameTag("cricket_batting art.bowler pitch_x", context)).toThrow("art.bowler is a figure on the field, so a webp or png");
    // A list absent from the context is not checked (the game checks only what content:build passed).
    expect(parseMiniGameTag("cricket_batting bg anywhere art.pitch any").bg).toBe("anywhere");
  });

  // A backdrop slot takes the journey's own picture or a credited tourism photo (docs/13 2.12); a sprite takes only its own.
  it("fills a backdrop slot with a mini-game picture or a tourism photo, and refuses a photo as a figure and an ID neither has", () => {
    const withPhotos = { ...context, miniGamePhotos: { gt_img_lawn: "assets/tourism/india/lawn.webp" } };
    expect(parseMiniGameTag("cricket_batting art.pitch pitch_x", withPhotos).art).toEqual({ pitch: "pitch_x" });
    expect(parseMiniGameTag("cricket_batting art.pitch gt_img_lawn art.bowler girl", withPhotos).art).toEqual({ pitch: "gt_img_lawn", bowler: "girl" });
    expect(miniGameArtPath(withPhotos, "pitch_x")).toBe("assets/minigames/pitch_x.jpg");
    expect(miniGameArtPath(withPhotos, "gt_img_lawn")).toBe("assets/tourism/india/lawn.webp");
    expect(miniGameArtPath(withPhotos, "missing")).toBeUndefined();
    expect(() => parseMiniGameTag("cricket_batting art.bowler gt_img_lawn", withPhotos))
      .toThrow("The minigame art gt_img_lawn of art.bowler is a tourism photo: art.bowler is a figure on the field");
    expect(() => parseMiniGameTag("cricket_batting art.pitch gt_img_missing", withPhotos)).toThrow("Unknown minigame art: art.pitch gt_img_missing");
    // Either list alone is checked: an ID the context's photos lack is refused without a mini-game picture list too.
    expect(() => parseMiniGameTag("cricket_batting art.pitch pitch_x", { miniGamePhotos: withPhotos.miniGamePhotos })).toThrow("Unknown minigame art: art.pitch pitch_x");
    expect(isValidMiniGameTag(parseMiniGameTag("cricket_batting art.pitch gt_img_lawn", withPhotos), withPhotos)).toBe(true);
    expect(isValidMiniGameTag(parseMiniGameTag("cricket_batting art.pitch gt_img_lawn", withPhotos), { ...context, miniGamePhotos: {} })).toBe(false);
  });

  it("is refused where content:build says no mini-game can run, and in a confession date with its reason", () => {
    expect(() => parseStoryTags(["minigame: cricket_batting"], { ...context, miniGames: false })).toThrow("a mini-game runs at a choice set of a scene written in a place file");
    expect(() => parseStoryTags(["minigame: cricket_batting"], { ...context, miniGames: "confession" })).toThrow("no mini-game in a confession date");
    expect(parseStoryTags(["minigame: cricket_batting"], { ...context, miniGames: true }).minigame?.id).toBe("cricket_batting");
  });

  it("writes a tag back as its value, and checks a saved tag with the same reader", () => {
    const tag = parseMiniGameTag("cricket_batting art.pitch pitch_x prefix again bg bg_pitch", context);
    expect(miniGameTagText(tag)).toBe("cricket_batting auto six prefix again bg bg_pitch art.pitch pitch_x");
    expect(parseMiniGameTag(miniGameTagText(tag), context)).toEqual(tag);
    expect(isValidMiniGameTag(tag, context)).toBe(true);
    expect(isValidMiniGameTag({ ...tag, auto: "home_run" }, context)).toBe(false);
    expect(isValidMiniGameTag({ ...tag, id: "tennis" }, context)).toBe(false);
    expect(isValidMiniGameTag({ ...tag, art: { sky: "pitch_x" } }, context)).toBe(false);
  });

  it("takes the choice whose option ID is the outcome's, after the prefix when the tag has one", () => {
    const choices = [{ index: 0, optionId: "six" }, { index: 1, optionId: "again_six" }, { index: 2 }];
    expect(miniGameOptionId({}, "six")).toBe("six");
    expect(miniGameOptionId({ prefix: "again" }, "no_swing")).toBe("again_no_swing");
    expect(miniGameChoice(choices, {}, "six")?.index).toBe(0);
    expect(miniGameChoice(choices, { prefix: "again" }, "six")?.index).toBe(1);
    expect(miniGameChoice(choices, {}, "edge")).toBeUndefined();
  });
});
