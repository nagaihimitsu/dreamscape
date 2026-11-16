import { z } from "zod";
import { isPlaceStory } from "../src/content/story-address";
import { jsonStrings, jsonValueLines, nearestId } from "./json-lines";
import { tagStart, tagsOf } from "./line-tag-text";
import { withoutComments } from "./place-files";

// npm run text:check (2026-11-16, on demand; never part of content:build): notes on the player-facing text, for the
// script review (台本の点検). The text is the Ink lines (their text, a choice's words, and the words of `# title:`,
// `# hint:`, `# translation:`, `# photo_caption:`) and the Japanese fields of the data (the `…Ja` fields), never IDs,
// tags or comments.
// (a) Words of winning and losing (AGENTS.md: a quiz is not a battle, and these words are not used for it).
// (b) A person speaking under the 「旅の風景」 plate (src/components/speaker-plate.ts: the narration, and a speaker the
//     screen cannot name): a narration line with a 「…」 quotation, a reported speech (〜と。), a 「あなた」; a line of
//     `# speaker: enemy` in a scene that names no one for it (authoring/SCENARIO_EDITING_GUIDE.md 2.8).
// (c) A line with `# voice:` whose plate shows no name (the narration, an enemy the screen cannot name).
// (d) The variants a journey's terms ledger (authoring/journeys/<journeyId>/terms.json) says to avoid.
// Lines are read statically (a line in a branch no walk takes is read too): a `# speaker:` holds until the next one, a
// scene starts with the narration, and a helper knot's lines before its first `# speaker:` have an unknown speaker
// (they are its caller's), so (b) and (c) pass them over. Pure: the caller passes the files' text.

// ── The terms ledger ──────────────────────────────────────────────────────────

/** One term of a ledger: the preferred word, the variants to avoid, the words that contain a variant but are fine, and why. */
export type Term = { preferred: string; avoid: string[]; allow?: string[]; reasonJa?: string };

const word = z.string().trim().min(1);
const ledgerSchema = z.object({
  schemaVersion: z.literal(1),
  noteJa: z.string().optional(),
  terms: z.array(z.object({ preferred: word, avoid: z.array(word).min(1), allow: z.array(word).optional(), reasonJa: z.string().optional() }).strict()),
}).strict();

/** Read a terms ledger (authoring/journeys/<journeyId>/terms.json); throws in Japanese, naming the file, for one of the wrong shape. */
export function parseTermLedger(file: string, text: string): Term[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`用語の台帳 ${file} を JSON として読めません。`, { cause: error });
  }
  const parsed = ledgerSchema.safeParse(data);
  if (!parsed.success)
    throw new Error(`用語の台帳 ${file} の形が違います（schemaVersion: 1 と、terms に preferred・avoid・任意の allow・reasonJa を書きます）：` +
      parsed.error.issues.map((issue) => `${issue.path.join(".") || "(全体)"} ${issue.message}`).join("、"));
  return parsed.data.terms;
}

// ── The text of the content ───────────────────────────────────────────────────

/** Who a line's plate names: a name (heroine, player, a person, an enemy the screen names), 旅の風景, or not known statically. */
export type Plate = "named" | "narration" | "unnamed-enemy" | "unknown";

/** A piece of player-facing text: where it is, its text, and for an Ink line its plate and tags. */
export type TextPiece = {
  file: string;
  journey: string;
  line: number;
  text: string;
  /** The knot (an Ink line) or the JSON path and nearest id (a data field). */
  where: string;
  kind: "line" | "choice" | "tag" | "data";
  /** In a quiz's scene (a battle knot or a knot it calls), or a quiz file's field. */
  quiz: boolean;
  plate?: Plate;
  voiced?: boolean;
  /** `# phone:` or `# letter:`: read on a screen or a sheet, not spoken under a plate. */
  written?: boolean;
};

/** An Ink file as read. */
export type InkSource = { storyId: string; file: string; journey: string; source: string };

const KNOT_LINE = /^\s*={2,}\s*(function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
const TARGET = /(?:->|<-)\s*([A-Za-z_][A-Za-z0-9_]*)/gu;
/** Lines of Ink's own (a stitch, a variable, an include, a divert, a thread, a code line, the end or start of a block). */
const LOGIC_LINE = /^(?:=|~|->|<-|VAR\s|CONST\s|INCLUDE\s|EXTERNAL\s|\}|\{[^}]*:$|\{$)/u;
/** Tags whose value the player reads. */
const TEXT_TAGS = ["title", "hint", "translation", "photo_caption"];

type KnotInfo = { name: string; scene?: string; person: boolean; targets: string[] };

/** The knots of a source with their head (`# scene:`, `# person:`) and the knots they divert to. */
function knotInfos(code: string[]): Map<string, KnotInfo> {
  const knots = new Map<string, KnotInfo>([["", { name: "", person: false, targets: [] }]]);
  let current = knots.get("")!;
  let inHead = false;
  for (const line of code) {
    const head = KNOT_LINE.exec(line);
    if (head) {
      current = { name: head[2], person: false, targets: [] };
      knots.set(current.name, current);
      inHead = !head[1];
      continue;
    }
    if (inHead && /^\s*#/u.test(line)) {
      for (const tag of tagsOf(line.trim())) {
        if (tag.key === "scene") current.scene = tag.value;
        if (tag.key === "person") current.person = true;
      }
      continue;
    }
    inHead = false;
    for (const match of line.matchAll(TARGET)) current.targets.push(match[1]);
  }
  return knots;
}

/** Whether `# speaker: enemy` has a name in a scene of this kind: a battle's opponent, an arrival's or epilogue's city finale opponent, a `# person:`. */
const namesEnemy = (knot: KnotInfo) => knot.person || knot.scene === "battle" || knot.scene === "arrival" || knot.scene === "epilogue";

/** For each knot: whether its scenes name the enemy, and whether it is in a quiz (a battle and the knots it reaches). */
function sceneContext(storyId: string, knots: Map<string, KnotInfo>): Map<string, { enemy: boolean | undefined; quiz: boolean }> {
  const context = new Map<string, { enemy: boolean | undefined; quiz: boolean }>();
  const place = isPlaceStory(storyId);
  const scenes = place ? [...knots.values()].filter((knot) => knot.scene !== undefined) : [knots.get("")!];
  for (const scene of scenes) {
    // A one-scene file's kind is its catalog's: whether it names the enemy is not known here (unless it has a # person:).
    const named = place || scene.person ? namesEnemy(scene) : undefined;
    const seen = new Set<string>();
    const queue = [scene.name];
    while (queue.length) {
      const name = queue.shift()!;
      const knot = knots.get(name);
      if (!knot || seen.has(name)) continue;
      seen.add(name);
      const before = context.get(name);
      context.set(name, { enemy: named === undefined ? before?.enemy : (before?.enemy ?? false) || named, quiz: (before?.quiz ?? false) || scene.scene === "battle" });
      queue.push(...knot.targets.filter((target) => knots.has(target) && (knots.get(target)!.scene === undefined || target === name)));
    }
  }
  return context;
}

/** A line's player-facing text: without Ink's marks before it (gathers, a label) and its divert after it; "" for a line of Ink's own. */
function lineText(content: string): string {
  const bare = content.trim().replace(/^(?:-(?!>)\s*)+/u, "").replace(/^\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\)\s*/u, "").trim();
  if (!bare || LOGIC_LINE.test(bare)) return "";
  if (/^[\x20-\x7e]*$/u.test(bare) && (/:$/u.test(bare) || bare.includes("->"))) return "";
  return bare.replace(/\s*(?:->|<-).*$/u, "").trim();
}

/** The player-facing pieces of an Ink file: its lines (with their static plate), its choices' words and its text tags. */
export function inkPieces(ink: InkSource): TextPiece[] {
  const code = withoutComments(ink.source).split("\n");
  const knots = knotInfos(code);
  const context = sceneContext(ink.storyId, knots);
  const pieces: TextPiece[] = [];
  let knot = "";
  let speaker: string | undefined = isPlaceStory(ink.storyId) ? undefined : "narrator";
  let pending: { key: string; value: string }[] = [];
  const base = (line: number) => ({ file: ink.file, journey: ink.journey, line, where: knot ? `knot ${knot}` : "ファイルの頭", quiz: context.get(knot)?.quiz ?? false });
  const plateOf = (who: string | undefined): Plate => who === undefined ? "unknown" : who === "narrator" ? "narration"
    : who !== "enemy" ? "named" : context.get(knot)?.enemy === undefined ? "unknown" : context.get(knot)!.enemy ? "named" : "unnamed-enemy";
  code.forEach((raw, index) => {
    const number = index + 1;
    const head = KNOT_LINE.exec(raw);
    if (head) {
      knot = head[2];
      const info = knots.get(knot);
      // A scene starts with the narration; a helper knot's first lines are its caller's speaker's.
      speaker = info?.scene !== undefined ? "narrator" : undefined;
      pending = [];
      return;
    }
    const start = tagStart(raw);
    const content = start < 0 ? raw : raw.slice(0, start);
    const tags = start < 0 ? [] : tagsOf(raw.slice(start));
    for (const tag of tags) if (TEXT_TAGS.includes(tag.key) && /[^\x20-\x7e]/u.test(tag.value))
      pieces.push({ ...base(number), text: tag.value, kind: "tag", where: `${base(number).where} の # ${tag.key}:` });
    if (/^\s*(?:-\s*)*[*+]/u.test(content)) {
      const words = content.replace(/^\s*(?:-\s*)*(?:[*+]\s*)+/u, "").replace(/^\(\s*[A-Za-z_][A-Za-z0-9_]*\s*\)\s*/u, "")
        .replace(/[[\]]/gu, "").replace(/\s*(?:->|<-).*$/u, "").trim();
      if (words) pieces.push({ ...base(number), text: words, kind: "choice" });
      pending = [];
      return;
    }
    const text = lineText(content);
    const all = [...pending, ...tags];
    for (const tag of all) if (tag.key === "speaker") speaker = tag.value;
    if (!text) {
      if (!content.trim()) pending = all.filter((tag) => tag.key !== "speaker");
      return;
    }
    pending = [];
    pieces.push({ ...base(number), text, kind: "line", plate: plateOf(speaker), voiced: all.some((tag) => tag.key === "voice"),
      written: all.some((tag) => tag.key === "phone" || tag.key === "letter") });
  });
  return pieces;
}

/** A content JSON file as read: its path, its journey ("core" for the shared files), its text, and whether it is a quiz's. */
export type DataSource = { file: string; journey: string; text: string };

/** The Japanese fields of a data file (the `…Ja` keys and the strings of arrays under them), with their lines. */
export function dataPieces(data: DataSource): TextPiece[] {
  const value: unknown = JSON.parse(data.text);
  const lines = jsonValueLines(data.text);
  const quiz = /\/quizzes\/[^/]+\.json$/u.test(data.file);
  return jsonStrings(value).filter((item) => item.field?.endsWith("Ja")).map((item) => {
    const id = nearestId(value, item.path);
    return { file: data.file, journey: data.journey, line: lines.get(item.path) ?? 1, text: item.value, where: `${item.path}${id ? `（${id}）` : ""}`, kind: "data", quiz };
  });
}

// ── The notes ─────────────────────────────────────────────────────────────────

export type NoteKind = "win-lose" | "narration-speech" | "voice-no-plate" | "term";
export type TextNote = { kind: NoteKind; piece: TextPiece; detailJa: string };

/**
 * Words of winning and losing: 勝つ・勝ち・勝って・勝利・勝負・勝者・勝敗・〜勝（優勝・圧勝…）, 負け・負かす, 敗北・敗者・敗れる・〜敗
 * (完敗・惨敗・連敗). Not 勝手・名勝・勝る, 背負う・自負・負担, 失敗.
 */
export const WIN_LOSE = /勝(?:ち|つ|て|っ|と|た|利|負|者|敗)|[優必連圧楽惜辛完全]勝|敗(?:北|者|れ|退)|[完惨連]敗|負(?:け|か[さしすせそ])/gu;

/** A 「…」 quotation this long or longer in the narration is probably someone's words (a short quoted phrase is fine, 2.8). */
export const QUOTE_MIN_LENGTH = 10;

/** Why a narration line reads as someone speaking (undefined: it does not): a long 「…」, a reported speech, あなた・あんた. */
export function narrationSpeech(text: string): string | undefined {
  const quote = [...text.matchAll(/「([^」]*)」/gu)].map((match) => match[1]).find((inner) => [...inner].length >= QUOTE_MIN_LENGTH);
  if (quote !== undefined) return `地の文の中に「${quote}」（${[...quote].length}字）`;
  if (/[だたいかうよねするんの、]と。$/u.test(text)) return "地の文が人の言葉を言い換えている（〜と。）";
  if (/あなた|あんた/u.test(text)) return "地の文に「あなた」「あんた」";
  return undefined;
}

/**
 * The first of a term's variants that a text uses outside its preferred word and its allowed words (「チーニー・カ・ラウザ」
 * inside 「チーニー・カ・ラウザー」, 「敵」 inside 「素敵」 is no variant), or undefined. One note per term and text.
 */
export function foundVariant(text: string, term: Term): string | undefined {
  const fine = [term.preferred, ...(term.allow ?? [])];
  const covered = (at: number, length: number) => fine.some((ok) => {
    for (let from = text.indexOf(ok); from >= 0; from = text.indexOf(ok, from + 1)) if (from <= at && at + length <= from + ok.length) return true;
    return false;
  });
  for (const variant of term.avoid)
    for (let at = text.indexOf(variant); at >= 0; at = text.indexOf(variant, at + 1)) if (!covered(at, variant.length)) return variant;
  return undefined;
}

const short = (text: string) => ([...text].length > 70 ? `${[...text].slice(0, 70).join("")}…` : text);

/** The notes (a) to (c) of the pieces, and (d) for the terms that apply to each piece (its journey's; the shared files: every journey's). */
export function textNotes(pieces: readonly TextPiece[], termsOf: (journey: string) => readonly Term[]): TextNote[] {
  const notes: TextNote[] = [];
  for (const piece of pieces) {
    const words = [...new Set([...piece.text.matchAll(WIN_LOSE)].map((match) => match[0]))];
    if (words.length) notes.push({ kind: "win-lose", piece, detailJa: `勝ち負けの言葉「${words.join("」「")}」${piece.quiz ? "（クイズの場面）" : ""}` });
    if (piece.kind === "line" && !piece.written) {
      if (piece.plate === "narration") {
        const why = narrationSpeech(piece.text);
        if (why) notes.push({ kind: "narration-speech", piece, detailJa: why });
      }
      if (piece.plate === "unnamed-enemy")
        notes.push({ kind: "narration-speech", piece, detailJa: "# speaker: enemy の行ですが、この場面には名前を出す相手がいません（頭に # person: がない）" });
      if (piece.voiced && (piece.plate === "narration" || piece.plate === "unnamed-enemy"))
        notes.push({ kind: "voice-no-plate", piece, detailJa: piece.plate === "narration" ? "地の文の行に # voice: がある" : "名前の出ない相手の行に # voice: がある" });
    }
    for (const term of termsOf(piece.journey)) {
      const variant = foundVariant(piece.text, term);
      if (variant) notes.push({ kind: "term", piece, detailJa: `「${variant}」→「${term.preferred}」${term.reasonJa ? `（${term.reasonJa}）` : ""}` });
    }
  }
  return notes;
}

/** Every term of the ledgers, without repeats (the shared files are read with all of them). */
export function allTerms(ledgers: readonly (readonly Term[])[]): Term[] {
  const seen = new Set<string>();
  return ledgers.flat().filter((term) => {
    const key = JSON.stringify([term.preferred, term.avoid, term.allow ?? []]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const KIND_LABELS: Record<NoteKind, string> = {
  "win-lose": "(a) 勝ち負けの言葉",
  "narration-speech": "(b) 「旅の風景」の名札のまま人が話しているかもしれない行",
  "voice-no-plate": "(c) 名札の出ない声（# voice: の行）",
  term: "(d) 用語の台帳で避ける言い方",
};
const KIND_HINTS: Record<NoteKind, string> = {
  "win-lose": "クイズは戦いとして書きません（AGENTS.md「文章と言語」）。クイズの外の歴史の話などは、そのままでかまいません。",
  "narration-speech": "人の言葉なら、その人の # speaker: の行に分けます（シナリオ改稿のポイント 2.8）。短い引用はそのままでかまいません。",
  "voice-no-plate": "声の主の # speaker: を書くか、場面の頭に # person: を書きます。",
  term: "表記をそろえます。台帳は authoring/journeys/<旅行編ID>/terms.json です。",
};

/** The report in Japanese: counts per kind (and per journey), then each note with its file, line and text. */
export function formatTextReport(notes: readonly TextNote[], options: { journeys: readonly string[]; ledgers: readonly { journey: string; file: string; count: number }[] }): string[] {
  const out = [
    "文の点検（text:check）：遊ぶ人に見える文（Ink の行・選択肢・# title: などの札の字、データの …Ja の欄）の注意だけで、どのファイルも変えません。直すかどうかは書く人が決めます。",
    "content:build の注意がもう見るもの（日本語の欄に日本語がない data-language、図鑑の語の長さ glossary、録音後に変わった声 voice-changed）は、ここでは繰り返しません。",
    `用語の台帳：${options.ledgers.map((ledger) => `${ledger.file}（${ledger.count}語）`).join("、") || "なし"}`,
    "",
  ];
  for (const kind of Object.keys(KIND_LABELS) as NoteKind[]) {
    const ofKind = notes.filter((note) => note.kind === kind);
    const perJourney = options.journeys.map((journey) => `${journey === "core" ? "共通" : journey} ${ofKind.filter((note) => note.piece.journey === journey).length}`);
    const quiz = kind === "win-lose" ? `。うちクイズの場面 ${ofKind.filter((note) => note.piece.quiz).length}` : "";
    out.push(`- ${KIND_LABELS[kind]}：${ofKind.length}件（${perJourney.join("、")}${quiz}）`);
  }
  for (const kind of Object.keys(KIND_LABELS) as NoteKind[]) {
    const ofKind = notes.filter((note) => note.kind === kind);
    out.push("", `■ ${KIND_LABELS[kind]}（${ofKind.length}件）。${KIND_HINTS[kind]}`);
    if (!ofKind.length) out.push("  ありません。");
    for (const note of ofKind) out.push(`  ${note.piece.file}:${note.piece.line}（${note.piece.where}）${note.detailJa}`, `    ${short(note.piece.text)}`);
  }
  return out;
}
