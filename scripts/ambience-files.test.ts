import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentSourcesFromTree, contentTreeFromFiles } from "./content-sources";
import { AMBIENCE_KIND, ambienceDataOf, ambienceRegistry, ambienceTagsOf, ambienceWarnings, checkAmbienceTags } from "./ambience-files";

// The ambience (環境音, 2026-11-13): each layer's presentation/ambience.json against the MP3 files of its
// public/assets/ambience/, a journey's play.places, the `# ambience:` tags of the stories and the notes that do not stop
// the build. Small content trees in memory (nothing below `root` exists).

const root = path.join(path.sep, "virtual", "dreamscape");
const json = (value: unknown) => JSON.stringify(value);
const tripA = "content/journeys/trip_a";
const tripB = "content/journeys/trip_b";
const manifest = (id: string, order: number) => json({ schemaVersion: 1, order, id, status: "preparing", cities: [] });
const source = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, titleJa: "Test Recording", author: "Someone", license: "CC BY 3.0", checkedAt: "2026-11-13", url: "https://example.org/rain", ...extra });
const track = (id: string, extra: Record<string, unknown> = {}) => ({ id, useJa: "テストの環境音", sources: ["recording"], fromJa: "test.mp3", ...extra });
const list = (tracks: unknown[], play?: unknown, sources: unknown[] = [source("recording")]) =>
  json({ schemaVersion: 1, sources, tracks, ...(play ? { play } : {}) });

/** The shared list with two tracks, and two journeys: trip_a with a city, a track and its places' own, trip_b with none. */
function files(): Record<string, string | null> {
  return {
    [`content/${AMBIENCE_KIND}`]: list([track("amb_rain"), track("amb_birds", { volume: 0.6 })]),
    "public/assets/ambience/amb_rain.mp3": null,
    "public/assets/ambience/amb_birds.mp3": null,
    [`${tripA}/manifest.json`]: manifest("trip_a", 10),
    [`${tripA}/cities/ta_city.json`]: json({ id: "ta_city" }),
    [`${tripA}/travel/ta_city.json`]: json({ places: [{ id: "ta_market" }, { id: "ta_park" }] }),
    [`${tripA}/travel/ta_city-settings.json`]: json({}),
    [`${tripA}/${AMBIENCE_KIND}`]: list([track("ta_amb_bazaar")], { places: { ta_market: "ta_amb_bazaar", ta_park: "amb_birds" } }),
    [`${tripA}/public/assets/ambience/ta_amb_bazaar.mp3`]: null,
    [`${tripB}/manifest.json`]: manifest("trip_b", 20),
  };
}
const load = (tree: Record<string, string | null>) => contentSourcesFromTree(contentTreeFromFiles(root, tree));
const without = (tree: Record<string, string | null>, ...gone: string[]) => Object.fromEntries(Object.entries(tree).filter(([file]) => !gone.includes(file)));
const registry = (tree: Record<string, string | null>) => () => ambienceRegistry(load(tree));

describe("the ambience's lists", () => {
  it("registers each layer's tracks and gives each journey its places' own", () => {
    const ambience = ambienceRegistry(load(files()));
    expect(ambience.tracks.map((item) => [item.entry.id, item.layer.id])).toEqual([["amb_rain", "core"], ["amb_birds", "core"], ["ta_amb_bazaar", "trip_a"]]);
    const data = ambienceDataOf(ambience, ["trip_a", "trip_b"]);
    expect(data.tracks.map((item) => [item.id, item.volume])).toEqual([["amb_rain", 1], ["amb_birds", 0.6], ["ta_amb_bazaar", 1]]);
    expect(data.journeys).toEqual({ trip_a: { places: { ta_market: "ta_amb_bazaar", ta_park: "amb_birds" } }, trip_b: { places: {} } });
    expect(data.sources.map((item) => item.id)).toEqual(["recording", "recording"]);
  });

  it("plays nothing without a list", () => {
    const ambience = ambienceRegistry(load({ [`${tripA}/manifest.json`]: manifest("trip_a", 10) }));
    expect(ambienceDataOf(ambience, ["trip_a"])).toEqual({ schemaVersion: 1, sources: [], tracks: [], journeys: { trip_a: { places: {} } } });
  });

  it("stops a missing file, an unlisted MP3, a track named stop or default and a source without its page", () => {
    expect(registry(without(files(), "public/assets/ambience/amb_rain.mp3")))
      .toThrow("環境音のファイルがありません：content/presentation/ambience.json の \"amb_rain\" の amb_rain.mp3 が public/assets/ambience/ にありません");
    expect(registry({ ...files(), [`${tripA}/public/assets/ambience/ta_extra.mp3`]: null }))
      .toThrow(`一覧にない環境音のファイルです：${tripA}/public/assets/ambience/ta_extra.mp3。${tripA}/presentation/ambience.json の tracks に`);
    expect(registry({ ...files(), [`content/${AMBIENCE_KIND}`]: list([track("amb_rain"), track("amb_birds"), track("stop")]),
      "public/assets/ambience/stop.mp3": null })).toThrow("Reserved ambience track ID: stop");
    expect(registry({ ...files(), [`content/${AMBIENCE_KIND}`]: list([track("amb_rain"), track("amb_birds")], undefined, [source("recording", { url: undefined })]) }))
      .toThrow("Ambience track source without url or author: recording");
    expect(registry({ ...files(), [`content/${AMBIENCE_KIND}`]: list([track("amb_rain"), track("amb_birds", { sources: ["nope"] })]) }))
      .toThrow("Unknown ambience track source: amb_birds/nope");
  });

  it("stops places in the shared list, and a journey's place or track it may not have", () => {
    expect(registry({ ...files(), [`content/${AMBIENCE_KIND}`]: list([track("amb_rain"), track("amb_birds")], { places: { ta_market: "amb_rain" } }) }))
      .toThrow("places in the shared ambience list");
    const own = (journey: string, tracks: unknown[], play: unknown) => registry({ ...files(), [`${journey}/${AMBIENCE_KIND}`]: list(tracks, play) });
    expect(own(tripB, [], { places: { ta_market: "ta_amb_bazaar" } })).toThrow("Unknown place in play.places: ta_market");
    expect(own(tripA, [track("ta_amb_bazaar")], { places: { ta_market: "nope" } })).toThrow("Unknown ambience track: nope");
    expect(own(tripA, [track("ta_amb_bazaar")], { night: "amb_rain" })).toThrow("Invalid play in a journey's ambience list");
  });
});

describe("a line's # ambience:", () => {
  const { tracks } = ambienceRegistry(load(files()));
  it("names a shared track, one of the story's own journey, stop or default", () => {
    const story = "=== knot ===\n# ambience: amb_rain\n雨。\n# ambience: ta_amb_bazaar # speaker: heroine\n市場。\n# ambience: stop\n静か。\n" +
      "# ambience: default\n// # ambience: not_a_track\n-> END\n";
    expect(ambienceTagsOf(story).map((tag) => tag.id)).toEqual(["amb_rain", "ta_amb_bazaar", "stop", "default"]);
    expect(() => checkAmbienceTags(story, "trip_a", tracks)).not.toThrow();
    expect(() => checkAmbienceTags(story, "trip_b", tracks)).toThrow("knot knot の4行目の # ambience: ta_amb_bazaar は、旅行編 trip_a の環境音です");
    expect(() => checkAmbienceTags("# ambience: bell\n鐘。\n", "trip_a", tracks)).toThrow("Unknown ambience track: bell");
    expect(() => checkAmbienceTags("# ambience: Bell\n鐘。\n", "trip_a", tracks)).toThrow("Invalid ambience track ID: Bell");
    expect(() => checkAmbienceTags("# ambience: amb_rain # ambience: stop\n雨。\n", "trip_a", tracks)).toThrow("Duplicate ambience tag on line 1");
  });

  it("notes a journey's own track that no place and no line plays (not a shared one)", () => {
    const tree = { ...files(), [`${tripA}/${AMBIENCE_KIND}`]: list([track("ta_amb_bazaar"), track("ta_amb_spare")], { places: { ta_market: "ta_amb_bazaar" } }),
      [`${tripA}/public/assets/ambience/ta_amb_spare.mp3`]: null };
    const sources = load(tree);
    expect(ambienceWarnings(sources, ambienceRegistry(sources)).map((note) => note.message)).toEqual([`Unused ambience track: ${tripA}/${AMBIENCE_KIND} ` +
      `registers "ta_amb_spare", but no play.places value (${AMBIENCE_KIND}) or line (# ambience:) of trip_a plays it`]);
    const played = load({ ...tree, [`${tripA}/stories/ta_scene.ink`]: "# ambience: ta_amb_spare\n音。\n" });
    expect(ambienceWarnings(played, ambienceRegistry(played))).toEqual([]);
  });
});
