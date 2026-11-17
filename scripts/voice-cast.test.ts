import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  castEntries, checkVoiceCast, formatCastRequest, lineStyle, requestLines, SHARED_MODEL_MAX_LINES, settingsText, uncastVoices, voiceCastSchema,
  type VoiceCast,
} from "./voice-cast";
import { voiceScript, type VoiceScriptInput } from "./voice-script";

// The cast of the voices other than the heroine's (cast.json, 2026-11-17) and the request of each engine voice:script
// writes from it (Aibishub.txt, voicevox.txt). The cast is a test fixture (fictional models, example.com pages).

const fixture = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tests/fixtures/voice-cast.json");
const cast: VoiceCast = voiceCastSchema.parse(JSON.parse(readFileSync(fixture, "utf8")));

const SOURCE = `=== ta_tower_battle ===
# scene: battle
# speaker: narrator
塔の前に、制服の男が立っていた。
# speaker: enemy
止まりなさい
# speaker: enemy
# reaction: enemy,sweat
それは違う
# speaker: enemy
{player_name}、帰りなさい
# speaker: heroine
はい

=== ta_tower_gate ===
# scene: encounter
# speaker: ta_guard
# voice: ta_tower_gate_guard_001
もう一度言う
# speaker: ta_guard
# voice: ta_tower_gate_guard_002
三度目だ

=== ta_tower_meet ===
# scene: encounter
# person: ta_lili
# speaker: enemy
こんにちは
# speaker: ta_crowd
わあ
`;
const input: VoiceScriptInput = {
  journeyId: "ta_trip", nameJa: "テストの旅", storiesPath: "content/journeys/ta_trip/stories/", cities: [{ id: "west", nameJa: "西" }],
  stories: [{ storyId: "places/ta_west_tower", source: SOURCE }],
  people: new Map([["ta_lili", { nameJa: "リリ", characterId: "ta_lili" }], ["ta_guard", { nameJa: "時計守", characterId: "ta_guard" }],
    ["ta_crowd", { nameJa: "人だかり" }]]),
  battles: new Map([["places/ta_west_tower.ta_tower_battle", { id: "ta_tower_battle", titleJa: "塔の問い", enemyNameJa: "時計守", characterId: "ta_guard" }]]),
  scripts: [], recorded: new Set(), voiceFiles: new Set(),
};
const script = voiceScript(input);
const recorded = new Map([["ta_tower_gate_guard_001", { text: "もう一度言う" }], ["ta_tower_gate_guard_002", { text: "三度目" }]]);
const castWith = (change: (copy: VoiceCast) => void): VoiceCast => {
  const copy = structuredClone(cast);
  change(copy);
  return copy;
};

describe("the cast of the other voices", () => {
  it("reads the fixture and warns about a voice with no lines, without errors", () => {
    expect(checkVoiceCast(cast, "ta_trip", script.lines)).toEqual({ errors: [], warnings: ["台詞のない声です：ta_kamla（カムラ（テスト用））"] });
  });

  // A second story file, for the sharing rule (2026-11-17): ta_vendor speaks only there.
  const east = (lines: number) => ({ storyId: "places/ta_east_market",
    source: `=== ta_east_market ===\n# scene: encounter\n${"# speaker: ta_vendor\nいらっしゃい\n".repeat(lines)}` });
  const twoStories = voiceScript({ ...input, stories: [...input.stories, east(1)] });
  const sharing = (change: (copy: VoiceCast) => void) => castWith((copy) => {
    // ta_vendor (places/ta_east_market.ink) is cast on the guard's model (places/ta_west_tower.ink).
    copy.voices.push({ ...structuredClone(copy.voices[1]), voice: "ta_vendor", nameJa: "物売り", noteJa: "同じモデル：時計守も使う（別のストーリー）。" });
    copy.voices[1].noteJa = "同じモデル：物売りも使う（別のストーリー）。";
    change(copy);
  });

  it(`lets a model serve voices of ${SHARED_MODEL_MAX_LINES} lines or fewer in other stories (2026-11-17 author decision)`, () => {
    expect(SHARED_MODEL_MAX_LINES).toBe(6);
    expect(checkVoiceCast(sharing(() => undefined), "ta_trip", twoStories.lines)).toEqual({ errors: [],
      warnings: ["台詞のない声です：ta_kamla（カムラ（テスト用））"] });
    // A shared model asks for its 「同じモデル：」 note on each voice; such a note on a model no one else uses is warned about.
    const unnoted = checkVoiceCast(sharing((copy) => {
      copy.voices[1].noteJa = "テスト用のメモ。";
      copy.voices[2].noteJa = "同じモデル：だれか。";
    }), "ta_trip", twoStories.lines).warnings;
    expect(unnoted).toContain("同じモデルを使うほかの人物を、ta_guard の noteJa の「同じモデル：」の行に書いていません");
    expect(unnoted).toContain("ta_lili の noteJa に「同じモデル：」の行がありますが、そのモデルを使うほかの人物はいません");
  });

  it("refuses one model for two voices that speak in the same story file", () => {
    // ta_lili (1 line) speaks in places/ta_west_tower.ink, as the guard does.
    const sameStory = castWith((copy) => {
      copy.voices[2] = { ...copy.voices[2], engine: "aivishub", model: { ...copy.voices[1].model } };
    });
    expect(checkVoiceCast(sameStory, "ta_trip", script.lines).errors).toEqual([
      "同じストーリーで同じモデルは使えません：AivisSpeech（AivisHub のモデル）の「テスト用モデルB」（00000000-0000-0000-0000-000000000001）を " +
        "時計守（テスト用）（ta_guard、5行）と リリ（テスト用）（ta_lili、1行）が使い、どちらも places/ta_west_tower.ink で話します。" +
        "同じストーリーの中では、別のモデルにします（作者の判断 2026-11-17）"]);
    // The same model ID on another engine is another model.
    const otherEngine = castWith((copy) => {
      copy.voices[2].model.id = copy.voices[1].model.id;
    });
    expect(checkVoiceCast(otherEngine, "ta_trip", script.lines).errors).toEqual([]);
  });

  it(`refuses one model for two voices of more than ${SHARED_MODEL_MAX_LINES} lines, in any stories`, () => {
    const guard = (lines: number) => ({ storyId: "places/ta_west_tower",
      source: `=== ta_tower_gate ===\n# scene: encounter\n${"# speaker: ta_guard\nもう一度言う\n".repeat(lines)}` });
    const errors = (guardLines: number) => checkVoiceCast(sharing(() => undefined), "ta_trip",
      voiceScript({ ...input, stories: [guard(guardLines), east(7)] }).lines).errors;
    expect(errors(6)).toEqual([]);
    expect(errors(7)).toEqual(["7行以上の人物どうしで、同じモデルは使えません：AivisSpeech（AivisHub のモデル）の「テスト用モデルB」" +
      "（00000000-0000-0000-0000-000000000001）を 時計守（テスト用）（ta_guard、7行）と 物売り（ta_vendor、7行）が使っています。" +
      "7行以上の人物は、旅行編の中で自分だけのモデルにします（作者の判断 2026-11-17：同じモデルを使えるのは1〜6行の人物）"]);
  });

  it("counts the models of one voice group as one model", () => {
    const grouped = sharing((copy) => {
      copy.voices[3].model = { ...copy.voices[3].model, id: "00000000-0000-0000-0000-000000000009", nameJa: "テスト用モデルD", voiceGroup: "テストの声" };
      copy.voices[1].model.voiceGroup = "テストの声";
    });
    expect(checkVoiceCast(grouped, "ta_trip", twoStories.lines).errors).toEqual([]);
    // The group's voices in one story: refused like one model.
    const sameStory = castWith((copy) => {
      copy.voices[1].model.voiceGroup = "テストの声";
      copy.voices[2] = { ...copy.voices[2], engine: "aivishub", model: { ...copy.voices[2].model, voiceGroup: "テストの声" } };
    });
    expect(checkVoiceCast(sameStory, "ta_trip", script.lines).errors).toEqual([
      "同じストーリーで同じモデルは使えません：同じ声のモデルの組「テストの声」（「テスト用モデルB」・「テスト用モデルC」）を " +
        "時計守（テスト用）（ta_guard、5行）と リリ（テスト用）（ta_lili、1行）が使い、どちらも places/ta_west_tower.ink で話します。" +
        "同じストーリーの中では、別のモデルにします（作者の判断 2026-11-17）"]);
  });

  it("refuses the heroine, a voice cast twice, another journey's cast and a setting the engine does not have", () => {
    const wrong = castWith((copy) => {
      copy.journeyId = "tb_trip";
      copy.voices.push({ ...structuredClone(copy.voices[2]), voice: "heroine", model: { ...copy.voices[2].model, id: "test_model_h" } });
      copy.voices.push({ ...structuredClone(copy.voices[2]), model: { ...copy.voices[2].model, id: "test_model_d" } });
      copy.voices[1].settings.pauseLengthScale = 1.2;
    });
    expect(checkVoiceCast(wrong, "ta_trip", script.lines).errors).toEqual([
      "ほかの旅行編の配役です：journeyId が tb_trip です（ta_trip を書きます）",
      "ta_guard の設定 pauseLengthScale は AivisSpeech（AivisHub のモデル） にありません（外すか、voice-cast.ts の表に足します）",
      "ヒロインは cast.json に書きません（ヒロインの声は、ヒロインの台本で別に頼みます）",
      "同じ声を2回書いています：ta_lili",
    ]);
  });

  it("refuses an engine it does not know, in Japanese", () => {
    const parsed = voiceCastSchema.safeParse({ ...cast, voices: [{ ...cast.voices[0], engine: "coeiroink" }] });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]).toMatchObject({ path: ["voices", 0, "engine"], message: "知らないエンジンです：coeiroink（aivishub か voicevox を書きます）" });
  });

  it("warns about a scene or line note for no line of a cast voice", () => {
    const notes = castWith((copy) => {
      copy.scenes = { ...copy.scenes, ta_nowhere: "どこにもない場面。" };
      copy.lines = { ...copy.lines, ta_tower_meet_crowd_001: { noteJa: "配役のない声の行" } };
    });
    expect(checkVoiceCast(notes, "ta_trip", script.lines).warnings).toEqual([
      "台詞のない声です：ta_kamla（カムラ（テスト用））",
      "場面の状況の knot に、配役した声の台詞がありません：ta_nowhere",
      "行の注意の ID に、配役した声の台詞がありません：ta_tower_meet_crowd_001",
    ]);
  });

  it("reads a line's style: its own, else its emotion's, else the voice's default", () => {
    const [kamla, guard, lili] = cast.voices;
    expect(lineStyle(lili, { id: "ta_tower_meet_lili_001", emo: [] }, cast)).toBe("ささやき");
    expect(lineStyle(guard, { id: "x", emo: ["焦り"] }, cast)).toBe("あせり");
    expect(lineStyle(kamla, { id: "x", emo: ["焦り"] }, cast)).toBe("ノーマル");
  });

  it("lists the voices with lines that are not cast", () => {
    expect(uncastVoices(script, cast)).toEqual([{ voice: "ta_crowd", speakerJa: "人だかり", lines: 1 }]);
  });
});

describe("the settings and the lines with a name (2026-11-17)", () => {
  it("prints a voice's settings in its engine's words and order, seconds for the silences", () => {
    const [kamla, guard] = cast.voices;
    expect(settingsText(guard)).toBe("話速 0.95　テンポの緩急 1（ほかはエンジンの初期値のまま）");
    expect(settingsText({ ...guard, settings: { pitchScale: 0.02, intonationScale: 1.2, speedScale: 1.1, postPhonemeLength: 0.2 } }))
      .toBe("話速 1.1　感情表現の強さ 1.2　音高 0.02　終了無音 0.2秒（ほかはエンジンの初期値のまま）");
    expect(settingsText({ ...kamla, settings: { intonationScale: 0.9, pauseLengthScale: 1.2, pitchScale: -0.05 } }))
      .toBe("音高 -0.05　抑揚 0.9　間の長さ 1.2（ほかはエンジンの初期値のまま）");
    expect(settingsText({ ...kamla, settings: {} })).toBe("エンジンの初期値のまま");
  });

  // The guard's line with the protagonist's name, given an input up to the name (author decision 「「……」まで録る」).
  const upToName = castWith((copy) => {
    copy.lines = { ...copy.lines, ta_tower_battle_guard_003: { input: "……", noteJa: "名前の手前まで。" } };
  });

  it("requests a line with a name only with an input that stops before the name", () => {
    const [guard] = requestLines(script, cast, "aivishub", recorded);
    expect(guard.named.map(({ line }) => line.id)).toEqual(["ta_tower_battle_guard_003"]);
    const [partial] = requestLines(script, upToName, "aivishub", recorded);
    expect(partial.named).toEqual([]);
    expect(partial.record.find(({ line }) => line.id === "ta_tower_battle_guard_003")?.untilName).toBe("……");
    // An input that still says a name is refused.
    const stillNamed = castWith((copy) => {
      copy.lines = { ...copy.lines, ta_tower_battle_guard_003: { input: "{player_name}、帰りなさい" },
        ta_tower_battle_guard_001: { input: "【主人公の名前】" } };
    });
    // (in the order of the cast's lines: the fixture has ta_tower_battle_guard_001 first)
    expect(checkVoiceCast(stillNamed, "ta_trip", script.lines).errors).toEqual([
      "入力する文に、遊ぶ人が決める名前があります：ta_tower_battle_guard_001（声では言えないので、名前の手前で止めた文にします）",
      "入力する文に、遊ぶ人が決める名前があります：ta_tower_battle_guard_003（声では言えないので、名前の手前で止めた文にします）",
    ]);
  });

  it("writes the entries of the lines it requests: the heroine's and the cast voices', `spoken` on a line up to a name", () => {
    const entries = castEntries(script, upToName);
    // ta_crowd is not cast: its line stays out (its ID stays provisional).
    expect(entries.map((line) => line.voice)).not.toContain("ta_crowd");
    expect(entries).toHaveLength(script.lines.filter((line) => line.voice !== "ta_crowd").length);
    expect(entries.find((line) => line.id === "ta_tower_battle_guard_003")).toMatchObject({ text: "【主人公の名前】、帰りなさい", spoken: "……" });
    expect(entries.filter((line) => line.spoken !== undefined)).toHaveLength(1);
    expect(castEntries(script, cast).some((line) => line.spoken !== undefined)).toBe(false);
  });
});

describe("the request of an engine", () => {
  const aivis = formatCastRequest(script, cast, "aivishub", recorded, "2026-11-20").split("\n");
  const voicevox = formatCastRequest(script, cast, "voicevox", recorded, "2026-11-20").split("\n");
  // A line's box: from its [ID] line (with its flags) to the blank line after it.
  const box = (text: string[], id: string) => {
    const start = text.findIndex((row) => row === `[${id}]` || row.startsWith(`[${id}]　`));
    return start < 0 ? [] : text.slice(start, text.indexOf("", start));
  };

  it("has a header with the counts, the rights to check, this request's dictionary words and the excluded name lines", () => {
    expect(aivis.slice(0, 7)).toEqual([
      "テストの旅（ta_trip）　ヒロイン以外の人物の台詞　ボイス収録の依頼",
      "依頼先：AivisSpeech（AivisHub のモデル）で声を作る人", "",
      "作成：2026-11-20　台本：content/journeys/ta_trip/stories/ の今の版から抜き出し　配役：cast.json（確認日 2026-11-17）",
      "この依頼の人物：1人　録る台詞：3行（1行＝1回の収録＝1ファイル）",
      "  ・うち録り直し：1行（もう届いている声の文が変わった行。同じ ID で録り直します）",
      "  ・録る前に作者が確かめることが残っている人物：1人（下の「2. 録る前に」）",
    ]);
    expect(aivis).toContain("    時計守（テスト用）（ta_guard、テスト用モデルB）");
    // Only the words the lines of this request say (時計守 is in none; 鐘楼 is for AivisSpeech but in no line).
    expect(aivis).toContain("    違う　読み：チガウ　アクセント：0　（テスト用の語）");
    expect(aivis.join("\n")).not.toContain("トケイモリ");
    expect(aivis.join("\n")).not.toContain("ショウロウ");
    expect(aivis).toContain("    [ta_tower_battle_guard_003]　時計守：【主人公の名前】、帰りなさい");
    expect(aivis).toContain("  この依頼には、同じモデルを使う人物はいません。");
    expect(voicevox).toContain("・この依頼の人物には、作者が確かめることは残っていません。");
    expect(voicevox).toContain("・登録する語はありません。");
    expect(voicevox).toContain("  この依頼には、同じキャラクターを使う人物はいません。");
    expect(voicevox).toContain("・この依頼の人物の台詞には、名前の入る台詞はありません。");
  });

  it("says which voices share a model, and leaves 「録音の前に：なし」 out of the checks", () => {
    const shared = castWith((copy) => {
      copy.voices[0] = { ...copy.voices[0], model: { ...copy.voices[2].model }, noteJa: `${"録音の前に：なし（テスト用）。"}\n同じモデル：リリも使う。` };
      copy.voices[2].noteJa = "同じモデル：カムラも使う。";
    });
    const text = formatCastRequest(script, shared, "voicevox", recorded, "2026-11-20").split("\n");
    expect(text).toContain("  この依頼で、同じキャラクターを使う人物：");
    expect(text).toContain("    「テスト用モデルC」：カムラ（テスト用）（ta_kamla、0行）、リリ（テスト用）（ta_lili、1行）");
    expect(text).toContain("・この依頼の人物には、作者が確かめることは残っていません。");
    expect(text).toContain("★録音の前に：なし（テスト用）。");
    expect(text).toContain("  同じモデル：リリも使う。");
  });

  it("puts each character's rights note first, then the voice, settings in the engine's words, who they are and why", () => {
    const block = aivis.slice(aivis.indexOf("■■■ 1. 時計守（テスト用）（ta_guard）　録る台詞 3行"));
    expect(block.slice(0, 15)).toEqual([
      "■■■ 1. 時計守（テスト用）（ta_guard）　録る台詞 3行", "═".repeat(60), "",
      "★録音の前に：テスト用の規約を作者が読む。", "",
      "【声】",
      "  エンジン：AivisSpeech（AivisHub のモデル）",
      "  モデル：テスト用モデルB（00000000-0000-0000-0000-000000000001）",
      "  話者：テスト話者B",
      "  スタイル：ふだんは「ノーマル」。表情が「焦り」の行は「あせり」",
      "  設定：話速 0.95　テンポの緩急 1（ほかはエンジンの初期値のまま）",
      "  クレジット表記：テスト用モデルB（架空）",
      "  ライセンス：テスト用（架空）",
      "  ページ：https://example.com/dreamscape-sample/model-b",
      "  利用規約：https://example.com/dreamscape-sample/model-b/terms",
    ]);
    for (const expected of ["  年齢：60代", "  出身地・言語・アクセント：テストの町。日本語で話す", "【選んだ理由】", "  テスト用の配役です。",
      "【作り方の注意】", "  テスト用のメモ。", "出る場面：西（塔の問い／場面（ta_tower_gate））", "台詞：全部で 5行。この依頼で録る行 3行"])
      expect(block).toContain(expected);
    expect(aivis).toContain("  1. 時計守（テスト用）（ta_guard）　テスト用モデルB・ノーマル　録る台詞 3行　［録音の前に作者が確かめる］");
    expect(aivis.join("\n")).not.toContain("ta_lili");
    // VOICEVOX: a character, its style IDs, no speaker line when it is the character's name.
    expect(voicevox).toContain("  1. カムラ（テスト用）（ta_kamla）　テスト用モデルA・ノーマル　録る台詞 0行");
    expect(voicevox).toContain("  キャラクター：テスト用モデルC（test_model_c）");
    expect(voicevox).toContain("  スタイル：ふだんは「ノーマル」（スタイル ID 3）");
    expect(voicevox).toContain("  設定：エンジンの初期値のまま");
    expect(voicevox).toContain("この依頼で録る行はありません。");
  });

  it("puts only the lines to record, scene by scene with the scene's situation, one box per line", () => {
    const scene = aivis.indexOf("■ 塔の問い　2行　（places/ta_west_tower.ink）");
    expect(aivis.slice(scene, scene + 4)).toEqual(["■ 塔の問い　2行　（places/ta_west_tower.ink）", "-".repeat(40), "  テストの塔の前。時計守が二人を止める。", ""]);
    expect(box(aivis, "ta_tower_battle_guard_001")).toEqual([
      "[ta_tower_battle_guard_001]", "  前の行（地の文）：塔の前に、制服の男が立っていた。", "  注意：テスト用の注意。", "  台詞：止まりなさい", "  入力する文：とまりなさい"]);
    expect(box(aivis, "ta_tower_battle_guard_002")).toEqual([
      "[ta_tower_battle_guard_002]", "  前の行（時計守）：止まりなさい", "  表情：焦り", "  スタイル：「あせり」", "  台詞：それは違う"]);
    // A recorded line whose text changed is recorded again; one that says its clip's text is not asked for.
    expect(box(aivis, "ta_tower_gate_guard_002")).toEqual([
      "[ta_tower_gate_guard_002]　録り直し", "  前の行（時計守）：もう一度言う", "  前の文：三度目", "  台詞：三度目だ"]);
    expect(aivis).not.toContain("[ta_tower_gate_guard_001]");
    expect(aivis).not.toContain("[ta_tower_battle_guard_003]　★名前を含む");
    expect(box(voicevox, "ta_tower_meet_lili_001")).toEqual(["[ta_tower_meet_lili_001]", "  スタイル：「ささやき」（スタイル ID 5）", "  台詞：こんにちは"]);
  });

  it("asks for a line with a name up to the name, with a clear note (author decision 「「……」まで録る」)", () => {
    const upToName = castWith((copy) => {
      copy.lines = { ...copy.lines, ta_tower_battle_guard_003: { input: "……", noteJa: "名前の手前まで。" } };
    });
    const text = formatCastRequest(script, upToName, "aivishub", recorded, "2026-11-20").split("\n");
    expect(text).toContain("  ・うち名前の手前まで録る行：1行（下の「5. 名前の入る台詞」）");
    expect(text).toContain("    [ta_tower_battle_guard_003]　時計守：【主人公の名前】、帰りなさい");
    expect(text).toContain("      → 録る文：……");
    expect(box(text, "ta_tower_battle_guard_003")).toEqual([
      "[ta_tower_battle_guard_003]　★名前の手前まで録る", "  前の行（時計守）：それは違う", "  注意：名前の手前まで。",
      "  台詞：【主人公の名前】、帰りなさい", "  入力する文：……", "  ★名前の手前まで録る。名前は字幕だけ（「入力する文」の最後で止めます）"]);
  });
});
