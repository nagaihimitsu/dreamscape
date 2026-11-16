import { z } from "zod";

// npm run content:warnings -- --save [file] | --compare [file] [--with-sample]: the warnings content:build counts (its
// content warnings by kind, and the stale dialogue annotations it counts on a line of their own), kept in a JSON file
// and compared with a later build, so that a report gives the counts before and after without counting by hand. The
// file format, the arguments and the printed text are here; content-warnings-cli.ts runs the pipeline.

export const DEFAULT_WARNINGS_FILE = "artifacts/content-warnings.json";
/** The kind under which the stale dialogue annotations (expressions and reactions left after Ink edits) are kept. */
export const STALE_DIALOGUE_KIND = "stale-dialogue";
/** The console warnings of the Ink validation that content:build counts as stale dialogue annotations. */
export const STALE_DIALOGUE_LINE = /^Stale dialogue (expression|reaction) \(/u;

const usage = "使い方: npm run content:warnings -- --save [ファイル] | --compare [ファイル]（どちらも -- --with-sample を付けると見本の編を含めて数える。ファイルを省くと "
  + `${DEFAULT_WARNINGS_FILE}）`;

export interface ContentWarningsArgs { mode: "save" | "compare"; file: string; withSample: boolean }

/** `--save` or `--compare` (one of them), each with an optional file that is not another option, and `--with-sample`. */
export function parseContentWarningsArgs(argv: readonly string[]): ContentWarningsArgs {
  let mode: ContentWarningsArgs["mode"] | undefined;
  let file: string | undefined;
  let withSample = false;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--with-sample") withSample = true;
    else if (arg === "--save" || arg === "--compare") {
      if (mode) throw new Error(`--save と --compare は、どちらか1つだけ指定します。${usage}`);
      mode = arg === "--save" ? "save" : "compare";
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) {
        file = next;
        index++;
      }
    } else throw new Error(`知らない指定です: ${arg}。${usage}`);
  }
  if (!mode) throw new Error(usage);
  return { mode, file: file ?? DEFAULT_WARNINGS_FILE, withSample };
}

const warningSchema = z.object({ kind: z.string(), message: z.string() });
const snapshotSchema = z.object({
  savedAt: z.string(),
  head: z.string().nullable(),
  withSample: z.boolean(),
  total: z.number(),
  counts: z.record(z.string(), z.number()),
  warnings: z.array(warningSchema),
});
export type WarningRecord = z.infer<typeof warningSchema>;
export type WarningSnapshot = z.infer<typeof snapshotSchema>;

/** The saved form: the counts by kind (sorted by kind), every message, the sample setting and the git HEAD. */
export function warningSnapshot(
  warnings: readonly WarningRecord[],
  staleAnnotations: readonly string[],
  info: { savedAt: string; head: string | null; withSample: boolean },
): WarningSnapshot {
  const all = [...warnings.map(({ kind, message }) => ({ kind, message })),
    ...staleAnnotations.map((message) => ({ kind: STALE_DIALOGUE_KIND, message }))];
  const counts: Record<string, number> = {};
  for (const kind of [...new Set(all.map((warning) => warning.kind))].sort()) counts[kind] = all.filter((warning) => warning.kind === kind).length;
  return { ...info, total: all.length, counts, warnings: all };
}

/** A saved file's snapshot; a message that names the file when it is no such snapshot. */
export function readWarningSnapshot(text: string, file: string): WarningSnapshot {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} は JSON として読めません（${error instanceof Error ? error.message : error}）。npm run content:warnings -- --save で保存し直してください。`);
  }
  const parsed = snapshotSchema.safeParse(json);
  if (!parsed.success) throw new Error(`${file} は content:warnings の記録の形ではありません。npm run content:warnings -- --save で保存し直してください。`);
  return parsed.data;
}

const sampleText = (withSample: boolean) => (withSample ? "見本あり" : "見本なし");
const headText = (head: string | null) => (head ? `HEAD ${head.slice(0, 7)}` : "HEAD 不明");
const staleNote = (...snapshots: WarningSnapshot[]) => snapshots.some((snapshot) => snapshot.counts[STALE_DIALOGUE_KIND])
  ? [`（${STALE_DIALOGUE_KIND} は Ink を直した後に残った表情・反応の注記で、content:build では別の行に数えます。）`]
  : [];

/** What --save prints: where it saved, the total with the sample setting and HEAD, and the count of each kind. */
export function savedSummary(snapshot: WarningSnapshot, file: string): string[] {
  return [
    `content:warnings: content:build の注意を ${file} に保存しました。`,
    `注意 ${snapshot.total} 件（${sampleText(snapshot.withSample)}、${headText(snapshot.head)}）`,
    ...Object.entries(snapshot.counts).map(([kind, count]) => `  ${kind}：${count}`),
    ...staleNote(snapshot),
    "あとで比べるときは npm run content:warnings -- --compare を実行します。",
  ];
}

const signed = (difference: number) => (difference > 0 ? `+${difference}` : `${difference}`);
const change = (before: number, after: number) => `${before} → ${after}${before === after ? "" : `（${signed(after - before)}）`}`;

/** The messages of `from` that `to` lacks, each as often as it is missing (the same message may come more than once). */
function missingFrom(from: readonly WarningRecord[], to: readonly WarningRecord[]): WarningRecord[] {
  const left = new Map<string, number>();
  const key = (warning: WarningRecord) => JSON.stringify([warning.kind, warning.message]);
  for (const warning of to) left.set(key(warning), (left.get(key(warning)) ?? 0) + 1);
  return from.filter((warning) => {
    const count = left.get(key(warning)) ?? 0;
    if (count > 0) left.set(key(warning), count - 1);
    return count === 0;
  });
}

/** What --compare prints: both records, a note when the sample setting differs, each kind before → after, the messages removed and added. */
export function compareWarningSnapshots(before: WarningSnapshot, after: WarningSnapshot, file: string): string[] {
  const lines = [`content:warnings: ${file}（${before.savedAt.slice(0, 10)} に保存、${sampleText(before.withSample)}、${headText(before.head)}）と、`
    + `今の注意（${sampleText(after.withSample)}、${headText(after.head)}）を比べます。`];
  if (before.withSample !== after.withSample)
    lines.push(`見本の設定が違います：保存した記録は${sampleText(before.withSample)}、今回は${sampleText(after.withSample)}で数えました。`
      + `見本の編の注意の分も違って見えます。そろえるには --with-sample を${before.withSample ? "付けて" : "外して"}比べ直します。`);
  const kinds = [...new Set([...Object.keys(before.counts), ...Object.keys(after.counts)])].sort();
  lines.push("種類ごとの件数（前 → 今）：", ...kinds.map((kind) => `  ${kind}：${change(before.counts[kind] ?? 0, after.counts[kind] ?? 0)}`),
    `  合計：${change(before.total, after.total)}`);
  const removed = missingFrom(before.warnings, after.warnings);
  const added = missingFrom(after.warnings, before.warnings);
  const listed = (heading: string, warnings: WarningRecord[]) => warnings.length
    ? [`${heading}（${warnings.length} 件）：`, ...warnings.map((warning) => `  - [${warning.kind}] ${warning.message}`)]
    : [`${heading}：なし`];
  lines.push(...listed("消えた注意", removed), ...listed("増えた注意", added), ...staleNote(before, after));
  if (!removed.length && !added.length) lines.push("注意の数と中身は、保存したときと同じです。");
  return lines;
}
