import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { displayPath } from "./content-sources";
import { authoringFolder } from "./journey-authoring";
import { voiceCastSchema, type VoiceCast } from "./voice-cast";
import type { SentVoiceScript } from "./voice-script";

// The records of a journey's voices in authoring/journeys/<journeyId>/voice/ (2026-11-13; the game never reads them):
// - <date>/ (YYYY-MM-DD, or YYYY-MM-DD_<label> for another script of the day, 2026-11-17: a-z and 0-9, newer than the
//   bare date): a script sent to the people who make the voices, kept as it was sent, with its entries.json.
//   voice:script keeps the IDs they gave; voice:changes compares the lines not recorded with the newest.
// - recorded.json: what each delivered clip says (the text it was made from and the date of that script), written by
//   voice:tag. voice:changes and content:build compare the recorded lines (`# voice:`) with it, so a changed line is
//   reported until its new clip is delivered and recorded, whatever scripts are sent in between. A clip recorded up to
//   a name the player sets (2026-11-17 author decision 「「……」まで録る」) also has `spoken`: what it says, the text
//   the request asked for (the sent entries.json line's `spoken`); content:build lets only such a clip's `# voice:`
//   stand on a line with a name (voice-files.ts checkVoiceTags).
// - cast.json (optional, 2026-11-17): who voices each character other than the heroine (voice-cast.ts); voice:script
//   writes the requests for the engines from it.

/** Where a journey's voice records are: `authoring/journeys/<journeyId>/voice/`. */
export const voiceRecordsFolder = (journeyId: string) => `${authoringFolder(journeyId)}voice/`;
export const RECORDED_FILE = "recorded.json";
export const CAST_FILE = "cast.json";

/**
 * What a delivered clip says: the text it was made from, and the date of the script that had it; for a clip recorded up
 * to a name the player sets, what it says (`spoken`, without the name).
 */
export type RecordedClip = { text: string; script: string; spoken?: string };
/** Voice ID → what its clip says, in the order they were recorded. */
export type RecordedClips = ReadonlyMap<string, RecordedClip>;

/** A sent script's folder: its date, and a label for another script of the same day (newer: names sort so). */
const DATE_FOLDER = /^\d{4}-\d{2}-\d{2}(?:_[a-z0-9]+)?$/u;
// A line sent before 2026-11-17 has no voice (it is the heroine's: voiceOf).
const scriptedLinesSchema = z.array(z.object({ id: z.string(), text: z.string(), file: z.string(), knot: z.string(), title: z.string(),
  voice: z.string().optional(), speakerJa: z.string().optional(), spoken: z.string().optional() }));
const recordedSchema = z.object({ schemaVersion: z.literal(1),
  clips: z.record(z.string(), z.object({ text: z.string(), script: z.string(), spoken: z.string().optional() })) });

function readJson<T>(root: string, file: string, schema: { parse(value: unknown): T }, what: string): T {
  try {
    return schema.parse(JSON.parse(readFileSync(file, "utf8")));
  } catch (error) {
    throw new Error(`${what}を読めません：${displayPath(root, file)}（Cannot read ${path.basename(file)}）`, { cause: error });
  }
}

/**
 * The scripts sent for a journey, newest first by folder name (2026-11-17_cast after 2026-11-17): each date folder with
 * an entries.json. Throws for one it cannot read.
 */
export function readSentScripts(root: string, journeyId: string): SentVoiceScript[] {
  const folder = path.join(root, voiceRecordsFolder(journeyId));
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && DATE_FOLDER.test(entry.name) && existsSync(path.join(folder, entry.name, "entries.json")))
    .map((entry) => entry.name).sort().reverse()
    .map((date) => {
      const file = path.join(folder, date, "entries.json");
      return { journeyId, date, file, lines: readJson(root, file, scriptedLinesSchema, "渡した声の台本") };
    });
}

/** The journey's recorded.json, or undefined when it has none. Throws for one it cannot read. */
export function readRecordedClips(root: string, journeyId: string): RecordedClips | undefined {
  const file = path.join(root, voiceRecordsFolder(journeyId), RECORDED_FILE);
  return existsSync(file) ? new Map(Object.entries(readJson(root, file, recordedSchema, "録音した声の記録").clips)) : undefined;
}

/**
 * The clips of the journeys recorded up to a name the player sets: voice ID → what each says (recorded.json `spoken`),
 * for content:build's name rule (voice-files.ts checkVoiceTags). A recorded.json it cannot read gives none (content:build
 * warns about it: voice-changes.ts voiceRecordWarnings).
 */
export function partialRecordings(root: string, journeyIds: readonly string[]): ReadonlyMap<string, string> {
  return new Map(journeyIds.flatMap((journeyId) => {
    try {
      return [...readRecordedClips(root, journeyId) ?? []].flatMap(([id, clip]): [string, string][] => clip.spoken === undefined ? [] : [[id, clip.spoken]]);
    } catch {
      return [];
    }
  }));
}

/**
 * Copy each journey's recorded.json from the project `from` to a copy of it at `to` (same place), for a staged or test
 * copy of content/ that content:build checks there: a clip recorded up to a name the player sets passes only with its
 * record (partialRecordings). A journey without one is passed over.
 */
export function copyVoiceRecords(from: string, to: string): void {
  const journeys = path.join(from, authoringFolder(""));
  if (!existsSync(journeys)) return;
  for (const journeyId of readdirSync(journeys)) {
    const file = path.join(voiceRecordsFolder(journeyId), RECORDED_FILE);
    if (!existsSync(path.join(from, file))) continue;
    mkdirSync(path.dirname(path.join(to, file)), { recursive: true });
    cpSync(path.join(from, file), path.join(to, file));
  }
}

/** The journey's cast.json (voice-cast.ts), or undefined when it has none. Throws for one it cannot read. */
export function readVoiceCast(root: string, journeyId: string): VoiceCast | undefined {
  const file = path.join(root, voiceRecordsFolder(journeyId), CAST_FILE);
  return existsSync(file) ? readJson(root, file, voiceCastSchema, "声の配役") : undefined;
}

/** Write the journey's recorded.json (its voice records folder must exist); returns the file. */
export function writeRecordedClips(root: string, journeyId: string, clips: RecordedClips): string {
  const file = path.join(root, voiceRecordsFolder(journeyId), RECORDED_FILE);
  writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, clips: Object.fromEntries(clips) }, null, 2)}\n`);
  return file;
}

/** The scripts sent (newest first) and the recorded clips (none without a recorded.json). */
export function readVoiceHistory(root: string, journeyId: string): { scripts: SentVoiceScript[]; recorded: RecordedClips } {
  return { scripts: readSentScripts(root, journeyId), recorded: readRecordedClips(root, journeyId) ?? new Map() };
}
