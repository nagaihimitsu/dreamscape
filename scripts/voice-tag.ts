import path from "node:path";
import { VOICE_ID } from "../src/content/voice-files";
import { tagStart } from "./line-tag-text";
import { withoutComments } from "./place-files";
import type { RecordedClip } from "./voice-records";
import { showNames, type SentVoiceScript, type VoiceLine, type VoiceScript } from "./voice-script";

// npm run voice:tag (2026-11-13; the repo version of the 2026-11-13 add_voice_tags.py): the delivered clips of a
// journey, by file name (<ID>.mp3 or <ID>.wav), get their `# voice: <ID>` before their lines, and recorded.json
// (voice-records.ts) records what each says: the text of the newest script that had the ID. A clip is refused when
// that text is not the line's text now (the line changed: its voice is made again from a new script), when no
// script or line has the ID, or when its MP3 is not yet in the journey's public/assets/voice/ (content:build stops a
// `# voice:` without its file). Copying and converting the audio stay by hand. Pure; voice-tag-cli.ts writes the files.

/** A clip voice:tag does not take, and why (Japanese). */
export type RefusedClip = { id: string; reasonJa: string };
export type VoiceTagPlan = {
  /** Lines that get a `# voice:` (their ID is the clip's). */
  tag: VoiceLine[];
  /** What each clip taken says (lines tagged now or before). */
  record: [string, RecordedClip][];
  refused: RefusedClip[];
};

const DELIVERED = /\.(?:mp3|wav)$/iu;

/** The voice IDs of a folder's file names (`<ID>.mp3`, `<ID>.wav`; other files are passed over), and the names that are no ID. */
export function deliveredIds(fileNames: readonly string[]): { ids: string[]; refused: RefusedClip[] } {
  const names = fileNames.filter((name) => DELIVERED.test(name)).map((name) => path.basename(name, path.extname(name)));
  return {
    ids: [...new Set(names.filter((name) => VOICE_ID.test(name)))],
    refused: names.filter((name) => !VOICE_ID.test(name))
      .map((name) => ({ id: name, reasonJa: "ファイル名が声の ID ではありません（英小文字・数字・_ だけ。台本の [ID] と同じ名前にします）" })),
  };
}

/** What voice:tag does with the delivered `ids`: the lines to tag, what to record, and the clips it refuses. */
export function planVoiceTags(script: VoiceScript, scripts: readonly SentVoiceScript[], ids: readonly string[], voiceFiles: ReadonlySet<string>): VoiceTagPlan {
  // Each ID with the text and date of the newest script that has it (what its clip was made from).
  const lastSent = new Map<string, RecordedClip>();
  for (const sent of scripts) for (const line of sent.lines) if (!lastSent.has(line.id)) lastSent.set(line.id, { text: line.text, script: sent.date });
  const order = new Map(script.lines.map((line, index) => [line.id, index]));
  const plan: VoiceTagPlan = { tag: [], record: [], refused: [] };
  for (const id of [...ids].sort((left, right) => (order.get(left) ?? Infinity) - (order.get(right) ?? Infinity) || (left < right ? -1 : 1))) {
    const clip = lastSent.get(id);
    if (!clip) {
      plan.refused.push({ id, reasonJa: "渡した台本にない ID です" });
      continue;
    }
    const lines = script.lines.filter((line) => line.id === id);
    const changed = lines.find((line) => line.text !== clip.text);
    const reasonJa = !lines.length ? `今の台詞に、この ID の行がありません（${clip.script}の台本の文：${clip.text}）。` +
        "文が変わった行は新しい ID になるので、この声は使えません（npm run voice:changes で確かめます）"
      : changed ? `文が台本と違います（${clip.script}の台本：${clip.text}　今：${changed.text}）。今の文で作り直します`
      : !voiceFiles.has(id) ? `声のファイルがまだありません。この旅行編の public/assets/voice/${id}.mp3 に置いてから付けます`
      : undefined;
    if (reasonJa) {
      plan.refused.push({ id, reasonJa });
      continue;
    }
    plan.record.push([id, clip]);
    plan.tag.push(...lines.filter((line) => !script.tagged.has(line.id)));
  }
  return plan;
}

/** `source` with `# voice: <ID>` on a line of its own before each line (same indent). Throws when a line is not the text expected. */
export function insertVoiceTags(source: string, lines: readonly Pick<VoiceLine, "line" | "id" | "text">[]): string {
  const rows = source.split("\n");
  const code = withoutComments(source).split("\n");
  for (const { line, id, text } of [...lines].sort((left, right) => right.line - left.line)) {
    const content = code[line]?.trim() ?? "";
    const start = tagStart(content);
    if (showNames((start < 0 ? content : content.slice(0, start)).trim()) !== text)
      throw new Error(`台詞の行が見つかりません：${line + 1}行目は「${text}」ではありません（# voice: ${id}）`);
    const raw = rows[line];
    rows.splice(line, 0, `${raw.slice(0, raw.length - raw.trimStart().length)}# voice: ${id}`);
  }
  return rows.join("\n");
}
