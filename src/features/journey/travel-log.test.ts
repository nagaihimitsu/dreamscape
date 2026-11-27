// 旅の記録 (2026-11-19 user decision: 旅の記録 and アルバム made one; 2026-11-27: 「体験」 made 「SNS」, SnsView.tsx and its
// tests in src/domain/sns.test.ts): 「写真」, the album the newest first, five to a row from its reduced copies, and for a
// journey without posts the log's one page.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cityStart } from "../../dev/scenario-builders";
import type { AlbumPhoto } from "../../domain/album-state";
import { MISSED_PHOTO_JA, travelLogPhotos } from "./travel-log";
import { PhotoGrid, TravelLogDialog } from "./TravelLog";

const delhiArrival: AlbumPhoto = { imageId: "gt_album_d001", caption: "路地の将軍カムラ", cityId: "delhi", day: 1, minute: 600,
  placeId: "delhi_hotel_hub", storyId: "places/gt_delhi_hotel_hub.gt_delhi_arrival" };

describe("旅の記録's dialog", () => {
  it("is 「写真」 alone for a journey without posts, with no quiz score or names line", () => {
    // ミラノ編 has no posts (インド編 has デリー's since 2026-11-27) and no album photos yet.
    const html = renderToStaticMarkup(createElement(TravelLogDialog, { game: cityStart("milano", ["航", "澪"]), onClose: () => {} }));
    expect(html).not.toContain("travel-log-sns");
    expect(html).toContain('class="travel-log-photos-title">写真<span class="travel-log-count">0</span>');
    expect(html).not.toContain("航");
    expect(html).not.toMatch(/挑戦|最高|手がかり \d/u);
  });

  it("reads each photo's square copy for the grid, and the photo itself opened larger", () => {
    const [photo] = travelLogPhotos({ ...cityStart("agra"), album: [delhiArrival] });
    expect(photo.thumbPath).toMatch(/^assets\/derived\/golden_triangle\/gt_album_d001\.thumb\.webp$/u);
    expect(photo.path).toMatch(/^assets\/album\/gt_album_d001\./u);
    const grid = renderToStaticMarkup(createElement(PhotoGrid, { photos: [photo], onOpen: () => {} }));
    expect(grid).toContain("gt_album_d001.thumb.webp");
  });

  it("counts the photos taken only, and greys the ones not taken yet with a line that says what grey means (2026-11-20)", () => {
    const state = { ...cityStart("agra"), album: [delhiArrival] };
    const grid = renderToStaticMarkup(createElement(PhotoGrid, { photos: travelLogPhotos(state, true), onOpen: () => {} }));
    expect(grid).toContain("灰色の写真は、まだ残していない写真です。");
    expect(grid).toContain('aria-label="路地の将軍カムラの写真を大きく見る"');
    expect(grid).toContain('class="is-missed" data-testid="album-missed" aria-label="十三人目（まだ残していない写真）を大きく見る"');
    expect(grid.match(/class="is-missed"/gu)).toHaveLength(travelLogPhotos(state, true).length - 1);
    expect(travelLogPhotos(state, true).at(-1)?.metaJa).toContain(MISSED_PHOTO_JA);
    expect(renderToStaticMarkup(createElement(PhotoGrid, { photos: travelLogPhotos(state), onOpen: () => {} }))).not.toContain("灰色");
  });
});
