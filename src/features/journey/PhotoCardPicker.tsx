import { useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { getCityContent, presentation } from "../../content";
import { derivedImagePath } from "../../content/derived-images";
import { getPlacePhoto } from "../../content/place-photo";
import { Icon } from "../../components/icons";
import { battlePlayed } from "../../domain/conditions";
import type { GameState } from "../../domain/game";
import {
  cardKinds, cardScales, flickSpeed, nearestIndex, photoCardLabel, stepIndex, swipeDeparts,
  type CardArrangement, type CardKinds, type PhotoCardEntry, type RowCard, type SwipeSample,
} from "./photo-cards";
import { placeDisplayName } from "./travel-labels";
import type { PressKind } from "./travel-selection";
import { whenLaidOut } from "./when-laid-out";
import "./travel-menu.css";

/** How long the row stays still before the card in its centre counts as chosen (a flick's momentum and snap included). */
const SETTLE_MS = 120;
const INSTANT = "instant" as ScrollBehavior;
/** How far a finger moves on the chosen card before it counts as a drag (px). */
const DRAG_SLOP_PX = 10;
/** A drag this far sideways, and more sideways than up, is no swipe up: the card comes back. */
const SIDEWAYS_PX = 32;
/** While the card cannot depart it follows the finger only this much (it will come back). */
const HELD_BACK = 0.35;
const SPRING_MS = 180;
const FLY_MS = 240;
/** A departure that left this screen on show (the move did not happen): the card comes back after this long. */
const RESTORE_MS = 1200;

const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !!document.querySelector(".app-shell.reduce-motion");

/** Whether one of the place's events has been played (today's map draws a white dot; a card names it). */
function placeVisited(game: GameState, placeId: string): boolean {
  return getCityContent(game.currentCityId).travel.events.some((event) => event.placeId === placeId &&
    (game.completedEpisodeIds.includes(event.id) || game.playedDateIds.includes(event.id) || battlePlayed(game, event.id)));
}

/** What a swipe up on the chosen card does (in the row; null: that card does not take it: 「待機」, the tour, 「ホテルに戻る」). */
export type CardSwipe = {
  /** Departs with the chosen event and way (the shared selection's pressRoute), or null when that cannot be done now. */
  go: ((kind: PressKind) => void) | null;
  /** When a press of the selection counts (its arming time, performance.now() ms): a departure waits for it. */
  readyAt: number;
  /** Says why it cannot depart (the live regions). */
  refuse: () => void;
};

/**
 * B案's photo cards (docs/02 「自由時間の画面」): 「待機」, the places, the tour and 「ホテルに戻る」. As a row: three show whole, the
 * chosen one in the middle and a smaller one on each side (each card's size follows its distance from the centre), the
 * one that settles in the centre after a flick is chosen (CSS scroll snap), a press on a side card brings it to the
 * centre and chooses it, 「m / n」 under the row says where it is (counting every card), and the chosen card's card (`card`) follows the row.
 * The chosen place's card departs on a swipe up (`swipe`; useSwipeUp) or Enter, never on a press. As a list (short
 * screens, large text, sideways): a press chooses its row, the card opens under it (with its 「行く」), and the pressed row
 * stays where it was. The chosen card is the list's one Tab stop; ←→ (in the list also ↑↓), Home and End move the choice.
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
  /** The chosen card's swipe up (a place's), or null. */
  swipe: CardSwipe | null;
}) {
  const list = useRef<HTMLUListElement>(null);
  const chosen = useRef(chosenId);
  chosen.current = chosenId;
  const swipeRef = useRef(swipe);
  swipeRef.current = swipe;
  const settle = useRef(0);
  /** The arrangement the row was last placed in (a first placement is instant). */
  const placedIn = useRef<CardArrangement | null>(null);
  /** In the list, the pressed row's top before the press (the card above it may close). */
  const anchor = useRef<{ cardId: string; top: number } | null>(null);
  const row = arrangement === "row";
  const swipeUp = useSwipeUp({ row, chosen, swipe: swipeRef, stage: list });
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
      const items = [...scroller.querySelectorAll<HTMLElement>(":scope > li[data-card-id]")];
      const scales = cardScales(items.map((item) => item.offsetLeft + item.offsetWidth / 2), scroller.scrollLeft + scroller.clientWidth / 2,
        items[0]?.offsetWidth ?? 0, small, reducedMotion());
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
        const classes = ["photo-card", face.kinds === "none" ? null : `is-${face.kinds}`, face.available ? null : "is-unavailable", face.hint ? "is-swipeable" : null];
        return <li key={rowCard.id} data-card-id={rowCard.id} data-testid={face.testId} data-selected={isChosen ? "true" : undefined}>
          <button type="button" className={classes.filter((name) => name).join(" ")} tabIndex={rowCard.id === tabStop ? 0 : -1}
            aria-current={isChosen ? "true" : undefined}
            aria-label={photoCardLabel({ position: index + 1, count: cards.length, name: face.name, marks })}
            onPointerDown={(down) => swipeUp.press(down, rowCard.id)}
            onClick={() => {
              // A drag just ended on it (a mouse's click follows its release): it chooses nothing.
              if (swipeUp.dragEnded()) return;
              choose(rowCard.id);
            }}
            onKeyDown={(key) => {
              swipeUp.dragEnded();
              // Enter on the chosen place's card departs as its swipe up does (a held key's repeats do nothing).
              if (key.key === "Enter" && swipeUp.takesEnter(rowCard.id)) {
                key.preventDefault();
                if (!key.repeat) swipeUp.enter();
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
              {face.hint && <span className="photo-card-hint" data-shown={row && isChosen && swipe?.go ? "true" : undefined}>{face.hint}</span>}
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

/** A swipe up in progress on the chosen card. */
type Gesture = {
  pointerId: number;
  cardId: string;
  mouse: boolean;
  x: number;
  y: number;
  card: HTMLElement;
  /** The card's floating copy, once the drag goes up (null before). */
  ghost: HTMLElement | null;
  /** The card's height, and its bottom on the screen, when it lifted. */
  height: number;
  bottom: number;
  samples: SwipeSample[];
  detach: () => void;
};

/**
 * The chosen card's swipe up (the row only, while `swipe` is set). The card follows the finger upwards only; released
 * past a third of its height or on a flick up (photo-cards.ts swipeDeparts) it flies off the top of the screen, then
 * `go` runs, once, when the selection's press counts; otherwise it springs back. A drag that starts sideways is the
 * row's own scroll (touch-action: pan-x) and one that starts downwards does nothing; a drag that turns sideways, a
 * second finger and pointercancel bring the card back. While the card cannot depart it follows less, comes back, and
 * `refuse` says why while the reason under the row comes into view. The card never leaves its slot: a copy of it floats
 * over the screen (`.photo-card-ghost`), so neither the row's box nor the header cuts it. From a confirmed departure
 * until this screen goes (or, the move not done, the card comes back) no second departure starts. Reduced motion: the
 * card still follows the finger, without the fly-off and the spring. Enter on the chosen card does the same as a swipe
 * up (no animation).
 */
function useSwipeUp({ row, chosen, swipe, stage }: {
  row: boolean;
  chosen: RefObject<string>;
  swipe: RefObject<CardSwipe | null>;
  stage: RefObject<HTMLUListElement | null>;
}) {
  const gesture = useRef<Gesture | null>(null);
  const departing = useRef(false);
  /** A drag ended on the card: the click that may follow chooses nothing. */
  const dragged = useRef(false);
  const timers = useRef(new Set<number>());
  /** Each floating copy with its card (hidden meanwhile). */
  const floating = useRef(new Map<HTMLElement, HTMLElement>());

  useEffect(() => {
    const pending = timers.current;
    const shown = floating.current;
    return () => {
      gesture.current?.detach();
      gesture.current = null;
      for (const timer of pending) window.clearTimeout(timer);
      for (const [ghost, card] of shown) {
        ghost.remove();
        card.style.visibility = "";
      }
      shown.clear();
    };
  }, []);

  const later = (run: () => void, ms: number) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      run();
    }, ms);
    timers.current.add(timer);
  };
  const drop = (ghost: HTMLElement) => {
    const card = floating.current.get(ghost);
    floating.current.delete(ghost);
    ghost.remove();
    if (card) card.style.visibility = "";
  };
  /** Moves the copy to `transform` (and `opacity`) over `ms`, then `then` (also when no transition ends). */
  const animate = (ghost: HTMLElement, ms: number, transform: string, then: () => void, opacity?: string) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      ghost.removeEventListener("transitionend", onEnd);
      then();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.target === ghost && event.propertyName === "transform") finish();
    };
    ghost.addEventListener("transitionend", onEnd);
    ghost.style.transition = `transform ${ms}ms ease-${opacity === undefined ? "out" : "in"}, opacity ${ms}ms ease-in`;
    ghost.style.transform = transform;
    if (opacity !== undefined) ghost.style.opacity = opacity;
    later(finish, ms + 80);
  };
  const springBack = (ghost: HTMLElement) => {
    if (reducedMotion()) drop(ghost);
    else animate(ghost, SPRING_MS, "translateY(0px)", () => drop(ghost));
  };
  /** Why it cannot depart: said, and the reason under the row brought into view. */
  const refuse = (current: CardSwipe) => {
    current.refuse();
    stage.current?.parentElement?.querySelector<HTMLElement>(".place-card-reason")
      ?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? INSTANT : "smooth" });
  };
  /** The confirmed departure: the copy flies off, then `go` runs once the press counts, for the card still chosen. */
  const flyOff = (g: Gesture, ghost: HTMLElement, go: (kind: PressKind) => void, readyAt: number) => {
    departing.current = true;
    const back = () => {
      drop(ghost);
      departing.current = false;
    };
    const launch = () => {
      if (chosen.current !== g.cardId) return back();
      later(() => {
        if (chosen.current === g.cardId) go("pointer");
        // Still here a moment later: the move did not happen; the card comes back.
        later(back, RESTORE_MS);
      }, Math.max(0, readyAt - performance.now()));
    };
    if (reducedMotion()) {
      ghost.style.visibility = "hidden";
      launch();
    } else animate(ghost, FLY_MS, `translateY(${-(g.bottom + 24)}px)`, launch, "0");
  };

  function lift(g: Gesture) {
    const rect = g.card.getBoundingClientRect();
    const width = g.card.offsetWidth;
    const height = g.card.offsetHeight;
    const ghost = g.card.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("aria-label");
    ghost.setAttribute("aria-hidden", "true");
    ghost.setAttribute("tabindex", "-1");
    ghost.setAttribute("inert", "");
    ghost.classList.add("photo-card-ghost");
    Object.assign(ghost.style, {
      left: `${rect.left + (rect.width - width) / 2}px`,
      top: `${rect.top + (rect.height - height) / 2}px`,
      width: `${width}px`,
      height: `${height}px`,
      transform: "translateY(0px)",
    });
    document.body.append(ghost);
    floating.current.set(ghost, g.card);
    g.card.style.visibility = "hidden";
    g.ghost = ghost;
    g.height = height;
    g.bottom = rect.bottom;
  }

  /** The gesture ends without a departure (pointercancel, a second finger, sideways): the card comes back. */
  function cancel() {
    const g = gesture.current;
    if (!g) return;
    g.detach();
    gesture.current = null;
    if (g.ghost) springBack(g.ghost);
  }

  function move(event: PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.ghost) {
      if (Math.hypot(dx, dy) < DRAG_SLOP_PX) return;
      // Sideways first: the row scrolls (the browser takes it); downwards: nothing.
      if (dy >= 0 || Math.abs(dx) >= Math.abs(dy)) return cancel();
      lift(g);
      dragged.current = true;
      if (g.mouse) {
        try {
          g.card.setPointerCapture(g.pointerId);
        } catch {
          // The pointer is already gone: its pointerup or pointercancel ends the gesture.
        }
      }
    }
    if (Math.abs(dx) >= SIDEWAYS_PX && Math.abs(dx) > -dy) return cancel();
    const follow = swipe.current?.go ? 1 : HELD_BACK;
    g.ghost!.style.transform = `translateY(${Math.min(0, dy) * follow}px)`;
    g.samples.push({ t: event.timeStamp, y: event.clientY });
    while (g.samples.length > 2 && event.timeStamp - g.samples[0].t > 150) g.samples.shift();
  }

  function release(event: PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    g.detach();
    gesture.current = null;
    // A press without a drag: its click chooses (the card is already chosen).
    if (!g.ghost) return;
    g.samples.push({ t: event.timeStamp, y: event.clientY });
    const departs = swipeDeparts({ lift: Math.min(0, event.clientY - g.y), height: g.height, speed: flickSpeed(g.samples) });
    const current = swipe.current;
    if (departs && current?.go && chosen.current === g.cardId) return flyOff(g, g.ghost, current.go, current.readyAt);
    springBack(g.ghost);
    if (departs && current) refuse(current);
  }

  return {
    /** A pointer goes down on a card: on the chosen one (the row, a swipe set, one finger or the main button) a swipe may start. */
    press(event: ReactPointerEvent<HTMLElement>, cardId: string) {
      dragged.current = false;
      if (!row || cardId !== chosen.current || !swipe.current || departing.current || gesture.current) return;
      if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
      const pointerId = event.pointerId;
      const own = (handler: (pointer: PointerEvent) => void) => (pointer: PointerEvent) => {
        if (pointer.pointerId === pointerId) handler(pointer);
      };
      const onMove = own(move);
      const onUp = own(release);
      const onCancel = own(cancel);
      const onOther = (pointer: PointerEvent) => {
        if (pointer.pointerId !== pointerId) cancel();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("pointerdown", onOther, true);
      gesture.current = {
        pointerId, cardId, mouse: event.pointerType === "mouse", x: event.clientX, y: event.clientY, card: event.currentTarget,
        ghost: null, height: 0, bottom: 0, samples: [{ t: event.timeStamp, y: event.clientY }],
        detach: () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onCancel);
          window.removeEventListener("pointerdown", onOther, true);
        },
      };
    },
    /** Whether a drag ended on the card since the last press or key (and forgets it). */
    dragEnded() {
      const was = dragged.current;
      dragged.current = false;
      return was;
    },
    /** Whether Enter on this card departs (the chosen card of the row, with a swipe). */
    takesEnter: (cardId: string) => row && cardId === chosen.current && !!swipe.current,
    /** Enter on the chosen card: departs as a swipe up does, or says why it cannot. */
    enter() {
      const current = swipe.current;
      if (!current || departing.current || gesture.current) return;
      if (current.go) current.go("keyboard");
      else refuse(current);
    },
  };
}

/**
 * What a card shows: its name, its photo or plain tile, its marks over the photo (top and bottom), its fill (what the
 * place holds), its swipe hint (a place's: departing, or at the current place starting there) and its testid.
 */
function cardFace(game: GameState, card: RowCard, recommendedId: string | null | undefined): {
  testId: string;
  name: string;
  available: boolean;
  top: string | null;
  bottom: string | null;
  photo: ReactNode;
  kinds: CardKinds;
  hint: string | null;
} {
  const kinds = cardKinds(card);
  if (card.kind === "wait")
    return { testId: "travel-wait", name: "待機", available: true, top: null, bottom: null, kinds, hint: null,
      photo: <PlainTile><Icon name="hourglass" /></PlainTile> };
  if (card.kind === "stay") {
    const hotel = getCityContent(game.currentCityId).travel.places.find((place) => place.id === game.travel.hotelPlaceId);
    // The inn's own photo (a travel place's photoAssetId) when it has one, else the bed on its background colour.
    const hotelPhoto = getPlacePhoto(game.currentCityId, game.travel.hotelPlaceId);
    return { testId: "travel-stay", name: "ホテルに戻る", available: true, top: null, bottom: null, kinds, hint: null,
      photo: hotelPhoto
        ? <img src={`${import.meta.env.BASE_URL}${derivedImagePath(hotelPhoto, "card")}`} alt="" width={240} height={160} loading="lazy" decoding="async" draggable={false} />
        : <PlainTile color={hotel && presentation.backgrounds[hotel.backgroundId]?.color}><Icon name="bed" /></PlainTile> };
  }
  if (card.kind === "tour")
    return { testId: "travel-tour", name: "ツアー", available: true, top: game.tour?.status === "booked" ? "予約済み" : null, bottom: null, kinds, hint: null,
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
    hint: here ? "︿ 上にスワイプで始める" : "︿ 上にスワイプして出発",
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
