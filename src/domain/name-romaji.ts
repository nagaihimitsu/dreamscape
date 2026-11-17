// The player's name in Latin letters, for writing drawn in the scene (the Jaipur mehndi: 2026-11-16, the user's decision,
// 案A: no Japanese letters in the pattern, the name in Latin letters). Kana in Hepburn without long-vowel marks
// (ヘボン式・長音は書かない: the long o and u written once, ー not written), ん always n (Junpei, Kenichi: no m before
// b, m, p and no apostrophe), っ before ch as t; a name already in Latin letters is kept (only an all-lower or all-upper
// word is put in title case). Any other name (kanji, other scripts, digits) has no Latin form of its own: the reading
// captured while the player typed it (2026-11-17, the user's decision: no field for it, 「入力欄は隠す」; the title's and
// the settings' name forms capture it as jquery.autoKana does, src/features/journey/useNameReading.ts) gives one, but
// only when it plausibly fits the name (readingFits); else the scene writes no letters of the name.
// Known limits: こうめ reads as Kome (お+う taken as a long o). A name pasted or filled in by the browser, or picked from
// a phone's predictive conversion that skips kana, gives no reading or a short one (太一 picked after typing たい reads
// Tai; a reading too short for the name's kanji, or none, gives no Latin form). The capture follows a name typed on at
// its end: a converted character (a kanji, katakana) deleted, or anything typed or deleted before one, leaves the reading
// unknown (none is kept: 太一 with its 一 deleted and typed again keeps none) until the field is emptied or its whole name
// typed over, which starts the reading again from the kana typed from then on (nameFieldEdit). Pure, no imports.

const BASE: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "i", ゑ: "e", を: "o", ゔ: "vu",
  // Small kana on their own (no syllable to join): their vowel.
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o", ゃ: "ya", ゅ: "yu", ょ: "yo", ゎ: "wa", ゕ: "ka", ゖ: "ke",
};
const YOON: Record<string, string> = { ゃ: "a", ゅ: "u", ょ: "o" };
const I_ROW: Record<string, string> = {
  き: "ky", ぎ: "gy", し: "sh", じ: "j", ち: "ch", ぢ: "j", に: "ny", ひ: "hy", び: "by", ぴ: "py", み: "my", り: "ry", ゔ: "vy",
};
// Extended (katakana loanword) pairs, Hepburn as in Kenkyusha / ANSI Z39.11.
const PAIRS: Record<string, string> = {
  しぇ: "she", じぇ: "je", ちぇ: "che", いぇ: "ye",
  うぃ: "wi", うぇ: "we", うぉ: "wo",
  ゔぁ: "va", ゔぃ: "vi", ゔぇ: "ve", ゔぉ: "vo",
  ふぁ: "fa", ふぃ: "fi", ふぇ: "fe", ふぉ: "fo", ふゅ: "fyu",
  てぃ: "ti", でぃ: "di", てゅ: "tyu", でゅ: "dyu", とぅ: "tu", どぅ: "du",
  つぁ: "tsa", つぃ: "tsi", つぇ: "tse", つぉ: "tso",
  くぁ: "kwa", くぃ: "kwi", くぇ: "kwe", くぉ: "kwo", ぐぁ: "gwa",
  すぃ: "si", ずぃ: "zi",
};
// ヷヸヹヺ have no hiragana: read as ゔぁ ゔぃ ゔぇ ゔぉ.
const KATA_V: Record<string, string> = { ヷ: "ゔぁ", ヸ: "ゔぃ", ヹ: "ゔぇ", ヺ: "ゔぉ", ヽ: "ゝ", ヾ: "ゞ" };

const toHiragana = (text: string) =>
  [...text].map((char) => {
    if (KATA_V[char]) return KATA_V[char];
    const code = char.codePointAt(0)!;
    return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : char;
  }).join("");

const KANA = /^[ぁ-ゖゝゞー]+$/u; // hiragana (after toHiragana), ゝゞ, ー
const LATIN = /^[\p{Script=Latin}\p{M}'’.\- ]+$/u;

/** One word of kana (hiragana, ゝゞ, ー) in Hepburn, lower case; null if a character is not kana. */
function kanaWord(word: string): string | null {
  // ゝ repeats the kana before it, ゞ voices it (みすゞ = みすず).
  let chars = "";
  for (const char of word) {
    const prev = chars.at(-1) ?? "";
    if (char === "ゝ") chars += prev;
    else if (char === "ゞ") chars += prev ? (prev + "\u3099").normalize("NFC") : "";
    else chars += char;
  }
  if (!KANA.test(chars)) return null;
  // Syllables: a kana with the small kana that joins it.
  const syllables: string[] = [];
  const list = [...chars];
  for (let index = 0; index < list.length; index += 1) {
    const char = list[index], next = list[index + 1] ?? "";
    if (char === "っ" || char === "ん" || char === "ー") { syllables.push(char); continue; }
    const pair = char + next;
    if (PAIRS[pair]) { syllables.push(PAIRS[pair]); index += 1; continue; }
    if (I_ROW[char] && YOON[next]) { syllables.push(I_ROW[char] + YOON[next]); index += 1; continue; }
    syllables.push(BASE[char] ?? "");
  }
  let out = "";
  let lastVowel = "";
  for (let index = 0; index < syllables.length; index += 1) {
    const syllable = syllables[index];
    if (syllable === "ー") continue; // long mark: not written
    if (syllable === "ん") { out += "n"; lastVowel = ""; continue; }
    if (syllable === "っ") {
      const next = syllables.slice(index + 1).find((s) => s !== "っ") ?? "";
      if (next.startsWith("ch")) out += "t";
      else if (/^[bcdfghjkmprstvwz]/u.test(next)) out += next[0];
      lastVowel = "";
      continue;
    }
    // Long o and u (おう・おお・うう, also after ょ ゅ) are written once.
    if ((syllable === "u" && (lastVowel === "o" || lastVowel === "u")) || (syllable === "o" && lastVowel === "o")) continue;
    out += syllable;
    lastVowel = syllable.at(-1) ?? "";
  }
  return out || null;
}

const capitalise = (word: string) => word.replace(/(^|[ \-'’])(\p{Ll})/gu, (_m, mark: string, letter: string) => mark + letter.toLocaleUpperCase("en"));

/** The name in Latin letters for the writing: kana in Hepburn, Latin as typed (case tidied); null for anything else. */
export function latinName(typed: string): string | null {
  const text = typed.normalize("NFKC").replace(/[・･]/gu, " ").replace(/[=゠‐]/gu, "-").replace(/\s+/gu, " ").trim();
  if (!text) return null;
  if (LATIN.test(text)) {
    if (!/\p{L}/u.test(text)) return null;
    return text.split(" ").map((word) => {
      const letters = word.replace(/[^\p{L}]/gu, "");
      const lower = letters === letters.toLocaleLowerCase("en");
      const upper = letters === letters.toLocaleUpperCase("en") && letters.length > 2;
      return lower || upper ? capitalise(word.toLocaleLowerCase("en")) : word;
    }).join(" ");
  }
  // Words split at spaces (and 中黒) and joined by hyphens (ジャン＝ポール): each part in Hepburn, capitalised.
  const parts = toHiragana(text).split(/([ -])/u);
  const latin = parts.map((part) => (part === " " || part === "-" ? part : kanaWord(part)));
  if (latin.some((part) => part === null)) return null;
  return capitalise((latin as string[]).join("").replace(/(^|[ ])-+|-+(?=$|[ ])/gu, "$1"));
}

/** The most kana a character of a name other than kana (a kanji, 々) may take in its reading (志 こころざし). */
export const MAX_KANA_PER_CHARACTER = 5;

const READING = /^[ぁ-ゖゝゞー ]+$/u; // hiragana (after toHiragana), ゝゞ, ー and single spaces
/** A character of a name read by any 1 to MAX_KANA_PER_CHARACTER kana: a kanji (々 and 〆 too), or ヶ ヵ (一ヶ谷). */
const READ_AS_KANA = /^[\p{Script=Han}ゖゕ]$/u;

/**
 * A reading as kept: kana only (half-width and katakana as hiragana, ー, spaces between words), in hiragana with single
 * spaces; null when it is empty or holds anything else.
 */
export function kanaReading(text: string): string | null {
  const reading = toHiragana(text.normalize("NFKC")).replace(/\s+/gu, " ").trim();
  return READING.test(reading) && /[ぁ-ゖ]/u.test(reading) ? reading : null;
}

/**
 * Whether `reading` plausibly reads `name` (spaces aside): the reading is kana only; each kana of the name is read as
 * itself, at its place in the reading; each other character (a kanji, 々) takes 1 to MAX_KANA_PER_CHARACTER kana. A name
 * with any other character (Latin letters, digits, other scripts) never fits.
 */
export function readingFits(reading: string, name: string): boolean {
  const kana = kanaReading(reading);
  if (kana === null) return false;
  const read = [...kana.replace(/ /gu, "")];
  const parts = [...toHiragana(name.normalize("NFKC")).replace(/\s+/gu, "")];
  if (!parts.length || parts.some((part) => !READ_AS_KANA.test(part) && !KANA.test(part))) return false;
  // fits(i, j): parts[i..] read by read[j..]; each (i, j) tried once.
  const tried = new Set<number>();
  const fits = (i: number, j: number): boolean => {
    if (i === parts.length) return j === read.length;
    if (tried.has(i * (read.length + 1) + j)) return false;
    tried.add(i * (read.length + 1) + j);
    if (!READ_AS_KANA.test(parts[i])) return read[j] === parts[i] && fits(i + 1, j + 1);
    for (let taken = 1; taken <= MAX_KANA_PER_CHARACTER && j + taken <= read.length; taken += 1)
      if (fits(i + 1, j + taken)) return true;
    return false;
  };
  return fits(0, 0);
}

/**
 * The Latin name a scene draws for the player: their name in Latin letters (latinName), else its reading in Latin
 * letters when the reading fits the name (readingFits), else null (no Latin form: the scene draws no letters of the name).
 */
export function playerLatinName(reading: string | undefined, playerName: string): string | null {
  return latinName(playerName) ?? (reading !== undefined && readingFits(reading, playerName) ? latinName(reading) : null);
}

/** The name a name form's field held when it appeared, and that name's saved reading (none: unknown, or not needed). */
export type ReadingStart = Readonly<{ name: string; reading?: string }>;

/** The reading of the name a field started with, as far as it is known: its saved reading, else the name itself when it is kana, else "". */
export function startReading(start: ReadingStart): string {
  return start.reading ?? kanaReading(start.name) ?? "";
}

/**
 * The reading to save with the name a form gives (undefined: none). `captured` is the field's furigana as
 * vanilla-autokana writes it: the reading the field started with (startReading), then the kana typed into it.
 * - A name that has a Latin form of its own (kana, Latin letters) needs no reading.
 * - The name kept as it started, maybe added to: the whole capture, when the reading it started with is known.
 * - The name replaced (its first character is no longer the one it started with): only what was typed.
 * - The name changed inside: the reading of the part kept is not known, so none.
 * The reading is kept only when it fits the name (readingFits).
 */
export function readingToSave(name: string, captured: string, start: ReadingStart): string | undefined {
  const typed = name.trim();
  if (!typed || latinName(typed) !== null) return undefined;
  const base = startReading(start);
  const reading = typed.startsWith(start.name) ? (start.name && !base ? null : captured)
    : [...typed][0] !== [...start.name][0] && captured.startsWith(base) ? captured.slice(base.length)
    : null;
  const kana = reading === null ? null : kanaReading(reading);
  return kana !== null && readingFits(kana, typed) ? kana : undefined;
}

/** What an edit of a name field does to the reading captured from the kana typed into it (nameFieldEdit). */
export type NameFieldEdit = "restart" | "lost" | "kept";
/** The selection of a name field an edit replaces (UTF-16 offsets into its value before the edit, as the field reports them). */
export type FieldSelection = Readonly<{ start: number; end: number }>;

/** The kana vanilla-autokana reads as typed (its own pattern: hiragana ぁ to ん, ー, spaces); any other character was converted. */
const TYPED_KANA = /^[ 　ぁ-んー]$/u;
const hasConverted = (chars: readonly string[]) => chars.some((char) => !TYPED_KANA.test(char));

/**
 * What an edit of a name field (its value `before` to `after`) does to the reading captured while it is typed: the
 * capture (vanilla-autokana) adds up the kana typed and takes a conversion's kana as the reading of what it gave, so it
 * follows a name typed on at its end, and cannot give back the kana of a converted character taken out.
 * - "restart": the field emptied, or its whole name replaced (a selection of all of it typed over; for an edit whose
 *   selection the field did not report, as a browser's autofill, a new name that shares no first character with the old):
 *   the reading starts again from nothing, from the kana typed from now on.
 * - "lost": a converted character (a kanji, katakana: anything but the kana typed) taken out, or anything typed or taken
 *   out before one (the kana kept no longer line up with the name); or kana taken out two or more at once, or one typed
 *   over with anything but kana (the capture takes either for a conversion): the reading is not known until the field is
 *   emptied or its whole name replaced.
 * - "kept": anything else (typed at the end; one of the kana typed and not yet converted taken out or typed over with
 *   kana, which the capture follows).
 * `selection` is the field's selection as the edit began (before input, composition start). An IME composition is one
 * edit: its first change, with the selection it replaced; its later changes (its kana turning into kanji as it commits)
 * replace its own text, not the name's, and are not passed here.
 */
export function nameFieldEdit(before: string, after: string, selection?: FieldSelection): NameFieldEdit {
  if (!after) return "restart";
  if (!before) return "kept";
  const whole = selection ? selection.start <= 0 && selection.end >= before.length : before[0] !== after[0];
  if (whole) return "restart";
  const old = [...before];
  const now = [...after];
  const offset = (units: number) => [...before.slice(0, units)].length;
  // Where the edit begins: after the start both values share, and never after the selection's start (a 一 typed between
  // 太 and 一 begins there, though 太一一 shares 太一 with 太一).
  let at = 0;
  while (at < old.length && at < now.length && old[at] === now[at]) at += 1;
  if (selection) at = Math.min(at, offset(selection.start));
  // Where what it took out ends: before the end both values share, and never before the selection's end.
  let tail = 0;
  while (tail < old.length - at && tail < now.length - at && old[old.length - 1 - tail] === now[now.length - 1 - tail]) tail += 1;
  const end = Math.max(old.length - tail, selection ? Math.min(old.length, offset(selection.end)) : 0);
  const taken = old.slice(at, end);
  const put = now.slice(at, now.length - (old.length - end));
  // A converted character taken out or kept after the edit loses the reading. So do kana taken out two or more at once,
  // or one typed over with anything but kana (an IME's first letter of romaji): the capture takes either for a
  // conversion, and keeps the kana taken out as the reading of what is left.
  return hasConverted(old.slice(at)) || taken.length > 1 || (taken.length === 1 && hasConverted(put)) ? "lost" : "kept";
}
