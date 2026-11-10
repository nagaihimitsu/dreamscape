import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { getCityContent, presentation } from "../../content";
import { derivedImagePath } from "../../content/derived-images";
import { getPlacePhoto } from "../../content/place-photo";
import { Icon } from "../../components/icons";
import { battlePlayed } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import { cardSummary } from "./PlaceCard";
import { nearestIndex, photoCardLabel, stepIndex, type CardArrangement, type PhotoCardEntry } from "./photo-cards";
import { placeDisplayName } from "./travel-labels";
import { whenLaidOut } from "./when-laid-out";
import "./travel-menu.css";

/** How long the row stays still before the card in its centre counts as chosen (a flick's momentum and snap included). */
const SETTLE_MS = 120;
const INSTANT = "instant" as ScrollBehavior;

const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !!document.querySelector(".app-shell.reduce-motion");

/** Whether one of the place's events has been played (today's map draws a white dot; a card names it). */
function placeVisited(game: GameState, placeId: string): boolean {
  return getCityContent(game.currentCityId).travel.events.some((event) => event.placeId === placeId &&
    (game.completedEpisodeIds.includes(event.id) || game.playedDateIds.includes(event.id) || battlePlayed(game, event.id)));
}

/**
 * B案's photo cards (docs/02 「自由時間の画面」). As a row: about three show, the one that settles in the centre after a
 * flick is chosen (CSS scroll snap), a press on a side card brings it to the centre and chooses it, and the chosen
 * place's introduction card (`card`) follows the row. As a list (short screens, large text, sideways): a press chooses
 * its row, the introduction card opens under it, and the pressed row stays where it was. A press never travels. The
 * chosen card is the list's one Tab stop; ←→ (in the list also ↑↓), Home and End move the choice.
 */
export function PhotoCardPicker({ game, entries, chosenId, onChoose, arrangement, label, testIdPrefix, recommendedId, card }: {
  game: GameState;
  /** At least one card. */
  entries: readonly PhotoCardEntry[];
  /** The chosen card (one of `entries`). */
  chosenId: string;
  onChoose: (placeId: string) => void;
  arrangement: CardArrangement;
  /** The list's accessible name. */
  label: string;
  /** Each card's testid: `${testIdPrefix}-${placeId}`. */
  testIdPrefix: string;
  recommendedId?: string | null;
  /** The chosen place's introduction card. */
  card: ReactNode;
}) {
  const list = useRef<HTMLUListElement>(null);
  const chosen = useRef(chosenId);
  chosen.current = chosenId;
  const settle = useRef(0);
  /** The arrangement the row was last placed in (a first placement is instant). */
  const placedIn = useRef<CardArrangement | null>(null);
  /** In the list, the pressed row's top before the press (the card above it may close). */
  const anchor = useRef<{ placeId: string; top: number } | null>(null);
  const row = arrangement === "row";
  const ids = entries.map((entry) => entry.place.id);
  const idsKey = ids.join(" ");
  const itemOf = (placeId: string) => list.current?.querySelector<HTMLElement>(`:scope > li[data-card-id="${CSS.escape(placeId)}"]`) ?? null;

  // The row keeps the chosen card in its centre; the list keeps a pressed row under the finger.
  useLayoutEffect(() => {
    const scroller = list.current;
    const item = itemOf(chosenId);
    if (!scroller || !item) return;
    if (!row) {
      placedIn.current = arrangement;
      const pressed = anchor.current;
      anchor.current = null;
      if (pressed?.placeId !== chosenId) return;
      const moved = item.getBoundingClientRect().top - pressed.top;
      if (Math.abs(moved) >= 1) window.scrollBy({ top: moved, behavior: INSTANT });
      return;
    }
    const centre = (behavior: ScrollBehavior) => {
      const left = item.offsetLeft + item.offsetWidth / 2 - scroller.clientWidth / 2;
      if (Math.abs(scroller.scrollLeft - left) >= 1) scroller.scrollTo({ left, behavior });
    };
    const behavior = placedIn.current === arrangement && !reducedMotion() ? "smooth" : INSTANT;
    placedIn.current = arrangement;
    return whenLaidOut(scroller, () => centre(behavior));
  // itemOf reads the list as rendered; the ids stand for the entries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenId, arrangement, idsKey]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  /** After a flick: the card that came to rest in the centre is chosen. */
  function onScroll() {
    if (!row) return;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const scroller = list.current;
      if (!scroller) return;
      const items = [...scroller.querySelectorAll<HTMLElement>(":scope > li[data-card-id]")];
      const index = nearestIndex(items.map((item) => item.offsetLeft + item.offsetWidth / 2), scroller.scrollLeft + scroller.clientWidth / 2);
      const placeId = index === null ? undefined : items[index].dataset.cardId;
      if (placeId && placeId !== chosen.current) onChoose(placeId);
    }, SETTLE_MS);
  }

  function choose(placeId: string) {
    const item = itemOf(placeId);
    if (!row && item && placeId !== chosenId) anchor.current = { placeId, top: item.getBoundingClientRect().top };
    onChoose(placeId);
  }

  const tabStop = ids.includes(chosenId) ? chosenId : ids[0];
  return <>
    <ul ref={list} className={`photo-cards${row ? "" : " is-list"}`} aria-label={label} onScroll={onScroll}>
      {entries.map((entry, index) => {
        const placeId = entry.place.id;
        const isChosen = placeId === chosenId;
        const name = placeDisplayName(game, entry.place.events[0].place);
        const summary = cardSummary(game, entry);
        const here = placeId === game.travel.currentPlaceId;
        const top = here ? "現在地" : placeId === recommendedId ? "おすすめ" : null;
        const visited = placeVisited(game, placeId);
        // Read out once each: the line under the name may already say 「現在地」.
        const marks = [top !== summary ? top : null, visited ? "訪問済み" : null].filter((mark): mark is string => !!mark);
        return <li key={placeId} data-card-id={placeId} data-testid={`${testIdPrefix}-${placeId}`} data-selected={isChosen ? "true" : undefined}>
          <button type="button" className={`photo-card${entry.available ? "" : " is-unavailable"}`} tabIndex={placeId === tabStop ? 0 : -1}
            aria-current={isChosen ? "true" : undefined}
            aria-label={photoCardLabel({ position: index + 1, count: entries.length, name, summary, marks })}
            onClick={() => choose(placeId)}
            onKeyDown={(key) => {
              // ↑↓ scroll the page past a row (they move the choice in the list only).
              if (row && (key.key === "ArrowUp" || key.key === "ArrowDown")) return;
              const next = stepIndex(index, entries.length, key.key);
              if (next === null) return;
              key.preventDefault();
              const target = entries[next].place.id;
              if (target !== chosenId) onChoose(target);
              // The row brings the chosen card to its centre itself; in the list the focus shows the row.
              itemOf(target)?.querySelector<HTMLElement>(".photo-card")?.focus({ preventScroll: row });
            }}>
            <span className="photo-card-photo">
              <CardPhoto game={game} entry={entry} />
              {top && <span className="photo-card-chip is-top" aria-hidden="true">{top}</span>}
              {visited && <span className="photo-card-chip is-bottom" aria-hidden="true">訪問済み</span>}
            </span>
            <span className="photo-card-text" aria-hidden="true">
              <span className="photo-card-name">{isChosen && <span className="travel-selected-badge">◆</span>}{name}</span>
              <span className="photo-card-summary">{summary}</span>
            </span>
          </button>
          {!row && isChosen && card}
        </li>;
      })}
    </ul>
    {row && card}
  </>;
}

/**
 * A card's photo: the reduced `card` copy of the place's registered photo (its credit is in 「写真の出典」), or, for a
 * place without one, today's plain tile in its background colour with the kind's mark (the hotel: a bed).
 */
function CardPhoto({ game, entry }: { game: GameState; entry: PhotoCardEntry }) {
  const place = entry.place.events[0].place;
  const photo = getPlacePhoto(game.currentCityId, place.id);
  if (photo) return <img src={`${import.meta.env.BASE_URL}${derivedImagePath(photo, "card")}`} alt="" width={240} height={160} loading="lazy" decoding="async" />;
  const date = entry.events.every((choice) => choice.event.category === "date");
  return <span className="photo-card-plain" style={{ backgroundColor: presentation.backgrounds[place.backgroundId]?.color }}>
    {place.id === game.travel.hotelPlaceId ? <Icon name="bed" /> : date ? "♡" : "◇"}
  </span>;
}
