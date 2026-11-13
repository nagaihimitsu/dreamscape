import type { ContentWarning } from "./content-report";
import { displayPath, type ContentSources } from "./content-sources";
import { errorText } from "./cli-error";
import { taggedLines } from "./line-tag-text";
import { readRecordedClips, type RecordedClip, type RecordedClips } from "./voice-records";
import { cityOfFile, matchSameLines, showNames, type ScriptedLine, type SentVoiceScript, type VoiceLine, type VoiceScript } from "./voice-script";

// Which heroine lines changed since their voices were scripted or recorded (2026-11-13): npm run voice:changes lists
// them (voiceChanges, formatVoiceChanges), and content:build warns about a recorded line whose text changed
// (voiceRecordWarnings). A recorded line (one with a `# voice:`) is compared with what its clip says (recorded.json,
// voice-records.ts), so it is reported until a new clip is recorded; the other lines with the newest script sent.

export type VoiceChanges = {
  /** Recorded lines whose text is no longer what their clip says: to record again. */
  rerecord: { now: VoiceLine; recorded: RecordedClip }[];
  /** Recorded clips that no line names any more (no `# voice:` has the ID). */
  unused: { id: string; recorded: RecordedClip }[];
  /** Lines with a `# voice:` that recorded.json does not have (not tagged by voice:tag). */
  unlisted: VoiceLine[];
  /** The lines not recorded, against the newest script's lines not recorded: */
  same: number;
  changed: { old: ScriptedLine; now: VoiceLine }[];
  removed: ScriptedLine[];
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
 * The current lines against their records: each recorded line against what its clip says; the other lines against
 * the newest script's other lines (the same line by matchSameLines; leftovers of a city paired as rewritten lines by
 * similarity, the most alike first; the rest removed and added).
 */
export function voiceChanges(script: VoiceScript, newest: SentVoiceScript | undefined, recorded: RecordedClips): VoiceChanges {
  const isRecorded = (line: { id: string }) => script.tagged.has(line.id);
  const recordedLines = script.lines.filter(isRecorded);
  const earlier = (newest?.lines ?? []).filter((line) => !isRecorded(line) && !recorded.has(line.id));
  const later = script.lines.filter((line) => !isRecorded(line));
  const cityIds = script.cities.map((city) => city.id);
  const earlierLeft = new Set(earlier.keys());
  const laterLeft = new Set(later.keys());
  const pair = (earlierIndex: number, laterIndex: number) => {
    earlierLeft.delete(earlierIndex);
    laterLeft.delete(laterIndex);
  };
  for (const [earlierIndex, laterIndex] of matchSameLines(earlier, later, cityIds)) pair(earlierIndex, laterIndex);
  const same = earlier.length - earlierLeft.size;
  const cityOf = (line: { file: string }) => cityOfFile(line.file, cityIds);
  const changed: [number, number][] = [];
  const candidates = [...earlierLeft].flatMap((earlierIndex) => [...laterLeft]
    .filter((laterIndex) => cityOf(earlier[earlierIndex]) === cityOf(later[laterIndex]))
    .map((laterIndex) => ({ earlierIndex, laterIndex, ratio: textSimilarity(earlier[earlierIndex].text, later[laterIndex].text) })))
    .filter((item) => item.ratio >= SIMILAR)
    .sort((left, right) => right.ratio - left.ratio || left.earlierIndex - right.earlierIndex || left.laterIndex - right.laterIndex);
  for (const { earlierIndex, laterIndex } of candidates) {
    if (!earlierLeft.has(earlierIndex) || !laterLeft.has(laterIndex)) continue;
    changed.push([earlierIndex, laterIndex]);
    pair(earlierIndex, laterIndex);
  }
  const ascending = (left: number, right: number) => left - right;
  return {
    rerecord: recordedLines.flatMap((now) => {
      const clip = recorded.get(now.id);
      return clip && clip.text !== now.text ? [{ now, recorded: clip }] : [];
    }),
    unused: [...recorded].filter(([id]) => !script.tagged.has(id)).map(([id, clip]) => ({ id, recorded: clip })),
    unlisted: recordedLines.filter((now) => !recorded.has(now.id)),
    same,
    changed: changed.sort(([left], [right]) => left - right).map(([earlierIndex, laterIndex]) => ({ old: earlier[earlierIndex], now: later[laterIndex] })),
    removed: [...earlierLeft].sort(ascending).map((index) => earlier[index]),
    added: [...laterLeft].sort(ascending).map((index) => later[index]),
  };
}

/** What voice:changes prints: what was compared, the counts, then the recorded lines first, the others, and the new lines. */
export function formatVoiceChanges(changes: VoiceChanges, script: VoiceScript, newest: { date: string; count: number; file: string },
  recorded: { count: number; file: string }): string[] {
  const { rerecord, unused, unlisted, same, changed, removed, added } = changes;
  const head = [
    `${script.nameJa}（${script.journeyId}）：今のヒロインの台詞 ${script.lines.length}行（録音済み ${script.tagged.size}行）を比べました。`,
    `録音済みの行は録音した声 ${recorded.count}本の文（${recorded.file}）と、まだ録音していない行は${newest.date}に渡した台本（${newest.count}行、${newest.file}）と比べます。`,
  ];
  if (!rerecord.length && !unused.length && !unlisted.length && !changed.length && !removed.length && !added.length)
    return [...head, `変わった台詞はありません（録音済みの${script.tagged.size}行は録音した文のまま、まだ録音していない${same}行は台本のままです）。`];
  const where = (line: Pick<VoiceLine, "title" | "file">) => `${line.title}（${line.file}）`;
  const clipText = (clip: RecordedClip) => `  録音：${clip.text}（${clip.script}の台本）`;
  // One box per line, each ending in a blank line.
  const sections: [string, string[]][] = [
    [`■ 録り直しが必要：録音した台詞が変わりました（${rerecord.length}行）`,
      rerecord.flatMap(({ now, recorded: clip }) => [`[${now.id}]　${where(now)}`, clipText(clip), `  今　：${now.text}`, ""])],
    [`■ 使われなくなった声：録音した台詞の # voice: がなくなりました（${unused.length}本）`,
      unused.flatMap(({ id, recorded: clip }) => [`[${id}]`, clipText(clip), ""])],
    [`■ 録音した文の記録がない声（${unlisted.length}行。npm run voice:tag で付けると記録されます）`,
      unlisted.flatMap((now) => [`[${now.id}]　${where(now)}`, `  今　：${now.text}`, ""])],
    [`■ まだ録音していない台詞が変わりました（${changed.length}行。新しい ID で、今の文で作ります）`,
      changed.flatMap(({ old, now }) => [`[${old.id}]（今のID：${now.id}）　${where(now)}`, `  台本：${old.text}`, `  今　：${now.text}`, ""])],
    [`■ まだ録音していない台詞がなくなりました（${removed.length}行。作らなくてよい台詞です）`,
      removed.flatMap((old) => [`[${old.id}]　${where(old)}`, `  台本：${old.text}`, ""])],
    [`■ 台本にない新しい台詞（${added.length}行。声を作るときは npm run voice:script で台本を作り直します）`,
      added.flatMap((now) => [`[${now.id}]　${where(now)}`, `  今　：${now.text}`, ""])],
  ];
  return [
    ...head,
    `録り直し ${rerecord.length}行／使われなくなった声 ${unused.length}本／記録のない声 ${unlisted.length}行／` +
      `まだ録音していない台詞：台本と同じ ${same}行・変わった ${changed.length}行・なくなった ${removed.length}行・台本にない ${added.length}行`,
    // A section's last box leaves its blank line to the next heading.
    ...sections.filter(([, boxes]) => boxes.length).flatMap(([title, boxes]) => ["", title, "", ...boxes.slice(0, -1)]),
  ];
}

/**
 * content:build's warnings for a journey's recorded.json: each `# voice:` of its stories whose line no longer says what
 * the clip says (record again), and each `# voice:` the file does not have (its text cannot be checked).
 */
export function recordedLineWarnings(sources: Pick<ContentSources, "root" | "storyFiles">, journeyId: string, recorded: RecordedClips): ContentWarning[] {
  return sources.storyFiles.filter((story) => story.layer === journeyId).flatMap((story) =>
    taggedLines(story.source, ["voice"]).flatMap(({ value, text, textLine }): ContentWarning[] => {
      if (text === null) return [];
      const where = `${displayPath(sources.root, story.file)} の${textLine}行目`;
      const clip = recorded.get(value);
      if (!clip) return [{ kind: "voice-changed", message: `録音した文の記録がない声です：${value}（${where}）。` +
        "npm run voice:tag で付けると、録音した文が記録されます。" }];
      if (showNames(text) === clip.text) return [];
      return [{ kind: "voice-changed", message: `録音した台詞が変わりました：${value}（録り直しが必要）。` +
        `録音した文（${clip.script}の台本）：${clip.text}　今：${showNames(text)}（${where}）` }];
    }));
}

/** recordedLineWarnings for every journey with a recorded.json; one that cannot be read is a warning too (it breaks no play). */
export function voiceRecordWarnings(sources: Pick<ContentSources, "root" | "storyFiles" | "manifests">): ContentWarning[] {
  return sources.manifests.flatMap((manifest): ContentWarning[] => {
    try {
      const recorded = readRecordedClips(sources.root, manifest.id);
      return recorded ? recordedLineWarnings(sources, manifest.id, recorded) : [];
    } catch (error) {
      return [{ kind: "voice-changed", message: errorText(error) }];
    }
  });
}
