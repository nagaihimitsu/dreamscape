import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentSourcesFromTree, contentTreeFromFiles } from "./content-sources";
import {
  cityOfFile, formatVoiceScript, heroineLines, voiceNameJa, voiceScript, voiceScriptInput, type ScriptedLine, type VoiceScriptInput,
} from "./voice-script";

// The voice script (npm run voice:script): the spoken lines of a journey's Ink sources (the heroine's and, 2026-11-17,
// every other speaker's but the narrator and the player) with their scene, branches, the line before and their tags in
// words, who voices them, and their stable IDs (a `# voice:`'s, else the ID the same text of the same voice was last
// sent with, else a number no script or recording has used).

const SQUARE = `INCLUDE modules.ink
-> DONE

=== ta_square_date ===
# scene: date
# title: 広場の時計
# speaker: narrator
広場に着いた。
# speaker: heroine
# reaction: heroine,smile,music
# voice: ta_square_date_001
きれいな時計だね
# speaker: ta_lili
三時で止まってるの
# speaker: heroine
# emotion: worried
{player_address}、見て
* [「直そう」 # option: fix]
    { romance_result == "negative":
        # speaker: heroine
        直せるの？
    - else:
        # speaker: heroine
        # pause: 600
        うん、やってみよう
    }
* [「そのままでいい」]
    # speaker: heroine
    # phone: received
    メッセージの行
    # speaker: heroine
    # stand: close
    そうだね。Stop the clock.
-
# speaker: heroine
{ cond("flag ta_saw_clock") and cond("date ta_park"):
    もう一度見たね
}
また来ようね
-> END

=== ta_square_battle ===
# scene: battle
# speaker: enemy
止まれ
# speaker: heroine
はい

=== ta_square_guide ===
# scene: guide
# speaker: heroine
// 書きかけ
これが広場
`;

const input = (stories: VoiceScriptInput["stories"], history: Partial<Pick<VoiceScriptInput, "scripts" | "recorded" | "voiceFiles">> = {}): VoiceScriptInput => ({
  journeyId: "ta_trip", nameJa: "テストの旅", storiesPath: "content/journeys/ta_trip/stories/",
  cities: [{ id: "west", nameJa: "西" }, { id: "east", nameJa: "東" }],
  stories,
  people: new Map([["ta_lili", { nameJa: "リリ", characterId: "ta_lili" }]]),
  battles: new Map([["places/ta_west_square.ta_square_battle", { id: "ta_square_battle", titleJa: "時計の番人", enemyNameJa: "番人" }]]),
  scripts: [], recorded: new Set(), voiceFiles: new Set(),
  ...history,
});

describe("the heroine lines of a voice script", () => {
  const script = voiceScript(input([{ storyId: "places/ta_west_square", source: SQUARE }]));
  const line = (text: string) => script.lines.find((item) => item.text === text);

  it("reads every heroine line, a speaker holding until the next, and leaves out messages", () => {
    expect(heroineLines(script).map((item) => item.text)).toEqual([
      "きれいな時計だね", "【主人公の呼び名】、見て", "直せるの？", "うん、やってみよう", "そうだね。Stop the clock.", "もう一度見たね", "また来ようね",
      "はい", "これが広場",
    ]);
    expect(script.skipped.get("heroine")).toBe(1);
  });

  it("numbers the lines of each knot, keeping a # voice: ID", () => {
    expect(heroineLines(script).map((item) => item.id)).toEqual([
      "ta_square_date_001", "ta_square_date_002", "ta_square_date_003", "ta_square_date_004", "ta_square_date_005", "ta_square_date_006",
      "ta_square_date_007", "ta_square_battle_001", "ta_square_guide_001",
    ]);
    expect(line("きれいな時計だね")).toMatchObject({ line: 11, file: "places/ta_west_square.ink", knot: "ta_square_date", title: "広場の時計",
      speaker: "heroine", voice: "heroine", speakerJa: "ヒロイン" });
  });

  it("keeps the 2026-11-12 entries' fields in their order, with who speaks after them (2026-11-17)", () => {
    expect(Object.keys(script.lines[0])).toEqual(["line", "id", "text", "emo", "staging", "context", "prev", "flags", "file", "knot", "title",
      "speaker", "voice", "speakerJa"]);
    // The other speakers' lines are in too, and never change the heroine's.
    expect(script.lines.filter((item) => item.voice !== "heroine").map((item) => [item.text, item.voice, item.id])).toEqual([
      ["三時で止まってるの", "ta_lili", "ta_square_date_lili_001"], ["止まれ", "ta_square_battle", "ta_square_battle_square_battle_001"]]);
  });

  it("says the tags in words and flags names and English", () => {
    expect(line("きれいな時計だね")).toMatchObject({ emo: ["ほほえみ", "楽しげ"], staging: [], flags: [] });
    expect(line("【主人公の呼び名】、見て")).toMatchObject({ emo: ["心配・弱っている"], flags: ["★名前を含む"] });
    expect(line("うん、やってみよう")?.staging).toEqual(["間600ms（字が出る前に間）"]);
    expect(line("そうだね。Stop the clock.")).toMatchObject({ staging: ["すぐそばに寄る"], flags: ["英語を含む"] });
  });

  it("names the branches a line sits in", () => {
    expect(line("直せるの？")?.context).toEqual(["選択肢［「直そう」］のあと", "噛み合いが悪いとき（少し距離のある言い方）"]);
    expect(line("うん、やってみよう")?.context).toEqual(["選択肢［「直そう」］のあと", "それ以外"]);
    expect(line("そうだね。Stop the clock.")?.context).toEqual(["選択肢［「そのままでいい」］のあと"]);
    expect(line("もう一度見たね")?.context).toEqual(["条件つき：出来事「ta_saw_clock」があったとき かつ デート「ta_park」を遊んだあと"]);
    expect(line("また来ようね")?.context).toEqual([]);
  });

  it("gives the line before: the person's name, the line before a menu or a branch, or how it varies", () => {
    expect(line("きれいな時計だね")?.prev).toEqual(["地の文", "広場に着いた。"]);
    expect(line("【主人公の呼び名】、見て")?.prev).toEqual(["リリ", "三時で止まってるの"]);
    expect(line("直せるの？")?.prev).toEqual(["ヒロイン", "【主人公の呼び名】、見て"]);
    expect(line("うん、やってみよう")?.prev).toEqual(["ヒロイン", "【主人公の呼び名】、見て"]);
    // A message is not spoken, but it is the line before.
    expect(line("そうだね。Stop the clock.")?.prev).toEqual(["ヒロイン", "メッセージの行"]);
    expect(line("もう一度見たね")?.prev).toEqual(["―", "主人公が選んだあと（どの選択肢を選んだかで変わる）"]);
    expect(line("また来ようね")?.prev).toEqual(["―", "条件で変わる（この前の分かれ道のどれを通ったかによる）"]);
  });

  it("reads no line from a gather, nested ones too (`- -`)", () => {
    const shop = `=== ta_shop ===\n# speaker: heroine\nどれにする？\n* [A]\n    * * [B]\n        これにする\n    * * [C]\n        やめておく\n    - -\n* [D]\n    -> END\n-\nまた来ようね\n`;
    expect(heroineLines(voiceScript(input([{ storyId: "places/ta_west_shop", source: shop }]))).map((item) => item.text)).toEqual([
      "どれにする？", "これにする", "やめておく", "また来ようね"]);
  });

  it("takes a battle's title and opponent from its catalog entry, else names the scene by its knot", () => {
    expect(line("はい")).toMatchObject({ title: "時計の番人", prev: ["番人", "止まれ"] });
    expect(line("これが広場")).toMatchObject({ title: "観光案内（ta_square_guide）", prev: null });
  });
});

describe("the IDs of a voice script", () => {
  const gate = (knot: string, lines: string) => [{ storyId: "places/ta_west_gate", source: `=== ${knot} ===\n# speaker: heroine\n${lines}` }];
  const sent = (date: string, lines: [string, string][]) => ({ journeyId: "ta_trip", date, file: "",
    lines: lines.map(([id, text]): ScriptedLine => ({ id, text, knot: "ta_gate", file: "places/ta_west_gate.ink", title: "門" })) });
  const ids = (script: ReturnType<typeof voiceScript>) => heroineLines(script).map((item) => [item.text, item.id]);
  const first = sent("2026-11-12", [["ta_gate_001", "いち"], ["ta_gate_002", "に"], ["ta_gate_003", "さん"]]);

  it("numbers a knot's lines when nothing was sent", () => {
    expect(ids(voiceScript(input(gate("ta_gate", "いち\nに\n"))))).toEqual([["いち", "ta_gate_001"], ["に", "ta_gate_002"]]);
  });

  it("keeps the IDs sent when a line is inserted at the top; the new line takes a number never used", () => {
    expect(ids(voiceScript(input(gate("ta_gate", "ぜろ\nいち\nに\nさん\n"), { scripts: [first] })))).toEqual([
      ["ぜろ", "ta_gate_004"], ["いち", "ta_gate_001"], ["に", "ta_gate_002"], ["さん", "ta_gate_003"]]);
  });

  it("keeps the IDs sent under a renamed knot (the battles moved to place files)", () => {
    expect(ids(voiceScript(input(gate("ta_gate_battle", "いち\nよん\n"), { scripts: [first] })))).toEqual([
      ["いち", "ta_gate_001"], ["よん", "ta_gate_battle_001"]]);
  });

  it("gives a rewritten line a new ID, after every number a script, recording or file has used", () => {
    const older = sent("2026-11-01", [["ta_gate_007", "なな"]]);
    const script = voiceScript(input(gate("ta_gate", "いち\nにい\nさん\n"), { scripts: [first, older], voiceFiles: new Set(["ta_gate_009"]) }));
    expect(ids(script)).toEqual([["いち", "ta_gate_001"], ["にい", "ta_gate_010"], ["さん", "ta_gate_003"]]);
  });

  it("matches the text an ID was last sent with, not an older script's", () => {
    const resent = sent("2026-11-20", [["ta_gate_001", "いち、です"], ["ta_gate_002", "に"]]);
    expect(ids(voiceScript(input(gate("ta_gate", "いち\nに\n"), { scripts: [resent, first] })))).toEqual([["いち", "ta_gate_004"], ["に", "ta_gate_002"]]);
  });

  it("keeps a # voice: ID whatever the text, and never gives a recorded ID to another line", () => {
    // ta_gate_002's line was rewritten (its tag stays); ta_gate_003's clip has no line any more.
    const script = voiceScript(input(gate("ta_gate", "# voice: ta_gate_002\nにい\nさん\nに\n"), { scripts: [first], recorded: new Set(["ta_gate_003"]) }));
    expect(ids(script)).toEqual([["にい", "ta_gate_002"], ["さん", "ta_gate_004"], ["に", "ta_gate_005"]]);
    expect([...script.tagged]).toEqual(["ta_gate_002"]);
  });
});

// Every other speaker (2026-11-17): who voices each line (a person's character, the one opposite as the game puts them
// there), their IDs (`<knot>_<voice without its first part>_<NNN>`, kept as the heroine's are), never matched to
// another voice's line.
const PEOPLE: VoiceScriptInput["people"] = new Map([
  ["ta_lili", { nameJa: "リリ", characterId: "ta_lili" }],
  ["ta_square_girl", { nameJa: "女の子", characterId: "ta_lili" }],
  ["ta_guard", { nameJa: "番人", characterId: "ta_guard" }],
  ["ta_crowd", { nameJa: "人だかり" }],
]);
const BATTLES: VoiceScriptInput["battles"] = new Map([
  ["places/ta_west_tower.ta_tower_battle", { id: "ta_tower_battle", titleJa: "塔の問い", enemyNameJa: "時計守", characterId: "ta_guard" }],
  ["places/ta_west_tower.ta_bell_battle", { id: "ta_bell_battle", titleJa: "鐘の問い", enemyNameJa: "鐘つき" }],
]);
const TOWER = `=== ta_tower_battle ===
# scene: battle
# speaker: enemy
# reaction: heroine,surprised
止まりなさい
# speaker: enemy
# reaction: enemy,anger
# stand: close
-> ta_tower_claim ->
# speaker: heroine
はい
-> END

=== ta_tower_claim ===
# speaker: enemy
# reaction: enemy,sweat
それは違う

=== ta_bell_battle ===
# scene: battle
# speaker: enemy
鐘を鳴らすのは私だ

=== ta_tower_meet ===
# scene: encounter
# person: ta_crowd
# person: ta_square_girl
# speaker: enemy
# emotion: smile
こんにちは
# speaker: ta_square_girl
わたし、リリ
# speaker: ta_crowd
わあ
# speaker: ta_lili
# phone: received
あとでね
# speaker: player
うん
`;
const others = (history: Partial<Pick<VoiceScriptInput, "scripts" | "recorded" | "voiceFiles">> = {}, source = TOWER) =>
  voiceScript({ ...input([{ storyId: "places/ta_west_tower", source }], history), people: PEOPLE, battles: BATTLES });

describe("the other voices of a voice script", () => {
  const script = others();
  const said = (text: string) => script.lines.find((item) => item.text === text);

  it("reads every speaker but the narrator and the player, and leaves out messages for everyone", () => {
    expect(script.lines.map((item) => [item.text, item.voice])).toEqual([
      ["止まりなさい", "ta_guard"], ["はい", "heroine"], ["それは違う", "ta_guard"], ["鐘を鳴らすのは私だ", "ta_bell_battle"],
      ["こんにちは", "ta_lili"], ["わたし、リリ", "ta_lili"], ["わあ", "ta_crowd"],
    ]);
    expect([...script.skipped]).toEqual([["ta_lili", 1]]);
  });

  it("gives enemy in a battle its opponent's character (else the battle), and in a battle's tunnel knot too", () => {
    expect(said("止まりなさい")).toMatchObject({ speaker: "enemy", voice: "ta_guard", speakerJa: "時計守" });
    expect(said("それは違う")).toMatchObject({ speaker: "enemy", voice: "ta_guard", speakerJa: "時計守", knot: "ta_tower_claim" });
    expect(said("鐘を鳴らすのは私だ")).toMatchObject({ voice: "ta_bell_battle", speakerJa: "鐘つき" });
  });

  it("gives enemy elsewhere the scene's # person: with a character first, and a person's other ID their character", () => {
    expect(said("こんにちは")).toMatchObject({ speaker: "enemy", voice: "ta_lili", speakerJa: "女の子" });
    expect(said("わたし、リリ")).toMatchObject({ speaker: "ta_square_girl", voice: "ta_lili", speakerJa: "女の子" });
    // A person without a character is voiced as themself.
    expect(said("わあ")).toMatchObject({ speaker: "ta_crowd", voice: "ta_crowd", speakerJa: "人だかり" });
    expect(voiceNameJa(script.lines, "ta_guard")).toBe("時計守");
    expect(voiceNameJa([...script.lines, { voice: "ta_lili", speaker: "ta_lili", speakerJa: "リリ" }], "ta_lili")).toBe("リリ");
  });

  it("says the speaker's own face only: a reaction on the heroine is hers, and where she stands is hers", () => {
    expect(said("止まりなさい")?.emo).toEqual([]);
    expect(said("それは違う")?.emo).toEqual(["焦り"]);
    expect(said("こんにちは")?.emo).toEqual(["ほほえみ"]);
  });

  it("numbers each voice of a knot from 001: <knot>_<voice without its first part>_<NNN>, the heroine's as before", () => {
    expect(script.lines.map((item) => item.id)).toEqual([
      "ta_tower_battle_guard_001", "ta_tower_battle_001", "ta_tower_claim_guard_001", "ta_bell_battle_bell_battle_001",
      "ta_tower_meet_lili_001", "ta_tower_meet_lili_002", "ta_tower_meet_crowd_001",
    ]);
  });

  it("says a battle's score condition in words", () => {
    const scored = others({}, "=== ta_bell_battle ===\n# scene: battle\n{ battle_score >= 2:\n    # speaker: enemy\n    見事だ\n- else:\n" +
      "    { battle_score == 1:\n        # speaker: enemy\n        一つだけか\n    }\n}\n");
    expect(scored.lines.map((item) => item.context)).toEqual([["クイズの正解がそこまでに2問以上のとき"],
      ["それ以外", "クイズの正解がそこまでに1問のとき"]]);
  });

  it("throws, naming the file and line, for enemy with no battle and no # person:", () => {
    expect(() => others({}, "=== ta_tower_walk ===\n# scene: encounter\n# speaker: enemy\nだれ？\n")).toThrow(
      "「# speaker: enemy」の声の主が分かりません：content/journeys/ta_trip/stories/places/ta_west_tower.ink の4行目（knot ta_tower_walk）。");
  });
});

describe("the IDs of the other voices", () => {
  const sentOf = (date: string, lines: ScriptedLine[]) => ({ journeyId: "ta_trip", date, file: "", lines });
  const first = others();
  const sent = sentOf("2026-11-20", first.lines);
  const idOf = (script: ReturnType<typeof voiceScript>, text: string) => script.lines.find((item) => item.text === text)?.id;

  it("keeps the IDs sent when a line of the same voice is put before them; the new line takes a number never used", () => {
    const again = others({ scripts: [sent] }, TOWER.replace("# speaker: enemy\n# reaction: heroine,surprised\n",
      "# speaker: enemy\nまず聞こう\n# speaker: enemy\n# reaction: heroine,surprised\n"));
    expect(again.lines.map((item) => [item.text, item.id]).slice(0, 3)).toEqual([
      ["まず聞こう", "ta_tower_battle_guard_002"], ["止まりなさい", "ta_tower_battle_guard_001"], ["はい", "ta_tower_battle_001"]]);
    // A second run with the same sent script gives the same IDs.
    expect(others({ scripts: [sent] }).lines.map((item) => item.id)).toEqual(first.lines.map((item) => item.id));
  });

  it("never gives a line the ID another voice's line of the same text was sent with", () => {
    // The guard's 「それは違う」 was sent; now the heroine says it in the same knot (and the guard does not).
    const swapped = others({ scripts: [sent] }, TOWER.replace("# speaker: enemy\n# reaction: enemy,sweat\nそれは違う", "# speaker: heroine\nそれは違う"));
    expect(swapped.lines.find((item) => item.text === "それは違う")).toMatchObject({ voice: "heroine", id: "ta_tower_claim_001" });
    // A line sent without a voice (before 2026-11-17) is the heroine's: the guard does not take its ID.
    const old = sentOf("2026-11-12", [{ id: "ta_tower_battle_007", text: "止まりなさい", knot: "ta_tower_battle", file: "places/ta_west_tower.ink", title: "塔" }]);
    expect(idOf(others({ scripts: [old] }), "止まりなさい")).toBe("ta_tower_battle_guard_001");
  });

  it("does not move the heroine's numbers for another voice's IDs, nor the other way round", () => {
    const busy = sentOf("2026-11-20", [{ id: "ta_tower_battle_guard_009", text: "前の台詞", knot: "ta_tower_battle", file: "places/ta_west_tower.ink",
      title: "塔", voice: "ta_guard" }, { id: "ta_tower_battle_004", text: "前のはい", knot: "ta_tower_battle", file: "places/ta_west_tower.ink", title: "塔" }]);
    const script = others({ scripts: [busy] });
    expect(idOf(script, "はい")).toBe("ta_tower_battle_005");
    expect(idOf(script, "止まりなさい")).toBe("ta_tower_battle_guard_010");
  });
});

describe("the order of a voice script", () => {
  it("goes city by city in the journey's order, place files first, then by file name; files of no city last", () => {
    const one = (storyId: string) => ({ storyId, source: `=== ${path.posix.basename(storyId)} ===\n# speaker: heroine\nこんにちは\n` });
    const script = voiceScript(input([one("places/ta_harbor"), one("places/ta_east_park"), one("dates/ta_west_aaa"), one("places/ta_west_zoo"),
      one("places/ta_west_gate")]));
    expect(script.lines.map((item) => item.knot)).toEqual(["ta_west_gate", "ta_west_zoo", "ta_west_aaa", "ta_east_park", "ta_harbor"]);
    expect([cityOfFile("places/ta_west_zoo.ink", ["west", "east"]), cityOfFile("east_x.ink", ["west", "east"]), cityOfFile("ta_harbor", ["west"])])
      .toEqual(["west", "east", "other"]);
  });
});

describe("the readable voice script", () => {
  it("has the 2026-11-12 layout: the counts, the reading guide, then city, scene and one box per line", () => {
    const text = formatVoiceScript(voiceScript(input([{ storyId: "places/ta_west_square", source: SQUARE }])), "2026-11-20").split("\n");
    expect(text.slice(0, 5)).toEqual([
      "テストの旅　ヒロインの台詞（ボイス収録用）", "",
      "作成：2026-11-20　台本：content/journeys/ta_trip/stories/ の現在の版から抜き出し",
      "収録する台詞：9行（1行＝1回の収録＝1ファイル）。メッセージ（携帯の吹き出し）とメモ・手紙の行 1行は、声を付けないので入れていない。",
      "★名前を含む：1行　★言い方が分かれる：0行（説明書の「気をつけること」を見てください）",
    ]);
    const box = text.indexOf("[ta_square_date_003]");
    expect(text.slice(text.indexOf("■■ 西") - 1, box + 6)).toEqual([
      "=".repeat(60), "■■ 西", "=".repeat(60), "", "■ 広場の時計　（places/ta_west_square.ink）", "-".repeat(40),
      ...text.slice(text.indexOf("[ta_square_date_001]"), box),
      "[ta_square_date_003]",
      "  前の行（ヒロイン）：【主人公の呼び名】、見て",
      "  場面の分かれ道：選択肢［「直そう」］のあと → 噛み合いが悪いとき（少し距離のある言い方）",
      "  台詞：直せるの？",
      "",
      "[ta_square_date_004]",
    ]);
    expect(text).toContain("■ 時計の番人　（places/ta_west_square.ink）");
    expect(text).toContain("[ta_square_date_002]　★名前を含む");
  });
});

describe("what a voice script reads of a journey", () => {
  it("reads the journey's cities, people, battles and voice files from the loaded content, with the voice records", () => {
    const json = (value: unknown) => JSON.stringify(value);
    const trip = "content/journeys/ta_trip";
    const sources = contentSourcesFromTree(contentTreeFromFiles(path.join(path.sep, "virtual", "dreamscape"), {
      [`${trip}/manifest.json`]: json({ schemaVersion: 1, order: 10, id: "ta_trip", nameJa: "テストの旅", status: "preparing",
        cities: [{ id: "west", nameJa: "西" }] }),
      [`${trip}/progression/story.json`]: json({ schemaVersion: 1, people: [{ id: "ta_lili", cityId: "west", nameJa: "リリ" }] }),
      [`${trip}/battles/catalog.json`]: json({ schemaVersion: 1, battles: [{ id: "ta_b", storyId: "places/ta_west_square.ta_square_battle",
        titleJa: "時計の番人", enemyNameJa: "番人" }] }),
      [`${trip}/presentation/characters.json`]: json({ schemaVersion: 1, characters: [], battleCharacters: { ta_b: "ta_guard" } }),
      [`${trip}/stories/places/ta_west_square.ink`]: SQUARE,
      [`${trip}/public/assets/voice/ta_square_date_001.mp3`]: null,
      [`${trip}/public/assets/voice/ta_old_line.mp3`]: null,
    }));
    const scripts = [{ journeyId: "ta_trip", date: "2026-11-12", file: "", lines: [] }];
    const read = voiceScriptInput(sources, "ta_trip", { scripts, recorded: new Map([["ta_square_date_001", { text: "きれいな時計だね", script: "2026-11-12" }]]) });
    expect(read).toMatchObject({ nameJa: "テストの旅", cities: [{ id: "west", nameJa: "西" }], storiesPath: `${trip}/stories/` });
    expect(read.stories.map((story) => story.storyId)).toEqual(["places/ta_west_square"]);
    expect(read.people.get("ta_lili")).toEqual({ nameJa: "リリ" });
    expect(read.battles.get("places/ta_west_square.ta_square_battle")).toEqual({ id: "ta_b", titleJa: "時計の番人", enemyNameJa: "番人", characterId: "ta_guard" });
    expect(read).toMatchObject({ scripts, recorded: new Set(["ta_square_date_001"]), voiceFiles: new Set(["ta_square_date_001", "ta_old_line"]) });
    expect(() => voiceScriptInput(sources, "tb_trip", { scripts: [], recorded: new Map() })).toThrow("旅行編がありません：tb_trip");
  });
});
