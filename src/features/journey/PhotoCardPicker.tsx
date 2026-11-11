import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { getCityContent, presentation } from "../../content";
import { derivedImagePath } from "../../content/derived-images";
import { getPlacePhoto } from "../../content/place-photo";
import { Icon } from "../../components/icons";
import { battlePlayed } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import {
  cardKinds, cardScales, nearestIndex, photoCardLabel, stepIndex, takesSwipe, type CardArrangement, type CardKinds, type PhotoCardEntry,
  type RowCard,
} from "./photo-cards";
import { placeDisplayName } from "./travel-labels";
import { centreOf, INSTANT, reducedMotion, rowItems, useCardGestures, type CardSwipe } from "./useCardGestures";
import { whenLaidOut } from "./when-laid-out";
import "./travel-menu.css";

/** How long the row stays still before the card in its centre counts as chosen (a flick's momentum and snap included). */
const SETTLE_MS = 120;

/** Whether one of the place's events has been played (a card names it; the maps' 「行った場所」 reads more: visited-places.ts). */
function placeVisited(game: GameState, placeId: string): boolean {
  return getCityContent(game.currentCityId).travel.events.some((event) => event.placeId === placeId &&
    (game.completedEpisodeIds.includes(event.id) || game.playedDateIds.includes(event.id) || battlePlayed(game, event.id)));
}

/**
 * B案's photo cards (docs/02 「自由時間の画面」): 「待機」, the places, the tour and 「ホテルに戻る」. As a row: three show whole, the
 * chosen one in the middle and a smaller one on each side (each card's size follows its distance from the centre), the
 * one that settles in the centre after a flick is chosen (CSS scroll snap; a sideways drag anywhere on the screen moves
 * the row too), a press on a side card brings it to the centre and chooses it, 「m / n」 under the row says where it is
 * (counting every card), and the chosen card's card (`card`) follows the row. The chosen place's card departs on a swipe
 * up (`swipe`; useCardGestures: from the row, or from anywhere on the screen once the page has nothing left below) or
 * Enter, never on a press; 「待機」's waits and 「ホテルに戻る」's rests the same way (photo-cards.ts takesSwipe). As a list
 * (short screens, large text, sideways): a press chooses its row, the card opens
 * under it (with its 「行く」), and the pressed row stays where it was. The chosen card is the list's one Tab stop; ←→ (in
 * the list also ↑↓), Home and End move the choice.
 */
export function PhotoCardPicker({ game, cards, chosenId, onChoose, arrangement, recommendedId, card, swipe }: {
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
  /** The chosen card's swipe up (a place's, 「待機」's or 「ホテルに戻る」's), or null. */
  swipe: CardSwipe | null;
}) {
  const list = useRef<HTMLUListElement>(null);
  const chosen = useRef(chosenId);
  chosen.current = chosenId;
  const swipeRef = useRef(swipe);
  swipeRef.current = swipe;
  const settle = useRef(0);
  /** Set while a sideways drag of the screen moves the row (useCardGestures): the row chooses once it is let go. */
  const driving = useRef(false);
  /** The arrangement the row was last placed in (a first placement is instant). */
  const placedIn = useRef<CardArrangement | null>(null);
  /** In the list, the pressed row's top before the press (the card above it may close). */
  const anchor = useRef<{ cardId: string; top: number } | null>(null);
  const row = arrangement === "row";
  const gestures = useCardGestures({ row, chosen, swipe: swipeRef, list, driving, settle: settleSoon });
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

  // In the row each card's size follows its distance from the centre (photo-cards.ts cardScales), every frame the row
  // scrolls or changes size: the card coming to the centre grows as it comes (with reduced motion, at once).
  useLayoutEffect(() => {
    const scroller = list.current;
    if (!scroller || !row) return;
    const small = parseFloat(getComputedStyle(scroller).getPropertyValue("--card-small")) || 0.38;
    let frame = 0;
    const update = () => {
      frame = 0;
      const items = rowItems(scroller);
      const scales = cardScales(items.map(centreOf), scroller.scrollLeft + scroller.clientWidth / 2, items[0]?.offsetWidth ?? 0, small, reducedMotion());
      items.forEach((item, index) => item.style.setProperty("--card-scale", String(scales[index])));
    };
    const later = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", later, { passive: true });
    const resized = new ResizeObserver(later);
    resized.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", later);
      resized.disconnect();
    };
  }, [row, idsKey]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  /** After a flick or a drag let go: the card that came to rest in the centre is chosen. */
  function settleSoon() {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const scroller = list.current;
      // A drag of the screen still holds the row: it settles once let go.
      if (!scroller || driving.current) return;
      // The snap, off while that drag moved the row, is back now that the row is still (on a card's centre).
      scroller.style.removeProperty("scroll-snap-type");
      const items = rowItems(scroller);
      const index = nearestIndex(items.map(centreOf), scroller.scrollLeft + scroller.clientWidth / 2);
      const cardId = index === null ? undefined : items[index].dataset.cardId;
      if (cardId && cardId !== chosen.current) onChoose(cardId);
    }, SETTLE_MS);
  }
  function onScroll() {
    if (row && !driving.current) settleSoon();
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
        const classes = ["photo-card", face.kinds === "none" ? null : `is-${face.kinds}`, face.available ? null : "is-unavailable"];
        return <li key={rowCard.id} data-card-id={rowCard.id} data-testid={face.testId} data-selected={isChosen ? "true" : undefined}>
          <button type="button" className={classes.filter((name) => name).join(" ")} tabIndex={rowCard.id === tabStop ? 0 : -1}
            aria-current={isChosen ? "true" : undefined} data-cue={row && isChosen && swipe?.go ? "true" : undefined}
            aria-label={photoCardLabel({ position: index + 1, count: cards.length, name: face.name, marks })}
            // A drag that started on it clicks nothing (useCardGestures takes that click away).
            onClick={() => choose(rowCard.id)}
            onKeyDown={(key) => {
              // Enter on the chosen card departs, waits or rests as its swipe up does (a held key's repeats do nothing).
              if (key.key === "Enter" && gestures.takesEnter(rowCard.id)) {
                key.preventDefault();
                if (!key.repeat) gestures.enter();
                return;
              }
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
              {face.swipeable && <span className="photo-card-cue" />}
            </span>
          </button>
          {!row && isChosen && card}
        </li>;
      })}
    </ul>
    {row && <p className="photo-cards-count" aria-hidden="true">{ids.indexOf(chosenId) + 1} / {cards.length}</p>}
    {row && card}
  </>;
}

/**
 * What a card shows: its name, its photo or plain tile, its marks over the photo (top and bottom), its fill (what the
 * place holds), whether a swipe up takes it (takesSwipe: a place's departing, or at the current place starting there;
 * 「待機」's waiting; 「ホテルに戻る」's resting; shown by the swipe cue's motion, no words) and its testid.
 */
function cardFace(game: GameState, card: RowCard, recommendedId: string | null | undefined): {
  testId: string;
  name: string;
  available: boolean;
  top: string | null;
  bottom: string | null;
  photo: ReactNode;
  kinds: CardKinds;
  swipeable: boolean;
} {
  const kinds = cardKinds(card);
  const swipeable = takesSwipe(card);
  if (card.kind === "wait")
    return { testId: "travel-wait", name: "待機", available: true, top: null, bottom: null, kinds, swipeable,
      photo: <PlainTile><Icon name="hourglass" /></PlainTile> };
  if (card.kind === "stay") {
    const hotel = getCityContent(game.currentCityId).travel.places.find((place) => place.id === game.travel.hotelPlaceId);
    // The inn's own photo (a travel place's photoAssetId) when it has one, else the bed on its background colour.
    const hotelPhoto = getPlacePhoto(game.currentCityId, game.travel.hotelPlaceId);
    return { testId: "travel-stay", name: "ホテルに戻る", available: true, top: null, bottom: null, kinds, swipeable,
      photo: hotelPhoto
        ? <img src={`${import.meta.env.BASE_URL}${derivedImagePath(hotelPhoto, "card")}`} alt="" width={240} height={160} loading="lazy" decoding="async" draggable={false} />
        : <PlainTile color={hotel && presentation.backgrounds[hotel.backgroundId]?.color}><Icon name="bed" /></PlainTile> };
  }
  if (card.kind === "tour")
    return { testId: "travel-tour", name: "ツアー", available: true, top: game.tour?.status === "booked" ? "予約済み" : null, bottom: null, kinds, swipeable,
      photo: <PlainTile><Icon name="ticket" /></PlainTile> };
  const { entry } = card;
  const placeId = entry.place.id;
  const here = placeId === game.travel.currentPlaceId;
  return {
    testId: `travel-place-${placeId}`,
    name: placeDisplayName(game, entry.place.events[0].place),
    available: entry.available,
    top: here ? "現在地" : placeId === recommendedId ? "おすすめ" : null,
    bottom: placeVisited(game, placeId) ? "訪問済み" : null,
    photo: <PlacePhoto game={game} entry={entry} />,
    kinds,
    swipeable,
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
  if (photo) return <img src={`${import.meta.env.BASE_URL}${derivedImagePath(photo, "card")}`} alt="" width={240} height={160} loading="lazy" decoding="async" draggable={false} />;
  const date = entry.events.every((choice) => choice.event.category === "date");
  return <PlainTile color={presentation.backgrounds[place.backgroundId]?.color}>{date ? "♡" : "◇"}</PlainTile>;
}
