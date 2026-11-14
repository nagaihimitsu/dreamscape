import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { currencyForCity, formatMoneyForCity } from "../content/currency";
import { encounters } from "../content/encounters";
import { getCities, getCityContent, presentation } from "../content";
import { itemUsableIn } from "../domain/item-cities";
import { itemLines } from "../domain/item-lines";
import type { TravelPlace } from "../content/travel-schemas";
import { DismissLayer } from "../components/DismissLayer";
import { DIALOGUE_LINE_ATTRIBUTE } from "../components/scene-tap";
import { HeldItems } from "../components/HeldItems";
import { HUD_SCREEN_TOOL_ID } from "../components/HudScreenTool";
import { Icon } from "../components/icons";
import { holdTaps } from "../components/tap-hold";
import { NewDot, useCuePlaying } from "../components/fx";
import { playSe } from "../audio/sound-effects";
import { vibrate } from "../audio/vibration";
import type { GameState } from "../domain/game";
import { itemDefinition } from "../domain/item-cities";
import { spentItemIds } from "../domain/item-changes";
import { tourLegUnderway } from "../domain/tour";
import { getGameWeekday, getTimePeriod } from "../domain/travel";
import { hudPlaceName, placeDisplayName, type MapCity } from "../features/journey/travel-labels";
import { formatTravelTime } from "../features/journey/travel-time";
import { moneyLength, weekdayLabel } from "./journey-hud-text";
import type { HudView } from "./hud-view";
import { flightTokens, itemsChange, numberChange, type Direction } from "./hud-cues";
import { FLIGHT_TOTAL_MS, HudFlight } from "./HudFlight";
import { ItemGainNotice } from "./ItemGainNotice";
import { ItemShowFlight } from "../components/ItemShow";
import type { ItemShowLeave } from "./useItemShowLeave";
import { useMeasuredHeight } from "../components/useMeasuredHeight";
import "./journey-hud.css";
import "./hud-effects.css";

/** Every loaded city's map (place IDs are unique across them), for a background that names its place by placeId. */
const mapCities = (): MapCity[] => getCities().map((city) => {
  const { travel, travelSettings } = getCityContent(city.id);
  return { hotelPlaceId: travelSettings.hotelPlaceId, places: travel.places };
});

/** How long a save's ribbon plays on ⚙設定 (milliseconds; hud-effects.css). */
const SAVE_MARK_MS = 900;

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
  /** セーブ: whether the scene was saved (a ribbon then drops onto ⚙設定). */
  onSave: () => boolean;
  onLoad: () => void;
  onRecords: () => void;
  /** 「アルバム」: the photos the journey's lines took (AlbumDialog). */
  onAlbum: () => void;
  /** 「旅の図鑑」: the terms the journey's lines named (GlossaryDialog); only for a journey that has terms. */
  onGlossary?: () => void;
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
 * 「手がかり帳」; HudScreenTool) and ⚙設定 with セーブ・ロード・旅の記録・アルバム・旅の図鑑・英語ノート・
 * (free time) 写真の出典・(a story scene) 画像の出典・ゲームの設定. Over a story scene
 * that waits for no choice (`view` "talk", hud-view.ts) the budget and AP, the held
 * items and the screen's tool keep their room but are not shown (journey-hud.css).
 * Its height is measured as `--hud-h` for the reserves of the scenes it lies over.
 * Its feedback (2026-11-13 user decision; display only, for changes in play): the held items' キラリ, their
 * 「NEW」 and their float as one is given away, 「…を手に入れました」 under it (ItemGainNotice), coins and
 * stars flying into a rising budget and AP (HudFlight), the dots of 英語ノート and 旅の図鑑 and a save's ribbon on ⚙設定, and a
 * line's item card (`# item_show:`) flying into the held items as its line goes (ItemShowFlight).
 */
export function JourneyHud({ game, place, view, sceneBackgroundId, replaced = 0, seenItemIds, onItemsSeen, englishNew = false, glossaryNew = false, holdNotices = false,
  itemFlight = null, ...actions }: {
  game: GameState; place: TravelPlace | undefined; view: HudView;
  /**
   * The background the story scene on screen draws its picture from (GameApp; none in free time or where a landmark's
   * photo shows): when it says where it is (`placeId`/`placeJa`), the place plate names that place (hudPlaceName).
   */
  sceneBackgroundId?: string;
  /** Counts the times a load (or Debug's return) put another game in place (GameApp): what it brings has no cue. */
  replaced?: number;
  /** The held items the player has looked at in the open detail during this play (GameApp's memory, seen-marks.ts). */
  seenItemIds?: ReadonlySet<string>;
  /** The detail opened on these held items: they are seen. */
  onItemsSeen?: (ids: readonly string[]) => void;
  /** 英語ノート has an entry the player has not opened it on: a dot on ⚙設定 and on its 「英語ノート」. */
  englishNew?: boolean;
  /** 旅の図鑑 has a term the player has not opened it on: a dot on ⚙設定 and on its 「旅の図鑑」. */
  glossaryNew?: boolean;
  /** Holds 「…を手に入れました」 while something else shows under the header (ItemGainNotice's `hold`). */
  holdNotices?: boolean;
  /** A line's item card on its way out (`# item_show:`, GameApp's useItemShowLeave): into the bag when held and shown, else it fades. */
  itemFlight?: ItemShowLeave | null;
} & MenuActions) {
  const measured = useMeasuredHeight("--hud-h");
  const weekday = getGameWeekday(game.travel.calendar);
  const money = formatMoneyForCity(game.currentCityId, game.travelBudget);
  // This city's items, and those carried through the journey from an earlier city (the item design §2.6).
  const items = encounters.items
    .filter((item) => itemUsableIn(game, item.id, game.currentCityId) && game.inventory[item.id] === "held")
    .map((item) => ({ id: item.id, name: item.nameJa, description: item.descriptionJa, lines: itemLines(game, item.linesJa), iconPath: item.iconPath,
      ...(item.cityId !== game.currentCityId ? { origin: `${getCities().find((city) => city.id === item.cityId)?.nameJa ?? item.cityId}から持ってきた` } : {}) }));
  const shown = view === "all";
  // A quiet line hides the header (journey-hud.css): a focus left on one of its buttons goes to the line, which reads on.
  useEffect(() => {
    const focused = document.activeElement;
    if (view === "quiet" && focused instanceof HTMLElement && focused.closest(".journey-hud"))
      document.querySelector<HTMLElement>(`[${DIALOGUE_LINE_ATTRIBUTE}]`)?.focus({ preventScroll: true });
  }, [view]);
  const budgetCue = useSeenChange(game.travelBudget, shown, valueChange, replaced);
  const apCue = useSeenChange(game.ap, shown, valueChange, replaced);
  const itemKey = items.map((item) => item.id).join("\n");
  // A line's item card flying into the bag: the bag's pop waits for it to land.
  const itemsCue = useSeenChange(itemKey, shown && !itemFlight, itemsChange, replaced);
  const spentCue = useSeenChange(game.inventory, shown, spentChange, replaced);
  // item_pouch (and a short vibration) as a new item's picture pops and キラリ crosses the bag, not for the items a load
  // brings; item_give as one given away or used leaves it.
  useEffect(() => {
    if (!itemsCue) return;
    playSe("item_pouch");
    vibrate("item");
  }, [itemsCue]);
  useEffect(() => {
    if (spentCue) playSe("item_give");
  }, [spentCue]);
  // money as the budget changes in play (a payment or a receipt) and ap_gain as the AP rises (a reward, a scene's AP):
  // the moment it changes, also while the header hides it; not on the first showing nor for a load.
  usePlayChange(game.travelBudget, replaced, playMoney);
  usePlayChange(game.ap, replaced, playApGain);
  // Coins into the budget and stars into the AP as they rise (HudFlight), then the value's pop.
  const budgetRef = useRef<HTMLSpanElement>(null);
  const apRef = useRef<HTMLSpanElement>(null);
  const coins = budgetCue?.change.direction === "up" ? flightTokens("coin", budgetCue.change.from, budgetCue.change.to) : 0;
  const stars = apCue?.change.direction === "up" ? flightTokens("star", apCue.change.from, apCue.change.to) : 0;
  const coinsFlying = useCuePlaying(coins ? budgetCue?.count : undefined, FLIGHT_TOTAL_MS);
  const starsFlying = useCuePlaying(stars ? apCue?.count : undefined, FLIGHT_TOTAL_MS);
  const spentIcon = spentCue ? itemDefinition(spentCue.change[0])?.iconPath : undefined;
  const newItemIds = items.filter((item) => seenItemIds && !seenItemIds.has(item.id)).map((item) => item.id);
  // In a tour's car (its leg's narration begun, the move not yet) the leg's label, not the place left behind; while the
  // scene shows a background that says where it is (a station, the hotel's alley in a finale), that place.
  const backdrop = sceneBackgroundId === undefined ? undefined : presentation.backgrounds[sceneBackgroundId];
  const placeJa = hudPlaceName(placeDisplayName(game, place), { legJa: tourLegUnderway(game)?.labelJa, backdrop },
    backdrop?.placeId ? mapCities() : []);
  return (
    <div className="journey-hud" data-testid="journey-bar" data-view={view} ref={measured} onMouseDown={keepFocusOffControls}>
      <div className="hud-status">
        <p className="hud-plate" data-testid="journey-context">
          <span className="hud-place"><Icon name="pin" /><span className="sr-only">現在地：</span>{placeJa}</span>
          <span className="hud-time">
            <Icon name={getTimePeriod(game.travel.minute) === "day" ? "sun" : "moon"} />
            {game.travel.day}日目{weekday === undefined ? null : <span aria-label={weekdayLabel(weekday).spoken}>{weekdayLabel(weekday).short}</span>} {formatTravelTime(game.travel.minute)}
          </span>
        </p>
        <p className="hud-wallet">
          {/* A new key per change the player sees plays its cue once (journey-hud.css). */}
          <span key={`budget-${budgetCue?.count ?? 0}`} ref={budgetRef} className="travel-budget" data-cue={budgetCue?.change.direction} data-fly={coins ? "" : undefined}
            data-length={moneyLength(money)} aria-label={`旅の予算 ${game.travelBudget}${currencyForCity(game.currentCityId).unitJa}`}><Icon name="coin" />{money}</span>
          <span key={`ap-${apCue?.count ?? 0}`} ref={apRef} className="ap" data-cue={apCue?.change.direction} data-fly={stars ? "" : undefined}
            aria-label={`残り${game.ap}AP`}><Icon name="star" />{game.ap}<small> AP</small></span>
        </p>
      </div>
      <div className="hud-actions">
        <HeldItems items={items} gained={itemsCue?.count} onOpen={closeWaitMenu}
          spent={spentCue ? { count: spentCue.count, iconPath: spentIcon } : undefined}
          newIds={newItemIds} onSeen={() => onItemsSeen?.(items.map((item) => item.id))} />
        <nav className="hud-tools" aria-label="旅の操作">
          <span id={HUD_SCREEN_TOOL_ID} className="hud-screen-tool" />
          <HudMenu {...actions} englishNew={englishNew} glossaryNew={glossaryNew} />
        </nav>
      </div>
      <ItemGainNotice inventory={game.inventory} replaced={replaced} hold={holdNotices || view === "quiet"} />
      {coinsFlying && <HudFlight key={`coins-${budgetCue?.count}`} kind="coin" count={coins} to={budgetRef} />}
      {starsFlying && <HudFlight key={`stars-${apCue?.count}`} kind="star" count={stars} to={apRef} />}
      {itemFlight && <ItemShowFlight key={itemFlight.key} itemId={itemFlight.itemId} toBag={itemFlight.held && shown} />}
    </div>
  );
}

type Cue<C> = { change: C; count: number };

/**
 * The changes of one of the header's values that the player has seen, for its cue (display only;
 * the header always shows the value itself). The budget, the AP and the held items wait for a
 * choice over a story scene (`shown` false, hud-view.ts), so a change made while they are hidden
 * counts when they show again: an AP reward read on a battle's result shows as the AP rising once
 * free time shows it. Null until the first change; nothing on the first showing. `replaced`
 * (JourneyHud's): when it changes, the value then is taken as seen, with no cue.
 */
function useSeenChange<T, C>(value: T, shown: boolean, change: (seen: T, now: T) => C | null, replaced: number): Cue<C> | null {
  const seen = useRef({ value, replaced });
  const [cue, setCue] = useState<Cue<C> | null>(null);
  useEffect(() => {
    if (seen.current.replaced !== replaced) {
      seen.current = { value, replaced };
      return;
    }
    if (!shown) return;
    const found = change(seen.current.value, value);
    seen.current = { value, replaced };
    if (found !== null) setCue((last) => ({ change: found, count: (last?.count ?? 0) + 1 }));
  }, [value, shown, change, replaced]);
  return cue;
}
/** A budget or AP that rose or fell, from what to what. */
const valueChange = (seen: number, now: number): { direction: Direction; from: number; to: number } | null => {
  const direction = numberChange(seen, now);
  return direction && { direction, from: seen, to: now };
};
/** The held items given away or used (not those a departure left behind). */
const spentChange = (seen: GameState["inventory"], now: GameState["inventory"]): string[] | null => {
  const spent = spentItemIds(seen, now);
  return spent.length ? spent : null;
};

/** Calls `onChange` as `value` changes in play: not on the first showing nor for a load (`replaced`, JourneyHud's). */
function usePlayChange(value: number, replaced: number, onChange: (before: number, now: number) => void) {
  const seen = useRef({ value, replaced });
  useEffect(() => {
    const before = seen.current;
    seen.current = { value, replaced };
    if (before.replaced === replaced && before.value !== value) onChange(before.value, value);
  }, [value, replaced, onChange]);
}
const playMoney = () => playSe("money");
const playApGain = (before: number, now: number) => {
  if (now > before) playSe("ap_gain");
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
 * 旅の記録, アルバム, 旅の図鑑 (a journey with terms), 英語ノート, 写真の出典 (free time's photos) or 画像の出典 (a story
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
 * アルバム's and 旅の図鑑's dialogs take no press for that moment, as their cards open larger on a tap.
 * Its marks (2026-11-13 user decision): while 英語ノート has an entry the player has not
 * opened it on (`englishNew`), a dot on ⚙設定 and on 「英語ノート」, said in their names;
 * likewise for 旅の図鑑's terms (`glossaryNew`) on ⚙設定 and 「旅の図鑑」;
 * a manual save that succeeded drops a small ribbon onto ⚙設定, which fades.
 */
function HudMenu({ onSave, onLoad, onRecords, onAlbum, onGlossary, onEnglish, onPhotoCredits, onSceneCredits, onSettings, onReturnToFreeTime, englishNew,
  glossaryNew }: MenuActions & { englishNew: boolean; glossaryNew: boolean }) {
  const newIn = [englishNew && "英語ノート", glossaryNew && "旅の図鑑"].filter(Boolean).join("と");
  const [open, setOpen] = useState(false);
  // Counts the manual saves that succeeded: each new count drops the ribbon once.
  const [saved, setSaved] = useState(0);
  const savePlaying = useCuePlaying(saved, SAVE_MARK_MS);
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
      playSe("ui_close");
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
        className="hud-tool fx-host"
        data-testid="hud-menu"
        aria-expanded={open}
        aria-controls="hud-menu-panel"
        onClick={() => {
          if (!open) closeWaitMenu();
          playSe(open ? "ui_close" : "ui_open");
          setOpen(!open);
        }}
      >
        <Icon name="gear" /><span className="hud-tool-word">設定</span>
        {newIn && <NewDot label={`${newIn}に新しい項目あり`} />}
        {savePlaying && <span key={saved} className="hud-save-mark" aria-hidden="true"><span className="hud-save-ribbon" /></span>}
      </button>
      <div id="hud-menu-panel" className="hud-menu-panel" data-testid="hud-menu-panel" ref={panel} hidden={!open} onKeyDown={moveWithArrows}>
        <button type="button" onClick={choose(() => {
          if (onSave()) setSaved((count) => count + 1);
        }, true)}><Icon name="save" />セーブ</button>
        <button type="button" onClick={choose(onLoad)}><Icon name="load" />ロード</button>
        <button type="button" onClick={choose(onRecords)}><Icon name="stamp" />旅の記録</button>
        <button type="button" onClick={choose(onAlbum)}><Icon name="camera" />アルバム</button>
        {onGlossary && <button type="button" onClick={choose(onGlossary)}><Icon name="lens" />旅の図鑑{glossaryNew && <NewDot label="新しい言葉あり" />}</button>}
        <button type="button" onClick={choose(onEnglish)}><Icon name="book" />英語ノート{englishNew && <NewDot label="新しい項目あり" />}</button>
        {onPhotoCredits && <button type="button" onClick={choose(onPhotoCredits)}><Icon name="credit" />写真の出典</button>}
        {onSceneCredits && <button type="button" onClick={choose(onSceneCredits)}><Icon name="credit" />画像の出典</button>}
        <button type="button" onClick={choose(onSettings)}><Icon name="sliders" />ゲームの設定</button>
        {/* Last, apart from the items of normal play; it opens a confirmation that settles presses. */}
        {onReturnToFreeTime && <button type="button" onClick={choose(onReturnToFreeTime)}><Icon name="map" />移動画面に戻る（Debug）</button>}
      </div>
      {open && <DismissLayer owner={group.current} onClose={(focusWasInside) => {
        playSe("ui_close");
        setOpen(false);
        if (focusWasInside) backToGear();
      }} />}
    </div>
  );
}
