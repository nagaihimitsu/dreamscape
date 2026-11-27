// Debug's SNS check (authoring/SNS_PLAN.md 「Debugでの確認」) on posts made for the test in デリー and アーグラ, with
// people and album pictures of インド編: what came and when, and what has not with why and its condition's parts.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SnsData } from "../content/sns";

const line = (speaker: string, textJa: string) => ({ speaker, textJa });
const FIXTURE: SnsData = {
  schemaVersion: 1,
  images: [],
  photoWith: {},
  posts: [
    { id: "gt_post_test_map", journeyId: "golden_triangle", cityId: "delhi", author: "heroine", imageIds: ["gt_album_d002", "gt_album_d003"],
      line: line("heroine", "{player_name}と、地図"), likes: [{ personId: "gt_kamla" }, { personId: "gt_monu", when: { flag: "gt_delhi_monu_zoom" } }],
      comments: [
        { id: "kamla", lines: [line("gt_kamla", "写真がきれいすぎる。"), line("heroine", "二回目です")] },
        { id: "said", oneOf: "bas", when: { flag: "gt_delhi_said_bas" }, lines: [line("gt_roohi", "言えたの？")] },
        { id: "other", oneOf: "bas", lines: [line("gt_roohi", "次は言ってね")] },
        { id: "closed", when: { flag: "gt_delhi_bas_for_her" }, lines: [line("gt_kamla", "自分で言いなさい。")] },
        { id: "later", later: true, when: { flag: "gt_delhi_player_sick" }, lines: [line("gt_roohi", "キチュリー食べた？")] },
      ] },
    { id: "gt_post_test_monu", journeyId: "golden_triangle", cityId: "delhi", author: "gt_monu", imageIds: ["gt_album_d057"],
      when: { flag: "gt_delhi_photo_both_in" }, line: line("gt_monu", "二人も入った"), likes: [], comments: [] },
    { id: "gt_post_test_gate", journeyId: "golden_triangle", cityId: "delhi", author: "heroine", imageIds: ["gt_album_d054"],
      line: line("heroine", "ピクニック"), likes: [], comments: [] },
    { id: "gt_post_test_agra", journeyId: "golden_triangle", cityId: "agra", author: "heroine", imageIds: ["gt_album_a006"],
      line: line("heroine", "アーグラ"), likes: [], comments: [] },
  ],
};

vi.mock("../content", async (importOriginal) => ({ ...(await importOriginal<typeof import("../content")>()), snsData: FIXTURE }));

const { cityStart } = await import("./scenario-builders");
const { deliverSns } = await import("../domain/sns");
const { snsDebugCities } = await import("./sns-debug");
const { SnsDebugView } = await import("./SnsDebugView");
type GameState = import("../domain/game").GameState;

const at = (state: GameState, day: number, minute: number): GameState => ({ ...state, travel: { ...state.travel, day, minute } });
const photo = { imageId: "gt_album_d002", cityId: "delhi", day: 1, minute: 600, placeId: "delhi_hotel_hub", storyId: "places/gt_delhi_hotel_hub.gt_delhi_arrival" };

describe("Debug's SNS check", () => {
  it("shows what came with its night, and what has not with why and its parts", () => {
    const start = { ...cityStart("delhi", ["航", "澪"]), album: [photo] };
    const night = deliverSns(at(start, 1, 21 * 60));
    const morning = at(night, 2, 9 * 60);
    const [delhi, agra] = snsDebugCities(morning);
    expect([delhi.cityNameJa, delhi.reached, agra.cityNameJa, agra.reached]).toEqual(["デリー", true, "アーグラ", false]);
    const [map, monu, gate] = delhi.posts;
    // The post came on the first night with its photo taken; only that photo was taken.
    expect(map).toMatchObject({ status: "届いた", detailJa: "デリー 1日目 21:00", textJa: "航と、地図",
      photos: [{ imageId: "gt_album_d002", taken: true }, { imageId: "gt_album_d003", taken: false }] });
    expect(map.likes.map((like) => [like.nameJa, like.howJa])).toEqual([["カムラ", "コメントした人"], ["ルーヒー", "コメントした人"]]);
    expect(map.comments.map((comment) => [comment.id, comment.status])).toEqual([
      ["kamla", "届いた"], ["said", "届かない"], ["other", "届いた"], ["closed", "届かない"], ["later", "まだ"]]);
    expect(map.comments[1].detailJa).toContain("「other」が先に届いた");
    expect(map.comments[3].detailJa).toContain("投稿の夜（デリー 1日目 21:00）に条件が偽で、閉じた");
    expect(map.comments[4]).toMatchObject({ detailJa: "条件が偽（後の夜にも届く）", marksJa: ["# timing: later"], parts: [{ value: false }] });
    // Not come: a false condition with its parts; the heroine's without a photo taken; a later city's.
    expect(monu).toMatchObject({ status: "まだ", detailJa: "条件が偽", parts: [{ value: false }] });
    expect(gate).toMatchObject({ status: "まだ", detailJa: "載せる写真をまだ1枚も撮っていない" });
    expect(agra.posts[0].detailJa).toBe("先の都市の投稿（その都市に着くまで届かない）");
    // A comment of the post's night is still open that night, and a post whose condition holds waits for the night.
    const tonight = snsDebugCities(at(night, 1, 21 * 60 + 30))[0].posts[0].comments[3];
    expect(tonight).toMatchObject({ status: "まだ", detailJa: "条件が偽（今夜のうちに真にならなければ閉じる）" });
    const flagged = { ...morning, storyProgress: { ...morning.storyProgress, flags: [...morning.storyProgress.flags, "gt_delhi_photo_both_in"] } };
    expect(snsDebugCities(flagged)[0].posts[1].detailJa).toMatch(/^条件は今そろっている。次に調べる夜/u);
  });

  it("renders closed beside 「この時点の候補」, and nothing for a journey without posts", () => {
    const html = renderToStaticMarkup(createElement(SnsDebugView, { state: cityStart("delhi") }));
    expect(html).toContain('data-testid="debug-sns"');
    expect(html).toContain("Debug：SNS（届いた投稿 0／4）");
    expect(html).not.toMatch(/<details[^>]* open/u);
    expect(renderToStaticMarkup(createElement(SnsDebugView, { state: cityStart("milano") }))).toBe("");
  });
});
