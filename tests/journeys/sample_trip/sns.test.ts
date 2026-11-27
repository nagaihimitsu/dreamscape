import { beforeAll, describe, expect, it } from "vitest";
import { snsData } from "../../../src/content";
import { getJourney } from "../../../src/content/journeys";
import { cityStart } from "../../../src/dev/scenario-builders";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { applyPlayerAction } from "../../../src/domain/player-action";
import { snsTimeline } from "../../../src/features/journey/sns";

// The sample journey's SNS (fictional; its stories/posts/mihon.ink): the heroine's post of the date 「三時までの席」 comes on
// the night after the date took its photo, as content:build wrote it into src/content/generated/sns.json.

const DATE = "smp_mihon_date_tower_square";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));

beforeAll(() => {
  if (!getJourney("sample_trip")) throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してください。");
});

describe("the sample journey's SNS", () => {
  it("brings the date's post on its night, with the photo the date took", () => {
    expect(snsData.posts.find((post) => post.journeyId === "sample_trip")).toMatchObject({ id: "smp_post_mihon_three_seats", author: "heroine" });
    const played = (minute: number) => (state: GameState): GameState => ({
      ...state, revision: state.revision + 1, playedDateIds: [DATE],
      album: [{ imageId: "smp_album_clock_tower", cityId: "mihon", day: 1, minute: 900, placeId: "mihon_clock_tower", storyId: `places/smp_mihon_clock_tower.${DATE}` }],
      travel: { ...state.travel, currentPlaceId: state.travel.hotelPlaceId, minute },
    });
    expect(restore(applyPlayerAction(cityStart("mihon"), played(900))).sns?.posts).toEqual([]);
    const night = restore(applyPlayerAction(cityStart("mihon"), played(21 * 60)));
    expect(snsTimeline(night).map((day) => day.heroine.map((post) => [post.id, post.photos.map((photo) => photo.imageId)])))
      .toEqual([[["smp_post_mihon_three_seats", ["smp_album_clock_tower"]]]]);
    // リリ (the one sample person with a placeholder portrait) comments, the heroine replies, and リリ likes it.
    const [post] = snsTimeline(night)[0].heroine;
    expect(post.comments.map((comment) => comment.lines.map((line) => line.speaker.id)))
      .toEqual([["smp_mihon_lili", "heroine"]]);
    expect(post.likers.map((person) => person.id)).toEqual(["smp_mihon_lili"]);
  });
});
