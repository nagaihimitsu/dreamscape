// The player's name in Latin letters, for writing drawn in the scene (the Jaipur mehndi: 2026-11-16, the user's decision
// 「案Aで、名前の文字のフォントを筆記体っぽいやつにして」: no Japanese letters in the pattern). Kana in Hepburn as a name
// is written on a passport (long o and u once, ー not written, no apostrophe after ん, っ before ch as t); a name already in
// Latin letters is kept (only an all-lower or all-upper word is put in title case); anything else (kanji, other scripts,
// digits) is null: the player's own spelling (the title's and the settings' 「ローマ字のつづり」) is then the only way.
// Known limit: こうめ reads as Kome (a long o); the spelling field is the fix. Pure, no imports.

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

const JAPANESE_LETTER = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

/**
 * Whether a typed 「ローマ字のつづり」 can be kept: Latin letters only (with spaces, `-`, `'` and `.`; full-width letters
 * count), so latinName makes it a name and no Japanese letter can reach a scene's writing through it.
 */
export function isLatinSpelling(typed: string): boolean {
  return !JAPANESE_LETTER.test(typed) && latinName(typed) !== null;
}

/** Whether a name form may start or save with this 「ローマ字のつづり」: blank (none given) or isLatinSpelling. */
export function spellingAllowed(typed: string): boolean {
  return !typed.trim() || isLatinSpelling(typed);
}

/**
 * The Latin name a scene draws for the player: their own spelling if they gave one, else their name in Latin letters,
 * else null (no Latin form: the scene draws no letters of the name).
 */
export function playerLatinName(spelling: string | undefined, playerName: string): string | null {
  return (spelling === undefined ? null : latinName(spelling)) ?? latinName(playerName);
}
