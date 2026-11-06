import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";
import { listFiles } from "./content-sources";

// The sample journey (authoring/templates/sample_trip/) as data: its README's
// lists (required files, optional parts), the minimal subset without the
// optional parts, and the marks that tell its fictional content apart, so
// that a journey copied from it (`npm run journey:new`) cannot be published
// while sample sources, images or texts are left (journey-readiness.ts).

const repositoryRoot = path.resolve(import.meta.dirname, "..");
export const SAMPLE_README = "README.md";
/** The source URL of every fictional claim of the sample. */
export const SAMPLE_SOURCE_URL = "https://example.com/dreamscape-sample";

export type SampleOptionalPart = { title: string; files: string[]; ids: string[] };
export type SampleReadme = {
  /** The required files (paths inside the sample folder), their role and the error without them. */
  core: { file: string; role: string; error: string }[];
  optional: SampleOptionalPart[];
};

/** The lists of the sample README: the required-file table and each optional part (### heading) with its files and entry IDs. */
export function parseSampleReadme(text: string): SampleReadme {
  const ticks = (line: string) => [...line.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
  const core: SampleReadme["core"] = [];
  const optional: SampleOptionalPart[] = [];
  for (const line of text.split("\n")) {
    const row = /^\| `([^`]+)` \| (.+?) \| `([^`]+)` \|$/u.exec(line);
    if (row) core.push({ file: row[1], role: row[2], error: row[3] });
    const heading = /^### (.+)$/u.exec(line);
    if (heading) optional.push({ title: heading[1], files: [], ids: [] });
    if (line.startsWith("- ファイル：")) optional.at(-1)?.files.push(...ticks(line));
    if (line.startsWith("- 項目のID：")) optional.at(-1)?.ids.push(...ticks(line));
  }
  return { core, optional: optional.filter((part) => part.files.length) };
}

/** Remove an optional part's entries from a JSON value: array elements naming one of `ids`, those strings, and those record keys. */
export function withoutIds(value: unknown, ids: ReadonlySet<string>): unknown {
  const names = (item: unknown) => typeof item === "string" ? ids.has(item)
    : !!item && typeof item === "object" && !Array.isArray(item) && Object.values(item).some((field) => typeof field === "string" && ids.has(field));
  if (Array.isArray(value)) return value.filter((item) => !names(item)).map((item) => withoutIds(item, ids));
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).filter(([key]) => !ids.has(key)).map(([key, item]) => [key, withoutIds(item, ids)]));
  return value;
}

/** JSON as the content files write it: two-space indentation and a final newline. */
export const jsonText = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * The sample without its optional parts: their files left out, their entries
 * removed from the other JSON files (rewritten as jsonText; other files keep
 * their bytes). Files are keyed by their path inside the sample folder.
 */
export function withoutOptionalParts<T extends Buffer | null>(files: ReadonlyMap<string, T>, readme: SampleReadme): Map<string, T> {
  const optionalFiles = new Set(readme.optional.flatMap((part) => part.files));
  const ids = new Set(readme.optional.flatMap((part) => part.ids));
  return new Map([...files].filter(([file]) => !optionalFiles.has(file)).map(([file, bytes]): [string, T] =>
    [file, (bytes && file.endsWith(".json") ? Buffer.from(jsonText(withoutIds(JSON.parse(bytes.toString("utf8")), ids))) : bytes) as T]));
}

/** The sample folder's files (path inside it → bytes) without its README, and the README's lists. */
export function readSampleJourney(directory = path.join(repositoryRoot, SAMPLE_JOURNEY_DIRECTORY)): { files: Map<string, Buffer>; readme: SampleReadme } {
  const readme = parseSampleReadme(readFileSync(path.join(directory, SAMPLE_README), "utf8"));
  const files = new Map(listFiles(directory).filter((file) => file !== SAMPLE_README).sort()
    .map((file): [string, Buffer] => [file, readFileSync(path.join(directory, file))]));
  return { files, readme };
}

// --- Sample leftovers -------------------------------------------------------

const japanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
/** The sample labels its fictional names and claims with 見本 (and the English names with Mihon). */
const sampleLabel = /見本|Mihon/u;
/** JSON whose Japanese texts are shared phrasing any journey may reuse: word glosses, reward titles, the currency. */
const sharedTextFiles = new Set(["learning/word-meanings.json"]);
const sharedTextKeys = new Set(["vocabularyJa", "rewards", "currency"]);
/** The English quiz texts (question, options): the sample's own unless as short as a common answer ("Every hour."). */
const englishQuizKeys = new Set(["questionEn", "textEn"]);
const englishQuizText = (key: string | undefined, value: string) => !!key && englishQuizKeys.has(key) && value.trim().split(/\s+/u).length >= 3;

/**
 * The texts of a sample file that another journey must not keep: of JSON,
 * every string with Japanese of 8 or more characters or with the sample's
 * label (見本, Mihon), and the English quiz questions and options of 3 or
 * more words, except shared phrasing (sharedTextFiles, sharedTextKeys); of
 * Ink, every line with Japanese of 8 or more characters (trimmed) except
 * `//` comments, which explain the rules of the script and may stay.
 */
export function sampleTextsOf(file: string, text: string): string[] {
  const kept = (value: string) => sampleLabel.test(value) || (japanese.test(value) && [...value].length >= 8);
  if (file.endsWith(".ink"))
    return text.split("\n").map((line) => line.trim()).filter((line) => !line.startsWith("//") && japanese.test(line) && [...line].length >= 8);
  if (!file.endsWith(".json") || sharedTextFiles.has(file)) return [];
  const texts: string[] = [];
  const visit = (value: unknown, key?: string) => {
    if (typeof value === "string") { if (kept(value) || englishQuizText(key, value)) texts.push(value); }
    else if (Array.isArray(value)) value.forEach((item) => visit(item, key));
    else if (value && typeof value === "object")
      for (const [name, item] of Object.entries(value)) if (!sharedTextKeys.has(name)) visit(item, name);
  };
  visit(JSON.parse(text));
  return texts;
}

/** A source URL at example.com (reserved for examples; the sample's sources), anywhere in a JSON file. */
const exampleUrl = /^https?:\/\/(?:[a-z0-9-]+\.)*example\.com(?:[/:?#]|$)/iu;
function exampleUrls(text: string): number {
  let count = 0;
  const visit = (value: unknown) => {
    if (typeof value === "string") { if (exampleUrl.test(value)) count += 1; }
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(JSON.parse(text));
  return count;
}

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** What identifies the sample's content: its texts (sampleTextsOf) and the hashes of its images. */
export type SampleMarks = { texts: ReadonlySet<string>; imageHashes: ReadonlySet<string> };

export function sampleMarksOf(files: ReadonlyMap<string, Buffer>): SampleMarks {
  const texts = new Set<string>();
  const imageHashes = new Set<string>();
  for (const [file, bytes] of files) {
    if (file.startsWith("public/")) imageHashes.add(sha256(bytes));
    else for (const text of sampleTextsOf(file, bytes.toString("utf8"))) texts.add(text);
  }
  return { texts, imageHashes };
}

let repositoryMarks: SampleMarks | undefined;
/** The marks of the repository's sample folder (read once). */
export function sampleMarks(): SampleMarks {
  return repositoryMarks ??= sampleMarksOf(readSampleJourney().files);
}

/** Sample content found in one file of a journey folder: example.com sources, a sample image, or sample texts. */
export type SampleLeftover = { file: string; kind: "source" | "image" | "text"; count: number };

/**
 * The sample content left in a journey's files (path inside the journey
 * folder → bytes; null for a file that could not be read): JSON with source
 * URLs at example.com, images with the bytes of a sample image, and JSON or
 * Ink with a text of the sample (sampleTextsOf, compared whole). `.md` notes
 * are not content and are skipped.
 */
export function sampleLeftovers(files: ReadonlyMap<string, Buffer | null>, marks: SampleMarks = sampleMarks()): SampleLeftover[] {
  const found: SampleLeftover[] = [];
  for (const [file, bytes] of [...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (!bytes) continue;
    if (file.startsWith("public/")) {
      if (marks.imageHashes.has(sha256(bytes))) found.push({ file, kind: "image", count: 1 });
      continue;
    }
    if (!file.endsWith(".json") && !file.endsWith(".ink")) continue;
    const text = bytes.toString("utf8");
    const sources = file.endsWith(".json") ? exampleUrls(text) : 0;
    if (sources) found.push({ file, kind: "source", count: sources });
    // Every occurrence counts, also of sharedTextKeys' strings: the marks never contain shared phrasing.
    const texts = sampleTextsOfAll(file, text).filter((item) => marks.texts.has(item)).length;
    if (texts) found.push({ file, kind: "text", count: texts });
  }
  return found;
}

/** Like sampleTextsOf, for a journey's file: every candidate text, whatever its key, so that moved sample texts are found too. */
function sampleTextsOfAll(file: string, text: string): string[] {
  if (file.endsWith(".ink")) return sampleTextsOf(file, text);
  const texts: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") texts.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(JSON.parse(text));
  return texts;
}

/** The files of a journey folder on disk for sampleLeftovers (`folder` absolute; dot entries skipped). */
export function journeyFolderFiles(folder: string): Map<string, Buffer | null> {
  return new Map(existsSync(folder) ? listFiles(folder).map((file): [string, Buffer | null] => [file, readFileSync(path.join(folder, file))]) : []);
}

/** One line per leftover, in Japanese, for the readiness report and journey:release. */
export function describeSampleLeftover(leftover: SampleLeftover): string {
  switch (leftover.kind) {
    case "source": return `見本の出典（example.com）が残っています: ${leftover.file}（${leftover.count}件）`;
    case "image": return `見本の画像のままです: ${leftover.file}`;
    case "text": return `見本の文章が残っています: ${leftover.file}（${leftover.count}か所）`;
  }
}
