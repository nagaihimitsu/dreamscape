import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, ModalTitle } from "../../components/Modal";
import { ImageCredit } from "../../components/ImageCredit";
import { CharacterFigure } from "../../components/CharacterPortrait";
import { Icon } from "../../components/icons";
import { playSe } from "../../audio/sound-effects";
import type { GameState } from "../../domain/game";
import { HeroineNote } from "../battle/HeroineNote";
import { albumSwipeStep, initialAlbumPage, type AlbumPhotoView } from "./album-pages";
import { travelLogPages, type LogExperience, type LogPage } from "./travel-log";
import "../battle/battle.css";
import "./city.css";
import "./travel-log.css";

const served = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/** The two axes of a city's page. */
type Axis = "lived" | "photos";
const KIND_JA: Record<LogExperience["kind"], string> = { visit: "観光", finale: "都市フィナーレ", date: "デート" };
/** Photos opened larger: the list they are turned through and the one shown first. */
type Viewing = { photos: readonly AlbumPhotoView[]; index: number };

/**
 * A sideways swipe on an element (albumSwipeStep): `onStep` with +1 (to the left: the next) or -1, and the click the
 * release may still fire swallowed, so it never lands on what the turn put under the finger. A mouse never swipes.
 */
function useSwipe(onStep: (step: -1 | 1) => void) {
  const start = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return {
    onPointerDown: (event: React.PointerEvent) => {
      swiped.current = false;
      start.current = event.isPrimary && event.pointerType !== "mouse" ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY } : null;
    },
    onPointerUp: (event: React.PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from || from.pointerId !== event.pointerId) return;
      const step = albumSwipeStep(event.clientX - from.x, event.clientY - from.y);
      if (!step) return;
      swiped.current = true;
      onStep(step);
    },
    onPointerCancel: () => { start.current = null; },
    onClickCapture: (event: React.MouseEvent) => {
      const afterSwipe = swiped.current;
      swiped.current = false;
      // A key's click (detail 0) is never the swipe's.
      if (!afterSwipe || event.detail === 0) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}

/** ←/→ while the focus is inside `within`'s dialog (no modifier key): `onStep`. Off while `active` is false. */
function useArrowKeys(within: React.RefObject<HTMLElement | null>, active: boolean, onStep: (step: -1 | 1) => void) {
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.defaultPrevented ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const dialog = within.current?.closest("dialog");
      const target = event.target instanceof Element ? event.target : null;
      if (!dialog || !target || target.closest("dialog") !== dialog) return;
      event.preventDefault();
      stepRef.current(event.key === "ArrowRight" ? 1 : -1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [within, active]);
}

/**
 * 旅の記録 (2026-11-19 user decisions: 旅の記録 and アルバム made one; travel-log.ts): `extras` (旅の音楽室, the end roll, the
 * kept 旅の思い出), then one page per city in the journey's order, turned with 「前の街」「次の街」, a sideways swipe on the page
 * or the arrow keys. A page shows one of its two axes, chosen at its top and kept as the pages turn:
 * - 「体験」: the city's progress and each thing lived there as a card (its picture, kind, time when the save has it, place,
 *   clear title and record with its seal 「完」, and her few words looking back on the place), then the people met there with
 *   their small standing pictures (head to waist), and `footer` (旅の数字). A card whose stories took album photos opens them all, larger, on a tap
 *   (its count on the picture when more than one); a place's tourism photo (the card's picture when its stories took none)
 *   carries its credit under it.
 * - 「写真」: the album's photos taken there as a close grid of square thumbnails; a tap opens them larger.
 * The photos open in their own dialog over the log (PhotoViewer), which it closes back to. It opens on the city the party
 * is in, takes no press for a moment (settlePresses), and closes with 「× 閉じる」, a tap on the dimmed page around, or Esc.
 * It shows no names, no relationship value and no quiz score.
 */
export function TravelLogDialog({ game, extras, footer, onClose }: {
  game: GameState;
  extras?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const pages = useMemo(() => travelLogPages(game), [game]);
  const [index, setIndex] = useState(() => initialAlbumPage(pages, game.currentCityId));
  const [axis, setAxis] = useState<Axis>("lived");
  const [turn, setTurn] = useState<"next" | "back" | null>(null);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const book = useRef<HTMLDivElement>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const last = pages.length - 1;
  const shown = Math.min(index, Math.max(0, last));
  const page = pages[shown];
  const go = (step: -1 | 1) => {
    const target = Math.max(0, Math.min(last, shown + step));
    if (target === shown) return;
    playSe("ui_page");
    setTurn(step > 0 ? "next" : "back");
    setIndex(target);
  };
  const swipe = useSwipe(go);
  useArrowKeys(book, !viewing && pages.length > 1, go);
  // A page button the turn disables (on the first or last page) hands the focus to the other one.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active === previousButton.current && shown === 0) nextButton.current?.focus({ preventScroll: true });
    else if (active === nextButton.current && shown === last) previousButton.current?.focus({ preventScroll: true });
  }, [shown, last]);
  const open = (photos: readonly AlbumPhotoView[], at: number) => setViewing({ photos, index: at });

  return <>
    <Modal labelledBy="travel-log-title" className="travel-log" onClose={onClose} settlePresses closeOnBackdrop>
      <ModalTitle id="travel-log-title" onClose={onClose} closeTestId="travel-log-close">旅の記録</ModalTitle>
      {extras}
      {page && <div className="travel-log-book" ref={book}>
        <div className="travel-log-head">
          <h3 id="travel-log-city">{page.cityJa}</h3>
          <div className="travel-log-axes" role="group" aria-label="記録の見方">
            <button type="button" aria-pressed={axis === "lived"} data-testid="travel-log-lived" onClick={() => setAxis("lived")}>
              体験<span className="travel-log-count">{page.experiences.length}</span></button>
            <button type="button" aria-pressed={axis === "photos"} data-testid="travel-log-photos" onClick={() => setAxis("photos")}>
              写真<span className="travel-log-count">{page.photos.length}</span></button>
          </div>
        </div>
        <section key={page.cityId} className="travel-log-page" data-turn={turn ?? undefined} data-testid="travel-log-page"
          aria-labelledby="travel-log-city" {...swipe}>
          {axis === "lived" ? <LivedPage page={page} heroineName={game.heroineName} onOpen={open} />
            : <PhotoGrid page={page} onOpen={open} />}
        </section>
        {pages.length > 1 && <nav className="album-pager" aria-label="旅の記録のページ">
          <button ref={previousButton} type="button" className="album-page-button" disabled={shown === 0} onClick={() => go(-1)}>前の街</button>
          <p className="album-page-count" aria-live="polite">
            {shown + 1} / {pages.length}<span className="sr-only">ページ、{page.cityJa}</span>
          </p>
          <button ref={nextButton} type="button" className="album-page-button" disabled={shown === last} onClick={() => go(1)}>次の街</button>
        </nav>}
      </div>}
      {axis === "lived" && footer}
    </Modal>
    {viewing && <PhotoViewer viewing={viewing} onClose={() => setViewing(null)} />}
  </>;
}

/** 「体験」: the city's progress, the things lived there in the order lived, and the people met there. */
function LivedPage({ page, heroineName, onOpen }: { page: LogPage; heroineName: string; onOpen: (photos: readonly AlbumPhotoView[], at: number) => void }) {
  return <>
    <p className="records-progress" data-testid="city-progress">{page.progressJa}</p>
    {page.experiences.length === 0
      ? <p className="travel-log-empty">この街での体験は、まだありません。訪ねた場所の思い出が、ここに残ります。</p>
      : <ol className="travel-log-lived">
        {page.experiences.map((item) => <li key={item.id} data-testid={`log-experience-${item.id}`}>
          <article className="travel-log-card" aria-labelledby={`log-title-${item.id}`}>
            {item.photo && <ExperiencePicture item={item} onOpen={onOpen} />}
            <div className="travel-log-card-body">
              <p className="travel-log-where">{[KIND_JA[item.kind], item.whenJa, item.placeJa].filter(Boolean).join(" · ")}</p>
              <div className="stop-title">
                <h4 id={`log-title-${item.id}`}>{item.titleJa}</h4>
                <span className="stop-seal" aria-hidden="true">完</span>
              </div>
              <p className="travel-log-record">{item.descriptionJa}</p>
            </div>
            {item.heroine && <HeroineNote className="travel-log-heroine" label={heroineName} text={item.heroine.textJa}
              cityId={item.heroine.cityId} testId={`log-heroine-${item.id}`} />}
          </article>
        </li>)}
      </ol>}
    {page.people.length > 0 && <section className="met-people" aria-labelledby={`log-people-${page.cityId}`} data-testid="met-people">
      <h4 id={`log-people-${page.cityId}`} className="travel-log-people-title">出会った人</h4>
      <dl>{page.people.map((person) => <div key={person.id} className="travel-log-person" data-testid={`met-person-${person.id}`}>
        <span className="travel-log-person-figure" aria-hidden="true">
          {person.characterId && <CharacterFigure characterId={person.characterId} cityId={page.cityId} />}
        </span>
        <div>
          <dt>{person.nameJa}</dt>
          {person.descriptionJa && <dd>{person.descriptionJa}</dd>}
        </div>
      </div>)}</dl>
    </section>}
  </>;
}

/**
 * A card's picture in a 3:2 frame: the latest album photo its stories took, which opens all of them larger (their count
 * on it when more than one), else its place's tourism photo with the credit folded under it.
 */
function ExperiencePicture({ item, onOpen }: { item: LogExperience; onOpen: (photos: readonly AlbumPhotoView[], at: number) => void }) {
  const picture = item.photo!;
  const at = picture.credit ? -1 : item.photos.findIndex((photo) => photo.path === picture.path);
  const image = <img src={served(picture.path)} alt={picture.altJa} loading="lazy" decoding="async" />;
  return <figure className="travel-log-picture">
    {at >= 0
      ? <button type="button" className="album-photo" data-testid={`log-photos-${item.id}`}
        aria-label={item.photos.length > 1 ? `${item.titleJa}の写真${item.photos.length}枚を大きく見る` : `${picture.captionJa}の写真を大きく見る`}
        onClick={() => onOpen(item.photos, at)}>
        {image}
        {item.photos.length > 1 && <span className="travel-log-photo-count" aria-hidden="true"><Icon name="camera" />{item.photos.length}</span>}
      </button>
      : <div className="album-photo">{image}</div>}
    {picture.credit && <details className="travel-log-credit">
      <summary>画像の出典</summary>
      <ImageCredit asset={picture.credit} sourceLabelJa="元の画像" />
    </details>}
  </figure>;
}

/** 「写真」: the album's photos taken in the city, in the order taken, as a close grid of square thumbnails. */
function PhotoGrid({ page, onOpen }: { page: LogPage; onOpen: (photos: readonly AlbumPhotoView[], at: number) => void }) {
  if (page.photos.length === 0) return <p className="travel-log-empty" data-testid="album-empty">この街の写真は、まだありません。</p>;
  return <ul className="travel-log-grid" data-testid="travel-log-grid">
    {page.photos.map((photo, at) => <li key={photo.imageId}>
      <button type="button" aria-label={`${photo.caption ?? photo.placeJa}の写真を大きく見る`} onClick={() => onOpen(page.photos, at)}>
        <img src={served(photo.path)} alt="" loading="lazy" decoding="async" />
      </button>
    </li>)}
  </ul>;
}

/**
 * Photos opened larger, over the log: the whole picture, its caption as the title, 「n日目 hh:mm · 場所」, and with more than
 * one photo 「前の写真」「次の写真」 and 「2 / 5」 at the foot (a sideways swipe on the picture and the arrow keys turn them
 * too). It closes back to the log with 「× 閉じる」, a tap on the dimmed page around, or Esc.
 */
function PhotoViewer({ viewing, onClose }: { viewing: Viewing; onClose: () => void }) {
  const [index, setIndex] = useState(viewing.index);
  const frame = useRef<HTMLDivElement>(null);
  const { photos } = viewing;
  const last = photos.length - 1;
  const photo = photos[Math.min(index, last)];
  const go = (step: -1 | 1) => setIndex((current) => Math.max(0, Math.min(last, current + step)));
  const swipe = useSwipe(go);
  useArrowKeys(frame, photos.length > 1, go);
  return <Modal labelledBy="album-photo-title" className="album-photo-viewer" onClose={onClose} closeOnBackdrop>
    <ModalTitle id="album-photo-title" onClose={onClose}>{photo.caption ?? photo.placeJa}</ModalTitle>
    <div ref={frame} className="photo-viewer-frame" {...swipe}>
      <img key={photo.imageId} src={served(photo.path)} alt={photo.altJa} data-testid="album-photo-large" />
    </div>
    <p className="album-meta">{photo.whenJa} · {photo.placeJa}</p>
    {photos.length > 1 && <nav className="photo-viewer-pager" aria-label="写真">
      <button type="button" className="album-page-button" disabled={index === 0} onClick={() => go(-1)}>前の写真</button>
      <p className="album-page-count" aria-live="polite">{index + 1} / {photos.length}</p>
      <button type="button" className="album-page-button" disabled={index === last} onClick={() => go(1)}>次の写真</button>
    </nav>}
  </Modal>;
}
