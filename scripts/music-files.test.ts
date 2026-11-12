import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentSourcesFromTree, contentTreeFromFiles } from "./content-sources";
import { bgmTagsOf, checkBgmTags, musicDataOf, musicRegistry, musicWarnings, MUSIC_KIND } from "./music-files";

// The background music (2026-11-12): each layer's presentation/music.json against the MP3 files of its
// public/assets/bgm/, the lists' play (the shared one and a journey's over it), the `# bgm:` tags of the stories and the
// notes that do not stop the build. Small content trees in memory (nothing below `root` exists).

const root = path.join(path.sep, "virtual", "dreamscape");
const json = (value: unknown) => JSON.stringify(value);
const tripA = "content/journeys/trip_a";
const tripB = "content/journeys/trip_b";
const manifest = (id: string, order: number) => json({ schemaVersion: 1, order, id, status: "preparing", cities: [] });
const source = (id: string) =>
  ({ id, titleJa: "Test Music", author: "Someone", license: "CC BY 4.0", checkedAt: "2026-11-12", url: "https://example.org/music" });
const track = (id: string, extra: Record<string, unknown> = {}) => ({ id, useJa: "テストの曲", sources: ["album"], fromJa: "test.mp3", ...extra });
const list = (tracks: unknown[], play?: unknown) => json({ schemaVersion: 1, sources: [source("album")], tracks, ...(play ? { play } : {}) });
const rootPlay = {
  title: "title_song", freeTime: { morning: "day_song", day: "day_song", night: "night_song" }, night: "night_song",
  place: "day_song", arrival: "day_song", epilogue: "night_song", endRoll: "title_song",
};
const sharedTracks = [track("title_song"), track("day_song", { volume: 0.5 }), track("night_song")];

/** The shared list with three tracks, and two journeys: trip_a with a city, a track and a play of its own, trip_b with none. */
function files(): Record<string, string | null> {
  return {
    [`content/${MUSIC_KIND}`]: list(sharedTracks, rootPlay),
    "public/assets/bgm/title_song.mp3": null,
    "public/assets/bgm/day_song.mp3": null,
    "public/assets/bgm/night_song.mp3": null,
    [`${tripA}/manifest.json`]: manifest("trip_a", 10),
    [`${tripA}/cities/ta_city.json`]: json({ id: "ta_city" }),
    [`${tripA}/travel/ta_city.json`]: json({ places: [{ id: "ta_fort" }, { id: "ta_hotel" }] }),
    [`${tripA}/travel/ta_city-settings.json`]: json({}),
    [`${tripA}/${MUSIC_KIND}`]: list([track("ta_fort_song")], { place: "ta_fort_song", places: { ta_hotel: "night_song" } }),
    [`${tripA}/public/assets/bgm/ta_fort_song.mp3`]: null,
    [`${tripB}/manifest.json`]: manifest("trip_b", 20),
  };
}
const load = (tree: Record<string, string | null>) => contentSourcesFromTree(contentTreeFromFiles(root, tree));
/** The tree without the files `gone`. */
const without = (tree: Record<string, string | null>, ...gone: string[]) => Object.fromEntries(Object.entries(tree).filter(([file]) => !gone.includes(file)));
const registry = (tree: Record<string, string | null>) => () => musicRegistry(load(tree));

describe("the music's lists", () => {
  it("registers each layer's tracks and gives each journey the shared play with its own over it", () => {
    const music = musicRegistry(load(files()));
    expect(music.tracks.map((item) => [item.entry.id, item.layer.id]))
      .toEqual([["title_song", "core"], ["day_song", "core"], ["night_song", "core"], ["ta_fort_song", "trip_a"]]);
    const data = musicDataOf(music, ["trip_a", "trip_b"]);
    expect(data.tracks.map((item) => [item.id, item.volume])).toEqual([["title_song", 1], ["day_song", 0.5], ["night_song", 1], ["ta_fort_song", 1]]);
    expect(data.root).toEqual({ ...rootPlay, places: {} });
    expect(data.journeys.trip_a).toEqual({ ...rootPlay, place: "ta_fort_song", places: { ta_hotel: "night_song" } });
    expect(data.journeys.trip_b).toEqual({ ...rootPlay, places: {} });
  });

  it("plays nothing without a list", () => {
    const music = musicRegistry(load({ [`${tripA}/manifest.json`]: manifest("trip_a", 10) }));
    expect(musicDataOf(music, ["trip_a"])).toEqual({ schemaVersion: 1, sources: [], tracks: [], root: null, journeys: {} });
  });

  it("stops a missing file, an unlisted MP3 and a track named stop or default, like the sound effects' files", () => {
    expect(registry(without(files(), "public/assets/bgm/night_song.mp3")))
      .toThrow("曲のファイルがありません：content/presentation/music.json の \"night_song\" の night_song.mp3 が public/assets/bgm/ にありません");
    expect(registry({ ...files(), [`${tripA}/public/assets/bgm/ta_extra.mp3`]: null }))
      .toThrow(`一覧にない曲のファイルです：${tripA}/public/assets/bgm/ta_extra.mp3。${tripA}/presentation/music.json の tracks に`);
    expect(registry({ ...files(), [`content/${MUSIC_KIND}`]: list([...sharedTracks, track("stop")], rootPlay), "public/assets/bgm/stop.mp3": null }))
      .toThrow("Reserved track ID: stop");
  });

  it("stops a shared list without play, with a key missing or places, or naming a track it may not play", () => {
    const shared = (play: unknown) => registry({ ...files(), [`content/${MUSIC_KIND}`]: list(sharedTracks, play) });
    expect(shared(undefined)).toThrow("Missing play in the shared music list");
    const { arrival: _arrival, ...noArrival } = rootPlay;
    expect(shared(noArrival)).toThrow("Invalid play in the shared music list");
    expect(shared(noArrival)).toThrow("play.arrival");
    expect(shared({ ...rootPlay, places: { ta_fort: "day_song" } })).toThrow("places in the shared music list");
    expect(shared({ ...rootPlay, endRoll: "ta_fort_song" })).toThrow("Journey track in the shared list: ta_fort_song is a track of trip_a");
    expect(shared({ ...rootPlay, night: "nope" })).toThrow("Unknown track: nope");
  });

  it("stops a journey's play naming another journey's track, a key it may not have or a place its cities do not have", () => {
    const own = (journey: string, tracks: unknown[], play: unknown) => registry({ ...files(), [`${journey}/${MUSIC_KIND}`]: list(tracks, play) });
    expect(own(tripB, [], { place: "ta_fort_song" })).toThrow("Track of another journey: ta_fort_song is a track of trip_a");
    expect(own(tripA, [track("ta_fort_song")], { nightScreen: "night_song" })).toThrow("Invalid play in a journey's music list");
    expect(own(tripA, [track("ta_fort_song")], { places: { ta_nowhere: "night_song" } })).toThrow("Unknown place in play.places: ta_nowhere");
    expect(own(tripA, [track("ta_fort_song")], { freeTime: { morning: "ta_fort_song", day: "day_song", night: "night_song" } })).not.toThrow();
  });
});

describe("a line's # bgm:", () => {
  const { tracks } = musicRegistry(load(files()));
  it("names a shared track, one of the story's own journey, stop or default", () => {
    const story = "=== knot ===\n# bgm: day_song\n朝。\n# bgm: ta_fort_song # speaker: heroine\n砦。\n# bgm: stop\n静か。\n# bgm: default\n// # bgm: not_a_track\n-> END\n";
    expect(bgmTagsOf(story).map((tag) => tag.id)).toEqual(["day_song", "ta_fort_song", "stop", "default"]);
    expect(() => checkBgmTags(story, "trip_a", tracks)).not.toThrow();
    expect(() => checkBgmTags(story, "trip_b", tracks)).toThrow("knot knot の4行目の # bgm: ta_fort_song は、旅行編 trip_a の曲です");
    expect(() => checkBgmTags("# bgm: bell\n鐘。\n", "trip_a", tracks)).toThrow("Unknown track: bell");
    expect(() => checkBgmTags("# bgm: Bell\n鐘。\n", "trip_a", tracks)).toThrow("Invalid track ID: Bell");
    expect(() => checkBgmTags("# bgm: day_song # bgm: night_song\n朝。\n", "trip_a", tracks)).toThrow("Duplicate bgm tag on line 1");
  });

  it("notes a track that no play value and no line plays", () => {
    const tree = { ...files(), [`content/${MUSIC_KIND}`]: list([...sharedTracks, track("spare_song")], rootPlay), "public/assets/bgm/spare_song.mp3": null };
    const sources = load(tree);
    expect(musicWarnings(sources, musicRegistry(sources)).map((note) => note.message)).toEqual([`Unused track: content/${MUSIC_KIND} registers ` +
      `"spare_song", but no play value (${MUSIC_KIND}) or line (# bgm:) plays it`]);
    const played = load({ ...tree, [`${tripA}/stories/ta_scene.ink`]: "# bgm: spare_song\n曲。\n" });
    expect(musicWarnings(played, musicRegistry(played))).toEqual([]);
  });
});
