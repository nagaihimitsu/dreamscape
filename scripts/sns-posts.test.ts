import { describe, expect, it } from "vitest";
import { checkPost, mayHoldAtNight, photoWithOf, postWarnings, readPostsFile, type PostsContext } from "./sns-posts";

// content:build's SNS posts (2026-11-26; authoring/SNS_PLAN.md 「札（書き方）」): stories/posts/<city>.ink read statically
// into posts, the build stopping only what would break the SNS and warning where reading would tire.

const context: PostsContext = {
  journeyId: "ta_trip", cityId: "ta_city",
  people: [
    { id: "ta_monu", characterId: "ta_monu" },
    { id: "ta_roohi", characterId: "ta_roohi" },
    { id: "ta_voice", characterId: "ta_voice", sns: { hidden: true } },
    { id: "ta_faceless" },
  ],
  albumImageIds: new Set(["ta_album_gate", "ta_album_lawn"]),
  snsImageIds: new Set(["ta_sns_phone"]),
  placeIds: new Set(["ta_gate"]),
};
const head = "INCLUDE modules.ink\n-> DONE\n";
const read = (source: string) => readPostsFile(head + source).map((post) => checkPost(post, context));

describe("SNS posts files", () => {
  it("reads a post's head, its one line and its comments (the comment first, then the replies)", () => {
    const [post] = read(`
=== ta_post_gate ===
# post: heroine
# images: ta_album_gate ta_album_lawn
# when: met ta_monu
# until: flag ta_left
# likes: ta_roohi
# likes: ta_monu if flag ta_waved
# speaker: heroine
十二人家族に、一日だけ入りました

= roohi
# speaker: ta_roohi
毎朝通ってるのに、知らなかった
# speaker: heroine
同じ名前、いっぱいあるよ

= monu_post
# timing: later
# one_of: monu
# when: met ta_monu
# speaker: ta_monu
I'll get a better zoom. # translation: もっと望遠のきく携帯にする
`);
    expect(post).toEqual({
      id: "ta_post_gate", journeyId: "ta_trip", cityId: "ta_city", author: "heroine", imageIds: ["ta_album_gate", "ta_album_lawn"],
      when: { all: [{ met: "ta_monu" }, { not: { flag: "ta_left" } }] },
      line: { speaker: "heroine", textJa: "十二人家族に、一日だけ入りました" },
      likes: [{ personId: "ta_roohi" }, { personId: "ta_monu", when: { flag: "ta_waved" } }],
      comments: [
        { id: "roohi", lines: [{ speaker: "ta_roohi", textJa: "毎朝通ってるのに、知らなかった" }, { speaker: "heroine", textJa: "同じ名前、いっぱいあるよ" }] },
        { id: "monu_post", later: true, oneOf: "monu", when: { met: "ta_monu" },
          lines: [{ speaker: "ta_monu", textJa: "I'll get a better zoom.", translationJa: "もっと望遠のきく携帯にする" }] },
      ],
    });
  });

  it("reads a person's post with its own pictures and a place, a place's name or none, the line's speaker its writer by default", () => {
    const posts = read(`
=== ta_post_monu_phone ===
# post: ta_monu
# images: ta_sns_phone
# where: ta_gate
望遠、研究中
=== ta_post_monu_village ===
# post: ta_monu
# images: ta_album_lawn
# where: 村の家
帰ってきた
`);
    expect(posts.map((post) => [post.where, post.line.speaker])).toEqual([[{ placeId: "ta_gate" }, "ta_monu"], [{ nameJa: "村の家" }, "ta_monu"]]);
  });

  it("stops a choice, a cond, an effect tag, a tag it does not know, logic, and a second line of a post", () => {
    const post = (body: string, top = "# post: heroine\n# images: ta_album_gate\n# speaker: heroine\n一言\n") => () => read(`=== ta_post_x ===\n${top}${body}`);
    expect(post("* [選ぶ]\n")).toThrow(/選択肢/u);
    expect(post("{ cond(\"flag ta_x\"): 文 }\n")).toThrow(/cond/u);
    expect(post("= c\n# speaker: heroine\n# set: ta_x\n文\n")).toThrow(/効果の札 # set:/u);
    expect(post("= c\n# speaker: heroine\n# money: 10\n文\n")).toThrow(/効果の札 # money:/u);
    expect(post("= c\n# speaker: heroine\n# emotion: happy\n文\n")).toThrow(/書けない札です：# emotion/u);
    expect(post("~ x = 1\n")).toThrow(/分岐・処理/u);
    expect(post("-> ta_post_y\n")).toThrow(/分岐・処理/u);
    expect(post("{x}\n")).toThrow(/\{heroine_name\}/u);
    expect(post("二行目\n")).toThrow(/投稿の一言は1行/u);
    expect(post("", "# post: heroine\n# images: ta_album_gate\n# speaker: ta_monu\n一言\n")).toThrow(/投稿した人（heroine）の言葉/u);
    expect(post("= c\nだれ\n")).toThrow(/# speaker:/u);
    // The names set are the one {…} a line may have.
    expect(read("=== ta_post_x ===\n# post: heroine\n# images: ta_album_gate\n{heroine_name}と{player_name}\n")[0].line.textJa)
      .toBe("{heroine_name}と{player_name}");
  });

  it("stops a missing picture, a writer or liker without a portrait or hidden, an unknown place ID and a missing # post:", () => {
    const post = (top: string) => () => read(`=== ta_post_x ===\n${top}\n一言\n`);
    expect(post("# post: heroine\n# images: ta_album_nowhere")).toThrow(/アルバムの絵/u);
    // The heroine's post shows album photos only (photos she took), not the SNS's own pictures.
    expect(post("# post: heroine\n# images: ta_sns_phone")).toThrow(/アルバムの絵/u);
    expect(post("# post: ta_faceless\n# images: ta_album_gate")).toThrow(/立ち絵/u);
    expect(post("# post: ta_voice\n# images: ta_album_gate")).toThrow(/SNS に出さない印/u);
    expect(post("# post: ta_nobody\n# images: ta_album_gate")).toThrow(/people にいません/u);
    expect(post("# post: heroine\n# images: ta_album_gate\n# likes: ta_faceless")).toThrow(/立ち絵/u);
    expect(post("# post: ta_monu\n# images: ta_album_gate\n# where: ta_nowhere")).toThrow(/地点/u);
    expect(post("# post: heroine\n# images: ta_album_gate\n# where: ta_gate")).toThrow(/# where: を書きません/u);
    expect(post("# images: ta_album_gate")).toThrow(/# post:/u);
    expect(post("# post: heroine")).toThrow(/# images:/u);
    expect(post("# post: heroine\n# images: ta_album_gate\n# when: flag")).toThrow(/# when: flag/u);
    expect(() => read("=== ta_post_x ===\n# post: heroine\n# images: ta_album_gate\n一言\n= c\n# speaker: ta_faceless\n文\n")).toThrow(/立ち絵/u);
    expect(() => read("=== ta_post_x ===\n# post: heroine\n# images: ta_album_gate\n一言\n= c\n# timing: soon\n# speaker: heroine\n文\n")).toThrow(/later/u);
    expect(() => read("=== ta_post_x ===\n# post: heroine\n# images: ta_album_gate\n一言\n= c\n# speaker: heroine\n文\n= c\n# speaker: heroine\n文\n"))
      .toThrow(/同じ名前のコメント/u);
    expect(() => readPostsFile("一言\n")).toThrow(/最初の knot より前/u);
  });

  it("warns, without stopping, at 4 comments or more on a post and at 2 later comments or more", () => {
    const comment = (name: string, later = false) => `= ${name}\n${later ? "# timing: later\n" : ""}# speaker: ta_roohi\n文\n`;
    const [many] = read(`=== ta_post_many ===\n# post: heroine\n# images: ta_album_gate\n一言\n${["a", "b", "c", "d"].map((name) => comment(name)).join("")}`);
    const [later] = read(`=== ta_post_later ===\n# post: heroine\n# images: ta_album_gate\n一言\n${comment("a", true)}${comment("b", true)}`);
    const [calm] = read(`=== ta_post_calm ===\n# post: heroine\n# images: ta_album_gate\n一言\n${comment("a")}${comment("b", true)}${comment("c")}`);
    expect(postWarnings([many, later, calm].map((post) => ({ ...post, file: "posts.ink" }))).map((warning) => warning.message))
      .toEqual([expect.stringContaining("ta_post_many"), expect.stringContaining("ta_post_later")]);
  });

  it("warns when a post, a comment or a like can never arrive because its condition never holds at night", () => {
    const [post] = read(`=== ta_post_day ===\n# post: heroine\n# images: ta_album_gate\n# when: time day\n# likes: ta_roohi if not time night\n一言\n` +
      `= a\n# when: flag ta_x\n# speaker: ta_roohi\n文\n= b\n# when: time day\n# when: flag ta_x\n# speaker: ta_monu\n文\n`);
    expect(postWarnings([{ ...post, file: "posts.ink" }]).map((warning) => [warning.kind, warning.message.split("（")[0]])).toEqual([
      ["sns-night", "SNS の投稿 ta_post_day"],
      ["sns-night", "SNS のコメント ta_post_day.b"],
      ["sns-night", "SNS のta_post_day の # likes: ta_roohi"],
    ]);
    expect(mayHoldAtNight({ any: [{ time: "day" }, { flag: "ta_x" }] })).toBe(true);
    expect(mayHoldAtNight({ not: { time: "night" } })).toBe(false);
    expect(mayHoldAtNight(undefined)).toBe(true);
  });

  it("reads the people a photo shows from # photo_with: on its # photo: line", () => {
    const people = new Set(["ta_monu", "ta_roohi"]);
    expect([...photoWithOf("# photo: ta_album_gate # photo_caption: 門 # photo_with: ta_monu ta_roohi\n文\n# photo: ta_album_lawn\n文", people)])
      .toEqual([["ta_album_gate", ["ta_monu", "ta_roohi"]]]);
    expect(() => photoWithOf("# photo_with: ta_monu\n文", people)).toThrow(/同じ行/u);
    expect(() => photoWithOf("# photo: ta_album_gate # photo_with: ta_nobody", people)).toThrow(/people にいません/u);
  });
});
