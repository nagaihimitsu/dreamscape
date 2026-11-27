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
import { HudOutfits, type OutfitOption } from "../components/HudOutfits";
import { characterPicture } from "../components/character-catalog";
import { canChangeOutfit, ownedOutfits } from "../domain/outfits";
import { HUD_SCREEN_TOOL_ID } from "../components/HudScreenTool";
import { Icon } from "../components/icons";
import { NewDot, useCuePlaying } from "../components/fx";
import { playSe } from "../audio/sound-effects";
import { vibrate } from "../audio/vibration";
import type { GameState } from "../domain/game";
import { itemDefinition } from "../domain/item-cities";
import { spentItemIds } from "../domain/item-changes";
import { tourLegUnderway } from "../domain/tour";
import { getGameWeekday } from "../domain/travel";
import { hudPlaceName, placeDisplayName, type MapCity } from "../features/journey/travel-labels";
import { formatTravelTime } from "../features/journey/travel-time";
import { moneyLength, weekdayLabel } from "./journey-hud-text";
import type { HudView } from "./hud-view";
import { flightTokens, itemsChange, numberChange, type Direction } from "./hud-cues";
import { FLIGHT_TOTAL_MS, HudFlight } from "./HudFlight";
import { ClueRecordedNotice, type ClueNoticeWord } from "./ClueRecordedNotice";
import { ItemGainNotice } from "./ItemGainNotice";
import { ItemShowFlight } from "../components/ItemShow";
import { ItemOutFlight } from "../components/ItemOut";
import { PhotoShowFlight, type PrintFlight } from "../components/PhotoShow";
import type { ItemShowLeave } from "./useItemShowLeave";
import type { SessionToast } from "./useGameSession";
import { useMeasuredHeight } from "../components/useMeasuredHeight";
import "./journey-hud.css";
import "./hud-effects.css";

/** Every loaded city's map (place IDs are unique across them), for a background that names its place by placeId. */
const mapCities = (): MapCity[] => getCities().map((city) => {
  const { travel, travelSettings } = getCityContent(city.id);
  return { hotelPlaceId: travelSettings.hotelPlaceId, places: travel.places };
});

/** How long ≡メニュー's bounce as a photo's print lands plays, its flight included (milliseconds; hud-effects.css). */
const PHOTO_LANDING_MS = 1100;
/** How long a save's ribbon plays on ≡メニュー (milliseconds; hud-effects.css). */
const SAVE_MARK_MS = 900;

/**
 * The header's popovers open one at a time, all hanging from its bottom edge:
 * ≡メニュー's panel and the held items' detail close each other (a press outside
 * either closes it), and opening one of them also closes the previous free-time
 * screen's open 待機 menu in its bottom band (MapListFreeTime; a `<details>`,
 * which closes only when its own summary is pressed).
 */
function closeWaitMenu() {
  for (const details of document.querySelectorAll<HTMLDetailsElement>('[data-testid="travel-actions"] details[open]')) details.open = false;
}

/**
 * What ≡メニュー's panel opens; 画面の出典 lists the photos free time shows (cards, a backdrop photo), the recap card's
 * place photo (also on the night screen) or a story scene's registered photo (its credits: the scene shows no 出典 of its
 * own, nor does a quiz answer's reveal of the same photo; 2026-11-15), the sources of a quiz answer's explanation and of
 * the clue book's clues (2026-11-20: off the quiz card and the clue book), and opens 出典・権利の一覧 (2026-11-20).
 */
type MenuActions = {
  /** 「セーブ・ロード」: the dialog of the journey's slots, to save into or load from one (SaveSlots.tsx's SaveLoadDialog). */
  onSaveLoad: () => void;
  /** Counts the saves that succeeded: each new count drops a ribbon onto ≡メニュー. */
  saveMark?: number;
  /** 「旅の記録」: the journey's SNS and 写真 (TravelLog.tsx; 2026-11-19, アルバム made one with it; 2026-11-27, 「体験」 made the SNS). */
  onRecords: () => void;
  /**
   * A photo taken that 旅の記録's 「写真」 has not shown yet (2026-11-25), or something arrived that its 「SNS」 has not
   * (2026-11-27): a dot on ≡メニュー and on 「旅の記録」.
   */
  recordsNew?: boolean;
  /** 「ノート」: 旅のことば and 旅の図鑑 in one dialog (NoteDialog.tsx; 2026-11-20); none for a journey with neither. */
  onNote?: () => void;
  /** Its name: 「ノート」, or its page's name for a note of one page (noteName). */
  noteLabel?: string;
  /** 「画面の出典」 (PhotoCredits.tsx's ScreenCredits; 2026-11-20): the screen's photos and sources, and the way into 出典・権利の一覧. */
  onScreenCredits?: () => void;
  onSettings: () => void;
  /** 移動画面に戻る（Debug）: only while Debug mode offers it (src/app/free-time-return.ts). */
  onReturnToFreeTime?: () => void;
};

const noop = () => undefined;

/**
 * The header of every game screen (UI redesign §3.1): row 1 shows where and when
 * the couple are and what they have (display only; the budget above the AP at
 * the right end; the place name is never cut: it wraps), row 2 holds what can be
 * pressed, side by side at its right end (user decision 2026-11-11): 「服」 once an outfit is bought (HudOutfits,
 * 2026-11-20), the held items, the screen's own tool (free time's 「地図」, a guide's or a battle's
 * 「手がかり帳」; HudScreenTool) and ≡メニュー (the game's main menu, named 「設定」 until 2026-11-14) with
 * セーブ・ロード | 旅の記録・ノート | 画面の出典・ゲームの設定.
 * Over a story scene
 * that waits for no choice (`view` "talk", hud-view.ts) the budget and AP, the held
 * items and the screen's tool keep their room but are not shown (journey-hud.css).
 * Its height is measured as `--hud-h` for the reserves of the scenes it lies over.
 * Its feedback (2026-11-13 user decision; display only, for changes in play): the held items' キラリ, their
 * 「NEW」 and their float as one is given away, 「…を手に入れました」 under it (ItemGainNotice), coins and
 * stars flying into a rising budget and AP (HudFlight), the dot of ノート and a save's ribbon on ≡メニュー, and a
 * line's item card (`# item_show:`) flying into the held items as its line goes (ItemShowFlight), and an item taken out
 * (`# item_out:`) going back into them (ItemOutFlight). The session's short words (`toast`: a save, a load, a tour's end)
 * show in the same place for a moment, the clue's word (ClueRecordedNotice) and the item notices waiting behind them.
 */
export function JourneyHud({ game, place, view, sceneBackgroundId, scenePlaceJa, replaced = 0, seenItemIds, onItemsSeen, noteNew = [], holdNotices = false,
  itemFlight = null, itemOutFlight = null, photoFlight = null, toast = null, clueNotice = null, onClueNoticeDone, clock, onWearOutfit, ...actions }: {
  game: GameState; place: TravelPlace | undefined; view: HudView;
  /** 「服」's choice (2026-11-20; outfits.ts wearOutfit): an outfit bought, or 普段の服 (null). */
  onWearOutfit?: (outfitId: string | null) => void;
  /**
   * The clock to show instead of the game's (GameApp: the night a rest slept from, while the night screen's 「ホテルで休みました。」
   * still shows; 2026-11-15: the morning's 「2日目 09:00」 and its sun waited for the tap).
   */
  clock?: Pick<GameState["travel"], "day" | "minute" | "calendar"> | null;
  /**
   * The background the story scene on screen draws its picture from (GameApp; none in free time or where a landmark's
   * photo shows): when it says where it is (`placeId`/`placeJa`), the place plate names that place (hudPlaceName).
   */
  sceneBackgroundId?: string;
  /** Where the story scene on screen is when the party did not go there on the map (a moment quiz's landmark): the plate's name if its background names no place. */
  scenePlaceJa?: string;
  /** Counts the times a load (or Debug's return) put another game in place (GameApp): what it brings has no cue. */
  replaced?: number;
  /** The held items the player has looked at in the open detail during this play (GameApp's memory, seen-marks.ts). */
  seenItemIds?: ReadonlySet<string>;
  /** The detail opened on these held items: they are seen. */
  onItemsSeen?: (ids: readonly string[]) => void;
  /** The pages of 「ノート」 with something the player has not opened them on (their names): a dot on ≡メニュー and on 「ノート」. */
  noteNew?: readonly string[];
  /** The session's word for a moment (useGameSession's SessionToast; it goes by itself). */
  toast?: SessionToast | null;
  /** Holds 「…を手に入れました」 and the clue's word while something else shows under the header (ItemGainNotice's `hold`). */
  holdNotices?: boolean;
  /** The first word of GameApp's queue that a clue was recorded (ClueRecordedNotice), and its end (it is dropped from the queue). */
  clueNotice?: ClueNoticeWord | null;
  onClueNoticeDone?: (key: number) => void;
  /** A line's item card on its way out (`# item_show:`, GameApp's useItemShowLeave): into the bag when held and shown, else it fades. */
  itemFlight?: ItemShowLeave | null;
  /** A line's item taken out on its way back (`# item_out:`, GameApp's useItemShowLeave): into the bag when held and shown, else it fades. */
  itemOutFlight?: ItemShowLeave | null;
  /** A photo just taken whose large print's line has gone (GameApp, 2026-11-25): the print flies into ≡メニュー, which bounces as it lands. */
  photoFlight?: PrintFlight | null;
} & MenuActions) {
  const measured = useMeasuredHeight("--hud-h");
  const shownClock = clock ?? game.travel;
  const weekday = getGameWeekday(shownClock.calendar);
  const money = formatMoneyForCity(game.currentCityId, game.travelBudget);
  // This city's items, and those carried through the journey from an earlier city (the item design §2.6).
  const items = encounters.items
    .filter((item) => itemUsableIn(game, item.id, game.currentCityId) && game.inventory[item.id] === "held")
    .map((item) => ({ id: item.id, name: item.nameJa, description: item.descriptionJa, lines: itemLines(game, item.linesJa), iconPath: item.iconPath }));
  const shown = view === "all";
  // 「服」 (2026-11-20): 普段の服 (the outfit this city gives her) and each outfit bought, her small picture in each.
  const bought = ownedOutfits(game);
  const outfitOptions: OutfitOption[] = [
    { id: null, name: "普段の服", picture: characterPicture("heroine", "neutral", { cityId: game.currentCityId }) },
    ...bought.map((outfit) => ({ id: outfit.id, name: outfit.nameJa, picture: characterPicture("heroine", "neutral", { costume: outfit.costume }) })),
  ];
  const outfitsCue = useSeenChange(bought.map((outfit) => outfit.id).join("\n"), shown, itemsChange, replaced);
  // The outfits' dot: one bought since the panel was last opened (a load brings none).
  const [outfitsOpenedAt, setOutfitsOpenedAt] = useState(0);
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
  const itemsCue = useSeenChange(itemKey, shown && !itemFlight && !itemOutFlight, itemsChange, replaced);
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
  const placeJa = hudPlaceName(placeDisplayName(game, place), { legJa: tourLegUnderway(game)?.labelJa, backdrop, sceneJa: scenePlaceJa },
    backdrop?.placeId ? mapCities() : []);
  return (
    <div className="journey-hud" data-testid="journey-bar" data-view={view} ref={measured} onMouseDown={keepFocusOffControls}>
      <div className="hud-status">
        {/* A new place shows its plate again in a talk, where it fades after a while (journey-hud.css). Words only, no
            marks before them (2026-11-25 user decision: the header as blended as it can be). */}
        <p key={placeJa} className="hud-plate" data-testid="journey-context">
          <span className="hud-place"><span className="sr-only">現在地：</span>{placeJa}</span>
          <span className="hud-time">
            {shownClock.day}日目{weekday === undefined ? null : <span aria-label={weekdayLabel(weekday).spoken}>{weekdayLabel(weekday).short}</span>} {formatTravelTime(shownClock.minute)}
          </span>
        </p>
        <p className="hud-wallet">
          {/* A new key per change the player sees plays its cue once (journey-hud.css). */}
          <span key={`budget-${budgetCue?.count ?? 0}`} ref={budgetRef} className="travel-budget" data-cue={budgetCue?.change.direction} data-fly={coins ? "" : undefined}
            data-length={moneyLength(money)} aria-label={`旅の予算 ${game.travelBudget}${currencyForCity(game.currentCityId).unitJa}`}>{money}</span>
          <span key={`ap-${apCue?.count ?? 0}`} ref={apRef} className="ap" data-cue={apCue?.change.direction} data-fly={stars ? "" : undefined}
            aria-label={`残り${game.ap}AP`}>{game.ap}<small> AP</small></span>
        </p>
      </div>
      <div className="hud-actions">
        <HudOutfits options={outfitOptions} worn={game.outfit ?? null} canChange={canChangeOutfit(game)} onOpen={closeWaitMenu}
          onWear={(id) => onWearOutfit?.(id)} gained={outfitsCue?.count} fresh={(outfitsCue?.count ?? 0) > outfitsOpenedAt}
          onSeen={() => setOutfitsOpenedAt(outfitsCue?.count ?? 0)} />
        <HeldItems items={items} gained={itemsCue?.count} onOpen={closeWaitMenu}
          spent={spentCue ? { count: spentCue.count, iconPath: spentIcon } : undefined}
          newIds={newItemIds} onSeen={() => onItemsSeen?.(items.map((item) => item.id))} />
        <nav className="hud-tools" aria-label="旅の操作">
          <span id={HUD_SCREEN_TOOL_ID} className="hud-screen-tool" />
          <HudMenu {...actions} noteNew={noteNew} photoMark={photoFlight?.key} />
        </nav>
      </div>
      {/* One notice under the header at a time: the session's word first, then the clue's, then 「…を手に入れました」. */}
      <ClueRecordedNotice notice={clueNotice} hold={holdNotices || view === "quiet" || !!toast} onDone={onClueNoticeDone ?? noop} />
      <ItemGainNotice inventory={game.inventory} replaced={replaced} hold={holdNotices || view === "quiet" || !!toast || !!clueNotice} />
      {/* The session's word (a save, a load, a tour's end): under the header like 「…を手に入れました」, taking no press and
          pushing nothing down; also over a quiet line (journey-hud.css), as it answers what the player just did. */}
      <div className="hud-toast-region" role="status" data-testid="session-toast">
        {toast && <p key={toast.key} className="item-gain-notice hud-toast">{toast.text}</p>}
      </div>
      {coinsFlying && <HudFlight key={`coins-${budgetCue?.count}`} kind="coin" count={coins} to={budgetRef} />}
      {starsFlying && <HudFlight key={`stars-${apCue?.count}`} kind="star" count={stars} to={apRef} />}
      {itemFlight && <ItemShowFlight key={itemFlight.key} itemId={itemFlight.itemId} toBag={itemFlight.held && shown} />}
      {photoFlight && <PhotoShowFlight key={`photo-${photoFlight.key}`} flight={photoFlight} toMenu={view !== "quiet"} />}
      {itemOutFlight && <ItemOutFlight key={`out-${itemOutFlight.key}`} itemId={itemOutFlight.itemId} toBag={itemOutFlight.held && shown} />}
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
 * ≡メニュー panel then gives it back to its button (HudMenu).
 */
function keepFocusOffControls(event: { target: EventTarget; preventDefault: () => void }) {
  if (event.target instanceof Element && !event.target.closest("button, a, input, select, summary, [tabindex]")) event.preventDefault();
}

/**
 * ≡メニュー (U2, U24; 「設定」 with a gear until 2026-11-14, renamed as it is the game's main menu): a disclosure button
 * with its small panel right under the header (APG Disclosure, not an ARIA menu: ordinary buttons, and Tab works as
 * everywhere else), its items in three groups split by thin rules (2026-11-19 user decision, as the menu had grown):
 * セーブ・ロード (one item since 2026-11-19: the dialog of the slots, SaveLoadDialog); 旅の記録 and ノート (旅のことば and
 * 旅の図鑑 in one dialog since 2026-11-20), what the journey collected; 画面の出典 (one item for free time's and a story
 * scene's photos since 2026-11-20, on every screen with the way into 出典・権利の一覧) and ゲームの設定 (U28). Debug's
 * 移動画面に戻る comes last.
 * Opening moves the focus to the first item (ArrowUp/ArrowDown also move between the items); Esc closes and
 * returns it to ≡メニュー; leaving the group with the focus or a press elsewhere
 * closes it. A tap on the page outside the header only closes it (DismissLayer).
 * Choosing an item closes the panel and puts the focus on ≡メニュー before the action
 * runs, so a dialog it opens gives the focus back to ≡メニュー when it closes. The
 * panel then leaves from under the finger: セーブ・ロード, ノート and ゲームの設定 open dialogs
 * that take no press for a moment, so the second tap of a double tap presses nothing that lay under it.
 * 画面の出典 opens its dialog at once (the second tap lands inside the dialog);
 * 旅の記録's dialog takes no press for that moment, as its photos open larger on a tap.
 * Its marks (2026-11-13 user decision): while 英語ノート has an entry the player has not
 * opened it on, or 旅のことば a word, or 旅の図鑑 a term (`noteNew`, their names), a dot on ≡メニュー and on 「ノート」, said in
 * their names;
 * a save that succeeded (`saveMark`) drops a small ribbon onto ≡メニュー, which fades.
 */
function HudMenu({ onSaveLoad, saveMark = 0, onRecords, recordsNew = false, onNote, noteLabel = "ノート", onScreenCredits, onSettings,
  onReturnToFreeTime, noteNew, photoMark }: MenuActions & { noteNew: readonly string[]; photoMark?: number }) {
  const newIn = noteNew.join("と");
  const menuNewIn = [...(recordsNew ? ["旅の記録"] : []), ...noteNew].join("と");
  // A photo's print lands on the button as its flight ends (PhotoShowFlight): the button bounces (hud-effects.css).
  const photoLanding = useCuePlaying(photoMark, PHOTO_LANDING_MS);
  const [open, setOpen] = useState(false);
  const savePlaying = useCuePlaying(saveMark, SAVE_MARK_MS);
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
    // which the press leaves where it was, goes back to ≡メニュー. The dismiss layer
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

  const choose = (action: () => void) => () => {
    setOpen(false);
    backToGear();
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
        data-photo-landing={photoLanding || undefined}
        data-testid="hud-menu"
        aria-expanded={open}
        aria-controls="hud-menu-panel"
        onClick={() => {
          if (!open) closeWaitMenu();
          // No sound as the menu's panel opens or closes (user decision 2026-11-14): it is pressed often.
          setOpen(!open);
        }}
      >
        <Icon name="menu" /><span className="hud-tool-word">メニュー</span>
        {menuNewIn && <NewDot label={`${menuNewIn}に新しい項目あり`} />}
        {savePlaying && <span key={saveMark} className="hud-save-mark" aria-hidden="true"><span className="hud-save-ribbon" /></span>}
      </button>
      <div id="hud-menu-panel" className="hud-menu-panel" data-testid="hud-menu-panel" ref={panel} hidden={!open} onKeyDown={moveWithArrows}>
        <button type="button" onClick={choose(onSaveLoad)}><Icon name="save" />セーブ・ロード</button>
        <hr className="hud-menu-rule" />
        <button type="button" onClick={choose(onRecords)}><Icon name="stamp" />旅の記録{recordsNew && <NewDot label="新しい写真・投稿あり" />}</button>
        {onNote && <button type="button" onClick={choose(onNote)}><Icon name="book" />{noteLabel}{newIn && <NewDot label={`${newIn}に新しい項目あり`} />}</button>}
        <hr className="hud-menu-rule" />
        {onScreenCredits && <button type="button" onClick={choose(onScreenCredits)}><Icon name="credit" />画面の出典</button>}
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
