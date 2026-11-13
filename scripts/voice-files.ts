import path from "node:path";
import { VOICE_FOLDER, VOICE_ID, voiceIdOf } from "../src/content/voice-files";
import { displayPath, type ContentLayer, type ContentSources } from "./content-sources";
import { taggedLines } from "./line-tag-text";
import { withoutComments } from "./place-files";

/**
 * The names the player sets, as a story's text writes them (src/features/romance/names.ts fills them in), with what
 * messages call them: no recording can say them (2026-11-13 user decision). {player_address}, the heroine's way of
 * calling the protagonist, is made from the protagonist's name (getPlayerAddress), so it counts as that name.
 */
const PLAYER_SET_NAMES = [
  { placeholder: "{player_name}", nameJa: "主人公の名前", nameEn: "the protagonist's name" },
  { placeholder: "{player_address}", nameJa: "主人公の呼び名", nameEn: "the protagonist's form of address" },
  { placeholder: "{heroine_name}", nameJa: "ヒロインの名前", nameEn: "the heroine's name" },
] as const;

// content:build's voices (2026-11-12; src/content/voice-files.ts): the recordings of each journey's
// public/assets/voice/<ID>.mp3 and the `# voice:` tags of the journeys' stories. Where they come from is the manifest's
// voiceCredits (2026-11-13), the image-rights check reads only images (image-rights.ts isImagePath), and a file
// no line names is an unused public file (content-report.ts, a warning). Pure checks of the loaded sources (no file is
// read). Light module (no content loading).

/** A voice of a journey: its ID (the file name without `.mp3`) and the journey whose public/ folder serves it. */
export type VoiceFile = { id: string; journeyId: string };

/** The voices of the journeys: each `<ID>.mp3` directly in a journey's public/assets/voice/, in the order of the served files. */
export function voiceFilesOf(sources: Pick<ContentSources, "layers" | "publicFiles">): VoiceFile[] {
  return [...sources.publicFiles].flatMap(([assetPath, file]): VoiceFile[] => {
    const id = voiceIdOf(assetPath);
    const layer = id === undefined ? undefined : sources.layers.find((item) => item.type === "journey" &&
      file.startsWith(path.join(item.directory, "public") + path.sep));
    return id !== undefined && layer ? [{ id, journeyId: layer.id }] : [];
  });
}

/** A journey's voice folder as messages show it (`content/journeys/<journeyId>/public/assets/voice`). */
export function voiceFolderPath(sources: Pick<ContentSources, "root">, layer: ContentLayer): string {
  return displayPath(sources.root, path.join(layer.directory, "public", ...VOICE_FOLDER.split("/")));
}

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
const VOICE_TAG = /#\s*voice\s*:([^#]*)/gu;

/** A `# voice:` of an Ink source: the ID it names (as written, trimmed), its line (from 1) and the knot it is in. */
export type VoiceTag = { id: string; line: number; knot?: string };

/** The `# voice:` tags of an Ink source, read statically (so a line in a branch no walk takes counts too), without `//` comments. */
export function voiceTagsOf(source: string): VoiceTag[] {
  let knot: string | undefined;
  return withoutComments(source).split("\n").flatMap((text, index) => {
    const head = KNOT_LINE.exec(text);
    if (head) knot = head[1];
    return [...text.matchAll(VOICE_TAG)].map((match): VoiceTag => ({ id: match[1].trim(), line: index + 1, ...(knot ? { knot } : {}) }));
  });
}

/**
 * Throws at the first manifest whose `voiceCredits` (where the journey's voices come from, 2026-11-13; shown in
 * 「出典・権利の一覧」) credits voices its journey does not have: no file in its voice folder. `file` is the manifest as
 * messages show it. Japanese first, English after.
 */
export function checkVoiceCredits(manifests: readonly { id: string; file: string; data: Record<string, unknown> }[], voices: readonly VoiceFile[]): void {
  for (const { id, file, data } of manifests) {
    if (data.voiceCredits === undefined || voices.some((voice) => voice.journeyId === id)) continue;
    throw new Error(`声のない旅行編に声の出典があります：${file} の voiceCredits。この旅行編の public/${VOICE_FOLDER}/ に声のファイルがありません。` +
      `声を置くか、voiceCredits を外してください（Voice credits without voices: journey ${id} has no file in public/${VOICE_FOLDER}/）。`);
  }
}

/** Where a `# voice:` is, as messages show it: 「knot gt_a の12行目の # voice: gt_a_001」. */
const voiceTagWhere = (id: string, line: number, knot?: string) => `${knot ? `knot ${knot} の` : ""}${line}行目の # voice: ${id}`;

/**
 * Throws at the first `# voice:` of a story of the journey `journeyId` whose ID is not one (a-z, 0-9 and _ only) or
 * names no voice of that journey (whose voice folder is `voiceFolder`, as voiceFolderPath shows it): a missing file, or
 * another journey's (a journey folder must stay removable on its own). Then at the first whose line says
 * {player_name}, {player_address} or {heroine_name} (2026-11-13 user decision): the player sets the names (the address
 * is made from the protagonist's), so no recording can say them.
 * Japanese first, English after.
 */
export function checkVoiceTags(source: string, journeyId: string, voices: readonly VoiceFile[], voiceFolder: string): void {
  for (const { id, line, knot } of voiceTagsOf(source)) {
    const where = voiceTagWhere(id, line, knot);
    if (!VOICE_ID.test(id))
      throw new Error(`声の ID が使えません：${where}。ID は ${voiceFolder}/ に置いた「ID.mp3」のファイル名で、英小文字・数字・_ だけです` +
        `（Invalid voice tag: # voice: ${id}; write # voice: <ID> with an ID of a-z, 0-9 and _）。`);
    const voice = voices.find((item) => item.id === id);
    if (voice?.journeyId === journeyId) continue;
    throw new Error(voice
      ? `ほかの旅行編の声です：${where} は、旅行編 ${voice.journeyId} の声です。この旅行編の ${voiceFolder}/ に置いた声の ID を書いてください` +
        `（Voice of another journey: # voice: ${id} is a file of ${voice.journeyId}）。`
      : `声のファイルがありません：${where} の ${id}.mp3 が ${voiceFolder}/ にありません。そこに置いてください` +
        `（Unknown voice: # voice: ${id} is not a file of ${voiceFolder}/）。`);
  }
  // The line a tag belongs to (line-tag-text.ts: the same line, else the next line of text), as written.
  for (const { value, line, knot, text, textLine } of taggedLines(source, ["voice"])) {
    const name = PLAYER_SET_NAMES.find((item) => text?.includes(item.placeholder));
    if (!name) continue;
    throw new Error(`${name.nameJa}は声にできません：${voiceTagWhere(value, line, knot)} の台詞（${textLine}行目）に ${name.placeholder} があります。` +
      `${name.nameJa}は遊ぶ人が決めるので、録音した声では言えません。名前を言わない台詞にするか、# voice: を外してください` +
      `（Voiced line says ${name.nameEn}: the line of # voice: ${value} has ${name.placeholder}; names are set by the player, so a recording cannot say it）。`);
  }
}
