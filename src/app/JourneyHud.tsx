import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { currencyForCity, formatMoneyForCity } from "../content/currency";
import { encounters } from "../content/encounters";
import { getCities } from "../content";
import { itemUsableIn } from "../domain/item-cities";
import { itemLines } from "../domain/item-lines";
import type { TravelPlace } from "../content/travel-schemas";
import { DismissLayer } from "../components/DismissLayer";
import { HeldItems } from "../components/HeldItems";
import { HUD_SCREEN_TOOL_ID } from "../components/HudScreenTool";
import { Icon } from "../components/icons";
import { holdTaps } from "../components/tap-hold";
import type { GameState } from "../domain/game";
import { getGameWeekday, getTimePeriod } from "../domain/travel";
import { placeDisplayName } from "../features/journey/travel-labels";
import { formatTravelTime } from "../features/journey/travel-time";
import { moneyLength, weekdayLabel } from "./journey-hud-text";
import type { HudView } from "./hud-view";
import { useMeasuredHeight } from "../components/useMeasuredHeight";
import "./journey-hud.css";

/**
 * The header's popovers open one at a time, all hanging from its bottom edge:
 * ⚙設定's panel and the held items' detail close each other (a press outside
 * either closes it), and opening one of them also closes the previous free-time
 * screen's open 待機 menu in its bottom band (MapListFreeTime; a `<details>`,
 * which closes only when its own summary is pressed).
 */
function closeWaitMenu() {
  for (const details of document.querySelectorAll<HTMLDetailsElement>('[data-testid="travel-actions"] details[open]')) details.open = false;
}

/**
 * What ⚙設定's panel opens; 写真の出典 only while free time shows photos (cards, a backdrop photo), 画像の出典 only while a
 * story scene shows a registered photo (its credits: the scene shows no 出典 of its own).
 */
type MenuActions = {
  onSave: () => void;
  onLoad: () => void;
  onRecords: () => void;
  /** 「アルバム」: the photos the journey's lines took (AlbumDialog). */
  onAlbum: () => void;
  onEnglish: () => void;
  onPhotoCredits?: () => void;
  onSceneCredits?: () => void;
  onSettings: () => void;
  /** 移動画面に戻る（Debug）: only while Debug mode offers it (src/app/free-time-return.ts). */
  onReturnToFreeTime?: () => void;
};

/**
 * The header of every game screen (UI redesign §3.1): row 1 shows where and when
 * the couple are and what they have (display only; the budget above the AP at
 * the right end; the place name is never cut: it wraps), row 2 holds what can be
 * pressed, side by side at its right end (user decision 2026-11-11): the held
 * items, the screen's own tool (free time's 「地図」, a guide's or a battle's
 * 「手がかり帳」; HudScreenTool) and ⚙設定 with セーブ・ロード・旅の記録・アルバム・英語ノート・
 * (free time) 写真の出典・(a story scene) 画像の出典・ゲームの設定. Over a story scene
 * that waits for no choice (`view` "talk", hud-view.ts) the budget and AP, the held
 * items and the screen's tool keep their room but are not shown (journey-hud.css).
 * Its height is measured as `--hud-h` for the reserves of the scenes it lies over.
 */
export function JourneyHud({ game, place, view, ...actions }: { game: GameState; place: TravelPlace | undefined; view: HudView } & MenuActions) {
  const measured = useMeasuredHeight("--hud-h");
  const weekday = getGameWeekday(game.travel.calendar);
  const money = formatMoneyForCity(game.currentCityId, game.travelBudget);
  // This city's items, and those carried through the journey from an earlier city (the item design §2.6).
  const items = encounters.items
    .filter((item) => itemUsableIn(game, item.id, game.currentCityId) && game.inventory[item.id] === "held")
    .map((item) => ({ id: item.id, name: item.nameJa, description: item.descriptionJa, lines: itemLines(game, item.linesJa), iconPath: item.iconPath,
      ...(item.cityId !== game.currentCityId ? { origin: `${getCities().find((city) => city.id === item.cityId)?.nameJa ?? item.cityId}から持ってきた` } : {}) }));
  const shown = view === "all";
  const budgetCue = useSeenChange(game.travelBudget, shown, numberChange);
  const apCue = useSeenChange(game.ap, shown, numberChange);
  const itemsCue = useSeenChange(items.map((item) => item.id).join("\n"), shown, itemsChange);
  return (
    <div className="journey-hud" data-testid="journey-bar" data-view={view} ref={measured} onMouseDown={keepFocusOffControls}>
      <div className="hud-status">
        <p className="hud-plate" data-testid="journey-context">
          <span className="hud-place"><Icon name="pin" /><span className="sr-only">現在地：</span>{placeDisplayName(game, place)}</span>
          <span className="hud-time">
            <Icon name={getTimePeriod(game.travel.minute) === "day" ? "sun" : "moon"} />
            {game.travel.day}日目{weekday === undefined ? null : <span aria-label={weekdayLabel(weekday).spoken}>{weekdayLabel(weekday).short}</span>} {formatTravelTime(game.travel.minute)}
          </span>
        </p>
        <p className="hud-wallet">
          {/* A new key per change the player sees plays its cue once (journey-hud.css). */}
          <span key={`budget-${budgetCue?.count ?? 0}`} className="travel-budget" data-cue={budgetCue?.direction} data-length={moneyLength(money)} aria-label={`旅の予算 ${game.travelBudget}${currencyForCity(game.currentCityId).unitJa}`}><Icon name="coin" />{money}</span>
          <span key={`ap-${apCue?.count ?? 0}`} className="ap" data-cue={apCue?.direction} aria-label={`残り${game.ap}AP`}><Icon name="star" />{game.ap}<small> AP</small></span>
        </p>
      </div>
      <div className="hud-actions">
        <HeldItems items={items} gained={itemsCue?.count} onOpen={closeWaitMenu} />
        <nav className="hud-tools" aria-label="旅の操作">
          <span id={HUD_SCREEN_TOOL_ID} className="hud-screen-tool" />
          <HudMenu {...actions} />
        </nav>
      </div>
    </div>
  );
}

type Direction = "up" | "down";
type Cue = { direction: Direction; count: number };

/**
 * The changes of one of the header's values that the player has seen, for its cue (display only;
 * the header always shows the value itself). The budget, the AP and the held items wait for a
 * choice over a story scene (`shown` false, hud-view.ts), so a change made while they are hidden
 * counts when they show again: an AP reward read on a battle's result shows as the AP rising once
 * free time shows it. Null until the first change; nothing on the first showing.
 */
function useSeenChange<T>(value: T, shown: boolean, change: (seen: T, now: T) => Direction | null): Cue | null {
  const seen = useRef(value);
  const [cue, setCue] = useState<Cue | null>(null);
  useEffect(() => {
    if (!shown) return;
    const direction = change(seen.current, value);
    seen.current = value;
    if (direction) setCue((last) => ({ direction, count: (last?.count ?? 0) + 1 }));
  }, [value, shown, change]);
  return cue;
}
const numberChange = (seen: number, now: number): Direction | null => now > seen ? "up" : now < seen ? "down" : null;
/** An item the header has not shown before (one used or given away only leaves the row). */
const itemsChange = (seen: string, now: string): Direction | null => {
  const before = seen.split("\n");
  return now.split("\n").some((id) => id !== "" && !before.includes(id)) ? "up" : null;
};

/**
 * A press on the header's text (the place, the money) keeps the focus where it
 * is, as on a page's plain text, instead of dropping it to the page: the open
 * ⚙設定 panel then gives it back to its button (HudMenu).
 */
function keepFocusOffControls(event: { target: EventTarget; preventDefault: () => void }) {
  if (event.target instanceof Element && !event.target.closest("button, a, input, select, summary, [tabindex]")) event.preventDefault();
}

/**
 * ⚙設定 (U2, U24): a disclosure button with its small panel of セーブ, ロード,
 * 旅の記録, アルバム, 英語ノート, 写真の出典 (free time's photos) or 画像の出典 (a story
 * scene's photo) and ゲームの設定 (U28) right under the header (APG Disclosure,
 * not an ARIA menu: ordinary buttons, and Tab works as everywhere else). Opening
 * moves the focus to セーブ (ArrowUp/ArrowDown also move between the items); Esc closes and
 * returns it to ⚙設定; leaving the group with the focus or a press elsewhere
 * closes it. A tap on the page outside the header only closes it (DismissLayer).
 * Choosing an item closes the panel and puts the focus on ⚙設定 before the action
 * runs, so a dialog it opens gives the focus back to ⚙設定 when it closes. The
 * panel then leaves from under the finger: ロード and ゲームの設定 open dialogs
 * that take no press for a moment (or a load holds taps), and セーブ, which opens
 * none, holds the page's taps for that moment itself (holdTaps), so the second
 * tap of a double tap presses nothing that lay under it (over a story scene, its
 * picture, where a tap reads on). 旅の記録, 英語ノート and the credits open their
 * dialogs at once, as their own buttons did (the second tap lands inside the dialog);
 * アルバム's dialog takes no press for that moment, as its photos open larger on a tap.
 */
function HudMenu({ onSave, onLoad, onRecords, onAlbum, onEnglish, onPhotoCredits, onSceneCredits, onSettings, onReturnToFreeTime }: MenuActions) {
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
        <button type="button" onClick={choose(onRecords)}><Icon name="stamp" />旅の記録</button>
        <button type="button" onClick={choose(onAlbum)}><Icon name="camera" />アルバム</button>
        <button type="button" onClick={choose(onEnglish)}><Icon name="book" />英語ノート</button>
        {onPhotoCredits && <button type="button" onClick={choose(onPhotoCredits)}><Icon name="credit" />写真の出典</button>}
        {onSceneCredits && <button type="button" onClick={choose(onSceneCredits)}><Icon name="credit" />画像の出典</button>}
        <button type="button" onClick={choose(onSettings)}><Icon name="sliders" />ゲームの設定</button>
        {/* Last, apart from the items of normal play; it opens a confirmation that settles presses. */}
        {onReturnToFreeTime && <button type="button" onClick={choose(onReturnToFreeTime)}><Icon name="map" />移動画面に戻る（Debug）</button>}
      </div>
      {open && <DismissLayer owner={group.current} onClose={(focusWasInside) => {
        setOpen(false);
        if (focusWasInside) backToGear();
      }} />}
    </div>
  );
}
