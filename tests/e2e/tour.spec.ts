import { readFileSync } from "node:fs";
import type { Tour } from "../../src/content/tour-schemas";
import { expect, ops, placeSave, playUntil, readSave, savedGame, test, tier } from "./helpers";

// Agra's Fatehpur Sikri day tour (tour stage 2a, docs/07 「ツアーは予約で1回だけ払い…」; its scenes, tour stages 2b and 3). The
// start of Agra is placed with the real game functions (lane 2: the page's scenario builders and saveGame); the tour itself is
// played in the UI: booked at the inn's front desk, the night, the morning at the inn, the car (its narration and in-car
// encounter), the visit, 「ツアーを続ける」, the scenes after it and the car back, free time at the inn.

const journeyId = "golden_triangle";
const tour = (JSON.parse(readFileSync(new URL("../../src/content/generated/tours.json", import.meta.url), "utf8")) as Tour[])
  .find((item) => item.id === "gt_agra_tour_fatehpur_sikri")!;
const price = (offerId: string) => tour.offers.find((offer) => offer.id === offerId)!.price;
const rupees = (amount: number) => `₹${amount.toLocaleString("en-US")}（2人分）`;

test("books Agra's day tour at the inn, rests, rides, visits Fatehpur Sikri and comes back, paying once", { tag: tier.gate }, async ({ page }) => {
  test.setTimeout(120_000);
  const source = savedGame(journeyId);
  await page.goto("/");
  await placeSave(page, journeyId, "cityStart", "agra", ["旅人", "澪"]);
  await ops.chooseJourney(page, journeyId);
  await expect(page.getByTestId("travel-menu")).toHaveAttribute("aria-label", "アーグラの行き先");
  const start = await readSave(page, journeyId);

  // The card shows the itinerary, both offers and their prices for two; the desk is booked after its confirmation.
  const sheet = await ops.openTours(page);
  const card = sheet.getByTestId(`travel-tour-${tour.id}`);
  await expect(card).toContainText("9:00 車でファテープル・シークリーへ（約60分）");
  await expect(card).toContainText("14:00ごろ解散");
  await expect(card.getByTestId("travel-tour-book-hotel_desk")).toContainText(rupees(price("hotel_desk")));
  await expect(card.getByTestId("travel-tour-book-web")).toContainText(rupees(price("web")));
  await card.getByTestId("travel-tour-book-hotel_desk").click();
  await expect(page.getByTestId("travel-tour-confirm")).toBeVisible();
  await page.getByTestId("travel-tour-confirm").click();
  await expect(page.getByTestId("travel-tour-booked")).toHaveText(`明日の予定：${tour.titleJa}（宿のフロントで予約）`);
  const booked = await readSave(page, journeyId);
  expect(booked.tour).toMatchObject({ status: "booked", tourId: tour.id, offerId: "hotel_desk", pricePaid: price("hotel_desk") });
  expect(booked.travelBudget).toBe(start.travelBudget - price("hotel_desk"));

  // 休む: 「次の日」, then the tour's morning at the inn (its scene before the car, tagged 「ツアー」), the car's narration and its
  // encounter, the car, the arrival, then the guide at Fatehpur Sikri.
  await ops.sleep(page);
  await ops.holdClock(page);
  await expect(page.getByTestId("time-passage")).toBeVisible();
  await page.clock.resume();
  // The night's overlay takes every tap while it shows: the morning is played after it.
  await expect(page.getByTestId("time-passage")).toHaveCount(0, { timeout: 10_000 });
  await expect.poll(async () => (await readSave(page, journeyId)).activeEncounter?.encounterId).toBe("gt_agra_tour_morning");
  await expect(ops.sceneLabel(page)).toContainText("ツアー");
  const morning = await readSave(page, journeyId);
  expect(morning.tour).toMatchObject({ status: "running", step: 0 });
  expect(morning.travel).toMatchObject({ currentPlaceId: "agra_hotel_hub", minute: 540, day: booked.travel.day + 1 });
  await playUntil(page, (state) => state.activeEpilogue?.kind === "tour_leg", { source });
  await expect(page.getByTestId("tour-leg-screen")).toBeVisible();
  await playUntil(page, (state) => state.activeTourism?.phase === "guide", { source });
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(ops.sceneLabel(page)).toContainText("ツアー・見学");
  const guide = await readSave(page, journeyId);
  expect(guide.tour).toMatchObject({ status: "running", step: 1 });
  expect(guide.travel).toMatchObject({ currentPlaceId: "agra_fatehpur_sikri", minute: 600, day: booked.travel.day + 1 });
  expect(guide.travelBudget).toBe(booked.travelBudget);

  // A reload in the guide: the same line, nothing paid again.
  const line = await page.getByTestId("dialogue-text").textContent();
  await page.reload();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByTestId("dialogue-text")).toHaveText(line!);
  expect(await readSave(page, journeyId)).toEqual(guide);

  // The observation, the battle, and its result's 「ツアーを続ける」: the scene after the visit, the car back (its narration and
  // encounter, the car), the scene at the inn, then free time at the inn.
  await ops.settled(page);
  await page.getByTestId("tourism-skip").click();
  await page.getByTestId("observation-proceed").click();
  await playUntil(page, (state) => state.activeBattle?.phase === "result", { source });
  const leave = page.getByRole("button", { name: /ツアーを続ける/ });
  await expect(leave).toBeVisible();
  await leave.click();
  await expect.poll(async () => (await readSave(page, journeyId)).activeEncounter?.encounterId).toBe("gt_agra_tour_mathri");
  await playUntil(page, (state) => state.activeEncounter?.encounterId === "gt_agra_tour_home", { source });
  const home = await readSave(page, journeyId);
  expect(home.travel).toMatchObject({ currentPlaceId: "agra_hotel_hub", minute: 840 });
  expect(home.tour).toMatchObject({ status: "running", step: 2 });
  await playUntil(page, (state) => state.tour === null, { source });
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "ツアーが終わりました。" })).toBeVisible();
  await expect(page.getByTestId("travel-tour-booked")).toHaveCount(0);
  await expect(page.getByTestId("travel-tours-open")).toHaveCount(0);
  const back = await readSave(page, journeyId);
  expect(back.tour).toBeNull();
  expect(back.completedTourIds).toEqual([tour.id]);
  expect(back.completedEpisodeIds).toContain("gt_agra_main_fatehpur_sikri");
  expect(back.travel).toMatchObject({ currentPlaceId: "agra_hotel_hub", minute: 840, returnReserve: 0 });
  expect(back.travelBudget).toBe(booked.travelBudget);
});

test("opens Agra's tour booked from its Debug launch URL", { tag: tier.debug }, async ({ page }) => {
  await page.goto(`/?debug&city=agra&scene=tour&target=${tour.id}`);
  await ops.debugShown(page.getByTestId("debug-session"));
  await expect(page.getByTestId("travel-tour-booked")).toHaveText(`明日の予定：${tour.titleJa}（宿のフロントで予約）`);
  await expect(page.getByTestId("travel-tour-cancel")).toBeVisible();
});
