import type { CSSProperties } from "react";
import { getAlbumImage } from "../../content";
import type { AlbumPhoto } from "../../domain/album-state";
import { ALBUM_IMAGE_ALT_JA } from "./album-pages";
import "./album-photo-notice.css";

/** How long the photo card stays (milliseconds); longer with the journey's first photo. */
export const ALBUM_PHOTO_NOTICE_MS = 4000;
export const FIRST_ALBUM_PHOTO_NOTICE_MS = 6000;

/**
 * The photo just taken, said for a moment (`id` changes with each new notice; `first`: the journey's first photo;
 * `fromLarge`: its line showed it large (the default since 2026-11-25; not `# photo_show: small`, nor a line 高速送り ran
 * past), so the card comes from that picture once the line goes; `flown`: that picture flew into ≡メニュー instead
 * (PhotoShowFlight; every photo but the journey's first), so the card is only said, not shown; `sound`: its line lets
 * the photo's sound ring (not quiet, no `# se:` of its own)).
 */
export type AlbumPhotoNoticeState = { id: number; photo: AlbumPhoto; first: boolean; fromLarge?: boolean; flown?: boolean; sound?: boolean };

/** Where the album is, said once, with the journey's first photo. */
export const ALBUM_PLACE_HINT_JA = "メニューの「旅の記録」の「写真」で見られます";

/**
 * 「写真の札」 (2026-11-12 user decision): a small card right under the header when a line's `# photo:` has just put a
 * photo in the album (GameApp: photoTaken on an action): the picture's small copy in a white frame, 「写真に残しました」
 * and its caption, and with the journey's first photo where the album is. It takes no taps and no focus (a tap on it
 * reaches the scene below), comes in, stays a few seconds and goes up toward ≡メニュー (album-photo-notice.css; still under
 * reduced motion and 「演出を短縮する」). Its status region stays mounted through the story scene (GameApp), so screen
 * readers announce the words politely when they are put into it. No credit: the album shows only the author's art.
 */
export function AlbumPhotoNotice({ notice }: { notice: AlbumPhotoNoticeState | null }) {
  const image = notice ? getAlbumImage(notice.photo.imageId) : undefined;
  const duration = notice?.first ? FIRST_ALBUM_PHOTO_NOTICE_MS : ALBUM_PHOTO_NOTICE_MS;
  return (
    <div className="album-photo-notice-region" role="status" data-testid="album-photo-notice">
      {notice?.flown && <p key={notice.id} className="sr-only">写真に残しました：{notice.photo.caption ?? ALBUM_IMAGE_ALT_JA}</p>}
      {notice && !notice.flown && (
        <div key={notice.id} className="album-photo-notice" data-from-large={notice.fromLarge || undefined}
          style={{ "--album-notice-ms": `${duration}ms` } as CSSProperties}>
          {image && <img className="album-photo-notice-picture" src={`${import.meta.env.BASE_URL}${image.path}`} alt="" decoding="async" />}
          <p className="album-photo-notice-text">
            <span className="album-photo-notice-label">写真に残しました</span>
            <span className="sr-only">：</span>
            <span className="album-photo-notice-caption">{notice.photo.caption ?? ALBUM_IMAGE_ALT_JA}</span>
            {/* Where the album is: for screen readers only (2026-11-27 user decision: no words of how-to on the scene). */}
            {notice.first && <span className="sr-only">。{ALBUM_PLACE_HINT_JA}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
