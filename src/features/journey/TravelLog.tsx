import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, ModalTitle } from "../../components/Modal";
import { ImageCredit } from "../../components/ImageCredit";
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

/**
 * 旅の記録 (2026-11-19 user decision: 旅の記録 and アルバム made one; travel-log.ts): the two names (and 「交際中」 once
 * together), `extras` (旅の音楽室, the end roll, the kept 旅の思い出), then one page per city in the journey's order, turned with
 * 「前の街」「次の街」, a sideways swipe on the page or the arrow keys. A page shows one of its two axes, chosen at its top and
 * kept as the pages turn: 「体験」, the city's progress and each thing lived there as a card (its picture, kind, place, clear
 * title and record, and her few words looking back on the place), then the people met there; 「写真」, the album's photos
 * taken there. An album photo opens larger, whole, in its own dialog over the log, which it closes back to. A place's
 * tourism photo (the card's picture when the story took none) carries its credit under it. `footer`: 旅の数字. It opens
 * on the city the party is in, takes no press for a moment (settlePresses), and closes with 「× 閉じる」, a tap on the
 * dimmed page around, or Esc. It shows no relationship value and no quiz score.
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
  const [enlarged, setEnlarged] = useState<AlbumPhotoView | null>(null);
  const book = useRef<HTMLDivElement>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
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
  const goRef = useRef(go);
  goRef.current = go;
  // A page button the turn disables (on the first or last page) hands the focus to the other one.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active === previousButton.current && shown === 0) nextButton.current?.focus({ preventScroll: true });
    else if (active === nextButton.current && shown === last) previousButton.current?.focus({ preventScroll: true });
  }, [shown, last]);
  // ←/→ turn the pages wherever the focus is in the log (not in the enlarged photo, nor with a modifier key).
  useEffect(() => {
    if (enlarged || pages.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.defaultPrevented ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const dialog = book.current?.closest("dialog");
      const target = event.target instanceof Element ? event.target : null;
      if (!dialog || !target || target.closest("dialog") !== dialog) return;
      event.preventDefault();
      goRef.current(event.key === "ArrowRight" ? 1 : -1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enlarged, pages.length]);

  return <>
    <Modal labelledBy="travel-log-title" className="travel-log" onClose={onClose} settlePresses closeOnBackdrop>
      <ModalTitle id="travel-log-title" onClose={onClose} closeTestId="travel-log-close">旅の記録</ModalTitle>
      <p className="records-travelers">
        <span data-testid="travelers">{game.playerName}<span className="amp"> と </span>{game.heroineName}</span>
        {game.endingReached && <span className="records-relationship">交際中</span>}
      </p>
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
        <section
          key={page.cityId}
          className="travel-log-page"
          data-turn={turn ?? undefined}
          data-testid="travel-log-page"
          aria-labelledby="travel-log-city"
          onPointerDown={(event) => {
            swiped.current = false;
            swipe.current = event.isPrimary && event.pointerType !== "mouse" ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY } : null;
          }}
          onPointerUp={(event) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || start.pointerId !== event.pointerId) return;
            const step = albumSwipeStep(event.clientX - start.x, event.clientY - start.y);
            if (!step) return;
            // The click this release may still fire would land on the next page's photo.
            swiped.current = true;
            go(step);
          }}
          onPointerCancel={() => { swipe.current = null; }}
          onClickCapture={(event) => {
            const afterSwipe = swiped.current;
            swiped.current = false;
            // A key's click (detail 0) is never the swipe's.
            if (!afterSwipe || event.detail === 0) return;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {axis === "lived" ? <LivedPage page={page} heroineName={game.heroineName} onEnlarge={setEnlarged} />
            : <PhotoPage page={page} onEnlarge={setEnlarged} />}
        </section>
        {pages.length > 1 && <nav className="album-pager" aria-label="旅の記録のページ">
          <button ref={previousButton} type="button" className="album-page-button" disabled={shown === 0} onClick={() => go(-1)}>前の街</button>
          <p className="album-page-count" aria-live="polite">
            {shown + 1} / {pages.length}<span className="sr-only">ページ、{page.cityJa}</span>
          </p>
          <button ref={nextButton} type="button" className="album-page-button" disabled={shown === last} onClick={() => go(1)}>次の街</button>
        </nav>}
      </div>}
      {footer}
    </Modal>
    {enlarged && <Modal labelledBy="album-photo-title" className="album-photo-viewer" onClose={() => setEnlarged(null)} closeOnBackdrop>
      <ModalTitle id="album-photo-title" onClose={() => setEnlarged(null)}>{enlarged.caption ?? enlarged.placeJa}</ModalTitle>
      <img src={served(enlarged.path)} alt={enlarged.altJa} data-testid="album-photo-large" />
      <p className="album-meta">{enlarged.whenJa} · {enlarged.placeJa}</p>
    </Modal>}
  </>;
}

/** 「体験」: the city's progress, the things lived there (newest last) and the people met there. */
function LivedPage({ page, heroineName, onEnlarge }: { page: LogPage; heroineName: string; onEnlarge: (photo: AlbumPhotoView) => void }) {
  return <>
    <p className="records-progress" data-testid="city-progress">{page.progressJa}</p>
    {page.experiences.length === 0
      ? <p className="travel-log-empty">この街での体験は、まだありません。訪ねた場所の思い出が、ここに残ります。</p>
      : <ol className="travel-log-lived">
        {page.experiences.map((item) => <li key={item.id} data-testid={`log-experience-${item.id}`}>
          <article className="travel-log-card" aria-labelledby={`log-title-${item.id}`}>
            {item.photo && <ExperiencePicture item={item} photos={page.photos} onEnlarge={onEnlarge} />}
            <div className="travel-log-card-body">
              <p className="travel-log-where">{KIND_JA[item.kind]}{item.placeJa && ` · ${item.placeJa}`}</p>
              <div className="stop-title">
                <h4 id={`log-title-${item.id}`}>{item.titleJa}</h4>
                {item.kind !== "date" && <span className="stop-seal" aria-hidden="true">完</span>}
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
      <dl>{page.people.map((person) => <div key={person.id} data-testid={`met-person-${person.id}`}>
        <dt>{person.nameJa}</dt>
        {person.descriptionJa && <dd>{person.descriptionJa}</dd>}
      </div>)}</dl>
    </section>}
  </>;
}

/**
 * A card's picture in a 3:2 frame: the story's own album photo (it opens larger, as on 「写真」), else the place's tourism
 * photo with its credit folded under it.
 */
function ExperiencePicture({ item, photos, onEnlarge }: { item: LogExperience; photos: readonly AlbumPhotoView[]; onEnlarge: (photo: AlbumPhotoView) => void }) {
  const picture = item.photo!;
  const own = picture.credit ? undefined : photos.find((photo) => photo.path === picture.path);
  return <figure className="travel-log-picture">
    {own
      ? <button type="button" className="album-photo" aria-label={`${picture.captionJa}の写真を大きく見る`} onClick={() => onEnlarge(own)}>
        <img src={served(picture.path)} alt={picture.altJa} loading="lazy" decoding="async" />
      </button>
      : <div className="album-photo"><img src={served(picture.path)} alt={picture.altJa} loading="lazy" decoding="async" /></div>}
    {picture.credit && <details className="travel-log-credit">
      <summary>画像の出典</summary>
      <ImageCredit asset={picture.credit} sourceLabelJa="元の画像" />
    </details>}
  </figure>;
}

/** 「写真」: the album's photos taken in the city, in the order taken. */
function PhotoPage({ page, onEnlarge }: { page: LogPage; onEnlarge: (photo: AlbumPhotoView) => void }) {
  if (page.photos.length === 0) return <p className="travel-log-empty" data-testid="album-empty">この街の写真は、まだありません。</p>;
  return <ul className="album-photos">
    {page.photos.map((photo) => <li key={photo.imageId}>
      <figure>
        <button type="button" className="album-photo" aria-label={`${photo.caption ?? photo.placeJa}の写真を大きく見る`}
          onClick={() => onEnlarge(photo)}>
          <img src={served(photo.path)} alt={photo.altJa} loading="lazy" decoding="async" />
        </button>
        <figcaption>
          {photo.caption !== undefined && <p className="album-caption">{photo.caption}</p>}
          <p className="album-meta">{photo.whenJa} · {photo.placeJa}</p>
        </figcaption>
      </figure>
    </li>)}
  </ul>;
}
