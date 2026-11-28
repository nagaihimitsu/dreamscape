import { useId, type KeyboardEvent } from "react";
import { getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { transportLabel } from "../../content/transport";
import type { GameState } from "../../domain/game";
import { getDirection } from "../../domain/travel";
import type { EventChoice, RouteChoice, SleepOption, TravelWaitOption } from "../../domain/travel-destinations";
import { getTravelEventDefinition, type TravelMode } from "../../domain/travel-game";
import { compareRouteTime } from "../../domain/travel-routes";
import { HeroineNote } from "../battle/HeroineNote";
import { withNames } from "../romance/names";
import {
  blockedSleepWays, blockedWays, chooseSleepWay, chooseWay, chosenEvent, departureOf, eventKindJa, refusalReasonsJa, sleepRefusalReasonsJa, sleepWayKey,
  sleepWayLabelJa, sleepWayShortJa, WAIT_BLOCKED_JA, waitKey, waitLabelJa, waitLineJa, type DeparturePlan, type PhotoCardEntry,
} from "./photo-cards";
import { placeHeroineLine } from "./place-heroine-line";
import { PlaceInsetMap } from "./PlaceInsetMap";
import { placeDisplayName } from "./travel-labels";
import { formatTravelTime } from "./travel-time";
import { TravelTours } from "./TravelTours";
import { pressKindOf, type PressScope, type TravelSelectionApi } from "./useTravelSelection";
import { visitedPlaceIds } from "./visited-places";
import "../battle/battle.css";
import { FitText } from "../../components/FitText";

/** A held key repeats its keydown: only its first press counts (the travel guards). */
function ignoreRepeat(event: KeyboardEvent) {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
}

/**
 * The name of a card under the row (visible, or for readers only where the chosen row right above names it). No
 * selected mark before it (user decision 2026-11-11): the chosen card and the map already show the choice.
 */
function CardName({ id, name, heading }: { id: string; name: string; heading: boolean }) {
  return <h2 id={id} className={heading ? "place-card-name" : "sr-only"}><FitText text={name} /></h2>;
}

/**
 * The selected place's introduction card (B案): its name, the place's own description (`descriptionJa` of the travel
 * place: general tourist information, never an event's teaser; none, no line), the heroine's few words about it (her
 * small face and a bubble, from its `heroineLinesJa`; on the page only, none without a line), then for each of its events its tag
 * (「ストーリー」 or 「デート」), the AP (when it takes some), time and admission (with several events, each tag beside its
 * title, which chooses the event a departure takes), the chosen event's ways with their time and fare; the return
 * reserve, and the small map of the current place and this one. The event and the way chosen here (`plan`) are what a
 * swipe up on the place's photo card takes; its 「行く」 takes them too (`quietGo`: in the row, where the swipe departs, for
 * screen readers and keys only), through the shared selection's pressRoute (its arming waits out a double tap), and
 * only while this place is the selection. In the expanded map the bar at the dialog's foot goes instead (`go` false:
 * PlaceGoBar).
 */
export function PlaceCard({ game, entry, api, plan, onPlan, scope = "page", map = true, heading = true, quietGo = false, go = true }: {
  game: GameState;
  entry: PhotoCardEntry;
  api: TravelSelectionApi;
  /** The event and the mode chosen here (shared with the photo card's swipe and the expanded map's card). */
  plan: DeparturePlan;
  onPlan: (change: Partial<DeparturePlan>) => void;
  scope?: PressScope;
  /** The small map (not in the expanded map's 「選んだ行き先」, beside the big one). */
  map?: boolean;
  /** The name as a visible heading (in the list the chosen row right above names it: then for readers only). */
  heading?: boolean;
  /** 「行く」 for screen readers and keys only (the row, where a swipe up on the photo card departs). */
  quietGo?: boolean;
  /** Its own 「行く」 (none in the expanded map, whose bar at the foot goes: PlaceGoBar). */
  go?: boolean;
}) {
  const id = useId();
  const cityId = game.currentCityId;
  const place = entry.place.events[0].place;
  const here = getCityContent(cityId).travel.places.find((item) => item.id === game.travel.currentPlaceId) ?? null;
  const isCurrent = place.id === game.travel.currentPlaceId;
  const selected = api.isSelected({ kind: "place", placeId: place.id });
  const name = placeDisplayName(game, place);
  const dateOnly = entry.events.every((choice) => choice.event.category === "date");
  const reserve = game.travel.returnReserve;
  const several = entry.events.length > 1;
  const chosen = chosenEvent(entry, plan.eventId).event.id;
  // Her few words about the place (its heroineLinesJa), on the page only: not in the expanded map's 「選んだ行き先」.
  const line = scope === "page" ? placeHeroineLine(game, place) : null;
  const events = entry.events.map((choice) => <PlaceEvent key={choice.event.id} game={game} placeId={place.id} choice={choice} several={several}
    chosen={choice.event.id === chosen} onChoose={() => onPlan({ eventId: choice.event.id })}
    way={{ isCurrent, selected, api, scope, picked: plan.mode, onPick: (mode) => onPlan({ mode }), quietGo, go }} />);
  return <section className={`place-card${entry.available ? "" : " is-unavailable"}`} data-testid="place-card" data-place-id={place.id}
    data-armed={selected && api.armed ? "true" : undefined} aria-labelledby={`${id}-name`}>
    <CardName id={`${id}-name`} name={name} heading={heading} />
    {place.descriptionJa && <p className="place-card-hook">{place.descriptionJa}</p>}
    {/* A new note for each place chosen, so it comes in again (place-card-heroine; none under reduced motion). */}
    {line !== null && <HeroineNote key={place.id} className="place-card-heroine" label={game.heroineName} hideLabel text={line} cityId={cityId} testId="place-heroine-line" />}
    {several ? <div className="place-card-event-list" role="group" aria-label="することを選ぶ">{events}</div> : events}
    {reserve > 0 && <p className="place-card-note">帰路用に{formatMoneyForCity(cityId, reserve)}を確保（所持金に含む）</p>}
    {map && <div className="place-card-map">
      <PlaceInsetMap here={here} there={place} name={name} glyph={dateOnly ? "♥" : "◆"} visited={visitedPlaceIds(game)} />
      {/* The direction as a small pill over the map's corner (2026-11-20 user decision: the header already names the current place). */}
      {here && <p className="place-card-direction">{isCurrent ? "現在地" : `現在地から${getDirection(here, place)}`}</p>}
    </div>}
  </section>;
}

/** What the ways of an event need from its card. */
type WayContext = {
  isCurrent: boolean;
  selected: boolean;
  api: TravelSelectionApi;
  scope: PressScope;
  picked: TravelMode | null;
  onPick: (mode: TravelMode) => void;
  quietGo: boolean;
  go: boolean;
};

/**
 * One event at the place: its tag (with several events, on the button that chooses it, before its title; else at the
 * start of its AP, time and admission line), and its ways (with several events, the chosen one's only).
 */
function PlaceEvent({ game, placeId, choice, several, chosen, onChoose, way }: {
  game: GameState;
  placeId: string;
  choice: EventChoice;
  several: boolean;
  chosen: boolean;
  onChoose: () => void;
  way: WayContext;
}) {
  const { event } = choice;
  const definition = getTravelEventDefinition(game, event.id) ?? event;
  const tag = <span className={`place-card-tag${event.category === "date" ? " is-date" : ""}`}>{eventKindJa(event.category)}</span>;
  const meta = [
    definition.apCost ? `AP ${definition.apCost}` : null,
    `${definition.activityMinutes}分`,
    definition.admissionCost ? `入場料 ${formatMoneyForCity(game.currentCityId, definition.admissionCost)}` : null,
  ].filter((part) => part !== null).join(" · ");
  return <div className="place-card-event" data-testid={`place-event-${event.id}`} data-chosen={several && chosen ? "true" : undefined}>
    {several && <button type="button" className="place-card-event-choice" data-testid={`event-choice-${event.id}`} aria-pressed={chosen}
      onKeyDown={ignoreRepeat} onClick={onChoose}>
      <span className="place-card-event-mark" aria-hidden="true">{chosen ? "●" : "○"}</span>{tag}<span>{withNames(event.titleJa, game)}</span>
    </button>}
    <p className="place-card-event-meta">{!several && tag}{meta}</p>
    {(!several || chosen) && <WayPicker cityId={game.currentCityId} placeId={placeId} eventId={event.id} routes={choice.routes} {...way} />}
  </div>;
}

/**
 * The way to go (B案 §3): several ways are one row of modes, each with its time and fare (pressing one only chooses
 * it; the fastest that can be taken is chosen first); one way is a line 「徒歩　約5分 · ₹0」 (in the row; elsewhere its
 * button says it). Then 「行く　約12分 · ₹80」 (one way: 「徒歩で行く　約5分 · ₹0」), which takes the chosen way (`quietGo`:
 * for screen readers and keys only; none with `go` false: the expanded map's bar says the way and goes). Ways that cannot
 * be taken are greyed, each reason said once under them.
 */
function WayPicker({ cityId, placeId, eventId, routes, isCurrent, selected, api, scope, picked, onPick, quietGo, go }: WayContext & {
  cityId: string;
  placeId: string;
  eventId: string;
  routes: RouteChoice[];
}) {
  const way = chooseWay(routes, picked);
  // With no way open, the button shows the fastest one, greyed.
  const { route } = way ?? [...routes].sort((a, b) => compareRouteTime(a.route, b.route))[0];
  const several = routes.length > 1;
  const label = (mode: TravelMode) => transportLabel(cityId, mode);
  const cost = (shown: RouteChoice["route"]) => `約${shown.minutes}分 · ${formatMoneyForCity(cityId, shown.cost)}`;
  return <div className="place-card-ways">
    {several && <div className="place-card-modes" role="group" aria-label="移動手段">
      {routes.map((choice) => <button key={choice.route.mode} type="button" className="place-card-mode" data-testid={`travel-mode-${eventId}-${choice.route.mode}`}
        aria-pressed={choice.route.mode === way?.route.mode} disabled={!choice.available} onKeyDown={ignoreRepeat}
        onClick={() => onPick(choice.route.mode)}>
        <span>{label(choice.route.mode)}</span>
        {!isCurrent && <span className="place-card-mode-cost"> {cost(choice.route)}</span>}
      </button>)}
    </div>}
    {!several && quietGo && !isCurrent && <p className={`place-card-way${way ? "" : " is-unavailable"}`}>
      {label(route.mode)}<span className="place-card-mode-cost"> {cost(route)}</span>
    </p>}
    {go && <button type="button" className={`primary place-card-go${quietGo ? " is-quiet" : ""}`} data-testid={`travel-go-${eventId}`} data-mode={route.mode}
      disabled={!way || !selected} onKeyDown={ignoreRepeat}
      onClick={(click) => { if (way) api.pressRoute(placeId, eventId, way.route.mode, pressKindOf(click), scope); }}>
      <span>{isCurrent ? "ここで始める" : several ? "行く" : `${label(route.mode)}で行く`}</span>
      {!isCurrent && <span className="place-card-go-cost">{cost(route)}</span>}
    </button>}
    {blockedWays(routes).map(({ modes, reason }) => {
      const names = modes.map(label).join("・");
      return <p key={reason} className="fine-print place-card-reason">{!several || modes.length === routes.length || reason.startsWith(names) ? reason : `${names}：${reason}`}</p>;
    })}
  </div>;
}

/** One of 「待機」's waits or 「ホテルに戻る」's ways home (CardOptions). */
type CardOption = { key: string; testId: string; label: string; cost: string | null; available: boolean };

/**
 * 「待機」's waits and 「ホテルに戻る」's ways home (2026-11-14, the UI audit): pressing one only chooses it (the swipe up
 * waits or rests), so they are chips, not buttons that look like actions; the chosen one is the smoked glass, with no
 * mark (2026-11-28 user decision: a place's ways have none). Pressing the chosen one again calls `onAgain` (the row
 * nudges the photo card's swipe cue: what waits or rests is the swipe). One choice is a line of plain text (nothing to
 * choose; 2026-11-27: not bold, so it does not read as a button), greyed when it cannot be taken; a tap on it nudges the
 * cue too (it did nothing before).
 */
function CardOptions({ label, options, chosenKey, onPick, onAgain }: {
  label: string;
  options: readonly CardOption[];
  chosenKey: string | null;
  onPick: (key: string) => void;
  onAgain?: () => void;
}) {
  if (options.length === 1) {
    const [only] = options;
    return <p className={`place-card-way${only.available ? "" : " is-unavailable"}`} data-testid={only.testId} onClick={only.available ? onAgain : undefined}>
      {only.label}{only.cost && <span className="place-card-mode-cost"> {only.cost}</span>}
    </p>;
  }
  return <div className="place-card-options" role="group" aria-label={label}>{options.map((option) => {
    const chosen = option.key === chosenKey;
    return <button key={option.key} type="button" className="place-card-option" data-testid={option.testId} aria-pressed={chosen}
      disabled={!option.available} onKeyDown={ignoreRepeat} onClick={() => (chosen ? onAgain?.() : onPick(option.key))}>
      <span className="place-card-option-text">{option.label}{option.cost && <span className="place-card-mode-cost">{option.cost}</span>}</span>
    </button>;
  })}</div>;
}

/**
 * The expanded map's bar for a place (2026-11-14, the UI audit: pinned at the dialog's foot, so it never sits below the
 * fold after a marker press): the name, the chosen event's tag and chosen way with its time and fare (else why it cannot
 * go now), and 「行く」 (「ここで始める」 at the current place). It takes what the card above chose (`plan`, as the photo
 * card's swipe does) through the shared selection's pressRoute, only while the place is the selection.
 */
export function PlaceGoBar({ game, entry, api, plan }: { game: GameState; entry: PhotoCardEntry; api: TravelSelectionApi; plan: DeparturePlan }) {
  const cityId = game.currentCityId;
  const place = entry.place.events[0].place;
  const isCurrent = place.id === game.travel.currentPlaceId;
  const selected = api.isSelected({ kind: "place", placeId: place.id });
  const { event, way } = departureOf(entry, plan);
  // With no way open, the bar says why (the button stays greyed, with the fastest way's mode).
  const { route } = way ?? [...event.routes].sort((a, b) => compareRouteTime(a.route, b.route))[0];
  const detail = !way ? refusalReasonsJa(event)
    : isCurrent ? "現在地" : `${transportLabel(cityId, route.mode)} 約${route.minutes}分 · ${formatMoneyForCity(cityId, route.cost)}`;
  return <div className="map-go-bar" data-armed={selected && api.armed ? "true" : undefined}>
    <p className="map-go-bar-text">
      <span className="map-go-bar-name">{placeDisplayName(game, place)}</span>
      <span className={`map-go-bar-detail${way ? "" : " is-unavailable"}`}>
        <span className={`place-card-tag${event.event.category === "date" ? " is-date" : ""}`}>{eventKindJa(event.event.category)}</span>{detail}
      </span>
    </p>
    <button type="button" className="primary map-go-bar-go" data-testid={`travel-go-${event.event.id}`} data-mode={route.mode}
      disabled={!way || !selected} onKeyDown={ignoreRepeat}
      onClick={(click) => { if (way) api.pressRoute(place.id, event.event.id, way.route.mode, pressKindOf(click), "dialog"); }}>
      {isCurrent ? "ここで始める" : "行く"}
    </button>
  </div>;
}

/** The expanded map's bar for 「ホテルに戻る」 (as PlaceGoBar): the chosen way home with its time and fare, and 「休む」. */
export function StayGoBar({ game, api, picked }: { game: GameState; api: TravelSelectionApi; picked: string | null }) {
  const cityId = game.currentCityId;
  const { options } = api.sleep;
  const way = chooseSleepWay(options, picked);
  const selected = api.isSelected({ kind: "sleep" });
  const atHotel = game.travel.currentPlaceId === game.travel.hotelPlaceId;
  const detail = !way ? sleepRefusalReasonsJa(options)
    : atHotel ? sleepWayJa(game, way.route, true) : `${sleepWayJa(game, way.route, true)} 約${way.route.minutes}分 · ${formatMoneyForCity(cityId, way.route.cost)}`;
  return <div className="map-go-bar" data-armed={selected && api.armed ? "true" : undefined}>
    <p className="map-go-bar-text">
      <span className="map-go-bar-name">ホテルに戻る</span>
      <span className={`map-go-bar-detail${way ? "" : " is-unavailable"}`}>{detail}</span>
    </p>
    <button type="button" className="primary map-go-bar-go" data-testid="travel-sleep-go" data-mode={way?.route.mode}
      disabled={!way || !selected} onKeyDown={ignoreRepeat}
      onClick={(click) => { if (way) api.pressSleepRoute(way.route.mode, way.route.viaPlaceId ?? null, pressKindOf(click), "dialog"); }}>
      休む
    </button>
  </div>;
}

/**
 * A way home in words: 「ホテルに戻って休む」 at the hotel, else 「徒歩で帰る」 and the like (photo-cards.ts sleepWayLabelJa,
 * the live regions), or on the screen (`short`) the mode alone, 「徒歩」 and the like (sleepWayShortJa).
 */
export function sleepWayJa(game: GameState, route: SleepOption["route"], short = false): string {
  const cityId = game.currentCityId;
  const via = route.viaPlaceId ? getCityContent(cityId).travel.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
  const words = { atHotel: game.travel.currentPlaceId === game.travel.hotelPlaceId, mode: transportLabel(cityId, route.mode), via };
  return short ? sleepWayShortJa(words) : sleepWayLabelJa(words);
}

const usesAssistance = (plan: SleepOption["plan"]) => plan.ok && plan.usedAssistance;

/**
 * 「ホテルに戻る」's card: 休む, today's ways home as chips with their time and fare, one always chosen (`picked`, else the
 * first that can be taken, the fastest: the card chosen afresh and each new day start there; CardOptions: one way is a
 * line, at the hotel 「ホテルに戻って休む」). A way that cannot be taken is greyed and cannot be chosen, each reason said once
 * under them. Going back is resting (the game has no going back without resting): a swipe up on its photo card rests by
 * the chosen way (user decision 2026-11-11), as does its 「休む」 (`quietGo`: in the row, for screen readers and keys only;
 * in the expanded map the bar at its foot: StayGoBar), through the shared selection's pressSleepRoute (its arming waits
 * out a double tap), and only while 「ホテルに戻る」 is the selection.
 */
export function StayCard({ game, api, picked, onPick, onAgain, scope = "page", heading = true, quietGo = false, go = true }: {
  game: GameState;
  api: TravelSelectionApi;
  /** The way home picked here (photo-cards.ts sleepWayKey; shared with the photo card's swipe and the expanded map's card). */
  picked: string | null;
  onPick: (key: string) => void;
  /** The chosen way pressed again (the row: its photo card's swipe cue nudges). */
  onAgain?: () => void;
  scope?: PressScope;
  heading?: boolean;
  /** 「休む」 for screen readers and keys only (the row, where a swipe up on the photo card rests). */
  quietGo?: boolean;
  /** Its own 「休む」 (none in the expanded map, whose bar at the foot rests: StayGoBar). */
  go?: boolean;
}) {
  const id = useId();
  const cityId = game.currentCityId;
  const { travelSettings } = getCityContent(cityId);
  const selected = api.isSelected({ kind: "sleep" });
  const atHotel = game.travel.currentPlaceId === game.travel.hotelPlaceId;
  const { options } = api.sleep;
  const way = chooseSleepWay(options, picked);
  const chosenKey = way && sleepWayKey(way.route);
  const cost = (route: SleepOption["route"]) => `約${route.minutes}分 · ${formatMoneyForCity(cityId, route.cost)}`;
  return <section className="place-card" data-testid="stay-card" data-armed={selected && api.armed ? "true" : undefined} aria-labelledby={`${id}-name`}>
    <CardName id={`${id}-name`} name="ホテルに戻る" heading={heading} />
    <div className="place-card-event">
      <h3 className="place-card-event-title">休む</h3>
      <p className="place-card-hook">ホテルに戻って休み、翌日9:00に出発します。{game.tour?.status === "booked" && "明日の朝、予約したツアーが始まります。"}宿泊費は{formatMoneyForCity(cityId, travelSettings.lodgingCost)}、APは使いません。予算の不足分は補助されます。</p>
      {options.length > 0 && <div className="place-card-ways">
        <CardOptions label="帰り方" chosenKey={chosenKey} onPick={onPick} onAgain={onAgain} options={options.map(({ route, plan }) => ({
          key: sleepWayKey(route), testId: `travel-sleep-route-${route.mode}${route.viaPlaceId ? `-${route.viaPlaceId}` : ""}`,
          label: sleepWayJa(game, route, true), cost: atHotel ? null : cost(route), available: plan.ok,
        }))} />
        {way && usesAssistance(way.plan) && <p className="fine-print">この帰り方では、宿泊費の不足分が補助されます。</p>}
        {go && <button type="button" className={`primary place-card-go${quietGo ? " is-quiet" : ""}`} data-testid="travel-sleep-go" data-mode={way?.route.mode}
          disabled={!way || !selected} onKeyDown={ignoreRepeat}
          onClick={(click) => { if (way) api.pressSleepRoute(way.route.mode, way.route.viaPlaceId ?? null, pressKindOf(click), scope); }}>
          <span>休む</span>
          {way && !atHotel && <span className="place-card-go-cost">{cost(way.route)}</span>}
        </button>}
        {blockedSleepWays(options).map(({ options: held, reason }) => <p key={reason} className="fine-print place-card-reason">
          {held.length === options.length ? reason : `${held.map((option) => sleepWayJa(game, option.route, true)).join("、")}：${reason}`}
        </p>)}
      </div>}
      {options.length === 0 && <p className="fine-print place-card-reason">ホテルへの経路は確認されていません。</p>}
    </div>
  </section>;
}

/**
 * 「待機」's card: today's waits where the party is (「30分待つ」 and, while it is day, 「夜（18:00）まで待つ」) as chips, one
 * always chosen (`wait`: the card chosen afresh and each new day start at 「30分待つ」; CardOptions: one wait is a line,
 * in words that say what happens: waitLineJa). A
 * wait that cannot be waited is greyed and cannot be chosen, its reason said under them. A swipe up on its photo card
 * waits the chosen one (user decision 2026-11-11), as does its 「待つ」 (`quietGo`: in the row, for screen readers and keys
 * only), through the same onTravelWait.
 */
export function WaitCard({ game, options, wait, onPick, onAgain, onWait, heading = true, quietGo = false }: {
  game: GameState;
  /** Today's waits (getTravelWaitOptions). */
  options: readonly TravelWaitOption[];
  /** The chosen wait (photo-cards.ts chooseWait), null when none can be waited. */
  wait: TravelWaitOption | null;
  onPick: (key: string) => void;
  /** The chosen wait pressed again (the row: its photo card's swipe cue nudges). */
  onAgain?: () => void;
  onWait: (wait: TravelWaitOption) => void;
  heading?: boolean;
  /** 「待つ」 for screen readers and keys only (the row, where a swipe up on the photo card waits). */
  quietGo?: boolean;
}) {
  const id = useId();
  const chosenKey = wait && waitKey(wait);
  return <section className="place-card" data-testid="wait-card" aria-labelledby={`${id}-name`}>
    <CardName id={`${id}-name`} name="待機" heading={heading} />
    <p className="place-card-hook">今いる場所で時間を進めます。</p>
    <div className="place-card-ways">
      <CardOptions label="待ち方" chosenKey={chosenKey} onPick={onPick} onAgain={onAgain} options={options.map((option) => ({
        key: waitKey(option), testId: `travel-wait-option-${waitKey(option)}`, label: options.length === 1 ? waitLineJa(option, game.travel.minute) : waitLabelJa(option), cost: null, available: option.available,
      }))} />
      <button type="button" className={`primary place-card-go${quietGo ? " is-quiet" : ""}`} data-testid="travel-wait-go" disabled={!wait}
        onKeyDown={ignoreRepeat} onClick={() => { if (wait) onWait(wait); }}>
        <span>待つ</span>
        {wait && <span className="place-card-go-cost">{formatTravelTime(game.travel.minute + wait.minutes)}まで</span>}
      </button>
      {options.some((option) => !option.available) && <p className="fine-print place-card-reason">{WAIT_BLOCKED_JA}</p>}
    </div>
  </section>;
}

/** The tour's card: what a tour is, then today's tours line (a booked tour with its cancel, 「ツアーを見る」 and its sheet). */
/**
 * A locked date's card under the row (2026-11-13, `# hint:`): 「まだ行けません」 and the writer's hint, nothing else (no
 * place, no title, no reason): it cannot be chosen to go, and nothing on it is pressable.
 */
export function LockedCard({ hintJa, heading = true }: { hintJa: string; heading?: boolean }) {
  const id = useId();
  return <section className="place-card place-card-locked" data-testid="locked-card" aria-labelledby={`${id}-name`}>
    <CardName id={`${id}-name`} name="まだ行けません" heading={heading} />
    <p className="place-card-hook">{hintJa}</p>
  </section>;
}

export function TourCard({ game, onBook, onCancel, heading = true }: {
  game: GameState;
  onBook: (tourId: string, offerId: string) => boolean;
  onCancel: () => boolean;
  heading?: boolean;
}) {
  const id = useId();
  return <section className="place-card" data-testid="tour-card" aria-labelledby={`${id}-name`}>
    <CardName id={`${id}-name`} name="ツアー" heading={heading} />
    <p className="place-card-hook">明日の朝9:00に宿を出る日帰りのツアーです。</p>
    <TravelTours game={game} onBook={onBook} onCancel={onCancel} />
  </section>;
}
