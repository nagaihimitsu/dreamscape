import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { getCityContent, presentation } from "../../content";
import { derivedImagePath } from "../../content/derived-images";
import { getPlacePhoto } from "../../content/place-photo";
import { Icon } from "../../components/icons";
import { battlePlayed } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import { nearestIndex, photoCardLabel, stepIndex, type CardArrangement, type PhotoCardEntry, type RowCard } from "./photo-cards";
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
 * B案's photo cards (docs/02 「自由時間の画面」): the places, the tour and 「ホテルに戻る」. As a row: about three show, the
 * one that settles in the centre after a flick is chosen (CSS scroll snap), a press on a side card brings it to the
 * centre and chooses it, and the chosen card's card (`card`) follows the row. As a list (short screens, large text,
 * sideways): a press chooses its row, the card opens under it, and the pressed row stays where it was. A press never
 * travels. The chosen card is the list's one Tab stop; ←→ (in the list also ↑↓), Home and End move the choice.
 */
export function PhotoCardPicker({ game, cards, chosenId, onChoose, arrangement, recommendedId, card }: {
  game: GameState;
  /** At least one card. */
  cards: readonly RowCard[];
  /** The chosen card (one of `cards`). */
  chosenId: string;
  onChoose: (cardId: string) => void;
  arrangement: CardArrangement;
  recommendedId?: string | null;
  /** The chosen card's card (a place's introduction, 「ホテルに戻る」's or the tour's). */
  card: ReactNode;
}) {
  const list = useRef<HTMLUListElement>(null);
  const chosen = useRef(chosenId);
  chosen.current = chosenId;
  const settle = useRef(0);
  /** The arrangement the row was last placed in (a first placement is instant). */
  const placedIn = useRef<CardArrangement | null>(null);
  /** In the list, the pressed row's top before the press (the card above it may close). */
  const anchor = useRef<{ cardId: string; top: number } | null>(null);
  const row = arrangement === "row";
  const ids = cards.map((item) => item.id);
  const idsKey = ids.join(" ");
  const itemOf = (cardId: string) => list.current?.querySelector<HTMLElement>(`:scope > li[data-card-id="${CSS.escape(cardId)}"]`) ?? null;

  // The row keeps the chosen card in its centre; the list keeps a pressed row under the finger.
  useLayoutEffect(() => {
    const scroller = list.current;
    const item = itemOf(chosenId);
    if (!scroller || !item) return;
    if (!row) {
      placedIn.current = arrangement;
      const pressed = anchor.current;
      anchor.current = null;
      if (pressed?.cardId !== chosenId) return;
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
  // itemOf reads the list as rendered; the ids stand for the cards.
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
      const cardId = index === null ? undefined : items[index].dataset.cardId;
      if (cardId && cardId !== chosen.current) onChoose(cardId);
    }, SETTLE_MS);
  }

  function choose(cardId: string) {
    const item = itemOf(cardId);
    if (!row && item && cardId !== chosenId) anchor.current = { cardId, top: item.getBoundingClientRect().top };
    onChoose(cardId);
  }

  const tabStop = ids.includes(chosenId) ? chosenId : ids[0];
  return <>
    <ul ref={list} className={`photo-cards${row ? "" : " is-list"}`} aria-label="行き先" onScroll={onScroll}>
      {cards.map((rowCard, index) => {
        const face = cardFace(game, rowCard, recommendedId);
        const isChosen = rowCard.id === chosenId;
        const marks = [face.top, face.bottom, face.available ? null : "今は行けない"].filter((mark): mark is string => !!mark);
        return <li key={rowCard.id} data-card-id={rowCard.id} data-testid={face.testId} data-selected={isChosen ? "true" : undefined}>
          <button type="button" className={`photo-card${face.available ? "" : " is-unavailable"}`} tabIndex={rowCard.id === tabStop ? 0 : -1}
            aria-current={isChosen ? "true" : undefined}
            aria-label={photoCardLabel({ position: index + 1, count: cards.length, name: face.name, marks })}
            onClick={() => choose(rowCard.id)}
            onKeyDown={(key) => {
              // ↑↓ scroll the page past a row (they move the choice in the list only).
              if (row && (key.key === "ArrowUp" || key.key === "ArrowDown")) return;
              const next = stepIndex(index, cards.length, key.key);
              if (next === null) return;
              key.preventDefault();
              const target = cards[next].id;
              if (target !== chosenId) onChoose(target);
              // The row brings the chosen card to its centre itself; in the list the focus shows the row.
              itemOf(target)?.querySelector<HTMLElement>(".photo-card")?.focus({ preventScroll: row });
            }}>
            <span className="photo-card-photo">
              {face.photo}
              {face.top && <span className="photo-card-chip is-top" aria-hidden="true">{face.top}</span>}
              {face.bottom && <span className="photo-card-chip is-bottom" aria-hidden="true">{face.bottom}</span>}
            </span>
            <span className="photo-card-text" aria-hidden="true">
              <span className="photo-card-name">{isChosen && <span className="travel-selected-badge">◆</span>}{face.name}</span>
            </span>
          </button>
          {!row && isChosen && card}
        </li>;
      })}
    </ul>
    {row && card}
  </>;
}

/** What a card shows: its name, its photo or plain tile, its marks over the photo (top and bottom) and its testid. */
function cardFace(game: GameState, card: RowCard, recommendedId: string | null | undefined): {
  testId: string;
  name: string;
  available: boolean;
  top: string | null;
  bottom: string | null;
  photo: ReactNode;
} {
  if (card.kind === "stay") {
    const hotel = getCityContent(game.currentCityId).travel.places.find((place) => place.id === game.travel.hotelPlaceId);
    return { testId: "travel-stay", name: "ホテルに戻る", available: true, top: null, bottom: null,
      photo: <PlainTile color={hotel && presentation.backgrounds[hotel.backgroundId]?.color}><Icon name="bed" /></PlainTile> };
  }
  if (card.kind === "tour")
    return { testId: "travel-tour", name: "ツアー", available: true, top: game.tour?.status === "booked" ? "予約済み" : null, bottom: null,
      photo: <PlainTile><Icon name="ticket" /></PlainTile> };
  const { entry } = card;
  const placeId = entry.place.id;
  return {
    testId: `travel-place-${placeId}`,
    name: placeDisplayName(game, entry.place.events[0].place),
    available: entry.available,
    top: placeId === game.travel.currentPlaceId ? "現在地" : placeId === recommendedId ? "おすすめ" : null,
    bottom: placeVisited(game, placeId) ? "訪問済み" : null,
    photo: <PlacePhoto game={game} entry={entry} />,
  };
}

/** A tile in place of a photo: the place's background colour (else the slate) with a mark. */
function PlainTile({ color, children }: { color?: string; children: ReactNode }) {
  return <span className="photo-card-plain" style={color ? { backgroundColor: color } : undefined}>{children}</span>;
}

/**
 * A place's photo: the reduced `card` copy of its registered photo (its credit is in ⚙設定's 「写真の出典」), or, for a
 * place without one, today's plain tile in its background colour with the mark of what is there (♡ dates only, else ◇).
 */
function PlacePhoto({ game, entry }: { game: GameState; entry: PhotoCardEntry }) {
  const place = entry.place.events[0].place;
  const photo = getPlacePhoto(game.currentCityId, place.id);
  if (photo) return <img src={`${import.meta.env.BASE_URL}${derivedImagePath(photo, "card")}`} alt="" width={240} height={160} loading="lazy" decoding="async" />;
  const date = entry.events.every((choice) => choice.event.category === "date");
  return <PlainTile color={presentation.backgrounds[place.backgroundId]?.color}>{date ? "♡" : "◇"}</PlainTile>;
}
