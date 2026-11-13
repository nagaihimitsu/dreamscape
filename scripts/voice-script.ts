import path from "node:path";
import { z } from "zod";
import { isPlaceStory } from "../src/content/story-address";
import { displayPath, parseCatalog, type ContentSources } from "./content-sources";
import { taggedLines, tagsOf, tagStart } from "./line-tag-text";
import { withoutComments } from "./place-files";
import { PLAYER_SET_NAMES, voiceFilesOf } from "./voice-files";

// The voice script (npm run voice:script, 2026-11-13): the heroine's spoken lines of a journey, one entry per line of
// text (one recording, one file named by the entry's ID), with the scene, the branches it sits in, the line before it
// and its emotion and staging tags, for the people who make the voices. Read statically from the Ink sources (so a
// line in a branch no walk takes is in too), in the reading of the 2026-11-12 script of the India heroine (877 lines):
// a `# speaker:` holds until the next one or the next knot or stitch; message and letter lines (`# phone:`,
// `# letter:`) are read, not spoken, so they are left out.
// The IDs are stable (2026-11-13): a line with a `# voice:` keeps that ID (a recording is never renumbered); a line
// whose text is as it was last sent keeps the ID it was sent with (the scripts kept in authoring/, newest first,
// matched as voice:changes does: matchSameLines); any other line gets `<knot>_<NNN>` after the highest number any
// script, recording or line has used for that knot, so one ID never names two texts.
// Pure on the loaded sources and the scripts sent (no file is read); voice-script-cli.ts writes the files.

/** The line before a heroine line, as the script shows it: who says it, and what. */
export type PreviousLine = [speaker: string, text: string];

/** One heroine line of a voice script (the shape of the 2026-11-12 entries.json). */
export type VoiceLine = {
  /** The line of its text in its file, from 0 (as in the 2026-11-12 entries). */
  line: number;
  id: string;
  /** Its text as the script shows it: the names the player sets read 【主人公の呼び名】 and so on. */
  text: string;
  /** Its emotion tags in words (`# reaction:`'s face and mark, else `# emotion:`). */
  emo: string[];
  /** Its staging tags in words (`# pause:`, `# size:`, `# shake:`, `# quiet:`, `# stand:`). */
  staging: string[];
  /** The branches it sits in: the choice it follows, then its conditions, outermost first. */
  context: string[];
  prev: PreviousLine | null;
  /** 「★名前を含む」, 「★言い方が分かれる」 (an inline `{…|…}` or `{…:…}`), 「英語を含む」. */
  flags: string[];
  /** Its Ink file, relative to the journey's stories/. */
  file: string;
  knot: string;
  /** Its scene's `# title:` (a battle's catalog title), else the kind of scene and the knot. */
  title: string;
};

/** What the script is read from: a journey's stories and the names its lines need. */
export type VoiceScriptInput = {
  journeyId: string;
  nameJa: string;
  /** The journey's cities in order: the script goes city by city (a file's city is in its name, `gt_delhi_…`). */
  cities: readonly { id: string; nameJa: string }[];
  /** The journey's stories folder as messages show it (`content/journeys/<id>/stories/`). */
  storiesPath: string;
  /** The journey's Ink files: their story IDs (path below stories/ without `.ink`) and sources. */
  stories: readonly { storyId: string; source: string }[];
  /** Person ID → name (progression/story.json people), for the line before. */
  people: ReadonlyMap<string, string>;
  /** Battle story address (`places/<file>.<knot>`, or a one-scene file's story ID) → its title and opponent. */
  battles: ReadonlyMap<string, { titleJa?: string; enemyNameJa?: string }>;
  /** The scripts sent, newest first (voice-records.ts). */
  scripts: readonly SentVoiceScript[];
  /** The IDs of the recorded-text file (voice-records.ts): a line without a `# voice:` never takes one. */
  recorded: ReadonlySet<string>;
  /** The journey's voice files (an ID a new line never takes). */
  voiceFiles: ReadonlySet<string>;
};

export type VoiceScript = Pick<VoiceScriptInput, "journeyId" | "nameJa" | "cities" | "storiesPath"> & {
  lines: VoiceLine[];
  /** The IDs of the lines with a `# voice:` (recorded lines). */
  tagged: ReadonlySet<string>;
  /** Heroine lines left out: messages (`# phone:`) and letters or notes (`# letter:`). */
  skipped: number;
};

/** What the comparisons read of a sent script's line (its entries.json may hold more). */
export type ScriptedLine = Pick<VoiceLine, "id" | "text" | "file" | "knot" | "title">;
/** A script sent to the people who make the voices: its date (its folder's name), its entries.json and its lines. */
export type SentVoiceScript = { journeyId: string; date: string; file: string; lines: ScriptedLine[] };

// The tags' words for the voice maker (the faces and marks of presentation/, in words that say how it sounds).
const EMOTIONS: Readonly<Record<string, string>> = {
  neutral: "ふつう", smile: "ほほえみ", happy: "うれしい", serious: "真剣", shy: "照れ", shy_deep: "強い照れ（真っ赤）",
  surprised: "驚き", surprised_big: "大きな驚き", exasperated: "困る・あきれる", teasing: "からかう",
  teasing_big: "大笑い・強いからかい", worried: "心配・弱っている",
};
const MARKS: Readonly<Record<string, string>> = {
  sweat: "焦り", blush: "赤面", music: "楽しげ", heart: "好意", sparkle: "感激", interrobang: "びっくり",
  question: "疑問", exclamation: "はっとする", gloom: "がっかり", anger: "むっとする", dizzy: "目が回る", sigh: "ため息",
};
const STANDS: Readonly<Record<string, string>> = { close: "すぐそばに寄る", apart: "少し離れる", near: "いつもの位置" };
/** A scene without a `# title:`: its kind from its knot's name (the first part found), else 「場面」. */
const SCENE_KINDS: readonly [string, string][] = [
  ["_arrival", "到着"], ["_epilogue", "エピローグ"], ["_guide", "観光案内"], ["_finale", "都市フィナーレ"],
  ["_main_", "メイン観光のクイズ"], ["_hotel_", "宿の場面"], ["_depart", "出発"], ["_arrive", "到着のあと"],
  ["_tour_", "ツアー"], ["_confession_lead", "告白の前置き"],
];
/** A conditional's or branch's condition in words (the first that matches; `$1` is its number). */
const CONDITIONS: readonly [RegExp, string][] = [
  [/romance_result\s*==\s*"negative"/u, "噛み合いが悪いとき（少し距離のある言い方）"],
  [/romance_result\s*==\s*"positive"/u, "噛み合いが良いとき"],
  [/confession_result\s*==\s*"accepted"/u, "告白を受け入れるとき"],
  [/confession_result\s*==\s*"rejected"/u, "告白を断るとき"],
  [/confession_result\s*==\s*"wait"/u, "告白に「待って」と答えるとき"],
  [/^ending_reached$/u, "恋人になっているとき"],
  [/romance_stage\s*>=\s*(\d)/u, "関係の段階が$1以上のとき"],
  [/romance_stage\s*==\s*(\d)/u, "関係の段階が$1のとき"],
  [/^quiz_correct$/u, "クイズに正解したとき"],
  [/cond\("couple"\)/u, "恋人になっているとき"],
  [/cond\("stage\s*>=\s*(\d)"\)/u, "関係の段階が$1以上のとき"],
];
const COND_PARTS: Readonly<Record<string, (name: string) => string>> = {
  flag: (name) => `出来事「${name}」があったとき`, date: (name) => `デート「${name}」を遊んだあと`,
  seen: (name) => `場面「${name}」を見たあと`, episode: (name) => `「${name}」を終えたあと`,
  battle: (name) => `クイズ「${name}」を遊んだあと`, item: (name) => `品物「${name}」`,
};
const CHANGES_BY_BRANCH: PreviousLine = ["―", "条件で変わる（この前の分かれ道のどれを通ったかによる）"];
const CHANGES_BY_CHOICE: PreviousLine = ["―", "主人公が選んだあと（どの選択肢を選んだかで変わる）"];

const KNOT_LINE = /^={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
const OTHER_CITY = { id: "other", nameJa: "その他" };

/** A text with the names the player sets as the script shows them (【主人公の呼び名】…): no recording can say them. */
export const showNames = (text: string) => PLAYER_SET_NAMES.reduce((shown, name) => shown.replaceAll(name.placeholder, `【${name.nameJa}】`), text);

/** A condition in words. */
function branchLabel(condition: string): string {
  const text = condition.trim();
  for (const [pattern, label] of CONDITIONS) {
    const match = pattern.exec(text);
    if (match) return label.replace("$1", match[1] ?? "");
  }
  if (text === "else") return "それ以外";
  if (!text.includes("cond(")) return `条件つき：${text}`;
  const parts = [...text.matchAll(/cond\("([^"]+)"\)/gu)].map(([, part]) => {
    const space = part.indexOf(" ");
    const word = COND_PARTS[space < 0 ? part : part.slice(0, space)];
    return word ? word(space < 0 ? "" : part.slice(space + 1)) : part;
  });
  return `条件つき：${parts.join(text.includes(" and ") ? " かつ " : " または ")}`;
}

/** The city of a story file: the first of `cityIds` its name starts with, directly or after its prefix (`gt_delhi_…`). */
export function cityOfFile(file: string, cityIds: readonly string[]): string {
  const stem = path.posix.basename(file, ".ink");
  const names = [stem, stem.slice(stem.indexOf("_") + 1)];
  return cityIds.find((city) => names.some((name) => name === city || name.startsWith(`${city}_`))) ?? OTHER_CITY.id;
}

/** A heroine line before its ID is settled: its place in its knot and its `# voice:`, if any. */
type Draft = Omit<VoiceLine, "id"> & { number: number; voiceId?: string };

/** The heroine lines of one Ink file, in written order, and the number left out. */
function readStory(storyId: string, source: string, input: VoiceScriptInput): { drafts: Draft[]; skipped: number } {
  const file = `${storyId}.ink`;
  // The `# voice:` of each line of text (line-tag-text.ts: on its line, or on a line of its own before it).
  const voiced = new Map<number, string>();
  for (const tag of taggedLines(source, ["voice"]))
    if (tag.textLine !== null && !tag.choice && !voiced.has(tag.textLine - 1)) voiced.set(tag.textLine - 1, tag.value);
  const drafts: Draft[] = [];
  let skipped = 0;
  let knot = path.posix.basename(storyId);
  let address = storyId;
  let title = input.battles.get(storyId)?.titleJa;
  let person: string | undefined;
  let speaker = "narrator";
  let tags = new Map<string, string>();
  // The open conditionals (their current branch in words; a bare `{` has none) and the line before each.
  const branches: (string | null)[] = [];
  const blockPrev: (PreviousLine | null)[] = [];
  // The choice whose lines these are (its indent and words), and the line before its menu.
  let choice: { indent: number; label: string } | null = null;
  let menuPrev: PreviousLine | null = null;
  let prev: PreviousLine | null = null;
  const counter = new Map<string, number>();
  const speakerName = (id: string) => id === "heroine" ? "ヒロイン" : id === "player" ? "主人公" : id === "narrator" ? "地の文"
    : id === "enemy" ? person || input.battles.get(address)?.enemyNameJa || "相手" : input.people.get(id) ?? id;

  withoutComments(source).split("\n").forEach((raw, index) => {
    const line = raw.trim();
    const indent = raw.length - raw.trimStart().length;
    if (!line || /^(?:INCLUDE|VAR|CONST|EXTERNAL)\s/u.test(line) || line.startsWith("~")) return;
    const head = KNOT_LINE.exec(line);
    if (head) {
      knot = head[1];
      address = `${storyId}.${knot}`;
      title = input.battles.get(address)?.titleJa;
      person = undefined;
      speaker = "narrator";
      tags = new Map();
      branches.length = 0;
      blockPrev.length = 0;
      choice = null;
      menuPrev = null;
      prev = null;
      return;
    }
    if (/^=\s*\w/u.test(line)) {
      speaker = "narrator";
      choice = null;
      return;
    }
    if (line.startsWith("#")) {
      for (const tag of tagsOf(line)) {
        if (tag.key === "speaker") speaker = tag.value;
        else if (tag.key === "title") title = tag.value;
        else if (tag.key === "person") person = input.people.get(tag.value) ?? tag.value;
        else tags.set(tag.key, tag.value);
      }
      return;
    }
    if (line.startsWith("->") || line.startsWith("<-")) return;
    if (line.startsWith("*") || line.startsWith("+")) {
      const label = /^[*+\s]+\[(.*?)\]/u.exec(line)?.[1].replace(/\s*#.*$/u, "") ?? line;
      // Every choice of one menu follows the same line.
      if (!(choice && choice.indent === indent && menuPrev !== null)) menuPrev = prev;
      prev = menuPrev;
      choice = { indent, label: `選択肢［${showNames(label)}］のあと` };
      tags = new Map();
      return;
    }
    if (line === "}") {
      if (branches.length) {
        branches.pop();
        if (prev !== blockPrev.pop()) prev = CHANGES_BY_BRANCH;
      }
      return;
    }
    const opening = /^\{\s*(.*?):\s*$/u.exec(line);
    if (opening || line === "{") {
      branches.push(opening ? branchLabel(opening[1]) : null);
      blockPrev.push(prev);
      return;
    }
    const branch = /^-\s*(.+?):\s*$/u.exec(line);
    if (branch && branches.length) {
      branches[branches.length - 1] = branchLabel(branch[1]);
      prev = blockPrev[blockPrev.length - 1];
      return;
    }
    if (/^-+\s*(->.*)?$/u.test(line)) {
      if (menuPrev !== null || choice) prev = CHANGES_BY_CHOICE;
      choice = null;
      menuPrev = null;
      return;
    }
    // A line of text, with its own tags after it.
    const start = tagStart(line);
    const text = (start < 0 ? line : line.slice(0, start)).trim();
    if (start >= 0) for (const tag of tagsOf(line.slice(start))) {
      if (tag.key === "speaker") speaker = tag.value;
      else tags.set(tag.key, tag.value);
    }
    if (choice && indent <= choice.indent) choice = null;
    if (speaker === "heroine") {
      if (tags.has("phone") || tags.has("letter")) skipped++;
      else {
        const number = (counter.get(knot) ?? 0) + 1;
        counter.set(knot, number);
        title ||= `${SCENE_KINDS.find(([part]) => knot.includes(part))?.[1] ?? "場面"}（${knot}）`;
        drafts.push({
          line: index, number, ...(voiced.has(index) ? { voiceId: voiced.get(index) } : {}), text: showNames(text),
          emo: emotionWords(tags), staging: stagingWords(tags), context: [...(choice ? [choice.label] : []), ...branches.filter((item) => item !== null)],
          prev, flags: flagsOf(text), file, knot, title,
        });
      }
    }
    prev = [speakerName(speaker), showNames(text)];
    tags = new Map();
  });
  return { drafts, skipped };
}

function emotionWords(tags: ReadonlyMap<string, string>): string[] {
  const reaction = tags.get("reaction");
  if (reaction === undefined) {
    const emotion = tags.get("emotion");
    return emotion === undefined ? [] : [EMOTIONS[emotion] ?? emotion];
  }
  const [, face, mark] = reaction.split(",");
  return [...(face === undefined ? [] : [EMOTIONS[face] ?? face]), ...(mark === undefined ? [] : [MARKS[mark] ?? mark])];
}

function stagingWords(tags: ReadonlyMap<string, string>): string[] {
  const stand = tags.get("stand");
  return [
    ...(tags.has("pause") ? [`間${tags.get("pause")}ms（字が出る前に間）`] : []),
    ...(tags.has("size") ? ["大きな字（声を張る）"] : []),
    ...(tags.has("shake") ? ["窓が揺れる（驚き・衝撃）"] : []),
    ...(tags.get("quiet") === "line" ? ["この行だけ静か（声を落とす）"] : []),
    ...(tags.get("quiet") === "scene" ? ["ここから静かな場面（声を落とす）"] : []),
    ...(stand === undefined ? [] : [STANDS[stand] ?? stand]),
  ];
}

function flagsOf(text: string): string[] {
  const withoutNames = PLAYER_SET_NAMES.reduce((rest, name) => rest.replaceAll(name.placeholder, ""), text);
  return [
    ...(withoutNames !== text ? ["★名前を含む"] : []),
    ...(/\{[^}]*[:|][^}]*\}/u.test(withoutNames) ? ["★言い方が分かれる"] : []),
    ...(/[A-Za-z]{2,}/u.test(showNames(text)) ? ["英語を含む"] : []),
  ];
}

/** What the matching reads of a line. */
type Matchable = Pick<VoiceLine, "id" | "text" | "file" | "knot">;

/**
 * The same lines of an earlier list (a script sent) and a later one (the lines now), as index pairs: the same ID and
 * text, else the same text in the same knot, else in the same city (each in written order, one line for one line).
 * voice:script keeps IDs by it and voice:changes compares by it.
 */
export function matchSameLines(earlier: readonly Matchable[], later: readonly Matchable[], cityIds: readonly string[]): [number, number][] {
  const pairs: [number, number][] = [];
  const earlierLeft = new Set(earlier.keys());
  const laterLeft = new Set(later.keys());
  const pass = (key: (line: Matchable) => string) => {
    const waiting = new Map<string, number[]>();
    for (const index of laterLeft) waiting.set(key(later[index]), [...waiting.get(key(later[index])) ?? [], index]);
    for (const index of [...earlierLeft]) {
      const match = waiting.get(key(earlier[index]))?.shift();
      if (match === undefined) continue;
      pairs.push([index, match]);
      earlierLeft.delete(index);
      laterLeft.delete(match);
    }
  };
  pass((line) => `${line.id}\0${line.text}`);
  pass((line) => `${line.knot}\0${line.text}`);
  pass((line) => `${cityOfFile(line.file, cityIds)}\0${line.text}`);
  return pairs;
}

const numbered = (knot: string, number: number) => `${knot}_${String(number).padStart(3, "0")}`;

/**
 * The IDs: a `# voice:`'s; else the ID the line's text was last sent with (an ID no recording keeps); else the knot's
 * next number after the highest that any script sent, recording, voice file or line has used.
 */
function settleIds(drafts: readonly Draft[], input: VoiceScriptInput): string[] {
  const ids = drafts.map((draft) => draft.voiceId);
  const tagged = ids.filter((id) => id !== undefined);
  // Each ID with the text it was last sent with (the newest script that has it).
  const lastSent = new Map<string, ScriptedLine>();
  for (const script of input.scripts) for (const line of script.lines) if (!lastSent.has(line.id)) lastSent.set(line.id, line);
  const recorded = new Set([...input.recorded, ...tagged]);
  const sent = [...lastSent.values()].filter((line) => !recorded.has(line.id));
  const waiting = drafts.flatMap((draft, index) => draft.voiceId === undefined ? [index] : []);
  // A waiting line is matched by its place in its knot first (the 2026-11-12 numbering), then by its text.
  const pairs = matchSameLines(sent, waiting.map((index) => ({ ...drafts[index], id: numbered(drafts[index].knot, drafts[index].number) })),
    input.cities.map((city) => city.id));
  for (const [sentIndex, waitingIndex] of pairs) ids[waiting[waitingIndex]] = sent[sentIndex].id;
  const used = new Set([...lastSent.keys(), ...recorded, ...input.voiceFiles, ...ids.filter((id) => id !== undefined)]);
  const highest = new Map<string, number>();
  return drafts.map(({ knot }, index) => {
    const known = ids[index];
    if (known !== undefined) return known;
    const prefix = `${knot}_`;
    let number = highest.get(knot) ?? Math.max(0, ...[...used].map((id) =>
      id.startsWith(prefix) && /^\d+$/u.test(id.slice(prefix.length)) ? Number(id.slice(prefix.length)) : 0));
    do number++; while (used.has(numbered(knot, number)));
    highest.set(knot, number);
    used.add(numbered(knot, number));
    return numbered(knot, number);
  });
}

/** The voice script of a journey: its heroine lines city by city (the journey's order), place files first, then by file name. */
export function voiceScript(input: VoiceScriptInput): VoiceScript {
  const cityIds = input.cities.map((city) => city.id);
  const rank = (storyId: string) => {
    const city = cityIds.indexOf(cityOfFile(storyId, cityIds));
    return [city < 0 ? cityIds.length : city, isPlaceStory(storyId) ? 0 : 1] as const;
  };
  const stories = [...input.stories].sort((left, right) => {
    const [a, b] = [rank(left.storyId), rank(right.storyId)];
    const [nameA, nameB] = [`${path.posix.basename(left.storyId)}.ink`, `${path.posix.basename(right.storyId)}.ink`];
    return a[0] - b[0] || a[1] - b[1] || (nameA < nameB ? -1 : nameA > nameB ? 1 : left.storyId < right.storyId ? -1 : 1);
  });
  const read = stories.map((story) => readStory(story.storyId, story.source, input));
  const drafts = read.flatMap((item) => item.drafts);
  const ids = settleIds(drafts, input);
  return {
    journeyId: input.journeyId, nameJa: input.nameJa, cities: input.cities, storiesPath: input.storiesPath,
    // In the key order of the 2026-11-12 entries.
    lines: drafts.map(({ line, text, emo, staging, context, prev, flags, file, knot, title }, index) =>
      ({ line, id: ids[index], text, emo, staging, context, prev, flags, file, knot, title })),
    tagged: new Set(drafts.flatMap((draft) => draft.voiceId === undefined ? [] : [draft.voiceId])),
    skipped: read.reduce((sum, item) => sum + item.skipped, 0),
  };
}

/** The readable script (the 2026-11-12 layout): a header, then city by city, scene by scene, one box per line. */
export function formatVoiceScript(script: VoiceScript, date: string): string {
  const count = (flag: string) => script.lines.filter((line) => line.flags.includes(flag)).length;
  const out = [
    `${script.nameJa}　ヒロインの台詞（ボイス収録用）`, "",
    `作成：${date}　台本：${script.storiesPath} の現在の版から抜き出し`,
    `収録する台詞：${script.lines.length}行（1行＝1回の収録＝1ファイル）。メッセージ（携帯の吹き出し）とメモ・手紙の行 ${script.skipped}行は、声を付けないので入れていない。`,
    `★名前を含む：${count("★名前を含む")}行　★言い方が分かれる：${count("★言い方が分かれる")}行（説明書の「気をつけること」を見てください）`, "",
    "見方：",
    "  [ID] … 収録ファイルの名前にする（例：ID.wav）。",
    "  前の行 … この台詞の直前に画面に出る行（誰が言ったか：言ったこと）。返事の調子を合わせるための手がかり。",
    "  場面の分かれ道 … この台詞が出る条件。同じ場面に、条件ちがいの別の言い方がある。",
    "  表情 … 台本の表情の札。声の感じの目安。",
    "  演出 … 間・大きな字・静かな場面などの札。", "",
  ];
  const cityIds = script.cities.map((city) => city.id);
  for (const city of [...script.cities, OTHER_CITY]) {
    const lines = script.lines.filter((line) => cityOfFile(line.file, cityIds) === city.id);
    if (!lines.length) continue;
    out.push("=".repeat(60), `■■ ${city.nameJa}`, "=".repeat(60));
    lines.forEach((line, index) => {
      if (index === 0 || lines[index - 1].file !== line.file || lines[index - 1].knot !== line.knot)
        out.push("", `■ ${line.title}　（${line.file}）`, "-".repeat(40));
      const before = line.prev && [...line.prev[1]];
      out.push(
        `[${line.id}]${line.flags.length ? `　${line.flags.join(" / ")}` : ""}`,
        ...(line.prev && before ? [`  前の行（${line.prev[0]}）：${before.slice(0, 70).join("")}${before.length > 70 ? "…" : ""}`] : []),
        ...(line.context.length ? [`  場面の分かれ道：${line.context.join(" → ")}`] : []),
        ...(line.emo.length ? [`  表情：${line.emo.join(" / ")}`] : []),
        ...(line.staging.length ? [`  演出：${line.staging.join(" / ")}`] : []),
        `  台詞：${line.text}`, "",
      );
    });
  }
  return out.join("\n");
}

// What the script reads of the loaded content: loosely, so a field another tool checks does not stop it.
const peopleSchema = z.object({ people: z.array(z.object({ id: z.string(), nameJa: z.string() })).default([]) });
const battlesSchema = z.object({ battles: z.array(z.object({ storyId: z.string(), titleJa: z.string().optional(), enemyNameJa: z.string().optional() })) });
const manifestSchema = z.object({ nameJa: z.string(), cities: z.array(z.object({ id: z.string(), nameJa: z.string() })) });

/**
 * What voiceScript reads of a journey of the loaded sources, with the scripts sent and the recorded IDs
 * (voice-records.ts readVoiceHistory). Throws for a journey that is not one.
 */
export function voiceScriptInput(sources: ContentSources, journeyId: string,
  history: { scripts: readonly SentVoiceScript[]; recorded: ReadonlyMap<string, unknown> }): VoiceScriptInput {
  const manifest = sources.manifests.find((item) => item.id === journeyId);
  const layer = sources.layers.find((item) => item.type === "journey" && item.id === journeyId);
  if (!manifest || !layer)
    throw new Error(`旅行編がありません：${journeyId}（content/journeys/ のフォルダ名を書いてください。Unknown journey: ${journeyId}）`);
  const { nameJa, cities } = manifestSchema.parse(manifest.data);
  const stories = sources.storyFiles.filter((story) => story.layer === journeyId).map((story) => ({ storyId: story.id, source: story.source }));
  const people = sources.catalogs["progression/story.json"] ? parseCatalog(sources, peopleSchema, "progression/story.json").people : [];
  const battles = sources.catalogs["battles/catalog.json"] ? parseCatalog(sources, battlesSchema, "battles/catalog.json").battles : [];
  return {
    journeyId, nameJa, cities, stories,
    storiesPath: `${displayPath(sources.root, path.join(layer.directory, "stories"))}/`,
    people: new Map(people.map((person) => [person.id, person.nameJa])),
    battles: new Map(battles.map((battle) => [battle.storyId, battle])),
    scripts: history.scripts,
    recorded: new Set(history.recorded.keys()),
    voiceFiles: new Set(voiceFilesOf(sources).filter((voice) => voice.journeyId === journeyId).map((voice) => voice.id)),
  };
}
