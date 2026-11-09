// The two-step selection's shared answer to "what can be chosen here" (UI redesign §3.5
// 「Shared code」): getDestinationChoices and getTravelSleepChoices must offer exactly the
// travel and rest actions the exploration tests walk (listPlayerActions).
import { describe, expect, it } from "vitest";
import { journeys } from "../content/journeys";
import { cityMidway, completedCity, newJourney, withAp } from "../dev/scenario-builders";
import type { GameState } from "./game";
import { listPlayerActions } from "./player-action";
import { getDestinationChoices, getTravelDestinations, getTravelSleepChoices } from "./travel-destinations";
import { waitForTravel } from "./travel-game";

const firstCities = journeys.filter((journey) => journey.status === "available").map((journey) => ({ journeyId: journey.id, cityId: journey.cities[0].id }));
const pair = (eventId: string, mode: string) => `${eventId}|${mode}`;

function checkState(state: GameState) {
  const actions = listPlayerActions(state);
  const travel = actions.flatMap((action) => action.kind === "travel" ? [pair(action.eventId, action.mode)] : []);
  const offered: string[] = [];
  for (const place of getTravelDestinations(state).places) {
    const choices = getDestinationChoices(state, place.id)!;
    expect(choices.place.id).toBe(place.id);
    const enabled = choices.events.flatMap((event) => event.routes.filter((route) => route.available).map((route) => pair(event.event.id, route.route.mode)));
    offered.push(...enabled);
    for (const event of choices.events) {
      if (!event.available) expect(event.reason, event.event.id).toBeTruthy();
      for (const route of event.routes) if (!route.available) expect(route.reason, `${event.event.id} ${route.route.mode}`).toBeTruthy();
      expect(event.available).toBe(event.routes.some((route) => route.available));
    }
    expect(choices.available).toBe(enabled.length > 0);
    if (!choices.available) expect(choices.reason).toBeTruthy();
    const one = choices.events.length === 1 && choices.events[0].routes.length === 1 && choices.events[0].routes[0].available;
    expect(choices.onlyWay !== null, place.id).toBe(one);
    if (choices.onlyWay) expect(enabled).toEqual([pair(choices.onlyWay.eventId, choices.onlyWay.mode)]);
  }
  expect(offered.sort()).toEqual([...travel].sort());
  const rest = actions.flatMap((action) => action.kind === "rest" ? [pair(action.mode, action.viaPlaceId ?? "")] : []);
  const sleep = getTravelSleepChoices(state);
  expect(sleep.options.filter((option) => option.plan.ok).map((option) => pair(option.route.mode, option.route.viaPlaceId ?? "")).sort()).toEqual(rest.sort());
  expect(sleep.onlyWay !== null).toBe(sleep.options.length === 1 && sleep.options[0].plan.ok);
}

describe("destination choices", () => {
  it.each(firstCities)("in $journeyId's first city ($cityId) offer exactly the travel and rest actions, at the start and later", ({ journeyId, cityId }) => {
    const start = newJourney(journeyId);
    checkState(start);
    checkState(waitForTravel(start, 600, start.revision));
    checkState(cityMidway(cityId));
  }, 60_000);

  it("is null for a place that is not a candidate", () => {
    const start = newJourney("milano");
    expect(getDestinationChoices(start, start.travel.hotelPlaceId)).toBeNull();
    expect(getDestinationChoices(start, "no_such_place")).toBeNull();
  });

  // The Debug-free states the E2E travel-select spec uses (they must keep existing).
  it("Milan cleared with 12 AP has a place with two one-route events and one where an unavailable event sits beside a two-mode event", () => {
    const state = withAp(completedCity("milano"), 12);
    checkState(state);
    const roastery = getDestinationChoices(state, "p_roastery")!;
    expect(roastery.events.length).toBe(2);
    expect(roastery.events.every((event) => event.available && event.routes.length === 1)).toBe(true);
    const navigli = getDestinationChoices(state, "p_navigli")!;
    expect(navigli.events.some((event) => !event.available)).toBe(true);
    expect(navigli.events.some((event) => event.available && event.routes.length >= 2)).toBe(true);
  }, 60_000);

  it("a new Milan journey has the Duomo as one way, the Last Supper with two modes and Castello unavailable (in the longer list)", () => {
    const start = newJourney("milano");
    expect(getDestinationChoices(start, "p_duomo")!.onlyWay).toEqual({ eventId: "milano_duomo_episode", mode: "walk" });
    expect(getDestinationChoices(start, "p_supper")!.events[0].routes.map((route) => route.route.mode)).toEqual(["walk", "tram"]);
    const castello = getDestinationChoices(start, "p_castello")!;
    expect(castello.available).toBe(false);
    expect(getTravelDestinations(start).other.map((place) => place.id)).toContain("p_castello");
    expect(getTravelSleepChoices(start).onlyWay).toMatchObject({ mode: "walk" });
  });
});
