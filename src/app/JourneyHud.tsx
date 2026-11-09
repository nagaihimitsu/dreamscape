import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { currencyForCity, formatMoneyForCity } from "../content/currency";
import { encounters } from "../content/encounters";
import type { TravelPlace } from "../content/travel-schemas";
import { DismissLayer } from "../components/DismissLayer";
import { HeldItems } from "../components/HeldItems";
import { Icon, type IconName } from "../components/icons";
import { holdTaps } from "../components/tap-hold";
import type { GameState } from "../domain/game";
import { getGameWeekday, getTimePeriod } from "../domain/travel";
import { cityProgressCounts } from "../features/journey/CityProgress";
import { cityProgressParts, type CityProgressPart } from "../features/journey/city-progress-label";
import { placeDisplayName } from "../features/journey/travel-labels";
import { formatTravelTime } from "../features/journey/travel-time";
import { moneyLength, placeNameIsCut, weekdayLabel } from "./journey-hud-text";
import { useMeasuredHeight } from "../components/useMeasuredHeight";
import "./journey-hud.css";

const progressIcons: Record<CityProgressPart["kind"], IconName> = { tourism: "camera", battles: "swords", cleared: "stamp" };

/**
 * The header's popovers open one at a time, all hanging from its bottom edge:
 * ⚙設定's panel and the held items' detail close each other (a press outside
 * either closes it), and opening one of them also closes free time's open 待機
 * menu in the bottom band (a `<details>`, which closes only when its own summary
 * is pressed).
 */
function closeWaitMenu() {
  for (const details of document.querySelectorAll<HTMLDetailsElement>('[data-testid="travel-actions"] details[open]')) details.open = false;
}

/**
 * The header of every game screen (UI redesign §3.1): row 1 shows where and when
 * the couple are and what they have (display only), row 2 holds what can be
 * pressed: the city's progress (opens 旅の記録), the held items, 英語ノート and ⚙設定 with
 * セーブ・ロード・ゲームの設定. Its height is measured as `--hud-h` for the
 * reserves of the scenes it lies over.
 */
export function JourneyHud({ game, place, onRecords, onEnglish, onSave, onLoad, onSettings }: {
  game: GameState;
  place: TravelPlace | undefined;
  onRecords: () => void;
  onEnglish: () => void;
  onSave: () => void;
  onLoad: () => void;
  onSettings: () => void;
}) {
  const measured = useMeasuredHeight("--hud-h");
  const wrapsWhenCut = useWholePlaceName();
  const header = useCallback((element: HTMLElement | null) => {
    const unmeasure = measured(element);
    const unwatch = wrapsWhenCut(element);
    return () => {
      unmeasure?.();
      unwatch?.();
    };
  }, [measured, wrapsWhenCut]);
  const weekday = getGameWeekday(game.travel.calendar);
  const money = formatMoneyForCity(game.currentCityId, game.travelBudget);
  const parts = cityProgressParts(cityProgressCounts(game));
  const items = encounters.items
    .filter((item) => item.cityId === game.currentCityId && game.inventory[item.id] === "held")
    .map((item) => ({ id: item.id, name: item.nameJa, description: item.descriptionJa, iconPath: item.iconPath }));
  return (
    <div className="journey-hud" data-testid="journey-bar" ref={header} onMouseDown={keepFocusOffControls}>
      <div className="hud-status">
        <p className="hud-plate" data-testid="journey-context">
          <span className="hud-place"><Icon name="pin" /><span className="sr-only">現在地：</span>{placeDisplayName(game, place)}</span>
          <span className="hud-time">
            <Icon name={getTimePeriod(game.travel.minute) === "day" ? "sun" : "moon"} />
            {game.travel.day}日目{weekday === undefined ? null : <span aria-label={weekdayLabel(weekday).spoken}>{weekdayLabel(weekday).short}</span>} {formatTravelTime(game.travel.minute)}
          </span>
        </p>
        <p className="hud-wallet">
          <span className="travel-budget" data-length={moneyLength(money)} aria-label={`旅の予算 ${game.travelBudget}${currencyForCity(game.currentCityId).unitJa}`}><Icon name="coin" />{money}</span>
          <span className="ap" aria-label={`残り${game.ap}AP`}><Icon name="star" />{game.ap}<small> AP</small></span>
        </p>
      </div>
      <div className="hud-actions">
        <button
          type="button"
          className="hud-progress"
          data-testid="city-progress"
          aria-label={`旅の記録：${parts.map((part) => part.text).join("、")}`}
          onClick={onRecords}
        >
          <span className="hud-progress-parts" data-testid={parts[0].kind === "cleared" ? "city-complete" : undefined}>
            {parts.map((part) => <span key={part.kind} className="hud-progress-part"><Icon name={progressIcons[part.kind]} />{part.text}</span>)}
          </span>
          <Icon name="chevron-right" className="hud-chevron" />
        </button>
        <HeldItems items={items} onOpen={closeWaitMenu} />
        <nav className="hud-tools" aria-label="旅の操作">
          <button type="button" className="hud-tool" aria-label="英語ノートを開く" onClick={onEnglish}>
            <Icon name="book" /><span className="hud-tool-word">英語ノート</span>
          </button>
          <HudMenu onSave={onSave} onLoad={onLoad} onSettings={onSettings} />
        </nav>
      </div>
    </div>
  );
}

/** Marks the header whose place name does not fit on one line (journey-hud.css). */
const WHOLE_PLACE_ATTRIBUTE = "data-place-wraps";

/**
 * The place name in the header is never cut (user decision 2026-11-09). It is
 * laid out on one line, and a name that line cannot hold, whatever the reason (a
 * long name, a long amount beside it, enlarged text, a narrow or a landscape
 * screen), gets WHOLE_PLACE_ATTRIBUTE on the header, whose CSS gives the name the
 * room it needs instead of cutting it: the money goes below it, the buttons of a
 * one-row header go to a row of their own, and a name wider than the whole row
 * wraps. The check lays the header out without the attribute and asks whether the
 * one-line clamp hides a line of the name (placeNameIsCut: glyphs reaching a pixel
 * past the line do not count), so a header whose name fits is laid out exactly as
 * before. It runs when the header is mounted (before it is painted), and again
 * when the header or the name changes size (the screen, the text size), when the
 * name or the amount changes, and when the web fonts arrive; those later checks
 * wait for the next frame, outside the observers' own callbacks.
 */
function useWholePlaceName() {
  return useCallback((header: HTMLElement | null) => {
    const place = header?.querySelector<HTMLElement>(".hud-place");
    if (!header || !place) return;
    const check = () => {
      header.removeAttribute(WHOLE_PLACE_ATTRIBUTE);
      const lineHeight = parseFloat(getComputedStyle(place).lineHeight);
      if (placeNameIsCut({ scrollHeight: place.scrollHeight, clientHeight: place.clientHeight, lineHeight })) {
        header.setAttribute(WHOLE_PLACE_ATTRIBUTE, "");
      }
    };
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    check();
    const resized = new ResizeObserver(later);
    resized.observe(header);
    resized.observe(place);
    const changed = new MutationObserver(later);
    changed.observe(header.querySelector(".hud-status") ?? header, { subtree: true, childList: true, characterData: true });
    document.fonts?.addEventListener("loadingdone", later);
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
      changed.disconnect();
      document.fonts?.removeEventListener("loadingdone", later);
    };
  }, []);
}

/**
 * A press on the header's text (the place, the money) keeps the focus where it
 * is, as on a page's plain text, instead of dropping it to the page: the open
 * ⚙設定 panel then gives it back to its button (HudMenu).
 */
function keepFocusOffControls(event: { target: EventTarget; preventDefault: () => void }) {
  if (event.target instanceof Element && !event.target.closest("button, a, input, select, summary, [tabindex]")) event.preventDefault();
}

/**
 * ⚙設定 (U2, U24): a disclosure button with its small panel of セーブ, ロード
 * and ゲームの設定 (U28) right under the header (APG Disclosure, not an ARIA menu:
 * three ordinary buttons, and Tab works as everywhere else). Opening moves the
 * focus to セーブ (ArrowUp/ArrowDown also move between the three); Esc closes and
 * returns it to ⚙設定; leaving the group with the focus or a press elsewhere
 * closes it. A tap on the page outside the header only closes it (DismissLayer).
 * Choosing an item closes the panel and puts the focus on ⚙設定 before the action
 * runs, so a dialog it opens gives the focus back to ⚙設定 when it closes. The
 * panel then leaves from under the finger: ロード and ゲームの設定 open dialogs
 * that take no press for a moment (or a load holds taps), and セーブ, which opens
 * none, holds the page's taps for that moment itself (holdTaps), so the second
 * tap of a double tap presses nothing that lay under it (in a sightseeing guide,
 * 手がかり帳).
 */
function HudMenu({ onSave, onLoad, onSettings }: { onSave: () => void; onLoad: () => void; onSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const group = useRef<HTMLDivElement>(null);
  const gear = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const backToGear = () => gear.current?.focus({ preventScroll: true });

  useLayoutEffect(() => {
    if (open) panel.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      setOpen(false);
      backToGear();
    };
    // A press on the header outside the group (another of its buttons, its text):
    // the panel closes and that button works as usual; on the text the focus,
    // which the press leaves where it was, goes back to ⚙設定. The dismiss layer
    // handles presses on the rest of the page.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || group.current?.contains(target) || target.closest(".dismiss-layer")) return;
      const focusWasInside = !!group.current?.contains(document.activeElement);
      setOpen(false);
      if (focusWasInside && !target.closest("button, a, input, select, summary, [tabindex]")) backToGear();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  const choose = (action: () => void, opensNoDialog = false) => () => {
    setOpen(false);
    backToGear();
    if (opensNoDialog) holdTaps();
    action();
  };
  const moveWithArrows = (event: ReactKeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = [...(panel.current?.querySelectorAll("button") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    buttons[(index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length].focus();
  };
  return (
    <div
      className="hud-menu"
      ref={group}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (open && next instanceof Node && !group.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={gear}
        type="button"
        className="hud-tool"
        data-testid="hud-menu"
        aria-expanded={open}
        aria-controls="hud-menu-panel"
        onClick={() => {
          if (!open) closeWaitMenu();
          setOpen(!open);
        }}
      >
        <Icon name="gear" /><span className="hud-tool-word">設定</span>
      </button>
      <div id="hud-menu-panel" className="hud-menu-panel" data-testid="hud-menu-panel" ref={panel} hidden={!open} onKeyDown={moveWithArrows}>
        <button type="button" onClick={choose(onSave, true)}><Icon name="save" />セーブ</button>
        <button type="button" onClick={choose(onLoad)}><Icon name="load" />ロード</button>
        <button type="button" onClick={choose(onSettings)}><Icon name="sliders" />ゲームの設定</button>
      </div>
      {open && <DismissLayer owner={group.current} onClose={(focusWasInside) => {
        setOpen(false);
        if (focusWasInside) backToGear();
      }} />}
    </div>
  );
}
