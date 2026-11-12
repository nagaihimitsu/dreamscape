import path from "node:path";
import { describe, expect, it } from "vitest";
import { SYSTEM_SOUND_IDS } from "../src/content/sounds";
import { contentSourcesFromTree, contentTreeFromFiles } from "./content-sources";
import { checkSoundTags, soundRegistry, soundTagsOf, soundVolumesOf, soundWarnings, SOUNDS_KIND } from "./sound-files";

// The sound effects (2026-11-12): each layer's presentation/sounds.json against the MP3 files of its public/assets/se/,
// the `# se:` tags of the stories and the notes that do not stop the build. Small content trees in memory (nothing below
// `root` exists).

const root = path.join(path.sep, "virtual", "dreamscape");
const json = (value: unknown) => JSON.stringify(value);
const tripA = "content/journeys/trip_a";
const tripB = "content/journeys/trip_b";
const manifest = (id: string, order: number) => json({ schemaVersion: 1, order, id, status: "preparing", cities: [] });
const source = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, titleJa: "Test Sounds", author: "Someone", license: "CC0 1.0", checkedAt: "2026-11-12", url: "https://example.org/sounds", ...extra });
const sound = (id: string, sources = ["kit"], extra: Record<string, unknown> = {}) => ({ id, useJa: "テストの音", sources, fromJa: "test_001", ...extra });
const list = (sources: unknown[], sounds: unknown[]) => json({ schemaVersion: 1, sources, sounds });

/** The shared list with two sounds, and two journeys: trip_a with a sound of its own, trip_b with none. */
function files(): Record<string, string | null> {
  return {
    [`content/${SOUNDS_KIND}`]: list([source("kit")], [sound("ui_tap"), sound("door_knock", ["kit"], { volume: 0.5 })]),
    "public/assets/se/ui_tap.mp3": null,
    "public/assets/se/door_knock.mp3": null,
    [`${tripA}/manifest.json`]: manifest("trip_a", 10),
    [`${tripA}/${SOUNDS_KIND}`]: list([source("kit")], [sound("ta_horn")]),
    [`${tripA}/public/assets/se/ta_horn.mp3`]: null,
    [`${tripB}/manifest.json`]: manifest("trip_b", 20),
  };
}
const load = (tree: Record<string, string | null>) => contentSourcesFromTree(contentTreeFromFiles(root, tree));
/** The tree without the files `gone`. */
const without = (tree: Record<string, string | null>, ...gone: string[]) => Object.fromEntries(Object.entries(tree).filter(([file]) => !gone.includes(file)));
const registry = (tree: Record<string, string | null>) => () => soundRegistry(load(tree));

describe("the sound effects' lists", () => {
  it("registers each layer's sounds with their volumes", () => {
    const sounds = soundRegistry(load(files()));
    expect(sounds.map((item) => [item.entry.id, item.layer.id])).toEqual([["ui_tap", "core"], ["door_knock", "core"], ["ta_horn", "trip_a"]]);
    expect(soundVolumesOf(sounds)).toEqual({ ui_tap: 1, door_knock: 0.5, ta_horn: 1 });
  });

  it("stops a missing file, an unlisted MP3, a file of another name and an unknown source, all in one message", () => {
    expect(registry(without(files(), "public/assets/se/door_knock.mp3")))
      .toThrow("効果音のファイルがありません：content/presentation/sounds.json の \"door_knock\" の door_knock.mp3 が public/assets/se/ にありません");
    expect(registry({ ...files(), [`${tripA}/public/assets/se/ta_bell.mp3`]: null }))
      .toThrow(`一覧にない効果音のファイルです：${tripA}/public/assets/se/ta_bell.mp3。${tripA}/presentation/sounds.json の sounds に`);
    expect(registry({ ...files(), "public/assets/se/Bell.wav": null })).toThrow("Invalid sound file: assets/se/Bell.wav");
    expect(registry({ ...files(), [`content/${SOUNDS_KIND}`]: list([source("kit")], [sound("ui_tap", ["nope"]), sound("door_knock")]) }))
      .toThrow("Unknown sound source: ui_tap/nope");
    // A sound names a source of its own list only.
    expect(registry({ ...files(), [`${tripA}/${SOUNDS_KIND}`]: list([], [sound("ta_horn")]) })).toThrow("Unknown sound source: ta_horn/kit");
    let message = "";
    try {
      soundRegistry(load({ ...without(files(), `${tripA}/public/assets/se/ta_horn.mp3`), "public/assets/se/extra.mp3": null }));
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.split("\n")).toHaveLength(2);
    expect(message).toContain("Unlisted sound file: assets/se/extra.mp3");
    expect(message).toContain("Missing sound file: assets/se/ta_horn.mp3");
  });

  it("stops a sound whose file another layer serves, an ID registered twice and a source without its page", () => {
    // trip_a lists a sound whose file is in the root public/: both sides are named.
    const moved = { ...files(), [`${tripA}/${SOUNDS_KIND}`]: list([source("kit")], [sound("ta_horn"), sound("ta_bell")]), "public/assets/se/ta_bell.mp3": null };
    expect(registry(moved)).toThrow(`効果音のファイルがありません：${tripA}/presentation/sounds.json の "ta_bell" の ta_bell.mp3 が ${tripA}/public/assets/se/ にありません`);
    expect(registry(moved)).toThrow("Unlisted sound file: assets/se/ta_bell.mp3");
    expect(registry({ ...files(), [`${tripA}/${SOUNDS_KIND}`]: list([source("kit")], [sound("ta_horn"), sound("door_knock")]) }))
      .toThrow("Duplicate sound ID: door_knock");
    expect(registry({ ...files(), [`content/${SOUNDS_KIND}`]: list([source("kit", { url: undefined })], [sound("ui_tap"), sound("door_knock")]) }))
      .toThrow("Sound source without url or author: kit");
    // A sound made for Dreamscape needs no page; one source under one ID in two lists is the same work.
    expect(registry({ ...files(), [`content/${SOUNDS_KIND}`]: list([source("kit", { license: "own", url: undefined })], [sound("ui_tap"), sound("door_knock")]),
      [`${tripA}/${SOUNDS_KIND}`]: list([source("kit", { license: "own", url: undefined })], [sound("ta_horn")]) })).not.toThrow();
    expect(registry({ ...files(), [`${tripA}/${SOUNDS_KIND}`]: list([source("kit", { author: "Someone else" })], [sound("ta_horn")]) }))
      .toThrow("Sound source kit differs between lists");
  });
});

describe("a line's # se:", () => {
  const sounds = soundRegistry(load(files()));
  it("names a shared sound or one of the story's own journey", () => {
    const story = "=== knot ===\n# se: door_knock\n戸を叩く。\n# se: ta_horn # speaker: heroine\n警笛。\n// # se: not_a_sound in a comment\n-> END\n";
    expect(soundTagsOf(story).map((tag) => tag.id)).toEqual(["door_knock", "ta_horn"]);
    expect(() => checkSoundTags(story, "trip_a", sounds)).not.toThrow();
    expect(() => checkSoundTags(story, "trip_b", sounds)).toThrow("knot knot の4行目の # se: ta_horn は、旅行編 trip_a の音です");
    expect(() => checkSoundTags("# se: bell\n鐘。\n", "trip_a", sounds)).toThrow("Unknown sound: bell");
    expect(() => checkSoundTags("# se: Bell\n鐘。\n", "trip_a", sounds)).toThrow("Invalid sound ID: Bell");
  });

  it("notes a journey's sound nothing plays and the system sounds the shared list lacks", () => {
    const sources = load(files());
    const notes = soundWarnings(sources, soundRegistry(sources)).map((note) => note.message);
    expect(notes[0]).toBe(`Unused sound: ${tripA}/presentation/sounds.json registers "ta_horn", but no line (# se:) or transport mode (se) of trip_a plays it`);
    expect(notes[1]).toContain(SYSTEM_SOUND_IDS.filter((id) => id !== "ui_tap").join(", "));
    expect(notes).toHaveLength(2);
  });
});
