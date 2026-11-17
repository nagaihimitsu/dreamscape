import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkVoiceCast, formatCastRequest, lineStyle, uncastVoices, voiceCastSchema, type VoiceCast } from "./voice-cast";
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

  it("refuses one model for two voices of the journey", () => {
    const twice = castWith((copy) => {
      copy.voices[2].model.id = "test_model_a";
    });
    expect(checkVoiceCast(twice, "ta_trip", script.lines).errors).toEqual([
      "同じ旅行編で同じモデルは使えません：VOICEVOX の「テスト用モデルC」（test_model_a）を ta_kamla と ta_lili が使っています"]);
    // The same model ID on another engine is another model.
    const otherEngine = castWith((copy) => {
      copy.voices[1].model.id = "test_model_a";
    });
    expect(checkVoiceCast(otherEngine, "ta_trip", script.lines).errors).toEqual([]);
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

describe("the request of an engine", () => {
  const aivis = formatCastRequest(script, cast, "aivishub", recorded, "2026-11-20").split("\n");
  const voicevox = formatCastRequest(script, cast, "voicevox", recorded, "2026-11-20").split("\n");
  // A line's box: from its [ID] line (with its flags) to the blank line after it.
  const box = (text: string[], id: string) => {
    const start = text.findIndex((row) => row === `[${id}]` || row.startsWith(`[${id}]　`));
    return start < 0 ? [] : text.slice(start, text.indexOf("", start));
  };

  it("has a header with the counts, the excluded name lines and this engine's dictionary words", () => {
    expect(aivis.slice(0, 4)).toEqual([
      "テストの旅（ta_trip）　ヒロイン以外の人物の台詞　ボイス収録の依頼（AivisSpeech（AivisHub のモデル））", "",
      "作成：2026-11-20　台本：content/journeys/ta_trip/stories/ の現在の版から抜き出し　配役：cast.json（確認日 2026-11-17）",
      "この依頼の人物：1人　収録する台詞：3行（1行＝1回の収録＝1ファイル）。うち録り直し 1行",
    ]);
    expect(aivis).toContain("・入れていない台詞（1行。作者が名前を言わない文に直してから、次の依頼で頼みます）：");
    expect(aivis).toContain("    [ta_tower_battle_guard_003]　時計守：【主人公の名前】、帰りなさい");
    expect(aivis).toContain("    時計守　読み：トケイモリ　アクセント：3　（テスト用の語）");
    expect(aivis).toContain("    鐘楼　読み：ショウロウ　アクセント：0");
    expect(voicevox).not.toContain("    鐘楼　読み：ショウロウ　アクセント：0");
    expect(voicevox).toContain("・この依頼の人物の台詞には、名前の入る台詞はありません。");
  });

  it("lists each character of the engine with their model, settings in the engine's words, and reason", () => {
    expect(aivis).toContain("  1. 時計守（テスト用）（ta_guard）　モデル：テスト用モデルB（話者：テスト話者B）　収録 3行");
    expect(aivis.join("\n")).not.toContain("ta_lili");
    expect(voicevox).toContain("  1. カムラ（テスト用）（ta_kamla）　モデル：テスト用モデルA（話者：テスト話者A）　収録 0行");
    expect(voicevox).toContain("  2. リリ（テスト用）（ta_lili）　モデル：テスト用モデルC（話者：テスト話者C）　収録 1行");
    for (const expected of ["  年齢：60代", "  出身地・言語・アクセント：テストの町。日本語で話す", "  エンジン：AivisSpeech（AivisHub のモデル）",
      "  モデル：テスト用モデルB（00000000-0000-0000-0000-000000000001）", "  話者：テスト話者B",
      "  スタイル：ふだんは「ノーマル」。表情が「焦り」の行は「あせり」", "  ページ：https://example.com/dreamscape-sample/model-b",
      "  利用規約：https://example.com/dreamscape-sample/model-b/terms", "  ライセンス：テスト用（架空）", "  クレジット表記：テスト用モデルB（架空）",
      "設定：話速：0.95　テンポの緩急：1", "選んだ理由：テスト用の配役です。", "メモ：テスト用のメモ。", "出る場面：西（塔の問い／場面（ta_tower_gate））",
      "台詞：全部で 5行。この依頼で録る行 3行"])
      expect(aivis).toContain(expected);
    expect(voicevox).toContain("設定：エンジンの初期値のまま");
    expect(voicevox).toContain("この依頼で録る行はありません。");
  });

  it("puts only the lines to record, scene by scene with the scene's situation, one box per line", () => {
    const scene = aivis.indexOf("■ 塔の問い　（places/ta_west_tower.ink）");
    expect(aivis.slice(scene, scene + 4)).toEqual(["■ 塔の問い　（places/ta_west_tower.ink）", "-".repeat(40), "  テストの塔の前。時計守が二人を止める。", ""]);
    expect(box(aivis, "ta_tower_battle_guard_001")).toEqual([
      "[ta_tower_battle_guard_001]", "  前の行（地の文）：塔の前に、制服の男が立っていた。", "  台詞：止まりなさい", "  入力する文：とまりなさい", "  注意：テスト用の注意。"]);
    expect(box(aivis, "ta_tower_battle_guard_002")).toEqual([
      "[ta_tower_battle_guard_002]", "  前の行（時計守）：止まりなさい", "  表情：焦り", "  スタイル：あせり", "  台詞：それは違う"]);
    // A recorded line whose text changed is recorded again; one that says its clip's text is not asked for.
    expect(box(aivis, "ta_tower_gate_guard_002")).toEqual([
      "[ta_tower_gate_guard_002]　録り直し", "  前の行（時計守）：もう一度言う", "  前の文：三度目", "  台詞：三度目だ"]);
    expect(aivis).not.toContain("[ta_tower_gate_guard_001]");
    expect(aivis).not.toContain("[ta_tower_battle_guard_003]　★名前を含む");
    expect(box(voicevox, "ta_tower_meet_lili_001")).toEqual(["[ta_tower_meet_lili_001]", "  スタイル：ささやき", "  台詞：こんにちは"]);
  });
});
