import { useEffect, useRef, type RefObject } from "react";
import {
  dragDirection, flickSpeed, glideIndex, halfShown, liftsCard, liftTurnedSideways, pageAtEnd, swipeArea, swipeDeparts,
  type DragDirection, type SwipeArea, type SwipeSample,
} from "./photo-cards";
import type { PressKind } from "./travel-selection";

/** What a swipe up does (in the row; null: the chosen card does not take it: 「待機」, the tour, 「ホテルに戻る」). */
export type CardSwipe = {
  /** Departs with the chosen event and way (the shared selection's pressRoute), or null when that cannot be done now. */
  go: ((kind: PressKind) => void) | null;
  /** When a press of the selection counts (its arming time, performance.now() ms): a departure waits for it. */
  readyAt: number;
  /** Says why it cannot depart (the live regions). */
  refuse: () => void;
};

export const INSTANT = "instant" as ScrollBehavior;
export const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !!document.querySelector(".app-shell.reduce-motion");
/** The row's cards (its items, in order), and an item's centre in the row's scroll coordinates. */
export const rowItems = (scroller: HTMLElement) => [...scroller.querySelectorAll<HTMLElement>(":scope > li[data-card-id]")];
export const centreOf = (item: HTMLElement) => item.offsetLeft + item.offsetWidth / 2;

/** While the card cannot depart it follows the finger only this much (it will come back). */
const HELD_BACK = 0.35;
const SPRING_MS = 180;
const FLY_MS = 240;
/** A departure that left this screen on show (the move did not happen): the card comes back after this long. */
const RESTORE_MS = 1200;
/** Where no drag starts: the header (its menus and panels), the site's header lines on wide screens, dialogs, menus, text fields. */
const NO_DRAG = ".journey-hud, .masthead, .journey-stage, .app-shell > footer, dialog, [role='dialog'], [role='menu'], input, textarea, select, [contenteditable]";
/** The app shell's mark while drags start anywhere on it (photo-free-time.css gives it its touch-action). */
const SURFACE_MARK = "data-card-swipe";
/** The app shell's mark while a drag runs (no text is selected meanwhile). */
const DRAGGING_MARK = "data-card-dragging";
/** The page counts as pinch-zoomed in past this scale. */
const ZOOMED_SCALE = 1.01;
/** How long after a drag the click it may leave behind is still taken away (ms). */
const CLICK_AFTER_DRAG_MS = 300;

/** A drag of the free-time screen in progress (from its press). */
type Gesture = {
  pointerId: number;
  area: SwipeArea;
  mouse: boolean;
  x: number;
  y: number;
  /** Whether a drag up lifts the chosen card (photo-cards.ts liftsCard, when the press started). */
  liftable: boolean;
  /** Its way once past the slop (null before: a press so far). */
  direction: DragDirection | null;
  /** The chosen card when it started, and its button. */
  cardId: string;
  card: HTMLElement | null;
  /** Sideways: the row's scroll position when the drag began. */
  scrollLeft: number;
  /** The card's floating copy, once the drag goes up (null before). */
  ghost: HTMLElement | null;
  /** The card's height, and its bottom on the screen, when it lifted. */
  height: number;
  bottom: number;
  samples: SwipeSample[];
  detach: () => void;
};

/**
 * The drags of the free-time screen in the row arrangement (docs/02 「自由時間の画面」, user decision 2026-11-11). A
 * drag may start anywhere on the app shell but the header (and its menus), the site's header lines, a dialog and a
 * text field; its first movement past DRAG_SLOP_PX decides its way (photo-cards.ts dragDirection), and a press that
 * moves less is a tap on what it started on (a drag clicks nothing: the click it may leave behind is taken away).
 *
 * Sideways: on the row it is the row's own scroll (touch-action: pan-x; a mouse drives it as below); elsewhere the drag
 * moves the row's scroll with the finger, its snap off meanwhile, and once let go the row glides to the card nearest
 * where the flick carries it (glideIndex; at once with reduced motion), and the row chooses that card when still
 * (`settle`), as after a flick of the row. Downwards: nothing (elsewhere the page scrolls). Up: the chosen card's swipe
 * (while `swipe` is set), from anywhere on the row; from elsewhere only once the page has nothing left below and half
 * the card shows (liftsCard; until then the page scrolls: the app shell keeps touch-action: pan-y, and the finger is
 * kept off the browser's own panning, by its touchmove, only for the lift). While the page is pinch-zoomed in, drags
 * start on the row only (the page pans elsewhere).
 *
 * The swipe up: the card follows the finger upwards only; released past a third of its height or on a flick up
 * (photo-cards.ts swipeDeparts) it flies off the top of the screen, then `go` runs, once, when the selection's press
 * counts; otherwise it springs back. A drag that turns sideways, a second finger and pointercancel bring the card
 * back. While the card cannot depart it follows less, comes back, and `refuse` says why while the reason under the row
 * comes into view. The card never leaves its slot: a copy of it floats over the screen (`.photo-card-ghost`), so
 * neither the row's box nor the header cuts it, and nothing else moves. From a confirmed departure until this screen
 * goes (or, the move not done, the card comes back) no drag starts. Reduced motion: the card still follows the finger,
 * without the fly-off and the spring. Enter on the chosen card does the same as a swipe up (no animation).
 */
export function useCardGestures({ row, chosen, swipe, list, driving, settle }: {
  row: boolean;
  chosen: RefObject<string>;
  swipe: RefObject<CardSwipe | null>;
  list: RefObject<HTMLUListElement | null>;
  /** Set while a sideways drag of the screen moves the row (the row then waits to choose). */
  driving: RefObject<boolean>;
  /** Chooses the card in the row's centre once the row has been still a moment (PhotoCardPicker). */
  settle: () => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const departing = useRef(false);
  /** A drag ended: the click that may follow chooses nothing. */
  const dragged = useRef(false);
  const forgetting = useRef(0);
  const settleRef = useRef(settle);
  settleRef.current = settle;
  const surface = useRef<HTMLElement | null>(null);
  const timers = useRef(new Set<number>());
  /** Each floating copy with its card (hidden meanwhile). */
  const floating = useRef(new Map<HTMLElement, HTMLElement>());

  useEffect(() => {
    const pending = timers.current;
    const shown = floating.current;
    return () => {
      gesture.current?.detach();
      gesture.current = null;
      window.clearTimeout(forgetting.current);
      for (const timer of pending) window.clearTimeout(timer);
      for (const [ghost, card] of shown) {
        ghost.remove();
        card.style.visibility = "";
      }
      shown.clear();
    };
  }, []);

  // The app shell takes drags while the row shows (and the page is not pinch-zoomed in).
  useEffect(() => {
    const scroller = list.current;
    const shell = scroller?.closest<HTMLElement>(".app-shell");
    if (!row || !scroller || !shell) return;
    surface.current = shell;
    const zoom = window.visualViewport;
    const mark = () => {
      if (zoomed()) shell.removeAttribute(SURFACE_MARK);
      else shell.setAttribute(SURFACE_MARK, "");
    };
    const forget = () => {
      window.clearTimeout(forgetting.current);
      dragged.current = false;
    };
    const takeClick = (click: MouseEvent) => {
      if (!dragged.current) return;
      click.preventDefault();
      click.stopPropagation();
      forget();
    };
    mark();
    zoom?.addEventListener("resize", mark);
    shell.addEventListener("pointerdown", press);
    shell.addEventListener("touchmove", hold, { passive: false });
    window.addEventListener("pointerdown", forget, true);
    window.addEventListener("keydown", forget, true);
    window.addEventListener("click", takeClick, true);
    return () => {
      zoom?.removeEventListener("resize", mark);
      shell.removeEventListener("pointerdown", press);
      shell.removeEventListener("touchmove", hold);
      window.removeEventListener("pointerdown", forget, true);
      window.removeEventListener("keydown", forget, true);
      window.removeEventListener("click", takeClick, true);
      // The list (or no screen) from here: a drag in progress just stops.
      const g = gesture.current;
      if (g) {
        end(g);
        if (g.ghost) drop(g.ghost);
      }
      driving.current = false;
      scroller.style.removeProperty("scroll-snap-type");
      shell.removeAttribute(SURFACE_MARK);
      shell.removeAttribute(DRAGGING_MARK);
      surface.current = null;
    };
  // The handlers read refs only; the effect stands for the row arrangement.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row]);

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
    list.current?.parentElement?.querySelector<HTMLElement>(".place-card-reason")
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

  function zoomed() {
    return (window.visualViewport?.scale ?? 1) > ZOOMED_SCALE;
  }

  function lift(g: Gesture, card: HTMLElement) {
    const rect = card.getBoundingClientRect();
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const ghost = card.cloneNode(true) as HTMLElement;
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
    floating.current.set(ghost, card);
    card.style.visibility = "hidden";
    g.ghost = ghost;
    g.height = height;
    g.bottom = rect.bottom;
  }

  /**
   * A sideways drag of the screen begins, `dx` px from its press: the row follows the finger from here (no jump by the
   * slop), its snap off meanwhile (the row waits to choose).
   */
  function drive(g: Gesture, scroller: HTMLElement, dx: number) {
    driving.current = true;
    g.scrollLeft = scroller.scrollLeft + dx;
    scroller.style.scrollSnapType = "none";
  }

  /** Let go (`speed`: the finger's, px per ms): the row glides to its card, then chooses it once still (its snap back). */
  function glide(speed: number) {
    driving.current = false;
    const scroller = list.current;
    if (!scroller) return;
    const half = scroller.clientWidth / 2;
    const centres = rowItems(scroller).map(centreOf);
    // The row scrolls against the finger.
    const index = glideIndex(centres, scroller.scrollLeft + half, -speed);
    if (index !== null) scroller.scrollTo({ left: centres[index] - half, behavior: reducedMotion() ? INSTANT : "smooth" });
    settleRef.current();
  }

  /** The gesture is over: its listeners go, and the click a drag may leave behind is forgotten a moment later. */
  function end(g: Gesture) {
    g.detach();
    gesture.current = null;
    if (!g.direction) return;
    surface.current?.removeAttribute(DRAGGING_MARK);
    window.clearTimeout(forgetting.current);
    forgetting.current = window.setTimeout(() => { dragged.current = false; }, CLICK_AFTER_DRAG_MS);
  }

  /** The gesture ends without a departure (pointercancel, a second finger, a lift turned sideways): all comes back. */
  function cancel() {
    const g = gesture.current;
    if (!g) return;
    end(g);
    if (g.direction === "sideways") glide(0);
    else if (g.ghost) springBack(g.ghost);
  }

  function move(event: PointerEvent) {
    const g = gesture.current;
    const scroller = list.current;
    if (!g || !scroller) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.direction) {
      const direction = dragDirection(dx, dy);
      if (!direction) return;
      // Downwards: nothing. Sideways on the row by a finger: the row's own scroll. Up where nothing lifts: the page's.
      if (direction === "down" || (direction === "sideways" ? g.area === "row" && !g.mouse : !g.liftable || !g.card)) return end(g);
      g.direction = direction;
      window.clearTimeout(forgetting.current);
      dragged.current = true;
      surface.current?.setAttribute(DRAGGING_MARK, "");
      if (g.mouse) {
        window.getSelection()?.removeAllRanges();
        try {
          surface.current?.setPointerCapture(g.pointerId);
        } catch {
          // The pointer is already gone: its pointerup or pointercancel ends the gesture.
        }
      }
      if (direction === "sideways") drive(g, scroller, dx);
      else lift(g, g.card!);
    }
    g.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
    while (g.samples.length > 2 && event.timeStamp - g.samples[0].t > 150) g.samples.shift();
    if (g.direction === "sideways") {
      scroller.scrollLeft = g.scrollLeft - dx;
      return;
    }
    if (liftTurnedSideways(dx, dy)) return cancel();
    const follow = swipe.current?.go ? 1 : HELD_BACK;
    g.ghost!.style.transform = `translateY(${Math.min(0, dy) * follow}px)`;
  }

  function release(event: PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    end(g);
    // A press without a drag: its click goes to what it started on.
    if (!g.direction) return;
    g.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
    if (g.direction === "sideways") return glide(flickSpeed(g.samples, "x"));
    const ghost = g.ghost!;
    const departs = swipeDeparts({ lift: Math.min(0, event.clientY - g.y), height: g.height, speed: flickSpeed(g.samples, "y") });
    const current = swipe.current;
    if (departs && current?.go && chosen.current === g.cardId) return flyOff(g, ghost, current.go, current.readyAt);
    springBack(ghost);
    if (departs && current) refuse(current);
  }

  /** A pointer goes down on the app shell: where a drag starts (one finger or the main button), one may begin. */
  function press(event: PointerEvent) {
    if (gesture.current || departing.current) return;
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    const scroller = list.current;
    const target = event.target instanceof Element ? event.target : null;
    if (!scroller || !target) return;
    // A mouse on the row's own scrollbar (under its cards) drags the scrollbar.
    const onScrollbar = target === scroller && event.clientY - scroller.getBoundingClientRect().top - scroller.clientTop >= scroller.clientHeight;
    const area = swipeArea({ onRow: scroller.contains(target), excluded: onScrollbar || !!target.closest(NO_DRAG), zoomed: zoomed() });
    if (!area) return;
    const cardId = chosen.current;
    const card = scroller.querySelector<HTMLElement>(`:scope > li[data-card-id="${CSS.escape(cardId)}"] > .photo-card`);
    const page = document.scrollingElement ?? document.documentElement;
    const box = card?.getBoundingClientRect();
    const liftable = !!swipe.current && !!box && liftsCard({
      area,
      atEnd: pageAtEnd({ top: page.scrollTop, viewport: window.innerHeight, height: page.scrollHeight }),
      cardShown: halfShown({ top: box.top, bottom: box.bottom, viewport: window.innerHeight }),
    });
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
      pointerId, area, mouse: event.pointerType === "mouse", x: event.clientX, y: event.clientY, liftable, direction: null,
      cardId, card, scrollLeft: 0, ghost: null, height: 0, bottom: 0, samples: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }],
      detach: () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("pointerdown", onOther, true);
      },
    };
  }

  /**
   * A finger's move on the app shell: once the gesture has taken it (a drag on its way, or, off the row, a press that
   * may lift going up), the browser's own panning stays off (touch-action: pan-y would scroll the page with it).
   */
  function hold(event: TouchEvent) {
    const g = gesture.current;
    if (!g || g.mouse || !event.cancelable || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - g.x;
    const dy = touch.clientY - g.y;
    if (g.direction || (g.area === "screen" && g.liftable && -dy > Math.abs(dx))) event.preventDefault();
  }

  return {
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
