import path from "node:path";
import { MINI_GAME_ART_FOLDER, miniGameArtIdOf, type MiniGameArt } from "../src/minigames/art";
import { displayPath, type ContentSources } from "./content-sources";
import { withoutComments } from "./place-files";

// content:build's mini-game pictures (2026-11-13 user decision; src/minigames/art.ts): the files of each layer's
// public/assets/minigames/, listed with their IDs, and the `art.<slot> <ID>` words of the stories' `# minigame:` tags.
// That a picture is listed as own artwork is image-rights.ts's general check of every served image; that a slot's
// picture is the right type (a sprite: webp or png) is the tag reader's (src/minigames/tag.ts). Pure checks of the loaded
// sources (no file is read).

/**
 * Every mini-game picture, in the order of the served files. Throws one error listing every problem (Japanese first,
 * English after): a file in a public/assets/minigames/ whose name is not `<ID>.<webp|png|jpg|jpeg>` directly in the
 * folder, and a second file of an ID already taken (an ID names one picture in the whole build).
 */
export function miniGameArtOf(sources: Pick<ContentSources, "root" | "layers" | "publicFiles">): MiniGameArt[] {
  const show = (file: string) => displayPath(sources.root, file);
  const images: MiniGameArt[] = [];
  const fileOf = new Map<string, string>();
  const errors: string[] = [];
  for (const [assetPath, file] of sources.publicFiles) {
    if (!assetPath.startsWith(`${MINI_GAME_ART_FOLDER}/`)) continue;
    const journey = sources.layers.find((layer) => layer.type === "journey" && file.startsWith(path.join(layer.directory, "public") + path.sep));
    const id = miniGameArtIdOf(assetPath);
    if (id === undefined) {
      errors.push(`ミニゲームの絵のファイル名が使えません：${show(file)}。public/${MINI_GAME_ART_FOLDER}/ の直下に「ID.webp」の名前で置きます。` +
        "ID は英小文字・数字・_ だけで、拡張子は webp・png・jpg・jpeg のどれかです" +
        `（Invalid mini-game art file: ${assetPath}; name it ${MINI_GAME_ART_FOLDER}/<ID>.<webp|png|jpg|jpeg> with an ID of a-z, 0-9 and _）。`);
      continue;
    }
    const previous = fileOf.get(id);
    if (previous) {
      errors.push(`同じIDのミニゲームの絵が2つあります：${show(previous)} と ${show(file)}。ID はファイル名（拡張子を除く）で、全体で1つだけにします` +
        `（Duplicate mini-game art ID: ${id}）。`);
      continue;
    }
    fileOf.set(id, file);
    images.push({ id, path: assetPath, journeyId: journey?.id ?? null });
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return images;
}

/** The pictures a story of `journeyId` may name: its journey's and the root's (ID → served path; TagContext.miniGameArt). */
export function miniGameArtFor(art: readonly MiniGameArt[], journeyId: string | null): Record<string, string> {
  return Object.fromEntries(art.filter((image) => image.journeyId === null || image.journeyId === journeyId).map((image) => [image.id, image.path]));
}

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
const MINIGAME_TAG = /#\s*minigame\s*:([^#]*)/gu;

/**
 * Throws at the first `art.<slot> <ID>` of a story of `journeyId` (read statically, every branch) that names a picture of
 * another journey: a journey folder must stay removable on its own. An unknown ID is the tag reader's error.
 */
export function checkMiniGameArtTags(source: string, journeyId: string, art: readonly MiniGameArt[]): void {
  let knot: string | undefined;
  withoutComments(source).split("\n").forEach((text, index) => {
    const head = KNOT_LINE.exec(text);
    if (head) knot = head[1];
    for (const match of text.matchAll(MINIGAME_TAG)) {
      const words = match[1].trim().split(/\s+/u);
      for (let at = 1; at + 1 < words.length; at += 2) {
        if (!words[at].startsWith("art.")) continue;
        const image = art.find((item) => item.id === words[at + 1]);
        if (!image || image.journeyId === null || image.journeyId === journeyId) continue;
        throw new Error(`ほかの旅行編のミニゲームの絵です：${knot ? `knot ${knot} の` : ""}${index + 1}行目の ${words[at]} ${image.id} は、旅行編 ${image.journeyId} の絵です。` +
          `この旅行編の public/${MINI_GAME_ART_FOLDER}/ に置いた絵を書いてください（Mini-game art of another journey: ${image.id} is ${image.journeyId}'s）。`);
      }
    }
  });
}
