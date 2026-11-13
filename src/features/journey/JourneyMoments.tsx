import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_ITEM_ICON } from "../../content/code-images";
import { Icon } from "../../components/icons";
import { Modal } from "../../components/Modal";
import { playSe } from "../../audio/sound-effects";
import { reducedMotionNow, useNightCard } from "./NightRest";
import type { ChapterStampCard, EndRoll, EpisodeTitleCard, MomentPhoto, PackedItem, Packing, ResumeRecap } from "./journey-moments";
import "./journey-moments.css";

// The journey's moments (2026-11-11 user decision; the rules in journey-moments.ts, GameApp's useJourneyMoments shows them):
// the title card as an episode begins, the stamp as it ends (2026-11-13), the recap of a resumed game, the packing as the party
// leaves a city, the credit roll at the end of a journey. None of them changes the game or shows a relationship value.

/** How long the title card shows (ms): it fades in, holds and fades to the scene. Reduced motion: still, a little shorter. */
const TITLE_MS = 2400;
const TITLE_REDUCED_MS = 1800;
/** The chapter's stamp (ms): it drops on and lands (its sound then), holds about a second and fades; journey-moments.css's timeline matches. */
const STAMP_MS = 1600;
const STAMP_LAND_MS = 260;
/** How long the packing shows (ms; its items come in one after another). Reduced motion: still. */
const PACKING_MS = 4200;
const PACKING_REDUCED_MS = 3600;
/** The credit roll's pace (px a second). */
const ROLL_PX_PER_SECOND = 32;

const served = (path: string) => `${import.meta.env.BASE_URL}${path}`;

/**
 * 話の始まりの題名の札: as an episode's first part begins (its guide, observation or battle), its title over the place's
 * photo for a moment, like a drama's title card. Over the whole screen (a portal) and over the scene, which waits for
 * it (`data-obstructs-dialogue`: no typing, auto-advance or reading on). It ends by itself (2.4 s), or at once on a tap
 * or Enter, Space or Esc, as the night cards do (useNightCard: the tap that led here and the second tap of a double tap
 * press nothing). Reduced motion: nothing moves or fades, it shows still for 1.8 s (the title is the information; there
 * is no fade to wait for). Screen readers hear the place and the title from a live region; the focus stays where it is.
 */
export function EpisodeTitle({ card, reduceMotion, onEnd }: { card: EpisodeTitleCard; reduceMotion: boolean; onEnd: () => void }) {
  const { reduced, announced, end } = useNightCard({ reduceMotion, ms: TITLE_MS, reducedMs: TITLE_REDUCED_MS, onEnd });
  useEffect(() => playSe("episode_title"), []);
  const [photoFailed, setPhotoFailed] = useState(false);
  return createPortal(<div className={`episode-title-card${reduced ? " is-reduced" : ""}`} data-testid="episode-title-card"
    data-obstructs-dialogue="" onClick={end}>
    {card.photo && !photoFailed && <img className="episode-title-photo" src={served(card.photo.path)} alt="" decoding="async"
      onError={() => setPhotoFailed(true)} />}
    <div className="episode-title-text" aria-hidden="true">
      <p className="episode-title-place">{card.finale ? `${card.placeJa} · 都市フィナーレ` : card.placeJa}</p>
      <span className="episode-title-rule" />
      <p className="episode-title-name">{card.titleJa}</p>
    </div>
    <p className="sr-only" role="status">{announced ? `${card.placeJa}。${card.titleJa}` : ""}</p>
  </div>, document.body);
}

/**
 * 話の終わりの「完」の判 (2026-11-13 user decision): when an episode has been completed in play, on the screen the player comes
 * back to after it (useJourneyMoments), a round red-brown seal with the episode's title and 「完」 drops onto the middle of the
 * screen with a slight overshoot, holds about a second and fades (1.6 s), and `stamp` sounds as it lands. It takes nothing:
 * taps pass through it (pointer-events: none), the focus stays, nothing waits for it. Its timers start on the next frame, so
 * a stamp a visual covers in the same moment (a rest at the day's end) waits for it unseen and unheard; `onStart` says it has
 * begun. Reduced motion: it fades in and out in place. A picture only (aria-hidden): the result screen has said the clear.
 */
export function ChapterStamp({ stamp, reduceMotion, onStart, onEnd }: {
  stamp: ChapterStampCard;
  reduceMotion: boolean;
  onStart: () => void;
  onEnd: () => void;
}) {
  const [reduced] = useState(() => reducedMotionNow(reduceMotion));
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  useEffect(() => {
    let landed = 0;
    let ended = 0;
    const frame = window.requestAnimationFrame(() => {
      onStartRef.current();
      landed = window.setTimeout(() => playSe("stamp"), STAMP_LAND_MS);
      ended = window.setTimeout(() => onEndRef.current(), STAMP_MS);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(landed);
      window.clearTimeout(ended);
    };
  }, []);
  return <div className={`chapter-stamp${reduced ? " is-reduced" : ""}`} data-testid="chapter-stamp" aria-hidden="true">
    <div className="chapter-stamp-seal">
      <span className="chapter-stamp-title">{stamp.titleJa}</span>
      <span className="chapter-stamp-mark">完</span>
    </div>
  </div>;
}

/**
 * The departure's dialog's list (「{都市}へ出発」, 2026-11-13; departureLuggage): 「持っていく品物」, the held items that go on to
 * the next city, and 「この街に置いていく品物」, those that stay, each with its icon and name. A part with no item is left out;
 * nothing shows when nothing is held. Read-only.
 */
export function DepartureLuggage({ carried, left }: { carried: readonly PackedItem[]; left: readonly PackedItem[] }) {
  const part = (titleJa: string, items: readonly PackedItem[], className = "") => items.length > 0 && <section className={`departure-items${className}`}>
    <h3>{titleJa}</h3>
    <ul>{items.map((item) => <li key={item.id}>
      <img src={served(item.iconPath ?? DEFAULT_ITEM_ICON)} alt="" width={28} height={28} />
      <span>{item.nameJa}</span>
    </li>)}</ul>
  </section>;
  return <>
    {part("持っていく品物", carried)}
    {part("この街に置いていく品物", left, " is-left")}
  </>;
}

/**
 * 前回までのあらすじ: a card at the top of free time or the night screen when a resumed game opens there (the page's start
 * with a save, 「ロード」): the city, day and time, the last episode completed (its clear title and record) and the album's
 * latest photo (the author's illustration in a 3:2 frame, no credit). In the page's flow; nothing waits for it, and it goes
 * with 「閉じる」 or when the screen changes.
 */
export function ResumeRecapCard({ recap, onClose }: { recap: ResumeRecap; onClose: () => void }) {
  return <section className="resume-recap" aria-labelledby="resume-recap-title" data-testid="resume-recap">
    <div className="resume-recap-head">
      <div>
        <h2 id="resume-recap-title" className="resume-recap-title">前回までのあらすじ</h2>
        <p className="resume-recap-when">{recap.cityJa} · {recap.whenJa}</p>
      </div>
      <button type="button" className="resume-recap-close" onClick={onClose}><Icon name="close" />閉じる</button>
    </div>
    <div className="resume-recap-body">
      {recap.photo && <RecapPhoto photo={recap.photo} />}
      <div className="resume-recap-chapter">
        {recap.chapter.cityJa && <p className="resume-recap-city">{recap.chapter.cityJa}で</p>}
        <h3>{recap.chapter.titleJa}</h3>
        <p>{recap.chapter.descriptionJa}</p>
      </div>
    </div>
  </section>;
}

function RecapPhoto({ photo }: { photo: MomentPhoto }) {
  return <figure className="resume-recap-photo">
    <img src={served(photo.path)} alt={photo.altJa} decoding="async" />
    <figcaption>{photo.caption ?? photo.placeJa}</figcaption>
  </figure>;
}

/** The words of the packing (its live region): 「荷造り。持って行く物：A、B。デリーに置いていく物：C。」 */
export function packingSentenceJa(packing: Packing): string {
  const names = (items: readonly PackedItem[]) => items.map((item) => item.nameJa).join("、");
  return `荷造り。${packing.carried.length ? `持って行く物：${names(packing.carried)}。` : ""}${
    packing.left.length ? `${packing.fromCityJa}に置いていく物：${names(packing.left)}。` : ""}`;
}

/**
 * 荷造りの場面: right after the departure (its scenes ran before it, then the items were left behind; the save already holds
 * the next city), before the next city's arrival shows: the suitcase with the held items that go along and, apart, the items
 * left in the city left (names and icons, read-only). GameApp shows it in place of the screen, so the arrival's title card
 * waits for it. It ends by itself (4.2 s), or on a tap or Enter, Space or Esc (useNightCard); reduced motion: still, 3.6 s.
 * Never shown when no item was held (packingOf).
 */
export function PackingScene({ packing, reduceMotion, onEnd }: { packing: Packing; reduceMotion: boolean; onEnd: () => void }) {
  const { reduced, announced, end } = useNightCard({ reduceMotion, ms: PACKING_MS, reducedMs: PACKING_REDUCED_MS, onEnd });
  return <section className={`packing-scene${reduced ? " is-reduced" : ""}`} data-testid="packing-scene" data-obstructs-dialogue="" onClick={end}>
    <div className="packing-content" aria-hidden="true">
      <p className="packing-eyebrow">荷造り</p>
      <p className="packing-title">{packing.fromCityJa}を発つ</p>
      {packing.carried.length > 0 && <div className="packing-case">
        <span className="packing-case-handle" />
        <p className="packing-label">持って行く物</p>
        <PackedList items={packing.carried} />
      </div>}
      {packing.left.length > 0 && <div className="packing-left">
        <p className="packing-label">{packing.fromCityJa}に置いていく物</p>
        <PackedList items={packing.left} />
      </div>}
      <p className="packing-next">{packing.toCityJa}へ</p>
    </div>
    <p className="sr-only" role="status">{announced ? packingSentenceJa(packing) : ""}</p>
  </section>;
}

function PackedList({ items }: { items: readonly PackedItem[] }) {
  return <ul className="packing-items">
    {items.map((item, index) => <li key={item.id} style={{ "--packing-index": index } as CSSProperties}>
      <img src={served(item.iconPath ?? DEFAULT_ITEM_ICON)} alt="" width={32} height={32} />
      <span>{item.nameJa}</span>
    </li>)}
  </ul>;
}

/**
 * 旅の終わりのエンドロール: when the journey ends (its last city's epilogue read), a dialog over the whole screen: the two
 * names, then each city of the journey with the clear titles of its episodes, the people met there and its album photos
 * (the author's illustrations in a 3:2 frame, no credit), the names again at the end. It rolls up slowly by itself; a tap on it, Enter or
 * Space (on the roll) or 「止める」 pauses it and 「続ける」 goes on; 「閉じる」 or Esc ends it. It stops at its end. With
 * reduced motion it does not roll: a list that scrolls by hand. Opened under the finger of the epilogue's last tap, it takes
 * no press for a moment (settlePresses). No relationship value is in it.
 */
export function EndRollDialog({ roll, reduceMotion, onClose }: { roll: EndRoll; reduceMotion: boolean; onClose: () => void }) {
  const [still] = useState(() => reducedMotionNow(reduceMotion));
  const [playing, setPlaying] = useState(!still);
  const [ended, setEnded] = useState(still);
  const scroller = useRef<HTMLDivElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const area = scroller.current;
    if (!playing || !area) return;
    let last: number | null = null;
    let carried = 0;
    let frame = window.requestAnimationFrame(function step(now) {
      // Whole pixels only (a fraction set to scrollTop is dropped); the rest is carried to the next frame.
      carried += last === null ? 0 : ((now - last) * ROLL_PX_PER_SECOND) / 1000;
      last = now;
      const whole = Math.floor(carried);
      if (whole > 0) {
        area.scrollTop += whole;
        carried -= whole;
      }
      if (area.scrollTop + area.clientHeight >= area.scrollHeight - 1) {
        setPlaying(false);
        setEnded(true);
        return;
      }
      frame = window.requestAnimationFrame(step);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);
  // At its end 「止める・続ける」 has nothing left to do: the focus it had goes to 「閉じる」.
  useLayoutEffect(() => {
    if (ended && document.activeElement === toggleButton.current) closeButton.current?.focus({ preventScroll: true });
  }, [ended]);
  const toggle = () => { if (!ended) setPlaying((value) => !value); };
  const names = <p className="end-roll-names">{roll.playerName}<span> と </span>{roll.heroineName}</p>;
  return <Modal labelledBy="end-roll-title" className={`end-roll${still ? " is-still" : ""}`} onClose={onClose} settlePresses>
    <div ref={scroller} className="end-roll-scroller" tabIndex={0} role="region" aria-labelledby="end-roll-title" data-testid="end-roll"
      onClick={(event) => { if (!(event.target as Element).closest("a, button, summary")) toggle(); }}
      onKeyDown={(event) => {
        // (A still list keeps Space for scrolling.)
        if (still || event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        toggle();
      }}>
      <div className="end-roll-content">
        <p className="end-roll-eyebrow">旅の終わり</p>
        <h2 id="end-roll-title" className="end-roll-title">{roll.journeyJa || "旅の記録"}</h2>
        {names}
        {roll.cities.map((city) => <section key={city.id} className="end-roll-city" aria-labelledby={`end-roll-city-${city.id}`}>
          <h3 id={`end-roll-city-${city.id}`}>{city.nameJa}</h3>
          {city.chapters.length > 0 && <>
            <p className="end-roll-label">物語</p>
            <ol className="end-roll-list">{city.chapters.map((title, index) => <li key={index}>{title}</li>)}</ol>
          </>}
          {city.people.length > 0 && <>
            <p className="end-roll-label">出会った人</p>
            <ul className="end-roll-list">{city.people.map((name, index) => <li key={index}>{name}</li>)}</ul>
          </>}
          {city.photos.length > 0 && <>
            <p className="end-roll-label">写真</p>
            <ul className="end-roll-photos">
              {city.photos.map((photo) => <li key={photo.imageId}>
                <figure>
                  <img src={served(photo.path)} alt={photo.altJa} loading="lazy" decoding="async" />
                  <figcaption>{photo.caption ?? photo.placeJa} · {photo.whenJa}</figcaption>
                </figure>
              </li>)}
            </ul>
          </>}
        </section>)}
        <div className="end-roll-last">{names}</div>
      </div>
    </div>
    <div className="end-roll-bar">
      {!still && <button ref={toggleButton} type="button" className="secondary" disabled={ended} onClick={toggle}>{playing ? "止める" : "続ける"}</button>}
      <button ref={closeButton} type="button" className="primary" data-testid="end-roll-close" onClick={onClose}>閉じる</button>
    </div>
  </Modal>;
}
