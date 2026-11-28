// Past posts (`# past:`, 2026-11-27; authoring/SNS_PLAN.md): a person's posts from before the two met never arrive at night,
// but are read on their page after the posts that came, always the same, with no player's like. Posts made for the test, with
// people and album pictures of インド編.
import { describe, expect, it, vi } from "vitest";
import type { SnsData } from "../../content/sns";

const line = (speaker: string, textJa: string) => ({ speaker, textJa });
const FIXTURE: SnsData = {
  schemaVersion: 1,
  images: [],
  photoWith: {},
  posts: [
    { id: "gt_post_test_now", journeyId: "golden_triangle", cityId: "delhi", author: "gt_monu", imageIds: ["gt_album_d056"],
      line: line("gt_monu", "十三人目"), likes: [], comments: [] },
    { id: "gt_past_test_phone", journeyId: "golden_triangle", cityId: "delhi", author: "gt_monu", imageIds: ["gt_album_d003", "gt_album_d005"],
      where: { nameJa: "村の家" }, past: "去年の冬", line: line("gt_monu", "{heroine_name}より前の携帯"), likes: [{ personId: "gt_kamla" }],
      comments: [{ id: "roohi", lines: [line("gt_roohi", "画面、割れてない？"), line("gt_monu", "割れてからが本番")] }] },
  ],
};

vi.mock("../../content", async (importOriginal) => ({ ...(await importOriginal<typeof import("../../content")>()), snsData: FIXTURE }));

const { cityStart } = await import("../../dev/scenario-builders");
const { deliverSns } = await import("../../domain/sns");
const { snsPersonPage, snsPostPageTitle, snsPostView, snsTimeline } = await import("./sns");

describe("past posts", () => {
  it("never arrive, and are read on their writer's page after the posts that came, always the same", () => {
    const start = cityStart("delhi", ["航", "澪"]);
    const night = deliverSns({ ...start, travel: { ...start.travel, minute: 21 * 60 } });
    expect(night.sns?.posts.map((post) => post.id)).toEqual(["gt_post_test_now"]);
    expect(snsTimeline(night).flatMap((day) => day.posts.map((post) => post.id))).toEqual(["gt_post_test_now"]);
    expect(snsPersonPage(night, "gt_monu")?.photos.map((tile) => [tile.postId, tile.imageId])).toEqual([
      ["gt_post_test_now", "gt_album_d056"], ["gt_past_test_phone", "gt_album_d003"], ["gt_past_test_phone", "gt_album_d005"]]);
    const past = snsPostView(night, "gt_past_test_phone")!;
    expect(past).toMatchObject({ pastJa: "去年の冬", liked: false, line: { textJa: "澪より前の携帯" } });
    expect(past.arrived).toBeUndefined();
    expect(past.photos.map((photo) => [photo.imageId, photo.placeNameJa])).toEqual([["gt_album_d003", "村の家"], ["gt_album_d005", "村の家"]]);
    expect(past.comments.map((comment) => [comment.id, comment.lines.map((item) => item.speaker.id), comment.arrived])).toEqual([
      ["gt_past_test_phone.roohi", ["gt_roohi", "gt_monu"], undefined]]);
    expect(past.likers.map((face) => face.id)).toEqual(["gt_roohi", "gt_kamla"]);
  });

  it("opens on a page of its own titled with its writer and when (and a post that came, with its night)", () => {
    const start = cityStart("delhi");
    const night = deliverSns({ ...start, travel: { ...start.travel, minute: 21 * 60 } });
    expect(snsPostPageTitle(snsPostView(night, "gt_past_test_phone")!)).toBe("モヌ · 去年の冬");
    expect(snsPostPageTitle(snsPostView(night, "gt_post_test_now")!)).toBe("デリー · 1日目");
  });
});
