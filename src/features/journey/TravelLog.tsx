import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, ModalTitle } from "../../components/Modal";
import { CharacterFigure } from "../../components/CharacterPortrait";
import { Icon } from "../../components/icons";
import type { GameState } from "../../domain/game";
import { HeroineNote } from "../battle/HeroineNote";
import { albumSwipeStep } from "./album-pages";
import { MISSED_PHOTO_JA, travelLogCities, travelLogPhotos, type LogCity, type LogPhoto } from "./travel-log";
import "../battle/battle.css";
import "./city.css";
import "./travel-log.css";

const served = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/** The two axes of the log. */
type Axis = "lived" | "photos";
const KIND_JA: Record<"visit" | "finale" | "date", string> = { visit: "観光", finale: "都市フィナーレ", date: "デート" };
/** Photos opened larger: the list they are turned through and the one shown first. */
type Viewing = { photos: readonly LogPhoto[]; index: number };

/**
 * A sideways swipe on an element (albumSwipeStep): `onStep` with +1 (to the left: the next) or -1, and the click the
 * release may still fire swallowed. A mouse never swipes.
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

/**
 * 旅の記録 (2026-11-19 user decisions: 旅の記録 and アルバム made one; reshaped 2026-11-20; travel-log.ts): `extras` (旅の音楽室,
 * the end roll, the kept 旅の思い出), then the switch between its two axes:
 * - 「体験」: each city of the journey lived in, in its order, under its name; a tap on the name folds the city away (and
 *   back), as the list grows with the cities. In a city, each thing lived there as a card (its place's photo, kind, time when
 *   the save has it, place, clear title and record with its seal 「完」, and her few words looking back on the place, her
 *   face saying who speaks), then the people met there with their small standing pictures. `footer` (旅の数字) under it.
 * - 「写真」: every photo of the journey's album, the newest at the top left, as a close grid of square thumbnails; a tap
 *   opens them larger, in their own dialog over the log (PhotoViewer), which closes back to it. With `missedPhotos`
 *   (travel-log.ts showsMissedPhotos: the journey is over), the photos not taken yet follow in the story's order, in grey
 *   in the grid and opened larger alike (2026-11-20 user decision), a line above the grid saying what the grey ones are.
 * It takes no press for a moment (settlePresses) and closes with 「× 閉じる」, a tap on the dimmed page around, or Esc. It
 * shows no names, no city progress, no credit, no relationship value and no quiz score (the place photos' credits are in
 * 出典・権利の一覧).
 */
export function TravelLogDialog({ game, missedPhotos = false, extras, footer, onClose }: {
  game: GameState;
  missedPhotos?: boolean;
  extras?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const cities = useMemo(() => travelLogCities(game), [game]);
  const photos = useMemo(() => travelLogPhotos(game, missedPhotos), [game, missedPhotos]);
  const taken = photos.filter((photo) => !photo.missed).length;
  const [axis, setAxis] = useState<Axis>("lived");
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set());
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const lived = cities.reduce((sum, city) => sum + city.experiences.length, 0);
  const toggle = (cityId: string) => setFolded((current) => {
    const next = new Set(current);
    if (!next.delete(cityId)) next.add(cityId);
    return next;
  });

  return <>
    <Modal labelledBy="travel-log-title" className="travel-log" onClose={onClose} settlePresses closeOnBackdrop>
      <ModalTitle id="travel-log-title" onClose={onClose} closeTestId="travel-log-close">旅の記録</ModalTitle>
      {extras}
      <div className="travel-log-axes" role="group" aria-label="記録の見方">
        <button type="button" aria-pressed={axis === "lived"} data-testid="travel-log-lived" onClick={() => setAxis("lived")}>
          体験<span className="travel-log-count">{lived}</span></button>
        <button type="button" aria-pressed={axis === "photos"} data-testid="travel-log-photos" onClick={() => setAxis("photos")}>
          写真<span className="travel-log-count">{taken}</span></button>
      </div>
      {axis === "lived" ? <>
        {cities.map((city) => <LivedCity key={city.cityId} city={city} heroineName={game.heroineName}
          open={!folded.has(city.cityId)} onToggle={() => toggle(city.cityId)} />)}
        {footer}
      </> : <PhotoGrid photos={photos} onOpen={(index) => setViewing({ photos, index })} />}
    </Modal>
    {viewing && <PhotoViewer viewing={viewing} onClose={() => setViewing(null)} />}
  </>;
}

/** One city of 「体験」: its name (a button that folds it), the things lived there in the order lived, the people met there. */
function LivedCity({ city, heroineName, open, onToggle }: { city: LogCity; heroineName: string; open: boolean; onToggle: () => void }) {
  const body = `log-city-${city.cityId}`;
  return <section className="travel-log-city" data-testid={`log-city-${city.cityId}`} aria-labelledby={`${body}-name`}>
    <h3 className="travel-log-city-name">
      <button type="button" id={`${body}-name`} aria-expanded={open} aria-controls={body} onClick={onToggle}>
        <span>{city.cityJa}</span>
        <span className="travel-log-city-count">{city.experiences.length}</span>
        <Icon name="chevron-down" />
      </button>
    </h3>
    <div id={body} hidden={!open}>
      {city.experiences.length === 0
        ? <p className="travel-log-empty">この街での体験は、まだありません。訪ねた場所の思い出が、ここに残ります。</p>
        : <ol className="travel-log-lived">
          {city.experiences.map((item) => <li key={item.id} data-testid={`log-experience-${item.id}`}>
            <article className="travel-log-card" aria-labelledby={`log-title-${item.id}`}>
              {item.picture && <div className="album-photo travel-log-picture">
                <img src={served(item.picture.path)} alt={item.picture.altJa} loading="lazy" decoding="async" />
              </div>}
              <div className="travel-log-card-body">
                <p className="travel-log-where">{[KIND_JA[item.kind], item.whenJa, item.placeJa].filter(Boolean).join(" · ")}</p>
                <div className="stop-title">
                  <h4 id={`log-title-${item.id}`}>{item.titleJa}</h4>
                  <span className="stop-seal" aria-hidden="true">完</span>
                </div>
                <p className="travel-log-record">{item.descriptionJa}</p>
              </div>
              {item.heroine && <HeroineNote className="travel-log-heroine" label={heroineName} hideLabel text={item.heroine.textJa}
                cityId={item.heroine.cityId} testId={`log-heroine-${item.id}`} />}
            </article>
          </li>)}
        </ol>}
      {city.people.length > 0 && <section className="met-people" aria-labelledby={`${body}-people`} data-testid="met-people">
        <h4 id={`${body}-people`} className="travel-log-people-title">出会った人</h4>
        <dl>{city.people.map((person) => <div key={person.id} className="travel-log-person" data-testid={`met-person-${person.id}`}>
          <span className="travel-log-person-figure" aria-hidden="true">
            {person.characterId && <CharacterFigure characterId={person.characterId} cityId={city.cityId} />}
          </span>
          <div>
            <dt>{person.nameJa}</dt>
            {person.descriptionJa && <dd>{person.descriptionJa}</dd>}
          </div>
        </div>)}</dl>
      </section>}
    </div>
  </section>;
}

/**
 * 「写真」: the journey's album photos, the newest first, then any not taken yet (grey), as a close grid of square thumbnails.
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
          <img src={served(photo.path)} alt="" loading="lazy" decoding="async" />
        </button>
      </li>)}
    </ul>
  </>;
}

/**
 * Photos opened larger, over the log: the whole picture, its caption as the title, 「n日目 hh:mm · 場所」 (a photo not taken
 * yet: grey, 「都市 · まだ残していない写真」), and with more than one photo 「前の写真」「次の写真」 and 「2 / 5」 at the foot
 * (a sideways swipe on the picture and the arrow keys turn them too, in the grid's order). It closes back to the log with
 * 「× 閉じる」, a tap on the dimmed page around, or Esc.
 */
function PhotoViewer({ viewing, onClose }: { viewing: Viewing; onClose: () => void }) {
  const [index, setIndex] = useState(viewing.index);
  const frame = useRef<HTMLDivElement>(null);
  const { photos } = viewing;
  const last = photos.length - 1;
  const photo = photos[Math.min(index, last)];
  const go = (step: -1 | 1) => setIndex((current) => Math.max(0, Math.min(last, current + step)));
  const goRef = useRef(go);
  goRef.current = go;
  const swipe = useSwipe(go);
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
    <div ref={frame} className="photo-viewer-frame" {...swipe}>
      <img key={photo.imageId} src={served(photo.path)} alt={photo.altJa} className={photo.missed ? "is-missed" : undefined}
        data-testid="album-photo-large" />
    </div>
    <p className="album-meta">{photo.metaJa}</p>
    {photos.length > 1 && <nav className="photo-viewer-pager" aria-label="写真">
      <button type="button" className="album-page-button" disabled={index === 0} onClick={() => go(-1)}>前の写真</button>
      <p className="album-page-count" aria-live="polite">{index + 1} / {photos.length}</p>
      <button type="button" className="album-page-button" disabled={index === last} onClick={() => go(1)}>次の写真</button>
    </nav>}
  </Modal>;
}
