import path from "node:path";
import { ALBUM_IMAGE_FOLDER, albumImageIdOf, type AlbumImage } from "../src/content/album-images";
import { isPlaceStory } from "../src/content/story-address";
import { displayPath, type ContentLayer, type ContentSources } from "./content-sources";
import { taggedLines, type TaggedLine } from "./line-tag-text";
import { withoutComments } from "./place-files";

// content:build's album images (2026-11-11 user decision; src/content/album-images.ts): the files of each journey's
// public/assets/album/, listed with their IDs, and the album tags (`# photo:`, `# recall:`) of the journeys' stories.
// The files are Dreamscape's own artwork by their folder: nothing registers them and the image-rights check asks
// nothing for them (image-rights.ts). Pure checks of the loaded sources (no file is read). Light module (no content
// loading): unit tests use it directly.

/** The journey layer whose public/assets/album/ holds `file` (absolute, from ContentSources.publicFiles), if any. */
export function albumFolderLayer(sources: Pick<ContentSources, "layers">, file: string): ContentLayer | undefined {
  return sources.layers.find((layer) => layer.type === "journey" &&
    file.startsWith(path.join(layer.directory, "public", ...ALBUM_IMAGE_FOLDER.split("/")) + path.sep));
}

/** A journey's album folder as messages show it (`content/journeys/<journeyId>/public/assets/album`). */
export function albumFolderPath(sources: Pick<ContentSources, "root">, layer: ContentLayer): string {
  return displayPath(sources.root, path.join(layer.directory, "public", ...ALBUM_IMAGE_FOLDER.split("/")));
}

/**
 * Every album image of the journeys, in the order of the served files. Throws one error listing every problem
 * (Japanese first, English after): a file in a journey's public/assets/album/ whose name is not
 * `<ID>.<webp|png|jpg|jpeg>` directly in the folder (an ID of a-z, 0-9 and _), and a second file of an ID already
 * taken, in the same journey (`x.webp` and `x.png`) or in another one: an ID names one image in the whole build.
 */
export function albumImagesOf(sources: Pick<ContentSources, "root" | "layers" | "publicFiles">): AlbumImage[] {
  const show = (file: string) => displayPath(sources.root, file);
  const images: AlbumImage[] = [];
  const fileOf = new Map<string, string>();
  const errors: string[] = [];
  for (const [assetPath, file] of sources.publicFiles) {
    const layer = albumFolderLayer(sources, file);
    if (!layer) continue;
    const id = albumImageIdOf(assetPath);
    if (id === undefined) {
      errors.push(`アルバムの絵のファイル名が使えません：${show(file)}。アルバムの絵は ${albumFolderPath(sources, layer)}/ の直下に「ID.webp」の名前で置きます。` +
        "ID は英小文字・数字・_ だけで、拡張子は webp・png・jpg・jpeg のどれかです" +
        `（Invalid album image file: ${assetPath}; name it ${ALBUM_IMAGE_FOLDER}/<ID>.<webp|png|jpg|jpeg> with an ID of a-z, 0-9 and _）。`);
      continue;
    }
    const previous = fileOf.get(id);
    if (previous) {
      errors.push(`同じIDのアルバムの絵が2つあります：${show(previous)} と ${show(file)}。ID はファイル名（拡張子を除く）で、すべての旅行編で1つだけにします。` +
        `どちらかの名前を変えてください（Duplicate album image ID: ${id}）。`);
      continue;
    }
    fileOf.set(id, file);
    images.push({ id, path: assetPath, journeyId: layer.id });
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return images;
}

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
const ALBUM_TAG = /#\s*(photo|recall)\s*:\s*([^#]*)/gu;

/** A `# photo:` or `# recall:` of an Ink source: the tag, the ID it names, its line (from 1) and the knot it is in. */
export type AlbumTag = { tag: "photo" | "recall"; id: string; line: number; knot?: string };

/** The album tags of an Ink source, read statically (so a line in a branch no walk takes counts too), without `//` comments. */
export function albumTagsOf(source: string): AlbumTag[] {
  let knot: string | undefined;
  return withoutComments(source).split("\n").flatMap((text, index) => {
    const head = KNOT_LINE.exec(text);
    if (head) knot = head[1];
    return [...text.matchAll(ALBUM_TAG)].flatMap((match): AlbumTag[] => {
      const id = match[2].trim();
      return id ? [{ tag: match[1] as AlbumTag["tag"], id, line: index + 1, ...(knot ? { knot } : {}) }] : [];
    });
  });
}

/**
 * Throws at the first album tag of a story of the journey `journeyId` that names no album image of that journey (whose
 * album folder is `albumFolder`, as albumFolderPath shows it): an unknown ID, or the image of another journey (a
 * journey folder must stay removable on its own). Japanese first, English after.
 */
export function checkAlbumTags(source: string, journeyId: string, images: readonly AlbumImage[], albumFolder: string): void {
  for (const { tag, id, line, knot } of albumTagsOf(source)) {
    const image = images.find((item) => item.id === id);
    if (image?.journeyId === journeyId) continue;
    const where = `${knot ? `knot ${knot} の` : ""}${line}行目の # ${tag}: ${id}`;
    throw new Error(image
      ? `ほかの旅行編のアルバムの絵です：${where} は、旅行編 ${image.journeyId} の絵です。この旅行編の ${albumFolder}/ に置いた絵の ID を書いてください` +
        `（Album image of another journey: # ${tag}: ${id} is an image of ${image.journeyId}）。`
      : `アルバムの絵がありません：${where} の絵が ${albumFolder}/ にありません。${id}.webp（または .png・.jpg・.jpeg）をそこに置いてください` +
        `（Unknown album image: # ${tag}: ${id} is not a file of ${albumFolder}/）。`);
  }
}

/** A scene as withPhotoSpots reads it (the scene table's entry): its city, its story and the knots it calls. */
export type PhotoScene = { cityId: string; story: { storyId: string; knot?: string }; knots: readonly string[] };

/** Whether two tags belong to the same line of the story (line-tag-text.ts: its text, else the tag's own line). */
const sameLine = (left: TaggedLine, right: TaggedLine) =>
  left.knot === right.knot && (left.textLine !== null ? left.textLine === right.textLine : left.line === right.line);

/**
 * The album images with where a line's `# photo:` takes each (2026-11-20 user decision: once the journey is over, 旅の記録's
 * 「写真」 shows in grey the photos not taken yet): the city of the scene whose lines have the first such line, in the order
 * of `stories` (each story's ID and its authored source) and their lines, and that line's `# photo_caption:`. A place file's
 * line is its knot's (`places/<file>.<knot>`), read by the scenes of that knot and by those that call it; a one-scene
 * file's is the file's. An image no line takes (only a `# recall:` names it, or nothing does), or whose line no scene
 * reads, has none. Pure.
 */
export function withPhotoSpots(images: readonly AlbumImage[], stories: readonly { id: string; source: string }[],
  scenes: readonly PhotoScene[]): AlbumImage[] {
  const cityOf = new Map<string, string>();
  for (const { cityId, story: { storyId, knot }, knots } of scenes)
    for (const address of knot === undefined ? [storyId] : [knot, ...knots].map((name) => `${storyId}.${name}`))
      if (!cityOf.has(address)) cityOf.set(address, cityId);
  const spots = new Map<string, NonNullable<AlbumImage["photo"]>>();
  for (const { id, source } of stories) {
    const tags = taggedLines(source, ["photo", "photo_caption"]);
    for (const tag of tags) {
      if (tag.key !== "photo" || !tag.value || spots.has(tag.value)) continue;
      const cityId = cityOf.get(isPlaceStory(id) && tag.knot ? `${id}.${tag.knot}` : id);
      if (cityId === undefined) continue;
      const caption = tags.find((other) => other.key === "photo_caption" && other.value && sameLine(other, tag))?.value;
      spots.set(tag.value, { cityId, ...(caption ? { caption } : {}) });
    }
  }
  return images.map((image) => {
    const photo = spots.get(image.id);
    return photo ? { ...image, photo } : image;
  });
}
