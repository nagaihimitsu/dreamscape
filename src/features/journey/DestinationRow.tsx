import { useId, type KeyboardEvent } from "react";
import { dates, episodes, getCityContent, journeyConfig, presentation } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { derivedImagePath } from "../../content/derived-images";
import { getJourneyForCity } from "../../content/journeys";
import { getPlacePhoto } from "../../content/place-photo";
import type { TravelPlace, TravelRoute } from "../../content/travel-schemas";
import { transportLabel } from "../../content/transport";
import { Icon } from "../../components/icons";
import type { GameState } from "../../domain/game";
import { getDirection } from "../../domain/travel";
import { getTravelEventDefinition } from "../../domain/travel-game";
import type { DestinationChoices, EventChoice, RouteChoice, TravelDestinationPlace, TravelSleepChoices } from "../../domain/travel-destinations";
import { compareRouteTime } from "../../domain/travel-routes";
import { withNames } from "../romance/names";
import { stripText, targetShape } from "./travel-selection";
import { pressKindOf, type PressScope, type TravelSelectionApi } from "./useTravelSelection";

/** A held key repeats its keydown: only its first press counts (§3.5 guards). */
function ignoreRepeat(event: KeyboardEvent) {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
}

/** Today's row line: the route (or the fastest mode), time, fare, direction, AP and admission. */
export function formatDestinationMeta(game: GameState, current: TravelPlace, place: TravelDestinationPlace): string {
  const event = place.events[0];
  const cityId = game.currentCityId;
  const direction = getDirection(current, event.place);
  const apCost = getTravelEventDefinition(game, event.id)?.apCost ?? event.apCost;
  // The line describes the routes the party can ride now (a rental mode once rented).
  const routes = event.describedRoutes;
  const onlyRoute = routes.length === 1 ? routes[0] : undefined;
  const fastestRoute = event.walkMinutes === null ? [...routes].sort(compareRouteTime)[0] : undefined;
  const shownRoute = onlyRoute ?? fastestRoute ?? routes.find((route) => route.mode === "walk");
  return `${onlyRoute ? `${transportLabel(cityId, onlyRoute.mode)}約${onlyRoute.minutes}分 · ${formatMoneyForCity(cityId, onlyRoute.cost)}` : fastestRoute ? `${transportLabel(cityId, fastestRoute.mode)}約${fastestRoute.minutes}分` : `徒歩約${event.walkMinutes}分`}${shownRoute?.transferNote ? `（${shownRoute.transferNote}）` : ""}${shownRoute?.estimation === "game_model" ? "（ゲーム内の推定）" : ""}${event.walkMinutes === null ? " · 徒歩の所要時間不明" : ""}（${direction}）${place.events.length === 1 && apCost ? ` · ${apCost} AP` : ""}${place.events.length === 1 && event.admissionCost ? ` · 入場料 ${formatMoneyForCity(cityId, event.admissionCost)}（2人分・ゲーム設定）` : ""}`;
}

/** A route's time and fare: 「12分 · €0（ゲーム内の推定）」. */
function routeTimeAndFare(cityId: string, route: TravelRoute): string {
  return `${route.minutes}分 · ${formatMoneyForCity(cityId, route.cost)}${route.estimation === "game_model" ? "（ゲーム内の推定）" : ""}`;
}

/** The description of a travel event (its date, episode or story battle). */
export function getTravelEventDescription(eventId: string): string {
  return dates.find((item) => item.id === eventId)?.descriptionJa ?? episodes.find((item) => item.id === eventId)?.descriptionJa
    ?? journeyConfig.storyBattles.find((item) => item.battleId === eventId)?.descriptionJa ?? "";
}

/**
 * One destination row (UI redesign §3.6): one button for the whole header (the "name"
 * pressed twice), and, once selected, the hint strip inside it or the inline choices
 * after it. The button keeps its name; 「選択中。」 and the hint are its description.
 */
export function DestinationRow({ game, place, choices, current, recommended, api, scope = "page", testId = "travel-place" }: {
  game: GameState;
  place: TravelDestinationPlace;
  choices: DestinationChoices;
  current: TravelPlace;
  recommended?: boolean;
  api: TravelSelectionApi;
  scope?: PressScope;
  testId?: string;
}) {
  const id = useId();
  const event = place.events[0];
  const categories = new Set(place.events.map((item) => item.category));
  const selected = api.isSelected({ kind: "place", placeId: place.id });
  const shape = targetShape({ kind: "place", placeId: place.id, choices });
  const expands = shape === "modes" || shape === "events";
  const hintId = `${id}-hint`;
  return <article className={`travel-destination${place.available ? "" : " is-unavailable"}${selected ? " is-selected" : ""}`}
    data-testid={`${testId}-${place.id}`} data-selected={selected ? "true" : undefined} data-armed={selected && api.armed ? "true" : undefined}>
    <button type="button" className="travel-destination-button" onKeyDown={ignoreRepeat}
      aria-describedby={selected ? `${id}-selected ${hintId}` : undefined}
      aria-expanded={expands ? selected : undefined} aria-controls={expands && selected ? `${id}-choices` : undefined}
      onClick={(click) => api.pressName(place.id, pressKindOf(click), scope)}>
      <PlaceThumbnail game={game} place={event.place} glyph={categories.has("main") ? "◇" : "♡"} />
      <span className="travel-destination-text">
        <span className="travel-destination-head">
          <span className="travel-category">{categories.has("main") && "◇ 観光"}{categories.size > 1 && " · "}{categories.has("date") && "♡ デート"}</span>
          {recommended && <small className="travel-recommended">おすすめ</small>}
        </span>
        <span className="travel-destination-title">
          {selected && <span className="travel-selected-badge" aria-hidden="true">◆</span>}
          <span>{event.place.nameJa}</span>
          <Icon name={selected && expands ? "chevron-down" : "chevron-right"} />
        </span>
        <span className="travel-destination-meta">{formatDestinationMeta(game, current, place)}</span>
        {!place.available && <small className="travel-destination-reason">{choices.reason}</small>}
        {selected && shape === "one" && <span className="travel-hint-strip" id={hintId} aria-hidden="true">{stripText(choices)}</span>}
        {selected && !choices.available && !expands && <span className="travel-hint-muted" id={hintId} aria-hidden="true">今は行けません</span>}
      </span>
    </button>
    {selected && <span className="sr-only" id={`${id}-selected`}>選択中。</span>}
    {selected && expands && <TravelChoices game={game} place={place} choices={choices} api={api} scope={scope} id={`${id}-choices`} hintId={hintId} />}
  </article>;
}

/** The selected row's inline choices: its events (then an event's modes) or its modes (§3.6). */
function TravelChoices({ game, place, choices, api, scope, id, hintId }: {
  game: GameState;
  place: TravelDestinationPlace;
  choices: DestinationChoices;
  api: TravelSelectionApi;
  scope: PressScope;
  id: string;
  hintId: string;
}) {
  const cityId = game.currentCityId;
  const several = choices.events.length > 1;
  const only = choices.events[0];
  const header = several ? `ここでできること（${choices.events.length}件）`
    : `移動手段を選んでください。時間・料金はゲーム内の目安です。${getJourneyForCity(cityId)?.farePartySize === 2 ? "料金は2人分です。" : ""}${only.event.admissionCost ? `入場料 ${formatMoneyForCity(cityId, only.event.admissionCost)}（2人分・ゲーム設定）` : ""}`;
  return <div className="travel-choices" id={id} data-testid={`travel-choices-${place.id}`}>
    <div className="travel-choices-head">
      <p id={hintId}>{header}</p>
      <ClearButton api={api} />
    </div>
    {several
      ? choices.events.map((item) => <TravelEventChoice key={item.event.id} game={game} placeId={place.id} choice={item} isCurrent={choices.isCurrent} api={api} scope={scope} />)
      : <div className="travel-routes">{only.routes.map((route) => <TravelRouteButton key={route.route.mode} cityId={cityId} placeId={place.id} eventId={only.event.id} choice={route} isCurrent={choices.isCurrent} api={api} scope={scope} />)}</div>}
  </div>;
}

function ClearButton({ api }: { api: TravelSelectionApi }) {
  return <button type="button" className="travel-choices-close" data-testid="travel-choices-close" aria-label="選択を解除" onClick={() => api.clear()}>
    <Icon name="close" />
  </button>;
}

/** An event of a place with several: one route travels (「行く ›」), several open its modes (「選ぶ ⌄」). */
function TravelEventChoice({ game, placeId, choice, isCurrent, api, scope }: {
  game: GameState;
  placeId: string;
  choice: EventChoice;
  isCurrent: boolean;
  api: TravelSelectionApi;
  scope: PressScope;
}) {
  const { event } = choice;
  const definition = getTravelEventDefinition(game, event.id) ?? event;
  const description = getTravelEventDescription(event.id);
  const modes = choice.routes.length > 1;
  const open = modes && api.selection?.openEventId === event.id;
  return <div className="travel-event">
    <button type="button" className="travel-event-button" data-testid={`travel-event-${event.id}`} disabled={!choice.available}
      aria-expanded={modes ? open : undefined} onKeyDown={ignoreRepeat}
      onClick={(click) => api.pressEvent(placeId, event.id, pressKindOf(click), scope)}>
      <span className="travel-event-title">{event.category === "main" ? "◇ 観光" : "♡ デート"} · {withNames(event.titleJa, game)}</span>
      <small>{definition.apCost ? `${definition.apCost} AP` : "AP不要"} · {definition.activityMinutes}分{definition.admissionCost ? ` · 入場料 ${formatMoneyForCity(game.currentCityId, definition.admissionCost)}（2人分・ゲーム設定）` : ""}</small>
      <span className="travel-event-go">{modes ? "選ぶ" : isCurrent ? "始める" : "行く"}<Icon name={modes ? "chevron-down" : "chevron-right"} /></span>
    </button>
    {description && <p>{withNames(description, game)}</p>}
    {!choice.available && <p className="fine-print">{choice.reason}</p>}
    {open && <div className="travel-routes">{choice.routes.map((route) => <TravelRouteButton key={route.route.mode} cityId={game.currentCityId} placeId={placeId} eventId={event.id} choice={route} isCurrent={isCurrent} api={api} scope={scope} />)}</div>}
  </div>;
}

/** One mode: 「{mode}で行く」 (at the current place 「ここで始める」) with its time and fare; a disabled one shows its reason. */
function TravelRouteButton({ cityId, placeId, eventId, choice, isCurrent, api, scope }: {
  cityId: string;
  placeId: string;
  eventId: string;
  choice: RouteChoice;
  isCurrent: boolean;
  api: TravelSelectionApi;
  scope: PressScope;
}) {
  const { route } = choice;
  return <div>
    <button type="button" className="travel-route" data-testid={`travel-route-${eventId}-${route.mode}`} disabled={!choice.available} onKeyDown={ignoreRepeat}
      onClick={(click) => api.pressRoute(placeId, eventId, route.mode, pressKindOf(click), scope)}>
      <span>{isCurrent ? "ここで始める" : `${transportLabel(cityId, route.mode)}で行く`}{route.transferNote ? `（${route.transferNote}）` : ""}</span>
      <span className="travel-route-cost">{routeTimeAndFare(cityId, route)}</span>
    </button>
    {!choice.available && <p className="fine-print">{choice.reason}</p>}
  </div>;
}

/**
 * The ways home of 休む (§3.5 「Hotel」), shown in the bottom band (and in the expanded
 * map's slot): the night's terms and one button per way home.
 */
export function SleepChoice({ game, sleep, api, scope = "page", hintId }: {
  game: GameState;
  sleep: TravelSleepChoices;
  api: TravelSelectionApi;
  scope?: PressScope;
  hintId?: string;
}) {
  const { travel, travelSettings } = getCityContent(game.currentCityId);
  const cityId = game.currentCityId;
  return <div className="travel-sleep-choices" data-testid="travel-sleep-choices">
    <div className="travel-choices-head">
      <p id={hintId}>滞在先へ戻り、翌日9:00に出発します。{game.tour?.status === "booked" && "明日の朝、予約したツアーが始まります。"}ゲーム内の宿泊費は{formatMoneyForCity(cityId, travelSettings.lodgingCost)}、APは使いません。予算の不足分は補助されます。{getJourneyForCity(cityId)?.farePartySize === 2 && "移動料金は2人分のゲーム内の目安です。"}{sleep.onlyWay ? (scope === "page" ? "もう一度『休む』を押すと休みます。" : "") : "帰り方を選んでください。"}</p>
      <ClearButton api={api} />
    </div>
    <div className="travel-routes">{sleep.options.map(({ route, plan }) => {
      const via = route.viaPlaceId ? travel.places.find((place) => place.id === route.viaPlaceId)?.nameJa : undefined;
      return <div key={JSON.stringify([route.mode, route.viaPlaceId ?? null])}>
        <button type="button" className="travel-route" disabled={!plan.ok} onKeyDown={ignoreRepeat}
          data-testid={`travel-sleep-route-${route.mode}${route.viaPlaceId ? `-${route.viaPlaceId}` : ""}`}
          onClick={(click) => api.pressSleepRoute(route.mode, route.viaPlaceId ?? null, pressKindOf(click), scope)}>
          <span>{transportLabel(cityId, route.mode)}で帰る{route.transferNote ? `（${route.transferNote}）` : ""}{via ? `・${via}から徒歩` : ""}</span>
          <span className="travel-route-cost">{route.minutes}分 · {formatMoneyForCity(cityId, route.cost)}{plan.ok && plan.usedAssistance ? "（宿泊費の不足分は補助）" : ""}</span>
        </button>
        {!plan.ok && <p className="fine-print">{plan.reason === "budget" ? "この移動手段の予算が足りません。" : "この経路では帰れません。"}</p>}
      </div>;
    })}</div>
    {sleep.options.length === 0 && <p>滞在先への経路は確認されていません。</p>}
  </div>;
}

/**
 * The row's photo (UI redesign §3.6): the reduced `card` copy of the place's
 * registered photo, or a plain tile in the place's background colour with the
 * category mark. Decorative (the name is beside it); its credit is in 「写真の出典」.
 */
function PlaceThumbnail({ game, place, glyph }: { game: GameState; place: TravelPlace; glyph: string }) {
  const photo = getPlacePhoto(game.currentCityId, place.id);
  if (photo) return <img className="travel-thumb" src={`${import.meta.env.BASE_URL}${derivedImagePath(photo, "card")}`} alt="" width={64} height={43} loading="lazy" decoding="async" />;
  return <span className="travel-thumb is-plain" style={{ backgroundColor: presentation.backgrounds[place.backgroundId]?.color }} aria-hidden="true">{glyph}</span>;
}
