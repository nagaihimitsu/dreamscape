import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ContentWarning } from "./content-report";
import { displayPath, type ContentSources } from "./content-sources";
import { errorText } from "./cli-error";
import { authoringFolder } from "./journey-authoring";
import { taggedLines } from "./line-tag-text";
import { cityOfFile, showNames, type VoiceLine } from "./voice-script";

// The voice scripts that were sent (2026-11-13): each kept as it was sent in authoring/journeys/<journeyId>/voice/<date>/
// (the readable script, its entries.json and the guide), so that a line whose text changes after it was scripted or
// recorded is found: npm run voice:changes lists them against the latest script (compareVoiceScripts), and
// content:build warns when a recorded line (`# voice:`) no longer says what the script said (voiceScriptWarnings).

/** What the comparisons read of a sent script's line (entries.json may hold more). */
export type ScriptedLine = Pick<VoiceLine, "id" | "text" | "file" | "knot" | "title">;
/** A sent script: its date (its folder's name), its entries.json and its lines. */
export type SentVoiceScript = { journeyId: string; date: string; file: string; lines: ScriptedLine[] };

const DATE_FOLDER = /^\d{4}-\d{2}-\d{2}$/u;
const scriptedLinesSchema = z.array(z.object({ id: z.string(), text: z.string(), file: z.string(), knot: z.string(), title: z.string() }));

/** Where a journey's sent scripts are kept: `authoring/journeys/<journeyId>/voice/` (one folder per date, YYYY-MM-DD). */
export const voiceScriptsFolder = (journeyId: string) => `${authoringFolder(journeyId)}voice/`;

/** The latest script sent for a journey (the date folder of voiceScriptsFolder with an entries.json), if any. Throws for one it cannot read. */
export function readLatestVoiceScript(root: string, journeyId: string): SentVoiceScript | undefined {
  const folder = path.join(root, voiceScriptsFolder(journeyId));
  if (!existsSync(folder)) return undefined;
  const date = readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && DATE_FOLDER.test(entry.name) && existsSync(path.join(folder, entry.name, "entries.json")))
    .map((entry) => entry.name).sort().at(-1);
  if (!date) return undefined;
  const file = path.join(folder, date, "entries.json");
  try {
    return { journeyId, date, file, lines: scriptedLinesSchema.parse(JSON.parse(readFileSync(file, "utf8"))) };
  } catch (error) {
    throw new Error(`渡した声の台本を読めません：${displayPath(root, file)}（Cannot read the voice script）`, { cause: error });
  }
}

/** A line whose text changed: as the script had it, as it is now, and whether its recording exists. */
export type VoiceChange = { old: ScriptedLine; now: VoiceLine; recorded: boolean };
export type VoiceChanges = {
  /** Lines that say what the script said. */
  same: number;
  changed: VoiceChange[];
  removed: { old: ScriptedLine; recorded: boolean }[];
  /** Heroine lines the script does not have. */
  added: VoiceLine[];
};

/** How alike two texts are: twice their longest common subsequence over their lengths (0 to 1). */
export function textSimilarity(left: string, right: string): number {
  const [a, b] = [[...left], [...right]];
  if (!a.length && !b.length) return 1;
  let previous = new Array<number>(b.length + 1).fill(0);
  for (const char of a) {
    const row = [0];
    for (let index = 0; index < b.length; index++) row.push(char === b[index] ? previous[index] + 1 : Math.max(previous[index + 1], row[index]));
    previous = row;
  }
  return (2 * previous[b.length]) / (a.length + b.length);
}
/** Below this a leftover pair is not one line rewritten (2026-11-13 compare: difflib's ratio 0.45). */
const SIMILAR = 0.45;

/**
 * The script's lines against the current ones. A line is the same when its ID and text are, else when a line of the
 * same city has its text (in order); a recorded ID left on both sides is one line rewritten; the leftovers of a city
 * pair as rewritten lines by similarity (the most alike first); the rest are removed and added. `recordings` are the
 * journey's voice IDs (files and `# voice:`).
 */
export function compareVoiceScripts(script: readonly ScriptedLine[], current: readonly VoiceLine[], cityIds: readonly string[],
  recordings: ReadonlySet<string>): VoiceChanges {
  const cityOf = (line: { file: string }) => cityOfFile(line.file, cityIds);
  const oldLeft = new Set(script.keys());
  const newLeft = new Set(current.keys());
  const match = (oldIndex: number, newIndex: number) => {
    oldLeft.delete(oldIndex);
    newLeft.delete(newIndex);
  };
  const byId = new Map(current.map((line, index) => [line.id, index]));
  script.forEach((line, index) => {
    const now = byId.get(line.id);
    if (now !== undefined && newLeft.has(now) && current[now].text === line.text) match(index, now);
  });
  const textKey = (line: ScriptedLine) => `${cityOf(line)}\0${line.text}`;
  const byText = new Map<string, number[]>();
  for (const index of newLeft) {
    const key = textKey(current[index]);
    byText.set(key, [...byText.get(key) ?? [], index]);
  }
  for (const index of [...oldLeft]) {
    const now = byText.get(textKey(script[index]))?.shift();
    if (now !== undefined) match(index, now);
  }
  const same = script.length - oldLeft.size;
  const changed: [number, number][] = [];
  for (const index of [...oldLeft]) {
    const now = byId.get(script[index].id);
    if (recordings.has(script[index].id) && now !== undefined && newLeft.has(now)) {
      changed.push([index, now]);
      match(index, now);
    }
  }
  const candidates = [...oldLeft].flatMap((oldIndex) => [...newLeft].filter((newIndex) => cityOf(script[oldIndex]) === cityOf(current[newIndex]))
    .map((newIndex) => ({ oldIndex, newIndex, ratio: textSimilarity(script[oldIndex].text, current[newIndex].text) })))
    .filter((pair) => pair.ratio >= SIMILAR)
    .sort((left, right) => right.ratio - left.ratio || left.oldIndex - right.oldIndex || left.newIndex - right.newIndex);
  for (const { oldIndex, newIndex } of candidates) {
    if (!oldLeft.has(oldIndex) || !newLeft.has(newIndex)) continue;
    changed.push([oldIndex, newIndex]);
    match(oldIndex, newIndex);
  }
  const recorded = (line: ScriptedLine) => recordings.has(line.id);
  return {
    same,
    changed: changed.sort(([left], [right]) => left - right).map(([oldIndex, newIndex]) =>
      ({ old: script[oldIndex], now: current[newIndex], recorded: recorded(script[oldIndex]) })),
    removed: [...oldLeft].sort((left, right) => left - right).map((index) => ({ old: script[index], recorded: recorded(script[index]) })),
    added: [...newLeft].sort((left, right) => left - right).map((index) => current[index]),
  };
}

/** What voice:changes prints: the counts, then the recorded lines (to record again), the others, and the new lines. */
export function formatVoiceChanges(changes: VoiceChanges, script: SentVoiceScript, journey: { id: string; nameJa: string }, scriptFile: string): string[] {
  const head = `${journey.nameJa}（${journey.id}）：${script.date}に渡した声の台本（${script.lines.length}行、${scriptFile}）と今のシナリオの比べ`;
  const { same, changed, removed, added } = changes;
  if (!changed.length && !removed.length && !added.length) return [head, `変わった台詞はありません。台本の${same}行は、どれも今のシナリオと同じです。`];
  const where = (line: Pick<VoiceLine, "title" | "file">) => `${line.title}（${line.file}）`;
  // One box per line, each ending in a blank line.
  const changedBoxes = (items: VoiceChange[]) => items.flatMap(({ old, now }) =>
    [`[${old.id}]${now.id === old.id ? "" : `（今のID：${now.id}）`}　${where(now)}`, `  台本：${old.text}`, `  今　：${now.text}`, ""]);
  const removedBoxes = (items: VoiceChanges["removed"]) => items.flatMap(({ old }) => [`[${old.id}]　${where(old)}`, `  台本：${old.text}`, ""]);
  const [rerecord, rewritten] = [changed.filter((item) => item.recorded), changed.filter((item) => !item.recorded)];
  const [unused, dropped] = [removed.filter((item) => item.recorded), removed.filter((item) => !item.recorded)];
  const sections: [string, string[]][] = [
    [`■ 録り直しが必要：録音した台詞が変わりました（${rerecord.length}行）`, changedBoxes(rerecord)],
    [`■ 録音した台詞がなくなりました（${unused.length}行。その声のファイルは使われなくなります）`, removedBoxes(unused)],
    [`■ まだ録音していない台詞が変わりました（${rewritten.length}行。今の文で作ります）`, changedBoxes(rewritten)],
    [`■ まだ録音していない台詞がなくなりました（${dropped.length}行。作らなくてよい台詞です）`, removedBoxes(dropped)],
    [`■ 台本にない新しい台詞（${added.length}行。声を作るときは npm run voice:script で台本を作り直します）`,
      added.flatMap((now) => [`[${now.id}]　${where(now)}`, `  今　：${now.text}`, ""])],
  ];
  return [
    head,
    `台本と同じ ${same}行／変わった ${changed.length}行（録音済み ${rerecord.length}行）／なくなった ${removed.length}行（録音済み ${unused.length}行）／` +
      `台本にない ${added.length}行`,
    // A section's last box leaves its blank line to the next heading.
    ...sections.filter(([, boxes]) => boxes.length).flatMap(([title, boxes]) => ["", title, "", ...boxes.slice(0, -1)]),
  ];
}

/**
 * content:build's warnings for a journey's sent script: each recorded line (a `# voice:`) whose text is no longer the
 * script's for that ID (the voice says the old text). The story files are the journey's of `sources`.
 */
export function changedRecordingWarnings(sources: Pick<ContentSources, "root" | "storyFiles">, script: SentVoiceScript): ContentWarning[] {
  const scripted = new Map(script.lines.map((line) => [line.id, line.text]));
  return sources.storyFiles.filter((story) => story.layer === script.journeyId).flatMap((story) =>
    taggedLines(story.source, ["voice"]).flatMap(({ value, text, textLine }): ContentWarning[] => {
      const old = scripted.get(value);
      if (old === undefined || text === null || showNames(text) === old) return [];
      return [{ kind: "voice-changed", message: `録音した台詞が変わりました：${value}（録り直しが必要）。` +
        `${script.date}の台本：${old}　今：${showNames(text)}（${displayPath(sources.root, story.file)} の${textLine}行目）` }];
    }));
}

/** changedRecordingWarnings for every journey with a sent script; a script that cannot be read is a warning too (it breaks no play). */
export function voiceScriptWarnings(sources: Pick<ContentSources, "root" | "storyFiles" | "manifests">): ContentWarning[] {
  return sources.manifests.flatMap((manifest): ContentWarning[] => {
    try {
      const script = readLatestVoiceScript(sources.root, manifest.id);
      return script ? changedRecordingWarnings(sources, script) : [];
    } catch (error) {
      return [{ kind: "voice-changed", message: errorText(error) }];
    }
  });
}
