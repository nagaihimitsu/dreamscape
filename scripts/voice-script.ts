import path from "node:path";
import { z } from "zod";
import { isPlaceStory } from "../src/content/story-address";
import { displayPath, parseCatalog, type ContentSources } from "./content-sources";
import { taggedLines, tagsOf, tagStart } from "./line-tag-text";
import { withoutComments } from "./place-files";
import { PLAYER_SET_NAMES, voiceFilesOf } from "./voice-files";

// The voice script (npm run voice:script, 2026-11-13): the spoken lines of a journey, one entry per line of text (one
// recording, one file named by the entry's ID), with the scene, the branches it sits in, the line before it and its
// emotion and staging tags, for the people who make the voices. Read statically from the Ink sources (so a line in a
// branch no walk takes is in too), in the reading of the 2026-11-12 script of the India heroine (877 lines): a
// `# speaker:` holds until the next one or the next knot or stitch; message and letter lines (`# phone:`, `# letter:`)
// are read, not spoken, so they are left out.
// Every speaker (2026-11-17 user request: voices for the other people too): the heroine and each `# speaker:` but the
// narrator and the player. Each line says who voices it (`voice`): `heroine`, else a character: a person's
// `characterId` (progression/story.json people; several person IDs of one character share it), else the person ID;
// `enemy` is who the game puts opposite (speaker-plate.ts): in a battle its opponent (presentation/characters.json
// battleCharacters by the battle's ID, else the battle's ID), elsewhere the scene's `# person:` (scene-person.ts: the
// first with a characterId, else the first).
// The IDs are stable (2026-11-13): a line with a `# voice:` keeps that ID (a recording is never renumbered); a line
// whose text is as it was last sent for the same voice keeps the ID it was sent with (the scripts kept in authoring/,
// newest first, matched as voice:changes does: matchSameLines); any other line gets the next number of its knot and
// voice after the highest any script, recording or line has used, so one ID never names two texts. The heroine's lines
// are `<knot>_<NNN>` (as since 2026-11-12), another voice's `<knot>_<voice without its first part>_<NNN>`.
// Pure on the loaded sources and the scripts sent (no file is read); voice-script-cli.ts writes the files.

/** The voice of the heroine's lines. */
export const HEROINE_VOICE = "heroine";

/** The line before a spoken line, as the script shows it: who says it, and what. */
export type PreviousLine = [speaker: string, text: string];

/** One spoken line of a voice script (the shape of the 2026-11-12 entries.json, with who speaks after). */
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
  /** Its `# speaker:` as written (`heroine`, `enemy` or a person ID). */
  speaker: string;
  /** Who voices it: HEROINE_VOICE, else the character (a person's characterId, else the person ID; a battle's ID). */
  voice: string;
  /** The name its plate shows (ヒロイン for the heroine). */
  speakerJa: string;
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
  /** Person ID → name and character (progression/story.json people). */
  people: ReadonlyMap<string, { nameJa: string; characterId?: string }>;
  /**
   * Battle story address (`places/<file>.<knot>`, or a one-scene file's story ID) → its ID, title and opponent, and the
   * opponent's character (presentation/characters.json battleCharacters, by the battle's ID).
   */
  battles: ReadonlyMap<string, { id: string; titleJa?: string; enemyNameJa?: string; characterId?: string }>;
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
  /** Lines left out per voice: messages (`# phone:`) and letters or notes (`# letter:`). */
  skipped: ReadonlyMap<string, number>;
};

/**
 * What the comparisons read of a sent script's line (its entries.json may hold more): a line sent before 2026-11-17 has
 * no voice (it is the heroine's) nor speakerJa. `spoken` (2026-11-17): a line with a name the player sets that was
 * requested up to the name says this (voice-cast.ts castEntries); voice:tag records it.
 */
export type ScriptedLine = Pick<VoiceLine, "id" | "text" | "file" | "knot" | "title"> & Partial<Pick<VoiceLine, "voice" | "speakerJa">> &
  { spoken?: string };
/** The voice of a sent line (HEROINE_VOICE for one sent before voices had a field). */
export const voiceOf = (line: { voice?: string }) => line.voice ?? HEROINE_VOICE;
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
  [/^battle_score\s*==\s*(\d+)$/u, "クイズの正解がそこまでに$1問のとき"],
  [/^battle_score\s*>=\s*(\d+)$/u, "クイズの正解がそこまでに$1問以上のとき"],
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

/** A voice without its first part, as its IDs name it (gt_kamla → kamla, gt_delhi_scam_suit_man → delhi_scam_suit_man). */
export const shortVoice = (voice: string) => voice.includes("_") ? voice.slice(voice.indexOf("_") + 1) : voice;
/** The part of a line's ID before its number: the knot for the heroine, `<knot>_<shortVoice>` for another voice. */
const idBase = (line: { knot: string; voice: string }) => line.voice === HEROINE_VOICE ? line.knot : `${line.knot}_${shortVoice(line.voice)}`;

/** A spoken line before its ID is settled: its place among its knot's lines of its voice and its `# voice:`, if any. */
type Draft = Omit<VoiceLine, "id"> & { number: number; voiceId?: string };

const TARGET = /(?:->|<-)\s*([A-Za-z_][A-Za-z0-9_]*)/gu;

/**
 * Each knot of a source ("" for the lines before the first) with its `# person:`s and the scene it belongs to: itself
 * when it has a `# scene:`, else the first scene of the file (then the file's head) that diverts to it, through knots
 * without a scene (a battle's `-> <knot> ->` tunnel speaks with the battle's opponent).
 */
function knotScenes(source: string): Map<string, { persons: string[]; scene?: string }> {
  const knots = new Map<string, { scene: boolean; persons: string[]; targets: string[] }>([["", { scene: false, persons: [], targets: [] }]]);
  let current = knots.get("")!;
  for (const raw of withoutComments(source).split("\n")) {
    const line = raw.trim();
    const head = KNOT_LINE.exec(line);
    if (head) {
      current = { scene: false, persons: [], targets: [] };
      knots.set(head[1], current);
      continue;
    }
    if (line.startsWith("#")) for (const tag of tagsOf(line)) {
      if (tag.key === "scene") current.scene = true;
      else if (tag.key === "person") current.persons.push(tag.value);
    }
    else for (const match of line.matchAll(TARGET)) current.targets.push(match[1]);
  }
  const owners = new Map<string, string>();
  for (const root of [...[...knots].filter(([, knot]) => knot.scene).map(([name]) => name), ""]) {
    const queue = [root];
    while (queue.length) {
      const name = queue.shift()!;
      if (owners.has(name)) continue;
      owners.set(name, root);
      queue.push(...knots.get(name)!.targets.filter((target) => knots.has(target) && !knots.get(target)!.scene));
    }
  }
  return new Map([...knots].map(([name, knot]) => [name, { persons: knot.persons, scene: owners.get(name) }]));
}

/** The spoken lines of one Ink file, in written order, and the lines left out per voice. */
function readStory(storyId: string, source: string, input: VoiceScriptInput): { drafts: Draft[]; skipped: Map<string, number> } {
  const file = `${storyId}.ink`;
  // The `# voice:` of each line of text (line-tag-text.ts: on its line, or on a line of its own before it).
  const voiced = new Map<number, string>();
  for (const tag of taggedLines(source, ["voice"]))
    if (tag.textLine !== null && !tag.choice && !voiced.has(tag.textLine - 1)) voiced.set(tag.textLine - 1, tag.value);
  const scenes = knotScenes(source);
  const drafts: Draft[] = [];
  const skipped = new Map<string, number>();
  let section = "";
  let knot = path.posix.basename(storyId);
  let address = storyId;
  let title = input.battles.get(storyId)?.titleJa;
  let person: string | undefined;
  let speaker = "narrator";
  let tags = new Map<string, string>();
  // The line's `# reaction:`s by whom they are for (heroine, enemy).
  let reactions = new Map<string, string>();
  // The open conditionals (their current branch in words; a bare `{` has none) and the line before each.
  const branches: (string | null)[] = [];
  const blockPrev: (PreviousLine | null)[] = [];
  // The choice whose lines these are (its indent and words), and the line before its menu.
  let choice: { indent: number; label: string } | null = null;
  let menuPrev: PreviousLine | null = null;
  let prev: PreviousLine | null = null;
  const counter = new Map<string, number>();
  const speakerName = (id: string) => id === "heroine" ? "ヒロイン" : id === "player" ? "主人公" : id === "narrator" ? "地の文"
    : id === "enemy" ? person || input.battles.get(address)?.enemyNameJa || "相手" : input.people.get(id)?.nameJa ?? id;
  // Who voices a line of `id` here, and the name its plate shows; undefined for an `enemy` no one stands for.
  const whoSpeaks = (id: string): Pick<VoiceLine, "voice" | "speakerJa"> | undefined => {
    if (id === "heroine") return { voice: HEROINE_VOICE, speakerJa: "ヒロイン" };
    if (id !== "enemy") return { voice: input.people.get(id)?.characterId ?? id, speakerJa: input.people.get(id)?.nameJa ?? id };
    const scene = scenes.get(section);
    const battle = (scene?.scene ? input.battles.get(`${storyId}.${scene.scene}`) : undefined) ?? input.battles.get(`${storyId}.${section}`)
      ?? input.battles.get(storyId);
    if (battle) return { voice: battle.characterId ?? battle.id, speakerJa: battle.enemyNameJa ?? "相手" };
    const persons = scene?.persons.length ? scene.persons : scenes.get(scene?.scene ?? "")?.persons ?? [];
    const named = persons.find((item) => input.people.get(item)?.characterId) ?? persons[0];
    return named === undefined ? undefined
      : { voice: input.people.get(named)?.characterId ?? named, speakerJa: input.people.get(named)?.nameJa ?? named };
  };

  withoutComments(source).split("\n").forEach((raw, index) => {
    const line = raw.trim();
    const indent = raw.length - raw.trimStart().length;
    if (!line || /^(?:INCLUDE|VAR|CONST|EXTERNAL)\s/u.test(line) || line.startsWith("~")) return;
    const head = KNOT_LINE.exec(line);
    if (head) {
      knot = head[1];
      section = knot;
      address = `${storyId}.${knot}`;
      title = input.battles.get(address)?.titleJa;
      person = undefined;
      speaker = "narrator";
      tags = new Map();
      reactions = new Map();
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
        else if (tag.key === "person") person = input.people.get(tag.value)?.nameJa ?? tag.value;
        else {
          tags.set(tag.key, tag.value);
          if (tag.key === "reaction") reactions.set(tag.value.split(",")[0].trim(), tag.value);
        }
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
      reactions = new Map();
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
    // A gather, labelled or not (`-`, `- -> END`, `- (stop)`: a reasoning quiz's loop), nested too (`- -`), is no line.
    if (/^(?:-\s*)+(?:\(\w+\)\s*)?(->.*)?$/u.test(line)) {
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
      else {
        tags.set(tag.key, tag.value);
        if (tag.key === "reaction") reactions.set(tag.value.split(",")[0].trim(), tag.value);
      }
    }
    if (choice && indent <= choice.indent) choice = null;
    if (speaker !== "narrator" && speaker !== "player") {
      const who = whoSpeaks(speaker);
      if (tags.has("phone") || tags.has("letter")) skipped.set(who?.voice ?? speaker, (skipped.get(who?.voice ?? speaker) ?? 0) + 1);
      else if (!who) throw new Error(`「# speaker: enemy」の声の主が分かりません：${input.storiesPath}${file} の${index + 1}行目（knot ${knot}）。` +
        "バトルの場面ではなく、場面の頭に # person: もありません。場面の頭に # person: <人物ID> を書いてください" +
        `（Cannot tell who voices # speaker: enemy at ${file}:${index + 1}: not a battle's scene and no # person:）。`);
      else {
        const key = `${who.voice}\0${knot}`;
        const number = (counter.get(key) ?? 0) + 1;
        counter.set(key, number);
        title ||= `${SCENE_KINDS.find(([part]) => knot.includes(part))?.[1] ?? "場面"}（${knot}）`;
        drafts.push({
          line: index, number, ...(voiced.has(index) ? { voiceId: voiced.get(index) } : {}), text: showNames(text),
          emo: emotionWords(tags, reactions, speaker), staging: stagingWords(tags, speaker), context: [...(choice ? [choice.label] : []), ...branches.filter((item) => item !== null)],
          prev, flags: flagsOf(text), file, knot, title, speaker, ...who,
        });
      }
    }
    prev = [speakerName(speaker), showNames(text)];
    tags = new Map();
    reactions = new Map();
  });
  return { drafts, skipped };
}

/**
 * A line's emotion in words: its `# reaction:`'s face and mark (`<who>,<face>[,<mark>]`, or `<who>,<mark>`), else its
 * `# emotion:`. The heroine's lines read the line's reaction whoever it is for (as since 2026-11-12); another voice's
 * only the reaction on the one opposite (`enemy`) when it is theirs, since a reaction on the heroine is her face.
 */
function emotionWords(tags: ReadonlyMap<string, string>, reactions: ReadonlyMap<string, string>, speaker: string): string[] {
  const reaction = speaker === "heroine" ? tags.get("reaction") : speaker === "enemy" ? reactions.get("enemy") : undefined;
  if (reaction === undefined) {
    const emotion = tags.get("emotion");
    return emotion === undefined ? [] : [EMOTIONS[emotion] ?? emotion];
  }
  const [, first, second] = reaction.split(",").map((part) => part.trim());
  if (second === undefined && first !== undefined && !Object.hasOwn(EMOTIONS, first) && Object.hasOwn(MARKS, first)) return [MARKS[first]];
  return [...(first === undefined ? [] : [EMOTIONS[first] ?? first]), ...(second === undefined ? [] : [MARKS[second] ?? second])];
}

/** A line's staging in words; where the heroine stands (`# stand:`) only on her own lines. */
function stagingWords(tags: ReadonlyMap<string, string>, speaker: string): string[] {
  const stand = speaker === "heroine" ? tags.get("stand") : undefined;
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

/** What the matching reads of a line (a line without a voice is the heroine's: voiceOf). */
type Matchable = Pick<VoiceLine, "id" | "text" | "file" | "knot"> & { voice?: string };

/**
 * The same lines of an earlier list (a script sent) and a later one (the lines now), as index pairs: the same ID and
 * text, else the same text in the same knot, else in the same city (each in written order, one line for one line), and
 * always of the same voice (one person's line is never another's). voice:script keeps IDs by it and voice:changes
 * compares by it.
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
  pass((line) => `${voiceOf(line)}\0${line.id}\0${line.text}`);
  pass((line) => `${voiceOf(line)}\0${line.knot}\0${line.text}`);
  pass((line) => `${voiceOf(line)}\0${cityOfFile(line.file, cityIds)}\0${line.text}`);
  return pairs;
}

const numbered = (base: string, number: number) => `${base}_${String(number).padStart(3, "0")}`;

/**
 * The IDs: a `# voice:`'s; else the ID the line's text was last sent with for its voice (an ID no recording keeps); else
 * the next number of its knot and voice (idBase) after the highest that any script sent, recording, voice file or line
 * has used. Another voice's IDs never count for the heroine's numbers: `<knot>_<NNN>` is the knot's base and a number.
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
  const pairs = matchSameLines(sent, waiting.map((index) => ({ ...drafts[index], id: numbered(idBase(drafts[index]), drafts[index].number) })),
    input.cities.map((city) => city.id));
  for (const [sentIndex, waitingIndex] of pairs) ids[waiting[waitingIndex]] = sent[sentIndex].id;
  const used = new Set([...lastSent.keys(), ...recorded, ...input.voiceFiles, ...ids.filter((id) => id !== undefined)]);
  const highest = new Map<string, number>();
  return drafts.map((draft, index) => {
    const known = ids[index];
    if (known !== undefined) return known;
    const base = idBase(draft);
    const key = `${draft.voice}\0${base}`;
    const prefix = `${base}_`;
    let number = highest.get(key) ?? Math.max(0, ...[...used].map((id) =>
      id.startsWith(prefix) && /^\d+$/u.test(id.slice(prefix.length)) ? Number(id.slice(prefix.length)) : 0));
    do number++; while (used.has(numbered(base, number)));
    highest.set(key, number);
    used.add(numbered(base, number));
    return numbered(base, number);
  });
}

/** The voice script of a journey: its spoken lines city by city (the journey's order), place files first, then by file name. */
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
  const skipped = new Map<string, number>();
  for (const [voice, count] of read.flatMap((item) => [...item.skipped])) skipped.set(voice, (skipped.get(voice) ?? 0) + count);
  return {
    journeyId: input.journeyId, nameJa: input.nameJa, cities: input.cities, storiesPath: input.storiesPath,
    // In the key order of the 2026-11-12 entries, then who speaks (2026-11-17).
    lines: drafts.map(({ line, text, emo, staging, context, prev, flags, file, knot, title, speaker, voice, speakerJa }, index) =>
      ({ line, id: ids[index], text, emo, staging, context, prev, flags, file, knot, title, speaker, voice, speakerJa })),
    tagged: new Set(drafts.flatMap((draft) => draft.voiceId === undefined ? [] : [draft.voiceId])),
    skipped,
  };
}

/** The heroine's lines of a script (heroine_lines.txt). */
export const heroineLines = (script: Pick<VoiceScript, "lines">) => script.lines.filter((line) => line.voice === HEROINE_VOICE);

/**
 * A voice's own name: what the plate shows on its lines in the character's own name (`# speaker: <its ID>`), else on its
 * lines as the one opposite (`enemy`: a battle's opponent, a scene's person), else on its first line (a person's other
 * ID, such as 男 before the name is told); the voice itself when it has no line.
 */
export function voiceNameJa(lines: readonly Pick<VoiceLine, "voice" | "speaker" | "speakerJa">[], voice: string): string {
  const own = lines.filter((line) => line.voice === voice);
  return (own.find((line) => line.speaker === voice) ?? own.find((line) => line.speaker === "enemy") ?? own[0])?.speakerJa ?? voice;
}

/** The readable script of the heroine's lines (the 2026-11-12 layout): a header, then city by city, scene by scene, one box per line. */
export function formatVoiceScript(script: VoiceScript, date: string): string {
  const heroine = heroineLines(script);
  const count = (flag: string) => heroine.filter((line) => line.flags.includes(flag)).length;
  const out = [
    `${script.nameJa}　ヒロインの台詞（ボイス収録用）`, "",
    `作成：${date}　台本：${script.storiesPath} の現在の版から抜き出し`,
    `収録する台詞：${heroine.length}行（1行＝1回の収録＝1ファイル）。メッセージ（携帯の吹き出し）とメモ・手紙の行 ${script.skipped.get(HEROINE_VOICE) ?? 0}行は、声を付けないので入れていない。`,
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
    const lines = heroine.filter((line) => cityOfFile(line.file, cityIds) === city.id);
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
const peopleSchema = z.object({ people: z.array(z.object({ id: z.string(), nameJa: z.string(), characterId: z.string().optional() })).default([]) });
const battlesSchema = z.object({ battles: z.array(z.object({ id: z.string(), storyId: z.string(), titleJa: z.string().optional(),
  enemyNameJa: z.string().optional() })) });
const charactersSchema = z.object({ battleCharacters: z.record(z.string(), z.string()).optional() });
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
  const battleCharacters = sources.catalogs["presentation/characters.json"]
    ? parseCatalog(sources, charactersSchema, "presentation/characters.json").battleCharacters ?? {} : {};
  return {
    journeyId, nameJa, cities, stories,
    storiesPath: `${displayPath(sources.root, path.join(layer.directory, "stories"))}/`,
    people: new Map(people.map(({ id, nameJa: name, characterId }) => [id, { nameJa: name, ...(characterId ? { characterId } : {}) }])),
    battles: new Map(battles.map(({ id, storyId, titleJa, enemyNameJa }) => [storyId, { id, ...(titleJa !== undefined ? { titleJa } : {}),
      ...(enemyNameJa !== undefined ? { enemyNameJa } : {}), ...(Object.hasOwn(battleCharacters, id) ? { characterId: battleCharacters[id] } : {}) }])),
    scripts: history.scripts,
    recorded: new Set(history.recorded.keys()),
    voiceFiles: new Set(voiceFilesOf(sources).filter((voice) => voice.journeyId === journeyId).map((voice) => voice.id)),
  };
}
