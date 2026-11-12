import type { CSSProperties } from "react";
import { getAlbumImage } from "../../content";
import type { AlbumPhoto } from "../../domain/album-state";
import { ALBUM_IMAGE_ALT_JA } from "./album-pages";
import "./album-photo-notice.css";

/** How long the photo card stays (milliseconds); longer with the first photo's hint, which has a line more to read. */
export const ALBUM_PHOTO_NOTICE_MS = 4000;
export const FIRST_ALBUM_PHOTO_NOTICE_MS = 6000;

/** The photo just taken, said for a moment (`id` changes with each new notice; `first`: the journey's first photo). */
export type AlbumPhotoNoticeState = { id: number; photo: AlbumPhoto; first: boolean };

/** Where the album is, said once, with the journey's first photo. */
export const ALBUM_PLACE_HINT_JA = "⚙設定の「アルバム」で見られます";

/**
 * 「写真の札」 (2026-11-12 user decision): a small card right under the header when a line's `# photo:` has just put a
 * photo in the album (GameApp: photoTaken on an action): the picture's small copy in a white frame, 「アルバムに入れました」
 * and its caption, and with the journey's first photo where the album is. It takes no taps and no focus (a tap on it
 * reaches the scene below), comes in, stays a few seconds and goes up toward ⚙設定 (album-photo-notice.css; still under
 * reduced motion and 「演出を短縮する」). Its status region stays mounted through the story scene (GameApp), so screen
 * readers announce the words politely when they are put into it. No credit: the album shows only the author's art.
 */
export function AlbumPhotoNotice({ notice }: { notice: AlbumPhotoNoticeState | null }) {
  const image = notice ? getAlbumImage(notice.photo.imageId) : undefined;
  const duration = notice?.first ? FIRST_ALBUM_PHOTO_NOTICE_MS : ALBUM_PHOTO_NOTICE_MS;
  return (
    <div className="album-photo-notice-region" role="status" data-testid="album-photo-notice">
      {notice && (
        <div key={notice.id} className="album-photo-notice" style={{ "--album-notice-ms": `${duration}ms` } as CSSProperties}>
          {image && <img className="album-photo-notice-picture" src={`${import.meta.env.BASE_URL}${image.path}`} alt="" decoding="async" />}
          <p className="album-photo-notice-text">
            <span className="album-photo-notice-label">アルバムに入れました</span>
            <span className="sr-only">：</span>
            <span className="album-photo-notice-caption">{notice.photo.caption ?? ALBUM_IMAGE_ALT_JA}</span>
            {notice.first && <span className="album-photo-notice-hint">{ALBUM_PLACE_HINT_JA}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
