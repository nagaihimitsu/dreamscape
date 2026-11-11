import { useId, type KeyboardEvent } from "react";
import { getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { transportLabel } from "../../content/transport";
import type { GameState } from "../../domain/game";
import { getDirection } from "../../domain/travel";
import { getTravelWaitOptions, type EventChoice, type RouteChoice } from "../../domain/travel-destinations";
import { getTravelEventDefinition, type TravelMode } from "../../domain/travel-game";
import { compareRouteTime } from "../../domain/travel-routes";
import { HeroineNote } from "../battle/HeroineNote";
import { withNames } from "../romance/names";
import { blockedWays, chooseWay, chosenEvent, eventKindJa, type DeparturePlan, type PhotoCardEntry } from "./photo-cards";
import { placeHeroineLine } from "./place-heroine-line";
import { PlaceInsetMap } from "./PlaceInsetMap";
import { placeDisplayName } from "./travel-labels";
import { formatTravelTime } from "./travel-time";
import { TravelTours } from "./TravelTours";
import { pressKindOf, type PressScope, type TravelSelectionApi } from "./useTravelSelection";
import { visitedPlaceIds } from "./visited-places";
import "../battle/battle.css";

/** A held key repeats its keydown: only its first press counts (the travel guards). */
function ignoreRepeat(event: KeyboardEvent) {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
}

/** The name of a card under the row (visible, or for readers only where the chosen row right above names it). */
function CardName({ id, name, heading }: { id: string; name: string; heading: boolean }) {
  return <h2 id={id} className={heading ? "place-card-name" : "sr-only"}>
    <span className="travel-selected-badge" aria-hidden="true">◆</span><span>{name}</span>
  </h2>;
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
 * only while this place is the selection.
 */
export function PlaceCard({ game, entry, api, plan, onPlan, scope = "page", map = true, heading = true, quietGo = false }: {
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
    way={{ isCurrent, selected, api, scope, picked: plan.mode, onPick: (mode) => onPlan({ mode }), quietGo }} />);
  return <section className={`place-card${entry.available ? "" : " is-unavailable"}`} data-testid="place-card" data-place-id={place.id}
    data-armed={selected && api.armed ? "true" : undefined} aria-labelledby={`${id}-name`}>
    <CardName id={`${id}-name`} name={name} heading={heading} />
    {place.descriptionJa && <p className="place-card-hook">{place.descriptionJa}</p>}
    {/* A new note for each place chosen, so it comes in again (place-card-heroine; none under reduced motion). */}
    {line !== null && <HeroineNote key={place.id} className="place-card-heroine" label={game.heroineName} text={line} cityId={cityId} testId="place-heroine-line" />}
    {several ? <div className="place-card-event-list" role="group" aria-label="することを選ぶ">{events}</div> : events}
    {reserve > 0 && <p className="place-card-note">帰路用に{formatMoneyForCity(cityId, reserve)}を確保（所持金に含む）</p>}
    {map && <div className="place-card-map">
      <PlaceInsetMap here={here} there={place} name={name} glyph={dateOnly ? "♥" : "◆"} visited={visitedPlaceIds(game)} />
      {here && <p className="place-card-direction">{isCurrent ? "現在地" : `${placeDisplayName(game, here)}から${getDirection(here, place)}`}</p>}
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
 * for screen readers and keys only). Ways that cannot be taken are greyed, each reason said once under them.
 */
function WayPicker({ cityId, placeId, eventId, routes, isCurrent, selected, api, scope, picked, onPick, quietGo }: WayContext & {
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
    <button type="button" className={`primary place-card-go${quietGo ? " is-quiet" : ""}`} data-testid={`travel-go-${eventId}`} data-mode={route.mode}
      disabled={!way || !selected} onKeyDown={ignoreRepeat}
      onClick={(click) => { if (way) api.pressRoute(placeId, eventId, way.route.mode, pressKindOf(click), scope); }}>
      <span>{isCurrent ? "ここで始める" : several ? "行く" : `${label(route.mode)}で行く`}</span>
      {!isCurrent && <span className="place-card-go-cost">{cost(route)}</span>}
    </button>
    {blockedWays(routes).map(({ modes, reason }) => {
      const names = modes.map(label).join("・");
      return <p key={reason} className="fine-print place-card-reason">{!several || modes.length === routes.length || reason.startsWith(names) ? reason : `${names}：${reason}`}</p>;
    })}
  </div>;
}

/**
 * 「ホテルに戻る」's card: 休む (today's ways home; going back is resting, the game has no going back without resting, so
 * its photo card takes no swipe). A way home rests through the shared selection's pressSleepRoute (its arming waits out
 * a double tap), and only while 「ホテルに戻る」 is the selection.
 */
export function StayCard({ game, api, scope = "page", heading = true }: {
  game: GameState;
  api: TravelSelectionApi;
  scope?: PressScope;
  heading?: boolean;
}) {
  const id = useId();
  const cityId = game.currentCityId;
  const { travel, travelSettings } = getCityContent(cityId);
  const selected = api.isSelected({ kind: "sleep" });
  const atHotel = game.travel.currentPlaceId === game.travel.hotelPlaceId;
  return <section className="place-card" data-testid="stay-card" data-armed={selected && api.armed ? "true" : undefined} aria-labelledby={`${id}-name`}>
    <CardName id={`${id}-name`} name="ホテルに戻る" heading={heading} />
    <div className="place-card-event">
      <h3 className="place-card-event-title">休む</h3>
      <p className="place-card-hook">ホテルに戻って休み、翌日9:00に出発します。{game.tour?.status === "booked" && "明日の朝、予約したツアーが始まります。"}宿泊費は{formatMoneyForCity(cityId, travelSettings.lodgingCost)}、APは使いません。予算の不足分は補助されます。</p>
      <div className="travel-routes">{api.sleep.options.map(({ route, plan }) => {
        const via = route.viaPlaceId ? travel.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
        return <div key={JSON.stringify([route.mode, route.viaPlaceId ?? null])}>
          <button type="button" className="travel-route" disabled={!plan.ok || !selected} onKeyDown={ignoreRepeat}
            data-testid={`travel-sleep-route-${route.mode}${route.viaPlaceId ? `-${route.viaPlaceId}` : ""}`}
            onClick={(click) => api.pressSleepRoute(route.mode, route.viaPlaceId ?? null, pressKindOf(click), scope)}>
            <span>{atHotel ? "ここで休む" : `${transportLabel(cityId, route.mode)}で帰る${via ? `・${via}から徒歩` : ""}`}</span>
            <span className="travel-route-cost">{atHotel ? "" : `約${route.minutes}分 · ${formatMoneyForCity(cityId, route.cost)}`}{plan.ok && plan.usedAssistance ? "（宿泊費の不足分は補助）" : ""}</span>
          </button>
          {!plan.ok && <p className="fine-print">{plan.reason === "budget" ? "この移動手段の予算が足りません。" : "この経路では帰れません。"}</p>}
        </div>;
      })}</div>
      {api.sleep.options.length === 0 && <p className="fine-print">ホテルへの経路は確認されていません。</p>}
    </div>
  </section>;
}

/** 「待機」's card: today's waits where the party is (「30分待つ」, 「…まで待つ」), each pressed waits at once. Not a place: no swipe. */
export function WaitCard({ game, onTravelWait, heading = true }: {
  game: GameState;
  onTravelWait: (minutes: number) => boolean;
  heading?: boolean;
}) {
  const id = useId();
  return <section className="place-card" data-testid="wait-card" aria-labelledby={`${id}-name`}>
    <CardName id={`${id}-name`} name="待機" heading={heading} />
    <p className="place-card-hook">今いる場所で時間を進めます。</p>
    <div className="place-card-modes">{getTravelWaitOptions(game).map((option) =>
      <button key={option.until ?? "minutes"} type="button" className="place-card-mode" disabled={!option.available} onKeyDown={ignoreRepeat}
        onClick={() => onTravelWait(option.minutes)}>{option.until === null ? `${option.minutes}分待つ` : `${formatTravelTime(option.until)}まで待つ`}</button>)}
    </div>
  </section>;
}

/** The tour's card: what a tour is, then today's tours line (a booked tour with its cancel, 「ツアーを見る」 and its sheet). */
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
