import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentSourcesFromTree, contentTreeFromFiles } from "./content-sources";
import { cityOfFile, formatVoiceScript, voiceScript, voiceScriptInput, type VoiceScriptInput } from "./voice-script";

// The voice script (npm run voice:script): the heroine lines of a journey's Ink sources with their scene, branches, the
// line before and their tags in words, and their IDs (a `# voice:`'s, else `<knot>_<NNN>`, never a recording's).

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

const input = (stories: VoiceScriptInput["stories"], recordings: string[] = []): VoiceScriptInput => ({
  journeyId: "ta_trip", nameJa: "テストの旅", storiesPath: "content/journeys/ta_trip/stories/",
  cities: [{ id: "west", nameJa: "西" }, { id: "east", nameJa: "東" }],
  stories,
  people: new Map([["ta_lili", "リリ"]]),
  battles: new Map([["places/ta_west_square.ta_square_battle", { titleJa: "時計の番人", enemyNameJa: "番人" }]]),
  recordings: new Set(recordings),
});

describe("the heroine lines of a voice script", () => {
  const script = voiceScript(input([{ storyId: "places/ta_west_square", source: SQUARE }], ["ta_square_date_001"]));
  const line = (text: string) => script.lines.find((item) => item.text === text);

  it("reads every heroine line, a speaker holding until the next, and leaves out messages", () => {
    expect(script.lines.map((item) => item.text)).toEqual([
      "きれいな時計だね", "【主人公の呼び名】、見て", "直せるの？", "うん、やってみよう", "そうだね。Stop the clock.", "もう一度見たね", "また来ようね",
      "はい", "これが広場",
    ]);
    expect(script.skipped).toBe(1);
  });

  it("numbers the lines of each knot, keeping a # voice: ID", () => {
    expect(script.lines.map((item) => item.id)).toEqual([
      "ta_square_date_001", "ta_square_date_002", "ta_square_date_003", "ta_square_date_004", "ta_square_date_005", "ta_square_date_006",
      "ta_square_date_007", "ta_square_battle_001", "ta_square_guide_001",
    ]);
    expect(line("きれいな時計だね")).toMatchObject({ line: 11, file: "places/ta_west_square.ink", knot: "ta_square_date", title: "広場の時計" });
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

  it("takes a battle's title and opponent from its catalog entry, else names the scene by its knot", () => {
    expect(line("はい")).toMatchObject({ title: "時計の番人", prev: ["番人", "止まれ"] });
    expect(line("これが広場")).toMatchObject({ title: "観光案内（ta_square_guide）", prev: null });
  });
});

describe("the IDs of lines without a # voice:", () => {
  const story = (lines: string) => [{ storyId: "places/ta_west_gate", source: `=== ta_gate ===\n# speaker: heroine\n${lines}` }];

  it("never takes a recorded ID: a taken number gives the knot's next free one", () => {
    // The first line's recording is _002; the second line's own number is taken, and _004 is a file of no line.
    const script = voiceScript(input(story("# voice: ta_gate_002\nいち\nに\nさん\n"), ["ta_gate_002", "ta_gate_004"]));
    expect(script.lines.map((item) => [item.text, item.id])).toEqual([["いち", "ta_gate_002"], ["に", "ta_gate_005"], ["さん", "ta_gate_003"]]);
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
  it("reads the journey's cities, people, battles and recordings from the loaded content", () => {
    const json = (value: unknown) => JSON.stringify(value);
    const trip = "content/journeys/ta_trip";
    const sources = contentSourcesFromTree(contentTreeFromFiles(path.join(path.sep, "virtual", "dreamscape"), {
      [`${trip}/manifest.json`]: json({ schemaVersion: 1, order: 10, id: "ta_trip", nameJa: "テストの旅", status: "preparing",
        cities: [{ id: "west", nameJa: "西" }] }),
      [`${trip}/progression/story.json`]: json({ schemaVersion: 1, people: [{ id: "ta_lili", cityId: "west", nameJa: "リリ" }] }),
      [`${trip}/battles/catalog.json`]: json({ schemaVersion: 1, battles: [{ id: "ta_b", storyId: "places/ta_west_square.ta_square_battle",
        titleJa: "時計の番人", enemyNameJa: "番人" }] }),
      [`${trip}/stories/places/ta_west_square.ink`]: SQUARE,
      [`${trip}/public/assets/voice/ta_square_date_001.mp3`]: null,
      [`${trip}/public/assets/voice/ta_old_line.mp3`]: null,
    }));
    const read = voiceScriptInput(sources, "ta_trip");
    expect(read).toMatchObject({ nameJa: "テストの旅", cities: [{ id: "west", nameJa: "西" }], storiesPath: `${trip}/stories/` });
    expect(read.stories.map((story) => story.storyId)).toEqual(["places/ta_west_square"]);
    expect(read.people.get("ta_lili")).toBe("リリ");
    expect(read.battles.get("places/ta_west_square.ta_square_battle")?.enemyNameJa).toBe("番人");
    expect([...read.recordings].sort()).toEqual(["ta_old_line", "ta_square_date_001"]);
    expect(() => voiceScriptInput(sources, "tb_trip")).toThrow("旅行編がありません：tb_trip");
  });
});
