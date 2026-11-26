// The SNS's rules and readers (2026-11-26 user decisions; authoring/SNS_PLAN.md 「届き方と記録」) on the sample journey's
// fictional 見本の街, with posts made for the test: the sample's people have no portrait (so its own posts file has only the
// heroine's), and here リリ and トーマ are given one, as the build requires of anyone on the SNS.
import { describe, expect, it, vi } from "vitest";
import type { SnsData } from "../content/sns";

const DATE = "smp_mihon_date_tower_square";
const LILI = "smp_mihon_lili";
const TOMA = "smp_mihon_toma";
const P1 = "smp_post_test_tea";
const P2 = "smp_post_test_gears";
const line = (speaker: string, textJa: string) => ({ speaker, textJa });
const FIXTURE: SnsData = {
  schemaVersion: 1,
  images: [],
  photoWith: { smp_album_clock_tower: [TOMA] },
  posts: [
    { id: P1, journeyId: "sample_trip", cityId: "mihon", author: "heroine", imageIds: ["smp_album_clock_tower", "smp_album_market"],
      when: { datePlayed: DATE }, line: line("heroine", "{player_name}と、三時のお茶"), likes: [{ personId: TOMA }, { personId: LILI, when: { flag: "smp_mihon_lili_told_why" } }],
      comments: [
        { id: "lili", lines: [line(LILI, "その席、わたしが拭いたの"), line("heroine", "ありがとう")] },
        { id: "toma_a", oneOf: "toma", when: { flag: "smp_mihon_bookmark_to_heroine" }, lines: [line(TOMA, "しおり、似合ってた")] },
        { id: "toma_b", oneOf: "toma", lines: [line(TOMA, "針は、まだ三時です")] },
        { id: "after_lili", when: { snsComment: `${P1}.lili` }, lines: [line(LILI, "また来てね")] },
        { id: "later", later: true, when: { flag: "smp_mihon_bookmark_kept" }, lines: [line(TOMA, "しおり、まだ持ってますか")] },
      ] },
    { id: P2, journeyId: "sample_trip", cityId: "mihon", author: TOMA, imageIds: ["smp_album_market"], where: { placeId: "mihon_clock_tower" },
      when: { snsLiked: P1 }, line: line(TOMA, "歯車に油を差しました"), likes: [], comments: [] },
  ],
};

vi.mock("../content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../content")>();
  return {
    ...actual,
    snsData: FIXTURE,
    storyState: { ...actual.storyState, people: actual.storyState.people.map((person) =>
      person.id === LILI || person.id === TOMA ? { ...person, characterId: "enemy" } : person) },
  };
});

const { cityStart } = await import("../dev/scenario-builders");
const { validateGameState } = await import("./game");
const { applyPlayerAction } = await import("./player-action");
const { deliverSns, postLikers, toggleSnsLike, snsShowsPerson } = await import("./sns");
const { meets } = await import("./conditions");
const { snsTimeline, snsPersonPage, snsNightArrivals, snsHeroinePage, snsMetPeople, journeyHasSns } = await import("../features/journey/sns");
type GameState = import("./game").GameState;

const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
/** An action that puts the party at the hotel on `day` at `minute`, with `extra` (the date played, flags set …). */
const at = (day: number, minute: number, extra: (state: GameState) => Partial<GameState> = () => ({})) => (state: GameState): GameState => ({
  ...state, ...extra(state), revision: state.revision + 1, travel: { ...state.travel, currentPlaceId: state.travel.hotelPlaceId, day, minute },
});
const photo = (state: GameState, imageId: string) =>
  ({ imageId, cityId: "mihon", day: state.travel.day, minute: state.travel.minute, placeId: "mihon_clock_tower", storyId: `places/smp_mihon_clock_tower.${DATE}` });
const datePlayed = (state: GameState): Partial<GameState> => ({ playedDateIds: [DATE], album: [photo(state, "smp_album_clock_tower")] });
const flags = (...ids: string[]) => (state: GameState): Partial<GameState> => ({ storyProgress: { ...state.storyProgress, flags: [...state.storyProgress.flags, ...ids] } });

describe("the SNS", () => {
  it("delivers only at night: a post on the first night its conditions hold, its comments with it, and closes them there", () => {
    const start = cityStart("mihon");
    expect(snsShowsPerson(TOMA)).toBe(true);
    // The date played in the afternoon: nothing comes in the day.
    const day = restore(applyPlayerAction(start, at(1, 15 * 60, datePlayed)));
    expect(day.sns?.posts).toEqual([]);
    // 21:00, free time at the hotel (the night screen): the post comes with its photo taken (the market's is not), its
    // # likes: person whose condition holds, and its comments: リリ's and the one that reads it, トーマ's second of one_of (the
    // first's flag is false), not the later one (its flag is false).
    const night = restore(applyPlayerAction(day, at(1, 21 * 60)));
    expect(night.sns?.posts).toEqual([{ id: P1, cityId: "mihon", day: 1, minute: 21 * 60, imageIds: ["smp_album_clock_tower"], likes: [TOMA] }]);
    expect(night.sns?.comments.map((item) => item.id)).toEqual([`${P1}.lili`, `${P1}.toma_b`, `${P1}.after_lili`]);
    expect(meets(night, { snsComment: `${P1}.lili` })).toBe(true);
    // The next day's flags: トーマ's first comment never comes (closed with its night, and its one_of was decided), the later one does.
    const liked = restore(toggleSnsLike(restore(applyPlayerAction(night, at(2, 600, flags("smp_mihon_bookmark_to_heroine", "smp_mihon_bookmark_kept", "smp_mihon_lili_told_why")))), P1, night.revision + 1));
    expect(meets(liked, { snsLiked: P1 })).toBe(true);
    const second = restore(applyPlayerAction(liked, at(2, 21 * 60)));
    expect(second.sns?.comments.map((item) => item.id)).toEqual([`${P1}.lili`, `${P1}.toma_b`, `${P1}.after_lili`, `${P1}.later`]);
    // トーマ's post (it reads the like) comes on the second night; the first post never changes (リリ's like was decided as it came).
    expect(second.sns?.posts.map((post) => [post.id, post.day, post.likes])).toEqual([[P1, 1, [TOMA]], [P2, 2, []]]);
    expect(postLikers(second, P1)).toEqual([LILI, TOMA]);
    // A like taken back changes nothing that came.
    const unliked = toggleSnsLike(second, P1, second.revision);
    expect(unliked.sns?.liked).toEqual([]);
    expect(meets(unliked, { snsLiked: P1 })).toBe(false);
    expect(deliverSns(unliked)).toBe(unliked);
  });

  it("brings no heroine's post without a photo taken, nor a post of a city not reached, nor anything twice", () => {
    const start = cityStart("mihon");
    const noPhoto = restore(applyPlayerAction(start, at(1, 21 * 60, () => ({ playedDateIds: [DATE] }))));
    expect(noPhoto.sns?.posts).toEqual([]);
    const night = restore(applyPlayerAction(start, at(1, 21 * 60, datePlayed)));
    expect(deliverSns(night)).toBe(night);
    // A like of a post that has not come, or with a stale revision, changes nothing.
    expect(toggleSnsLike(noPhoto, P1, noPhoto.revision)).toBe(noPhoto);
    expect(toggleSnsLike(night, P1, night.revision - 1)).toBe(night);
  });

  it("delivers as a rest at the hotel before 21:00 passes the night", async () => {
    const { sleepAtHotel } = await import("./travel-game");
    const evening = restore(applyPlayerAction(cityStart("mihon"), at(1, 19 * 60, datePlayed)));
    expect(evening.sns?.posts).toEqual([]);
    const rested = sleepAtHotel(evening, "walk", evening.revision);
    expect(rested.sns?.posts.map((post) => [post.id, post.day, post.minute])).toEqual([[P1, 1, 19 * 60]]);
  });

  it("refuses a save whose record names what this build does not know", () => {
    const night = restore(applyPlayerAction(cityStart("mihon"), at(1, 21 * 60, datePlayed)));
    const sns = night.sns!;
    for (const wrong of [
      { ...sns, posts: [{ ...sns.posts[0], id: "smp_post_nowhere" }] },
      { ...sns, posts: [{ ...sns.posts[0], imageIds: ["smp_album_market"] }] },
      { ...sns, posts: [{ ...sns.posts[0], likes: [LILI, "smp_mihon_nobody"] }] },
      { ...sns, comments: [{ ...sns.comments[0], id: `${P2}.lili` }] },
      { ...sns, liked: [P2] },
      { ...sns, posts: [sns.posts[0], sns.posts[0]] },
    ]) expect(() => validateGameState({ ...night, sns: wrong })).toThrow();
    // A save written before the SNS: nothing came.
    const { sns: _none, ...old } = night;
    expect(validateGameState(old).sns).toBeUndefined();
  });

  it("reads the timeline, the pages and the night's arrivals for the screens", () => {
    const met = (state: GameState): Partial<GameState> => ({ metTimes: [{ id: TOMA, cityId: "mihon", day: 1, minute: 600, placeId: "mihon_clock_tower" }] });
    const first = restore(applyPlayerAction(cityStart("mihon", ["航", "澪"]), at(1, 21 * 60, (state) => ({ ...datePlayed(state), ...met(state) }))));
    const liked = toggleSnsLike(first, P1, first.revision);
    const second = restore(applyPlayerAction(liked, at(2, 21 * 60, flags("smp_mihon_bookmark_kept"))));
    expect(journeyHasSns(second)).toBe(true);
    const days = snsTimeline(second);
    expect(days.map((day) => [day.cityNameJa, day.day, day.heroine.map((post) => post.id), day.posts.map((post) => post.id)]))
      .toEqual([[expect.any(String), 2, [], [P2]], [expect.any(String), 1, [P1], []]]);
    const [tea] = days[1].heroine;
    expect(days[1].met.map((face) => face.id)).toEqual([TOMA]);
    expect(tea.line.textJa).toBe("航と、三時のお茶");
    expect(tea.author).toMatchObject({ id: "heroine", nameJa: "澪", characterId: "heroine" });
    expect(tea.photos).toEqual([expect.objectContaining({ imageId: "smp_album_clock_tower", path: expect.any(String), album: expect.objectContaining({ day: 1 }) })]);
    expect(tea.comments.map((comment) => [comment.writer.id, comment.lines.length, comment.arrived.day])).toEqual([[LILI, 2, 1], [TOMA, 1, 1], [LILI, 1, 1], [TOMA, 1, 2]]);
    expect(tea.likers.map((face) => face.id)).toEqual([LILI, TOMA]);
    expect(tea.liked).toBe(true);
    expect(days[0].posts[0].photos[0].placeNameJa).toEqual(expect.any(String));
    const page = snsPersonPage(second, TOMA)!;
    expect(page.note.met).toMatchObject({ day: 1, placeNameJa: expect.any(String) });
    expect(page.photos).toEqual([expect.objectContaining({ postId: P2, imageId: "smp_album_market" })]);
    expect(page.comments.map((item) => [item.post.postId, item.comment.id])).toEqual([[P1, `${P1}.toma_b`], [P1, `${P1}.later`]]);
    expect(page.withPhotos.map((item) => item.imageId)).toEqual(["smp_album_clock_tower"]);
    // Someone without a portrait has no page; the heroine's page has her one card.
    expect(snsPersonPage(second, "smp_mihon_clock_keeper")).toBeNull();
    expect(snsHeroinePage(second).days.map((day) => day.heroine.map((post) => post.id))).toEqual([[P1]]);
    const tonight = snsNightArrivals(second, { cityId: "mihon", day: 2 });
    expect([tonight.posts.map((post) => post.id), tonight.comments.map((item) => item.comment.id), tonight.faces.map((face) => face.id)])
      .toEqual([[P2], [`${P1}.later`], [TOMA]]);
    expect(snsNightArrivals(second, { cityId: "mihon", day: 3 })).toEqual({ posts: [], comments: [], faces: [] });
    expect(snsMetPeople(second)).toEqual([]);
  });
});
