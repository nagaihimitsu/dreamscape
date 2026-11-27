import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, ModalTitle } from "../../components/Modal";
import { NewDot } from "../../components/fx";
import type { GameState } from "../../domain/game";
import { JourneyNumbersCard } from "./JourneyNumbers";
import type { JourneyNumbers } from "./journey-numbers";
import { journeyHasSns, type SnsPhotoView, type SnsPostView } from "./sns";
import { SnsView } from "./SnsView";
import { MISSED_PHOTO_JA, travelLogPhotos, type LogPhoto } from "./travel-log";
import { formatTravelTime } from "./travel-time";
import { useSwipe } from "./useSwipe";
import "./travel-log.css";

const served = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/** The two axes of the log. */
type Axis = "sns" | "photos";
/** Photos opened larger: the list they are turned through and the one shown first. */
type Viewing = { photos: readonly LogPhoto[]; index: number };

/** What 旅の記録 gives the SNS: the comments new as it opened, the post to open on, the player's like (none: a kept journey). */
export type TravelLogSns = {
  /** Something arrived that 「SNS」 has not shown yet (its dot; 旅の記録 then opens on it). */
  isNew?: boolean;
  newIds?: ReadonlySet<string>;
  openPostId?: string;
  onShown?: () => void;
  onLike?: (postId: string) => void;
};

/**
 * 旅の記録 (2026-11-19 user decisions: 旅の記録 and アルバム made one; 2026-11-27: 「体験」 made 「SNS」): `extras` (旅の音楽室,
 * the end roll, the kept 旅の思い出), then the switch between its two axes:
 * - 「SNS」 (SnsView.tsx; only for a journey with posts, journeyHasSns): the nights' posts and comments, the people met and
 *   their pages, the heroine's page with 旅の数字 (`numbers`).
 * - 「写真」: every photo of the journey's album, the newest at the top left, as a close grid of square thumbnails (their
 *   reduced copies); a tap opens them larger, in their own dialog over the log (PhotoViewer), which closes back to it. With
 *   `missedPhotos` (travel-log.ts showsMissedPhotos: the journey is over), the photos not taken yet follow in the story's
 *   order, in grey in the grid and opened larger alike (2026-11-20 user decision), a line above the grid saying what the
 *   grey ones are. A journey without an SNS has 旅の数字 under it.
 * A tab with something new has a small dot (this tab's memory: GameApp). It opens on 「SNS」 when something came there (or
 * to open a post), else on 「写真」 when a photo is new (`photosNew`), else on 「SNS」 when there is one. `onPhotosShown` and
 * the SNS's `onShown` tell when each is on show, so what it has counts as seen.
 * It takes no press for a moment (settlePresses) and closes with 「× 閉じる」, a tap on the dimmed page around, or Esc. It
 * shows no city progress, no credit, no relationship value and no quiz score.
 */
export function TravelLogDialog({ game, missedPhotos = false, photosNew = false, onPhotosShown, sns = {}, numbers = null, reduceMotion = false, extras, onClose }: {
  game: GameState;
  missedPhotos?: boolean;
  photosNew?: boolean;
  onPhotosShown?: () => void;
  sns?: TravelLogSns;
  numbers?: JourneyNumbers | null;
  reduceMotion?: boolean;
  extras?: ReactNode;
  onClose: () => void;
}) {
  const hasSns = journeyHasSns(game);
  const photos = useMemo(() => travelLogPhotos(game, missedPhotos), [game, missedPhotos]);
  const taken = photos.filter((photo) => !photo.missed).length;
  const [axis, setAxis] = useState<Axis>(() => !hasSns ? "photos" : sns.isNew || sns.openPostId ? "sns" : photosNew ? "photos" : "sns");
  // The comments new as 旅の記録 opened keep their dots while it is open.
  const [newIds] = useState(() => sns.newIds ?? new Set<string>());
  useEffect(() => {
    if (axis === "photos") onPhotosShown?.();
    else sns.onShown?.();
  // As a tab comes on show (and while it shows, what arrives meanwhile: `game`).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, game.album, game.sns]);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  /** A photo of the SNS opened larger: in the album's order when it is an album photo there, else on its own. */
  function openSnsPhoto(photo: SnsPhotoView, post?: SnsPostView) {
    const index = photos.findIndex((item) => item.imageId === photo.imageId);
    if (index >= 0) return setViewing({ photos, index });
    if (!photo.path) return;
    const when = post ? (post.arrived ? `${post.arrived.day}日目` : post.pastJa ?? "") : photo.album ? `${photo.album.day}日目 ${formatTravelTime(photo.album.minute)}` : "";
    setViewing({ index: 0, photos: [{ imageId: photo.imageId, path: photo.path, thumbPath: photo.thumbPath ?? photo.path,
      altJa: post?.line.textJa ?? "", titleJa: post ? `${post.author.nameJa}の写真` : "写真",
      metaJa: [when, photo.placeNameJa].filter(Boolean).join(" · "), missed: false }] });
  }

  return <>
    <Modal labelledBy="travel-log-title" className="travel-log" onClose={onClose} settlePresses closeOnBackdrop>
      <ModalTitle id="travel-log-title" onClose={onClose} closeTestId="travel-log-close">旅の記録</ModalTitle>
      {extras}
      {hasSns && <div className="travel-log-axes" role="group" aria-label="記録の見方">
        <button type="button" aria-pressed={axis === "sns"} data-testid="travel-log-sns" onClick={() => setAxis("sns")}>
          SNS{sns.isNew && axis !== "sns" && <NewDot label="新しい投稿・コメントあり" />}</button>
        <button type="button" aria-pressed={axis === "photos"} data-testid="travel-log-photos" onClick={() => setAxis("photos")}>
          写真<span className="travel-log-count">{taken}</span>{photosNew && axis !== "photos" && <NewDot label="新しい写真あり" />}</button>
      </div>}
      {!hasSns && <h3 className="travel-log-photos-title">写真<span className="travel-log-count">{taken}</span></h3>}
      {axis === "sns" ? <SnsView game={game} newIds={newIds} openPostId={sns.openPostId} numbers={numbers} reduceMotion={reduceMotion}
        onLike={sns.onLike} onPhoto={openSnsPhoto} />
        : <>
          <PhotoGrid photos={photos} onOpen={(index) => setViewing({ photos, index })} />
          {!hasSns && numbers && <JourneyNumbersCard numbers={numbers} reduceMotion={reduceMotion} />}
        </>}
    </Modal>
    {viewing && <PhotoViewer viewing={viewing} onClose={() => setViewing(null)} />}
  </>;
}

/**
 * 「写真」: the journey's album photos, the newest first, then any not taken yet (grey), as a close grid of square thumbnails
 * (five to a row, about seven on a wide screen; 2026-11-27), each the picture's reduced copy.
 * Grey is not the only sign of one not taken: a line above the grid says what the grey ones are, and its button's name says so.
 */
export function PhotoGrid({ photos, onOpen }: { photos: readonly LogPhoto[]; onOpen: (index: number) => void }) {
  if (photos.length === 0) return <p className="travel-log-empty" data-testid="album-empty">まだ写真はありません。</p>;
  return <>
    {photos.some((photo) => photo.missed) &&
      <p className="travel-log-photos-note" data-testid="album-missed-note">灰色の写真は、まだ残していない写真です。</p>}
    <ul className="travel-log-grid" data-testid="travel-log-grid">
      {photos.map((photo, index) => <li key={photo.imageId}>
        <button type="button" className={photo.missed ? "is-missed" : undefined} data-testid={photo.missed ? "album-missed" : undefined}
          aria-label={photo.missed ? `${photo.titleJa}（${MISSED_PHOTO_JA}）を大きく見る` : `${photo.titleJa}の写真を大きく見る`}
          onClick={() => onOpen(index)}>
          <img src={served(photo.thumbPath)} alt="" loading="lazy" decoding="async" />
        </button>
      </li>)}
    </ul>
  </>;
}

/**
 * Photos opened larger, over the log: the whole picture, its caption as the title, 「n日目 hh:mm · 場所」 (a photo not taken
 * yet: grey, 「都市 · まだ残していない写真」), and with more than one photo 「前の写真」「次の写真」 and 「2 / 5」 at the foot
 * (a sideways swipe or flick on the picture and the arrow keys turn them too, in the grid's order). The picture goes along
 * with a finger moved sideways (useSwipe; only a little at either end) and the photo turned to comes in from the side it
 * was pulled from (2026-11-27 user request; none with less motion); the photos either side are fetched beforehand. It
 * closes back to the log with 「× 閉じる」, a tap on the dimmed page around, or Esc.
 */
function PhotoViewer({ viewing, onClose }: { viewing: Viewing; onClose: () => void }) {
  const [index, setIndex] = useState(viewing.index);
  /** The way the last turn went (+1: to the next), for the photo turned to to come in from its side. */
  const [turn, setTurn] = useState<-1 | 0 | 1>(0);
  const frame = useRef<HTMLDivElement>(null);
  const { photos } = viewing;
  const last = photos.length - 1;
  const at = Math.min(index, last);
  const photo = photos[at];
  const go = (step: -1 | 1) => {
    const next = Math.max(0, Math.min(last, at + step));
    if (next === at) return;
    setTurn(step);
    setIndex(next);
  };
  const goRef = useRef(go);
  goRef.current = go;
  const swipe = useSwipe(go, { canStep: (step) => step === 1 ? at < last : at > 0 });
  // The photos either side, fetched beforehand so the one turned to is there as it comes in.
  useEffect(() => {
    for (const near of [photos[at - 1], photos[at + 1]]) if (near) new Image().src = served(near.path);
  }, [photos, at]);
  // ←/→ turn the photos while the focus is in this dialog (no modifier key).
  useEffect(() => {
    if (photos.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.defaultPrevented ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const dialog = frame.current?.closest("dialog");
      const target = event.target instanceof Element ? event.target : null;
      if (!dialog || !target || target.closest("dialog") !== dialog) return;
      event.preventDefault();
      goRef.current(event.key === "ArrowRight" ? 1 : -1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [photos.length]);
  return <Modal labelledBy="album-photo-title" className="album-photo-viewer" onClose={onClose} closeOnBackdrop>
    <ModalTitle id="album-photo-title" onClose={onClose}>{photo.titleJa}</ModalTitle>
    <div ref={frame} className="photo-viewer-frame" data-turn={turn === 1 ? "next" : turn === -1 ? "prev" : undefined} {...swipe}>
      <img key={photo.imageId} src={served(photo.path)} alt={photo.altJa} className={photo.missed ? "is-missed" : undefined}
        data-testid="album-photo-large" />
    </div>
    <p className="album-meta">{photo.metaJa}</p>
    {photos.length > 1 && <nav className="photo-viewer-pager" aria-label="写真">
      <button type="button" className="album-page-button" disabled={at === 0} onClick={() => go(-1)}>前の写真</button>
      <p className="album-page-count" aria-live="polite">{at + 1} / {photos.length}</p>
      <button type="button" className="album-page-button" disabled={at === last} onClick={() => go(1)}>次の写真</button>
    </nav>}
  </Modal>;
}
