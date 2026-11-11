import path from "node:path";
import { describe, expect, it } from "vitest";
import { albumImagesOf, albumTagsOf, checkAlbumTags } from "./album-images";
import { contentSourcesFromTree, contentTreeFromFiles } from "./content-sources";

// The album's illustrations (2026-11-11 user decision): every file of a journey's public/assets/album/ is an album image
// named by its file name, one per ID in the whole build, and a line's # photo: or # recall: names one of its own
// journey's. Small content trees in memory (nothing below `root` exists), as in image-rights.test.ts.

const root = path.join(path.sep, "virtual", "dreamscape");
const manifest = (id: string, order: number) => JSON.stringify({ schemaVersion: 1, order, id, status: "preparing", cities: [] });
const album = (journeyId: string, file: string) => `content/journeys/${journeyId}/public/assets/album/${file}`;
/** Two journeys with album images, another folder of a journey's public/, and the root public/ (which has no album). */
function files(extra: Record<string, string | null> = {}): Record<string, string | null> {
  return {
    "content/journeys/trip_a/manifest.json": manifest("trip_a", 10),
    "content/journeys/trip_b/manifest.json": manifest("trip_b", 20),
    [album("trip_a", "a_tower.webp")]: null,
    [album("trip_a", "01_square.png")]: null,
    [album("trip_b", "b_harbour.jpg")]: null,
    "content/journeys/trip_a/public/assets/tourism/a_tower_photo.webp": null,
    "public/assets/album/shared.webp": null,
    ...extra,
  };
}
const load = (tree: Record<string, string | null>) => contentSourcesFromTree(contentTreeFromFiles(root, tree));
const errorOf = (tree: Record<string, string | null>) => {
  try { albumImagesOf(load(tree)); } catch (error) { return (error as Error).message.split("\n"); }
  return [];
};

describe("album images", () => {
  it("are the files of each journey's public/assets/album/, the ID their file name, with their served path and journey", () => {
    expect(albumImagesOf(load(files()))).toEqual([
      { id: "01_square", path: "assets/album/01_square.png", journeyId: "trip_a" },
      { id: "a_tower", path: "assets/album/a_tower.webp", journeyId: "trip_a" },
      { id: "b_harbour", path: "assets/album/b_harbour.jpg", journeyId: "trip_b" },
    ]);
  });

  it("stop at a file name that is no ID: capitals, other signs, another extension, a sub-folder", () => {
    const errors = errorOf(files({ [album("trip_a", "Tower.webp")]: null, [album("trip_a", "a-gate.webp")]: null,
      [album("trip_a", "a_gate.gif")]: null, [album("trip_a", "old/a_gate.webp")]: null }));
    expect(errors).toHaveLength(4);
    expect(errors).toContain("アルバムの絵のファイル名が使えません：content/journeys/trip_a/public/assets/album/Tower.webp。" +
      "アルバムの絵は content/journeys/trip_a/public/assets/album/ の直下に「ID.webp」の名前で置きます。ID は英小文字・数字・_ だけで、" +
      "拡張子は webp・png・jpg・jpeg のどれかです（Invalid album image file: assets/album/Tower.webp; name it assets/album/<ID>.<webp|png|jpg|jpeg> " +
      "with an ID of a-z, 0-9 and _）。");
    for (const file of ["a-gate.webp", "a_gate.gif", "old/a_gate.webp"])
      expect(errors.some((error) => error.startsWith(`アルバムの絵のファイル名が使えません：${album("trip_a", file)}。`)), file).toBe(true);
  });

  it("stop at a second file of one ID, in the same journey or in another", () => {
    expect(errorOf(files({ [album("trip_a", "a_tower.png")]: null }))).toEqual([
      `同じIDのアルバムの絵が2つあります：${album("trip_a", "a_tower.png")} と ${album("trip_a", "a_tower.webp")}。` +
      "ID はファイル名（拡張子を除く）で、すべての旅行編で1つだけにします。どちらかの名前を変えてください（Duplicate album image ID: a_tower）。",
    ]);
    expect(errorOf(files({ [album("trip_b", "a_tower.jpg")]: null }))).toEqual([
      `同じIDのアルバムの絵が2つあります：${album("trip_a", "a_tower.webp")} と ${album("trip_b", "a_tower.jpg")}。` +
      "ID はファイル名（拡張子を除く）で、すべての旅行編で1つだけにします。どちらかの名前を変えてください（Duplicate album image ID: a_tower）。",
    ]);
  });
});

describe("a line's # photo: and # recall:", () => {
  const images = albumImagesOf(load(files()));
  const folder = "content/journeys/trip_a/public/assets/album";
  /** A scene whose 4th line is `line`. */
  const story = (line: string) => `VAR player_name = ""\n=== a_scene ===\n# speaker: narrator\n${line}\n塔の下。\n-> END\n`;

  it("are read from the source with their line and knot, never from a comment, and never as # photo_caption:", () => {
    expect(albumTagsOf(story("# photo: a_tower # photo_caption: 塔の下で # recall: 01_square\n// # photo: a_old"))).toEqual([
      { tag: "photo", id: "a_tower", line: 4, knot: "a_scene" },
      { tag: "recall", id: "01_square", line: 4, knot: "a_scene" },
    ]);
  });

  it("name an album image of the story's own journey", () => {
    expect(() => checkAlbumTags(story("# photo: a_tower # photo_caption: 塔の下で"), "trip_a", images, folder)).not.toThrow();
    expect(() => checkAlbumTags(story("# recall: 01_square"), "trip_a", images, folder)).not.toThrow();
  });

  it("stop at another journey's album image and at an ID no album file has (a tourism photo's included)", () => {
    expect(() => checkAlbumTags(story("# photo: b_harbour"), "trip_a", images, folder)).toThrow(
      "ほかの旅行編のアルバムの絵です：knot a_scene の4行目の # photo: b_harbour は、旅行編 trip_b の絵です。" +
      "この旅行編の content/journeys/trip_a/public/assets/album/ に置いた絵の ID を書いてください" +
      "（Album image of another journey: # photo: b_harbour is an image of trip_b）。");
    expect(() => checkAlbumTags(story("# speaker: heroine # recall: a_gate"), "trip_a", images, folder)).toThrow(
      "アルバムの絵がありません：knot a_scene の4行目の # recall: a_gate の絵が content/journeys/trip_a/public/assets/album/ にありません。" +
      "a_gate.webp（または .png・.jpg・.jpeg）をそこに置いてください" +
      "（Unknown album image: # recall: a_gate is not a file of content/journeys/trip_a/public/assets/album/）。");
    expect(() => checkAlbumTags(story("# photo: a_tower_photo"), "trip_a", images, folder)).toThrow("アルバムの絵がありません：");
    // The root public/ has no album: its file is no album image.
    expect(() => checkAlbumTags(story("# photo: shared"), "trip_a", images, folder)).toThrow("アルバムの絵がありません：");
  });
});
