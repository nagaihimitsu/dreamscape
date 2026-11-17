import { z } from "zod";
import { cityOfFile, HEROINE_VOICE, voiceNameJa, type VoiceLine, type VoiceScript } from "./voice-script";

// The cast of a journey's voices other than the heroine's (2026-11-17 user request): authoring/journeys/<journeyId>/
// voice/cast.json (optional; the game never reads it) says, for each voice of voice:script (a character), who they are
// (ten attributes the author decides from), which model of which engine voices them (an AivisHub model for
// AivisSpeech, or a VOICEVOX character; never one model for two voices of one journey: 2026-11-17 user decision), its
// style and settings, and why. voice:script then writes one request per engine (Aibishub.txt, voicevox.txt: the two
// are made by different people), with several characters in each: who they are, their model, and their lines that need
// a recording. Pure (voice-records.ts reads the file, voice-script-cli.ts writes the requests).

export const VOICE_ENGINES = ["aivishub", "voicevox"] as const;
export type VoiceEngine = (typeof VOICE_ENGINES)[number];

/** The settings a cast may give a voice (the engines' own names, as their audio query calls them). */
export const SETTING_KEYS = ["speedScale", "pitchScale", "intonationScale", "volumeScale", "tempoDynamicsScale", "pauseLengthScale",
  "prePhonemeLength", "postPhonemeLength"] as const;
type SettingKey = (typeof SETTING_KEYS)[number];

/** VOICEVOX's labels of the settings it has (as its editor shows them; correct them here). */
export const VOICEVOX_SETTING_LABELS: Partial<Record<SettingKey, string>> = {
  speedScale: "話速", pitchScale: "音高", intonationScale: "抑揚", volumeScale: "音量", pauseLengthScale: "間の長さ",
  prePhonemeLength: "開始無音", postPhonemeLength: "終了無音",
};
/** AivisSpeech's labels of the settings it has (as its editor shows them; correct them here). */
export const AIVISSPEECH_SETTING_LABELS: Partial<Record<SettingKey, string>> = {
  speedScale: "話速", pitchScale: "音高", intonationScale: "抑揚", volumeScale: "音量", tempoDynamicsScale: "テンポの緩急",
  prePhonemeLength: "開始無音", postPhonemeLength: "終了無音",
};

/** Each engine: its name in the requests, its request file, and its settings' labels. */
export const ENGINES: Readonly<Record<VoiceEngine, { nameJa: string; file: string; settings: Partial<Record<SettingKey, string>> }>> = {
  aivishub: { nameJa: "AivisSpeech（AivisHub のモデル）", file: "Aibishub.txt", settings: AIVISSPEECH_SETTING_LABELS },
  voicevox: { nameJa: "VOICEVOX", file: "voicevox.txt", settings: VOICEVOX_SETTING_LABELS },
};

/** The ten attributes of a character, in the order the requests print them, with their labels. */
export const PROFILE_LABELS = [
  ["age", "年齢"], ["gender", "性別"], ["build", "体型・身体的特徴"], ["looks", "顔立ち・外見"], ["personality", "性格"],
  ["pitch", "声の高さ"], ["quality", "声質・質感"], ["speed", "話す速度"], ["delivery", "話し方・抑揚"], ["origin", "出身地・言語・アクセント"],
] as const;

const text = z.string().trim().min(1, "空です（文を書きます）");
const engine = z.enum(VOICE_ENGINES, { error: (issue) => `知らないエンジンです：${String(issue.input)}（aivishub か voicevox を書きます）` });
const profileSchema = z.object(Object.fromEntries(PROFILE_LABELS.map(([key]) => [key, text])) as Record<(typeof PROFILE_LABELS)[number][0], typeof text>).strict();
const castVoiceSchema = z.object({
  voice: text,
  nameJa: text,
  profile: profileSchema,
  engine,
  model: z.object({
    /** AivisHub: the model's aivm_model_uuid. VOICEVOX: the character's page name (such as aoyama_ryusei). */
    id: text, nameJa: text, speaker: text, url: z.url(), termsUrl: z.url(), license: text, creditJa: text,
  }).strict(),
  styles: z.object({ default: text, byEmotion: z.record(z.string(), text).optional() }).strict(),
  settings: z.object(Object.fromEntries(SETTING_KEYS.map((key) => [key, z.number().optional()])) as Record<SettingKey, z.ZodOptional<z.ZodNumber>>).strict(),
  reasonJa: text,
  noteJa: z.string().optional(),
}).strict();

export const voiceCastSchema = z.object({
  schemaVersion: z.literal(1),
  journeyId: text,
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, "YYYY-MM-DD で書きます"),
  voices: z.array(castVoiceSchema),
  /** Knot → the scene's situation for the voice makers (2-3 sentences). */
  scenes: z.record(z.string(), text).optional(),
  /** Line ID → the text to type into the engine (when it differs), its style, a note. */
  lines: z.record(z.string(), z.object({ input: text.optional(), style: text.optional(), noteJa: text.optional() }).strict()).optional(),
  /** Words to register once in the engine's user dictionary (reading in katakana; accent: the mora where the pitch falls, 0 for none). */
  dictionary: z.array(z.object({
    word: text,
    reading: z.string().regex(/^[ァ-ヺー]+$/u, "カタカナだけで書きます"),
    accent: z.number().int().min(0).optional(),
    noteJa: z.string().optional(),
    engines: z.array(engine).optional(),
  }).strict()).optional(),
}).strict();

export type VoiceCast = z.infer<typeof voiceCastSchema>;
export type CastVoice = VoiceCast["voices"][number];

/**
 * What is wrong with a cast for a journey's lines: errors (the requests are not written) and warnings. Errors: another
 * journey's cast, the heroine cast here (her voice is ordered on its own), a voice cast twice, one model (engine and
 * model ID) for two voices, a setting the engine does not have. Warnings: a voice with no lines, a scene or line note for
 * a knot or ID that has no line of a cast voice.
 */
export function checkVoiceCast(cast: VoiceCast, journeyId: string, lines: readonly Pick<VoiceLine, "id" | "voice" | "knot">[]):
{ errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (cast.journeyId !== journeyId) errors.push(`ほかの旅行編の配役です：journeyId が ${cast.journeyId} です（${journeyId} を書きます）`);
  const seen = new Set<string>();
  const models = new Map<string, string>();
  for (const voice of cast.voices) {
    if (voice.voice === HEROINE_VOICE) errors.push("ヒロインは cast.json に書きません（ヒロインの声は、ヒロインの台本で別に頼みます）");
    if (seen.has(voice.voice)) errors.push(`同じ声を2回書いています：${voice.voice}`);
    seen.add(voice.voice);
    const model = `${voice.engine}\0${voice.model.id}`;
    const other = models.get(model);
    if (other !== undefined && other !== voice.voice)
      errors.push(`同じ旅行編で同じモデルは使えません：${ENGINES[voice.engine].nameJa} の「${voice.model.nameJa}」（${voice.model.id}）を ${other} と ${voice.voice} が使っています`);
    else models.set(model, voice.voice);
    for (const key of SETTING_KEYS)
      if (voice.settings[key] !== undefined && !ENGINES[voice.engine].settings[key])
        errors.push(`${voice.voice} の設定 ${key} は ${ENGINES[voice.engine].nameJa} にありません（外すか、voice-cast.ts の表に足します）`);
    if (!lines.some((line) => line.voice === voice.voice)) warnings.push(`台詞のない声です：${voice.voice}（${voice.nameJa}）`);
  }
  const castLines = lines.filter((line) => seen.has(line.voice));
  for (const knot of Object.keys(cast.scenes ?? {}))
    if (!castLines.some((line) => line.knot === knot)) warnings.push(`場面の状況の knot に、配役した声の台詞がありません：${knot}`);
  for (const id of Object.keys(cast.lines ?? {}))
    if (!castLines.some((line) => line.id === id)) warnings.push(`行の注意の ID に、配役した声の台詞がありません：${id}`);
  return { errors, warnings };
}

/** A line that needs a recording: one without a `# voice:` (new) or a recorded one whose text is not what its clip says (the clip's text). */
export type NeededLine = { line: VoiceLine; recorded?: string };
/** The flag of a line that says a name the player sets (voice-script.ts flagsOf): no recording can say it. */
const NAME_FLAG = "★名前を含む";

/**
 * The lines of an engine's request, per cast voice of that engine (in the cast's order): the lines to record (no
 * `# voice:`, or a recorded line whose text changed), and those left out because they say a name the player sets.
 */
export function requestLines(script: Pick<VoiceScript, "lines" | "tagged">, cast: VoiceCast, engineId: VoiceEngine,
  recorded: ReadonlyMap<string, { text: string }>): { voice: CastVoice; record: NeededLine[]; named: NeededLine[] }[] {
  return cast.voices.filter((voice) => voice.engine === engineId).map((voice) => {
    const needed = script.lines.filter((line) => line.voice === voice.voice).flatMap((line): NeededLine[] => {
      if (!script.tagged.has(line.id)) return [{ line }];
      const clipText = recorded.get(line.id)?.text;
      return clipText !== undefined && clipText !== line.text ? [{ line, recorded: clipText }] : [];
    });
    return { voice, record: needed.filter(({ line }) => !line.flags.includes(NAME_FLAG)), named: needed.filter(({ line }) => line.flags.includes(NAME_FLAG)) };
  });
}

/** The style a line is read in: the line's own, else its first emotion's (styles.byEmotion), else the voice's default. */
export function lineStyle(voice: CastVoice, line: Pick<VoiceLine, "id" | "emo">, cast: Pick<VoiceCast, "lines">): string {
  const own = cast.lines?.[line.id]?.style;
  if (own !== undefined) return own;
  const byEmotion = voice.styles.byEmotion ?? {};
  const word = line.emo.find((item) => Object.hasOwn(byEmotion, item));
  return word === undefined ? voice.styles.default : byEmotion[word];
}

const RULE = "━".repeat(40);
const BANNER = "═".repeat(60);
const clip = (value: string, length: number) => [...value].length > length ? `${[...value].slice(0, length).join("")}…` : value;

/**
 * The request for one engine (Aibishub.txt, voicevox.txt): a header (what it is, how to read the boxes, the files, the
 * names no voice can say, the dictionary), a table of contents, then each character of that engine (who they are, their
 * model and settings, why) with their lines that need a recording, city by city and scene by scene, one box per line.
 * `recorded` is what each recorded clip says (recorded.json).
 */
export function formatCastRequest(script: VoiceScript, cast: VoiceCast, engineId: VoiceEngine,
  recorded: ReadonlyMap<string, { text: string }>, date: string): string {
  const engineInfo = ENGINES[engineId];
  const cityIds = script.cities.map((city) => city.id);
  const cityName = (line: Pick<VoiceLine, "file">) => script.cities.find((city) => city.id === cityOfFile(line.file, cityIds))?.nameJa ?? "その他";
  const parts = requestLines(script, cast, engineId, recorded);
  const voices = parts.map((part) => part.voice);
  const named = parts.flatMap((part) => part.named);
  const toRecord = (voice: CastVoice) => parts.find((part) => part.voice === voice)!.record;
  const count = parts.reduce((sum, part) => sum + part.record.length, 0);
  const rerecord = parts.flatMap((part) => part.record).filter((item) => item.recorded !== undefined).length;
  const skipped = voices.reduce((sum, voice) => sum + (script.skipped.get(voice.voice) ?? 0), 0);
  const words = (cast.dictionary ?? []).filter((word) => !word.engines || word.engines.includes(engineId));
  const example = voices.flatMap(toRecord)[0]?.line.id ?? "gt_delhi_arrival_kamla_001";
  const settingsLabels = Object.entries(engineInfo.settings).map(([, label]) => label).join("・");

  const out = [
    `${script.nameJa}（${script.journeyId}）　ヒロイン以外の人物の台詞　ボイス収録の依頼（${engineInfo.nameJa}）`, "",
    `作成：${date}　台本：${script.storiesPath} の現在の版から抜き出し　配役：cast.json（確認日 ${cast.checkedAt}）`,
    `この依頼の人物：${voices.length}人　収録する台詞：${count}行（1行＝1回の収録＝1ファイル）${rerecord ? `。うち録り直し ${rerecord}行` : ""}`, "",
    RULE, "1. この依頼について", RULE,
    "・旅の恋愛ゲームの、ヒロイン以外の人物の台詞に声を付けます。ヒロインの声は別に頼んでいるので、この依頼には入っていません。",
    `・この依頼は ${engineInfo.nameJa} で作る人物だけです。ほかのエンジンの人物は、別の依頼書にあります。`,
    "・人物ごとに、使うモデル（声）・スタイル・設定を決めてあります（下の人物ごとの欄）。同じ旅行編の中では、人物ごとに別のモデルです。",
    "・1人の人物は、最初から最後まで同じモデル・同じ設定で録ります。",
    `・メッセージ（携帯の吹き出し）とメモ・手紙の行${skipped ? `（この依頼の人物で ${skipped}行）` : ""}は、声を付けないので入れていません。`, "",
    RULE, "2. 箱の見方", RULE,
    "・[ID] … 収録ファイルの名前にします（例：[ID].wav）。",
    "・読むのは「台詞：」の後ろだけです。「入力する文：」がある行は、その文をエンジンに入れます（読み方を直した文。画面には「台詞」の文が出ます）。",
    "・「前の行」「場面の分かれ道」「表情」「演出」と、場面の見出しの下の状況は、声の調子を決める手がかりです。読みません。",
    "・前の行 … この台詞の直前に画面に出る行（誰が言ったか：言ったこと）。返事の調子を合わせるための手がかり。",
    "・場面の分かれ道 … この台詞が出る条件。同じ場面に、条件ちがいの別の言い方があります。遊ぶ人にはどれか1つしか聞こえないので、それぞれ別に録ります。",
    "・表情 … 台本の表情の札。声の感じの目安。",
    "・演出 … 間・大きな字・静かな場面などの札。間の札がある行は、ゲームが字を出す前に待つので、録音の頭に無音を足しません。",
    "・スタイル … この行だけ、その人物のふだんのスタイルと違うスタイルで読みます。欄がなければ、ふだんのスタイルです。",
    "・注意 … この行だけの気をつけること。",
    "・録り直し … もう届いている声の文が変わった行。同じ ID で録り直します。「前の文」は、前に録った文です。",
    "・英語を含む … 英語の所は英語らしく読みます（入力する文があれば、それに従います）。",
    "・★言い方が分かれる … {A|B} のように、遊ぶたびに変わる所があります。作者に確かめてから録ります。", "",
    RULE, "3. ファイルのそろえ方", RULE,
    `・1行＝1ファイル。ファイル名は [ID] と同じにします（例：${example}.wav）。`,
    "・WAV（48kHz か 44.1kHz、モノラル）。",
    "・頭と終わりの無音は0.1〜0.2秒ほど。",
    `・1人の人物は、全部の行を同じモデル・同じ設定（${settingsLabels}）で録ります。スタイルは、人物の欄と箱の「スタイル」に従います。`,
    "・音量をそろえます（行の間でも、人物の間でも）。", "",
    RULE, "4. 名前は声にできない", RULE,
    "・主人公とヒロインの名前は遊ぶ人が決めるので、録音した声では言えません。名前の入る台詞は、この依頼に入れていません。",
    ...(named.length
      ? [`・入れていない台詞（${named.length}行。作者が名前を言わない文に直してから、次の依頼で頼みます）：`,
        ...named.map(({ line }) => `    [${line.id}]　${line.speakerJa}：${line.text}`)]
      : ["・この依頼の人物の台詞には、名前の入る台詞はありません。"]), "",
    RULE, "5. ユーザー辞書（最初に一度だけ登録する）", RULE,
    ...(words.length
      ? ["・読み間違えやすい語です。録る前に、エンジンのユーザー辞書に登録します。アクセントの数字は、音が下がる直前の音（モーラ）の番号です（0 は下がらない平板）。",
        ...words.map((word) => `    ${word.word}　読み：${word.reading}${word.accent === undefined ? "" : `　アクセント：${word.accent}`}${word.noteJa ? `　（${word.noteJa}）` : ""}`)]
      : ["・登録する語はありません。"]), "",
    RULE, "目次", RULE,
    ...voices.map((voice, index) => `  ${index + 1}. ${voice.nameJa}（${voice.voice}）　モデル：${voice.model.nameJa}（話者：${voice.model.speaker}）　収録 ${toRecord(voice).length}行`),
    "",
  ];

  voices.forEach((voice, index) => {
    const lines = script.lines.filter((line) => line.voice === voice.voice);
    const records = toRecord(voice);
    const scenes = new Map<string, { city: string; titles: Set<string> }>();
    for (const line of lines) {
      const city = cityName(line);
      const entry = scenes.get(city) ?? { city, titles: new Set<string>() };
      entry.titles.add(line.title);
      scenes.set(city, entry);
    }
    const settings = SETTING_KEYS.flatMap((key) => voice.settings[key] === undefined ? [] : [`${engineInfo.settings[key] ?? key}：${voice.settings[key]}`]);
    const byEmotion = Object.entries(voice.styles.byEmotion ?? {});
    out.push(
      BANNER, `■■■ ${index + 1}. ${voice.nameJa}（${voice.voice}）`, BANNER, "",
      `出る場面：${[...scenes.values()].map((entry) => `${entry.city}（${[...entry.titles].join("／")}）`).join("、")}`,
      `台詞：全部で ${lines.length}行。この依頼で録る行 ${records.length}行`, "",
      "人物：",
      ...PROFILE_LABELS.map(([key, label]) => `  ${label}：${voice.profile[key]}`), "",
      "声のモデル：",
      `  エンジン：${engineInfo.nameJa}`,
      `  モデル：${voice.model.nameJa}（${voice.model.id}）`,
      `  話者：${voice.model.speaker}`,
      `  スタイル：ふだんは「${voice.styles.default}」${byEmotion.length ? `。${byEmotion.map(([word, style]) => `表情が「${word}」の行は「${style}」`).join("、")}` : ""}`,
      `  ページ：${voice.model.url}`,
      `  利用規約：${voice.model.termsUrl}`,
      `  ライセンス：${voice.model.license}`,
      `  クレジット表記：${voice.model.creditJa}`, "",
      `設定：${settings.length ? settings.join("　") : "エンジンの初期値のまま"}`,
      `選んだ理由：${voice.reasonJa}`,
      ...(voice.noteJa ? [`メモ：${voice.noteJa}`] : []), "",
    );
    if (!records.length) {
      out.push("この依頼で録る行はありません。", "");
      return;
    }
    let city = "";
    records.forEach(({ line, recorded: before }, at) => {
      const lineCity = cityName(line);
      if (lineCity !== city) {
        city = lineCity;
        out.push(RULE, `■■ ${city}`, RULE);
      }
      const previous = records[at - 1]?.line;
      if (at === 0 || previous.file !== line.file || previous.knot !== line.knot || cityName(previous) !== lineCity) {
        const note = cast.scenes?.[line.knot];
        out.push("", `■ ${line.title}　（${line.file}）`, "-".repeat(40), ...(note ? [`  ${note}`, ""] : []));
      }
      const style = lineStyle(voice, line, cast);
      const extra = cast.lines?.[line.id];
      const flags = [...line.flags, ...(before !== undefined ? ["録り直し"] : [])];
      out.push(
        `[${line.id}]${flags.length ? `　${flags.join(" / ")}` : ""}`,
        ...(line.prev ? [`  前の行（${line.prev[0]}）：${clip(line.prev[1], 70)}`] : []),
        ...(line.context.length ? [`  場面の分かれ道：${line.context.join(" → ")}`] : []),
        ...(line.emo.length ? [`  表情：${line.emo.join(" / ")}`] : []),
        ...(line.staging.length ? [`  演出：${line.staging.join(" / ")}`] : []),
        ...(style !== voice.styles.default ? [`  スタイル：${style}`] : []),
        ...(before !== undefined ? [`  前の文：${before}`] : []),
        `  台詞：${line.text}`,
        ...(extra?.input ? [`  入力する文：${extra.input}`] : []),
        ...(extra?.noteJa ? [`  注意：${extra.noteJa}`] : []),
        "",
      );
    });
  });
  return out.join("\n");
}

/** The voices with lines that the cast does not have (they are in no request), with their names and line counts. */
export function uncastVoices(script: Pick<VoiceScript, "lines">, cast: VoiceCast | undefined): { voice: string; speakerJa: string; lines: number }[] {
  const castVoices = new Set(cast?.voices.map((voice) => voice.voice) ?? []);
  const counts = new Map<string, number>();
  for (const line of script.lines)
    if (line.voice !== HEROINE_VOICE && !castVoices.has(line.voice)) counts.set(line.voice, (counts.get(line.voice) ?? 0) + 1);
  return [...counts].map(([voice, lines]) => ({ voice, speakerJa: voiceNameJa(script.lines, voice), lines }));
}
