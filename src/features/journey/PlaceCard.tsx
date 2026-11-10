import { useId, useState, type KeyboardEvent } from "react";
import { getCityContent } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import type { TravelRoute } from "../../content/travel-schemas";
import { transportLabel } from "../../content/transport";
import type { GameState } from "../../domain/game";
import { getDirection } from "../../domain/travel";
import type { EventChoice, RouteChoice } from "../../domain/travel-destinations";
import { getTravelEventDefinition, type TravelMode } from "../../domain/travel-game";
import { compareRouteTime } from "../../domain/travel-routes";
import { withNames } from "../romance/names";
import { getTravelEventDescription } from "./DestinationRow";
import { blockedWays, chooseWay, type PhotoCardEntry } from "./photo-cards";
import { PlaceInsetMap } from "./PlaceInsetMap";
import { placeDisplayName } from "./travel-labels";
import { pressKindOf, type PressScope, type TravelSelectionApi } from "./useTravelSelection";

/** A held key repeats its keydown: only its first press counts (the travel guards). */
function ignoreRepeat(event: KeyboardEvent) {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
}

/** A way in a line: 「徒歩約5分」, 「オートリキシャ約25分 · ₹90」 (the fare when there is one). */
export function waySummary(cityId: string, route: TravelRoute): string {
  return `${transportLabel(cityId, route.mode)}約${route.minutes}分${route.cost > 0 ? ` · ${formatMoneyForCity(cityId, route.cost)}` : ""}`;
}

/** The line under a photo card's name: the way its 「行く」 takes first, 「現在地」, or 「今は行けない」. */
export function cardSummary(game: GameState, entry: PhotoCardEntry): string {
  if (!entry.available) return "今は行けない";
  if (entry.place.id === game.travel.currentPlaceId) return "現在地";
  const way = entry.events.map((choice) => chooseWay(choice.routes, null)).find((choice) => choice !== null);
  return way ? waySummary(game.currentCityId, way.route) : "今は行けない";
}

/**
 * The selected place's introduction card (B案): its name, then for each of its events the title, the AP, time and
 * admission, the author's one line (only text the content already has) and the way to go; the fine print, and the
 * small map of the current place and this one. Only the way buttons travel, through the shared selection's
 * pressRoute (its arming waits out a double tap), and only while this place is the selection.
 */
export function PlaceCard({ game, entry, api, scope = "page", map = true, heading = true }: {
  game: GameState;
  entry: PhotoCardEntry;
  api: TravelSelectionApi;
  scope?: PressScope;
  /** The small map (not in the expanded map's 「選んだ行き先」, beside the big one). */
  map?: boolean;
  /** The name as a visible heading (in the list the chosen row right above names it: then for readers only). */
  heading?: boolean;
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
  return <section className={`place-card${entry.available ? "" : " is-unavailable"}`} data-testid="place-card" data-place-id={place.id}
    data-armed={selected && api.armed ? "true" : undefined} aria-labelledby={`${id}-name`}>
    <h2 id={`${id}-name`} className={heading ? "place-card-name" : "sr-only"}>
      <span className="travel-selected-badge" aria-hidden="true">◆</span><span>{name}</span>
    </h2>
    {entry.events.map((choice) => <PlaceEvent key={choice.event.id} game={game} placeId={place.id} choice={choice} isCurrent={isCurrent}
      selected={selected} api={api} scope={scope} />)}
    <p className="place-card-note">
      時間・料金はゲーム内の目安です。{getJourneyForCity(cityId)?.farePartySize === 2 && "料金は2人分です。"}
      {reserve > 0 && `帰路用に${formatMoneyForCity(cityId, reserve)}を確保（所持金に含む）`}
    </p>
    {map && <div className="place-card-map">
      <PlaceInsetMap here={here} there={place} name={name} glyph={dateOnly ? "♥" : "◆"} />
      {here && <p className="place-card-direction">{isCurrent ? "現在地" : `${placeDisplayName(game, here)}から${getDirection(here, place)}`}</p>}
    </div>}
  </section>;
}

/** One event at the place: what it is (existing text only) and its way. */
function PlaceEvent({ game, placeId, choice, isCurrent, selected, api, scope }: {
  game: GameState;
  placeId: string;
  choice: EventChoice;
  isCurrent: boolean;
  selected: boolean;
  api: TravelSelectionApi;
  scope: PressScope;
}) {
  const { event } = choice;
  const cityId = game.currentCityId;
  const definition = getTravelEventDefinition(game, event.id) ?? event;
  const description = getTravelEventDescription(event.id);
  return <div className="place-card-event" data-testid={`place-event-${event.id}`}>
    <p className="place-card-event-title">{event.category === "main" ? "◇ 観光" : "♡ デート"} · {withNames(event.titleJa, game)}</p>
    <p className="place-card-event-meta">
      {definition.apCost ? `${definition.apCost} AP` : "AP不要"} · {definition.activityMinutes}分
      {definition.admissionCost ? ` · 入場料 ${formatMoneyForCity(cityId, definition.admissionCost)}（2人分・ゲーム設定）` : ""}
    </p>
    {description && <p className="place-card-hook">{withNames(description, game)}</p>}
    <WayPicker cityId={cityId} placeId={placeId} eventId={event.id} routes={choice.routes} isCurrent={isCurrent} selected={selected} api={api} scope={scope} />
  </div>;
}

/**
 * The way to go (B案 §3): one way is one button 「徒歩で行く　約5分 · ₹0」; several are one row of modes (pressing one
 * only chooses it; the fastest that can be taken is chosen first) and one 「行く　約12分 · ₹80」. Ways that cannot be
 * taken are greyed, each reason said once under the button.
 */
function WayPicker({ cityId, placeId, eventId, routes, isCurrent, selected, api, scope }: {
  cityId: string;
  placeId: string;
  eventId: string;
  routes: RouteChoice[];
  isCurrent: boolean;
  selected: boolean;
  api: TravelSelectionApi;
  scope: PressScope;
}) {
  const [picked, setPicked] = useState<TravelMode | null>(null);
  const way = chooseWay(routes, picked);
  // With no way open, the button shows the fastest one, greyed.
  const { route } = way ?? [...routes].sort((a, b) => compareRouteTime(a.route, b.route))[0];
  const several = routes.length > 1;
  const label = (mode: TravelMode) => transportLabel(cityId, mode);
  return <div className="place-card-ways">
    {several && <div className="place-card-modes" role="group" aria-label="移動手段">
      {routes.map((choice) => <button key={choice.route.mode} type="button" className="place-card-mode" data-testid={`travel-mode-${eventId}-${choice.route.mode}`}
        aria-pressed={choice.route.mode === way?.route.mode} disabled={!choice.available} onKeyDown={ignoreRepeat}
        onClick={() => setPicked(choice.route.mode)}>{label(choice.route.mode)}</button>)}
    </div>}
    <button type="button" className="primary place-card-go" data-testid={`travel-go-${eventId}`} data-mode={route.mode}
      disabled={!way || !selected} onKeyDown={ignoreRepeat}
      onClick={(click) => { if (way) api.pressRoute(placeId, eventId, way.route.mode, pressKindOf(click), scope); }}>
      <span>{isCurrent ? "ここで始める" : several ? "行く" : `${label(route.mode)}で行く`}{route.transferNote ? `（${route.transferNote}）` : ""}</span>
      {!isCurrent && <span className="place-card-go-cost">約{route.minutes}分 · {formatMoneyForCity(cityId, route.cost)}{route.estimation === "game_model" ? "（ゲーム内の推定）" : ""}</span>}
    </button>
    {blockedWays(routes).map(({ modes, reason }) => {
      const names = modes.map(label).join("・");
      return <p key={reason} className="fine-print">{!several || modes.length === routes.length || reason.startsWith(names) ? reason : `${names}：${reason}`}</p>;
    })}
  </div>;
}
