import { expect, test } from "@playwright/test";
import { saved, startNewGame } from "./helpers";

// These are the actual authored city routes, inspected without unlocking an
// unfinished India story or modifying either journey's persistent save.
test("India prototype public transport displays and charges the selected party fare", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const originalStorage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");

  const cases: ReadonlyArray<{ cityId: string; placeId: string; mode: "rail" | "bus"; label: string; transferNote?: string; returnNote?: string }> = [
    { cityId: "delhi", placeId: "delhi_red_fort", mode: "rail", label: "鉄道・地下鉄" },
    { cityId: "delhi", placeId: "delhi_lodhi_garden", mode: "bus", label: "バス" },
    { cityId: "delhi", placeId: "delhi_agrasen_baoli", mode: "bus", label: "バス", transferNote: "停留所までの接続を含む" },
    { cityId: "agra", placeId: "agra_taj_mahal", mode: "rail", label: "鉄道・地下鉄" },
    { cityId: "jaipur", placeId: "jaipur_amber_fort", mode: "bus", label: "バス" },
    { cityId: "agra", placeId: "agra_fatehpur_sikri", mode: "bus", label: "バス", transferNote: "Idgahで乗り継ぎ", returnNote: "Idgahで乗り継ぎ" },
    { cityId: "agra", placeId: "agra_akbar_tomb", mode: "bus", label: "バス", transferNote: "Bijli Gharへ接続" },
  ];
  for (const { cityId, placeId, mode, label, transferNote, returnNote } of cases) {
    const route = await page.evaluate(async ({ cityId, placeId, mode }) => {
      const contentPath = "/src/content/index.ts";
      const { getCityContent } = await import(/* @vite-ignore */ contentPath);
      const { travel, travelSettings } = getCityContent(cityId);
      const route = travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
        item.fromPlaceId === travelSettings.hotelPlaceId && item.toPlaceId === placeId && item.mode === mode);
      const place = travel.places.find((item: { id: string }) => item.id === placeId);
      return route && place ? { cost: route.cost as number, minutes: route.minutes as number,
        estimation: route.estimation as string | undefined, placeName: place.nameJa as string } : null;
    }, { cityId, placeId, mode });
    expect(route, `Missing ${mode} route to ${placeId}`).not.toBeNull();
    if (!route) throw new Error(`Missing ${mode} route to ${placeId}`);
    expect(route.estimation).toBe("game_model");
    expect(route.cost).toBeGreaterThan(0);

    await page.getByTestId("debug-city").selectOption(cityId);
    await page.getByRole("button", { name: "地図・交通を確認" }).click();
    const preview = page.getByTestId("debug-prototype-preview");
    // At the hotel, a detour through another place must not be presented as
    // a paid return route when resting in the current place is free.
    await expect(preview.getByRole("button", { name: /^滞在先で休む/ })).toHaveCount(1);
    await expect(preview.getByRole("button", { name: "滞在先で休む（徒歩 0分 · ₹0）", exact: true })).toBeVisible();
    await preview.getByTestId("debug-prototype-destination").selectOption(placeId);
    const transport = preview.getByRole("button", { name: `${label}${transferNote ? `（${transferNote}）` : ""} ${route.minutes}分 · ₹${route.cost}` });
    await expect(transport).toBeVisible();
    if (transferNote) await expect(transport.locator("..")).toContainText(transferNote);
    await expect(preview).toContainText("ゲーム用推定経路");
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: 740 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: testInfo.outputPath(`${cityId}-${placeId}-${mode}-${width}.png`), fullPage: true });
    }
    await transport.click();
    const arrivalMinute = 9 * 60 + route.minutes;
    const arrivalTime = `${String(Math.floor(arrivalMinute / 60)).padStart(2, "0")}:${String(arrivalMinute % 60).padStart(2, "0")}`;
    await expect(preview.getByRole("status")).toContainText("一時データで移動を確認しました");
    const status = preview.getByTestId("debug-prototype-status");
    await expect(status).toContainText(`現在地：${route.placeName}`);
    await expect(status).toContainText(arrivalTime);
    await expect(status).toContainText(`₹${30_000 - route.cost}`);
    if (returnNote) await expect(preview.getByRole("button", { name: `滞在先で休む（バス・${returnNote}`, exact: false })).toBeVisible();
    await preview.getByRole("button", { name: "一時データを読み直す" }).click();
    await expect(status).toContainText(`₹${30_000 - route.cost}`);
    await preview.getByRole("button", { name: "設定へ戻る" }).click();
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(originalStorage);
  }
});

test("Jaipur's car and metro connection charges both travelers and permits a safe return", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const originalStorage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  const routes = await page.evaluate(async () => {
    const path = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ path);
    const { travel, travelSettings } = getCityContent("jaipur");
    const find = (from: string, to: string, mode: string) => travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
    const first = find(travelSettings.hotelPlaceId, "jaipur_nahargarh_fort", "taxi");
    const connection = find("jaipur_nahargarh_fort", "jaipur_albert_hall", "rail");
    const home = find("jaipur_albert_hall", travelSettings.hotelPlaceId, "walk");
    const hotel = travel.places.find((item: { id: string }) => item.id === travelSettings.hotelPlaceId);
    if (!first || !connection || !home || !hotel) throw new Error("Missing Jaipur city transport fixture");
    return { first, connection, home, hotelName: hotel.nameJa as string };
  });
  expect(routes.first.estimation).toBe("game_model");
  expect(routes.connection.estimation).toBe("game_model");
  expect(routes.connection.transferNote).toBe("車でChandpoleへ・地下鉄に乗換");
  expect(routes.connection.cost).toBeGreaterThan(0);
  await page.getByTestId("debug-city").selectOption("jaipur");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  const preview = page.getByTestId("debug-prototype-preview");
  const status = preview.getByTestId("debug-prototype-status");
  await expect(preview).toContainText("料金は2人分です。");
  await preview.getByTestId("debug-prototype-destination").selectOption("jaipur_nahargarh_fort");
  await preview.getByRole("button", { name: `タクシー ${routes.first.minutes}分 · ₹${routes.first.cost}`, exact: true }).click();
  await expect(preview.getByRole("status")).toContainText("一時データで移動を確認しました");
  await expect(status).toContainText(`₹${30_000 - routes.first.cost}`);

  await preview.getByTestId("debug-prototype-destination").selectOption("jaipur_albert_hall");
  const rail = preview.getByRole("button", { name: `鉄道・地下鉄（車でChandpoleへ・地下鉄に乗換） ${routes.connection.minutes}分 · ₹${routes.connection.cost}`, exact: true });
  await expect(rail).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`jaipur-car-metro-${width}.png`), fullPage: true });
  }
  await rail.click();
  const remaining = 30_000 - routes.first.cost - routes.connection.cost;
  const arrival = 9 * 60 + routes.first.minutes + routes.connection.minutes;
  const arrivalTime = `${String(Math.floor(arrival / 60)).padStart(2, "0")}:${String(arrival % 60).padStart(2, "0")}`;
  await expect(status).toContainText("現在地：アルバート・ホール");
  await expect(status).toContainText(arrivalTime);
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(preview.getByRole("status")).toContainText("一時データから再開しました");
  await expect(status).toContainText(arrivalTime);
  await expect(status).toContainText(`₹${remaining}`);

  await preview.getByRole("button", { name: `滞在先で休む（徒歩 ${routes.home.minutes}分 · ₹${routes.home.cost}）`, exact: true }).click();
  await expect(preview.getByRole("status")).toContainText("一時データで翌日になりました");
  await expect(status).toContainText(`現在地：${routes.hotelName}`);
  await expect(status).toContainText("2日目");
  await expect(status).toContainText("09:00");
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(originalStorage);
});

test("Agra's metro and car connection charges both travelers and permits a safe return", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const originalStorage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  const routes = await page.evaluate(async () => {
    const path = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ path);
    const { travel, travelSettings } = getCityContent("agra");
    const find = (from: string, to: string, mode: string) => travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
    const first = find(travelSettings.hotelPlaceId, "agra_agra_fort", "walk");
    const connection = find("agra_agra_fort", "agra_mehtab_bagh", "rail");
    const home = find("agra_mehtab_bagh", travelSettings.hotelPlaceId, "taxi");
    const hotel = travel.places.find((item: { id: string }) => item.id === travelSettings.hotelPlaceId);
    const destination = travel.places.find((item: { id: string }) => item.id === "agra_mehtab_bagh");
    if (!first || !connection || !home || !hotel || !destination) throw new Error("Missing Agra city transport fixture");
    return { first, connection, home, hotelName: hotel.nameJa as string, destinationName: destination.nameJa as string };
  });
  expect(routes.connection.estimation).toBe("game_model");
  expect(routes.connection.transferNote).toBe("タージ側で地下鉄から車へ");
  expect(routes.connection.cost).toBeGreaterThan(0);
  await page.getByTestId("debug-city").selectOption("agra");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  const preview = page.getByTestId("debug-prototype-preview");
  const status = preview.getByTestId("debug-prototype-status");
  await expect(preview).toContainText("料金は2人分です。");
  await preview.getByTestId("debug-prototype-destination").selectOption("agra_agra_fort");
  await preview.getByRole("button", { name: `徒歩 ${routes.first.minutes}分 · ₹${routes.first.cost}`, exact: true }).click();
  await expect(preview.getByRole("status")).toContainText("一時データで移動を確認しました");
  await expect(status).toContainText(`₹${30_000 - routes.first.cost}`);

  await preview.getByTestId("debug-prototype-destination").selectOption("agra_mehtab_bagh");
  const rail = preview.getByRole("button", { name: `鉄道・地下鉄（タージ側で地下鉄から車へ） ${routes.connection.minutes}分 · ₹${routes.connection.cost}`, exact: true });
  await expect(rail).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`agra-metro-car-${width}.png`), fullPage: true });
  }
  await rail.click();
  const remaining = 30_000 - routes.first.cost - routes.connection.cost;
  const arrival = 9 * 60 + routes.first.minutes + routes.connection.minutes;
  const arrivalTime = `${String(Math.floor(arrival / 60)).padStart(2, "0")}:${String(arrival % 60).padStart(2, "0")}`;
  await expect(status).toContainText(`現在地：${routes.destinationName}`);
  await expect(status).toContainText(arrivalTime);
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(preview.getByRole("status")).toContainText("一時データから再開しました");
  await expect(status).toContainText(arrivalTime);
  await expect(status).toContainText(`₹${remaining}`);

  await preview.getByRole("button", { name: `滞在先で休む（タクシー ${routes.home.minutes}分 · ₹${routes.home.cost}）`, exact: true }).click();
  await expect(preview.getByRole("status")).toContainText("一時データで翌日になりました");
  await expect(status).toContainText(`現在地：${routes.hotelName}`);
  await expect(status).toContainText("2日目");
  await expect(status).toContainText("09:00");
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(originalStorage);
});

test("Agra's west-to-north bus and car connection charges both travelers and permits a safe return", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const originalStorage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  const routes = await page.evaluate(async () => {
    const contentPath = "/src/content/index.ts";
    const routePath = "/src/domain/travel-routes.ts";
    const { getCityContent } = await import(/* @vite-ignore */ contentPath);
    const { findTravelHomeRoutes } = await import(/* @vite-ignore */ routePath);
    const { travel, travelSettings } = getCityContent("agra");
    const find = (from: string, to: string, mode: string) => travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
    const first = find(travelSettings.hotelPlaceId, "agra_mariam_tomb", "taxi");
    const connection = find("agra_mariam_tomb", "agra_itimad_tomb", "bus");
    if (!first || !connection) throw new Error("Missing Agra west-to-north route");
    const arrival = 9 * 60 + first.minutes + connection.minutes;
    const remaining = 30_000 - first.cost - connection.cost;
    const homes = findTravelHomeRoutes(travel.routes, "agra_itimad_tomb", travelSettings.hotelPlaceId);
    const home = homes.filter((item: { minutes: number; cost: number }) => arrival + item.minutes <= 21 * 60 && item.cost <= remaining)
      .sort((a: { cost: number; minutes: number }, b: { cost: number; minutes: number }) => a.cost - b.cost || a.minutes - b.minutes)[0];
    const place = (id: string) => travel.places.find((item: { id: string }) => item.id === id)?.nameJa as string | undefined;
    const hotelName = place(travelSettings.hotelPlaceId);
    const destinationName = place("agra_itimad_tomb");
    const viaName = home?.viaPlaceId ? place(home.viaPlaceId) : undefined;
    if (!home || !hotelName || !destinationName || (home.viaPlaceId && !viaName)) throw new Error("Missing affordable Agra return");
    return { first, connection, home, hotelName, destinationName, viaName };
  });
  expect(routes.connection.estimation).toBe("game_model");
  expect(routes.connection.transferNote).toBe("バス→車を乗継");
  expect(routes.connection.minutes).toBe(145);
  expect(routes.connection.cost).toBe(210);
  await page.getByTestId("debug-city").selectOption("agra");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  const preview = page.getByTestId("debug-prototype-preview");
  const status = preview.getByTestId("debug-prototype-status");
  await expect(preview).toContainText("料金は2人分です。");
  await preview.getByTestId("debug-prototype-destination").selectOption("agra_mariam_tomb");
  await preview.getByRole("button", { name: `タクシー ${routes.first.minutes}分 · ₹${routes.first.cost}`, exact: true }).click();
  await expect(preview.getByRole("status")).toContainText("一時データで移動を確認しました");
  await expect(status).toContainText(`₹${30_000 - routes.first.cost}`);

  await preview.getByTestId("debug-prototype-destination").selectOption("agra_itimad_tomb");
  const bus = preview.getByRole("button", { name: "バス（バス→車を乗継） 145分 · ₹210", exact: true });
  await expect(bus).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`agra-west-north-bus-car-${width}.png`), fullPage: true });
  }
  await bus.click();
  const remaining = 30_000 - routes.first.cost - routes.connection.cost;
  const arrival = 9 * 60 + routes.first.minutes + routes.connection.minutes;
  const arrivalTime = `${String(Math.floor(arrival / 60)).padStart(2, "0")}:${String(arrival % 60).padStart(2, "0")}`;
  await expect(status).toContainText(`現在地：${routes.destinationName}`);
  await expect(status).toContainText(arrivalTime);
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(preview.getByRole("status")).toContainText("一時データから再開しました");
  await expect(status).toContainText(arrivalTime);
  await expect(status).toContainText(`₹${remaining}`);

  const modeLabels: Record<string, string> = { walk: "徒歩", rail: "鉄道・地下鉄", tram: "路面電車", bus: "バス", taxi: "タクシー" };
  const note = routes.home.transferNote ? `・${routes.home.transferNote}` : "";
  const via = routes.viaName ? `・${routes.viaName}から徒歩` : "";
  const returnName = `滞在先で休む（${modeLabels[routes.home.mode]}${note}${via} ${routes.home.minutes}分 · ₹${routes.home.cost}）`;
  await preview.getByRole("button", { name: returnName, exact: true }).click();
  await expect(preview.getByRole("status")).toContainText("一時データで翌日になりました");
  await expect(status).toContainText(`現在地：${routes.hotelName}`);
  await expect(status).toContainText("2日目");
  await expect(status).toContainText("09:00");
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(originalStorage);
});

test("Agra Fort to Ram Bagh uses the walk and AG-11 model without changing the normal save", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const originalStorage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  const routes = await page.evaluate(async () => {
    const path = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ path);
    const { travel, travelSettings } = getCityContent("agra");
    const find = (from: string, to: string, mode: string) => travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
    const first = find(travelSettings.hotelPlaceId, "agra_agra_fort", "walk");
    const connection = find("agra_agra_fort", "agra_ram_bagh", "bus");
    const home = find("agra_ram_bagh", travelSettings.hotelPlaceId, "taxi");
    const place = (id: string) => travel.places.find((item: { id: string }) => item.id === id)?.nameJa as string | undefined;
    const hotelName = place(travelSettings.hotelPlaceId);
    const destinationName = place("agra_ram_bagh");
    if (!first || !connection || !home || !hotelName || !destinationName) throw new Error("Missing Agra AG-11 route");
    return { first, connection, home, hotelName, destinationName };
  });
  expect(routes.connection.estimation).toBe("game_model");
  expect(routes.connection.transferNote).toBe("徒歩・AG-11を乗継");
  expect(routes.connection.minutes).toBe(55);
  expect(routes.connection.cost).toBe(50);

  await page.getByTestId("debug-city").selectOption("agra");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  const preview = page.getByTestId("debug-prototype-preview");
  const status = preview.getByTestId("debug-prototype-status");
  await expect(preview).toContainText("料金は2人分です。");
  await preview.getByTestId("debug-prototype-destination").selectOption("agra_agra_fort");
  await preview.getByRole("button", { name: `徒歩 ${routes.first.minutes}分 · ₹${routes.first.cost}`, exact: true }).click();
  await preview.getByTestId("debug-prototype-destination").selectOption("agra_ram_bagh");
  const bus = preview.getByRole("button", { name: "バス（徒歩・AG-11を乗継） 55分 · ₹50", exact: true });
  await expect(bus).toBeVisible();
  await expect(preview).toContainText("ゲーム用推定経路");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await bus.click();
  const remaining = 30_000 - routes.first.cost - 50;
  const arrival = 9 * 60 + routes.first.minutes + 55;
  const arrivalTime = `${String(Math.floor(arrival / 60)).padStart(2, "0")}:${String(arrival % 60).padStart(2, "0")}`;
  await expect(status).toContainText(`現在地：${routes.destinationName}`);
  await expect(status).toContainText(arrivalTime);
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(status).toContainText(arrivalTime);
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: `滞在先で休む（タクシー ${routes.home.minutes}分 · ₹${routes.home.cost}）`, exact: true }).click();
  await expect(status).toContainText(`現在地：${routes.hotelName}`);
  await expect(status).toContainText("2日目");
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(originalStorage);
});

// India scenes are unfinished; use a Milan test route solely to exercise the
// shared production dialogs and avoid claiming an India story was played.
test("connection notes appear and can be selected in the shared travel and lodging dialogs", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const installTestRoutes = () => page.evaluate(async () => {
    const contentPath = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ contentPath);
    const { routes } = getCityContent("milano").travel;
    for (const [fromPlaceId, toPlaceId] of [["p_hotel", "p_duomo"], ["p_duomo", "p_hotel"]]) {
      const walk = routes.find((route: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
        route.fromPlaceId === fromPlaceId && route.toPlaceId === toPlaceId && route.mode === "walk");
      if (!walk) throw new Error(`Missing fixture walking route ${fromPlaceId} to ${toPlaceId}`);
      routes.push({ ...walk, mode: "bus", minutes: 15, cost: 3, estimation: "game_model", transferNote: "試験停留所で乗り継ぎ" });
    }
  });
  await installTestRoutes();
  // Trigger a normal state update so the shared destination menu recomputes
  // its options after the fixture routes have been installed.
  await page.getByText("待機", { exact: true }).click();
  await page.getByRole("button", { name: "30分待つ" }).click();
  const initialSave = await page.evaluate(() => localStorage.getItem("dreamscape.save.v1")!);
  await page.getByTestId("travel-place-p_duomo").getByRole("button").click();
  const outbound = page.getByRole("dialog", { name: /へ$/ });
  const outgoingBus = outbound.getByRole("button", { name: /バス（試験停留所で乗り継ぎ） 15分 · €3/ });
  await expect(outgoingBus).toBeVisible();
  await expect(outgoingBus).toBeEnabled();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(outgoingBus).toBeVisible();
  }
  await outgoingBus.click();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect((await saved(page)).travelBudget).toBe(57);

  // Set an otherwise valid, idle test state at the destination so the
  // ordinary hotel-return dialog can be exercised without completing a story.
  await page.evaluate((value) => {
    const state = JSON.parse(value);
    state.travel.currentPlaceId = "p_duomo";
    localStorage.setItem("dreamscape.save.v1", JSON.stringify(state));
  }, initialSave);
  await page.reload();
  await installTestRoutes();
  await page.getByRole("button", { name: "滞在先で休む", exact: true }).click();
  const sleep = page.getByRole("dialog", { name: "滞在先で休む" });
  const returnBus = sleep.getByRole("button", { name: /バス（試験停留所で乗り継ぎ） 15分 · €3/ });
  await expect(returnBus).toBeVisible();
  await expect(returnBus).toBeEnabled();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(returnBus).toBeVisible();
  }
  await returnBus.click();
  await expect.poll(async () => (await saved(page)).travel.currentPlaceId).toBe("p_hotel");
  // Milan charges €10 for lodging as well as the €3 test return fare.
  expect((await saved(page)).travelBudget).toBe(47);
});
test("Agra Taj and Ram Bagh connections preserve the party fare and preview save", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const originalStorage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  const routes = await page.evaluate(async () => {
    const path = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ path);
    const { travel, travelSettings } = getCityContent("agra");
    const find = (from: string, to: string, mode: string) => travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
    const first = find(travelSettings.hotelPlaceId, "agra_taj_mahal", "rail");
    const outbound = find("agra_taj_mahal", "agra_ram_bagh", "bus");
    const back = find("agra_ram_bagh", "agra_taj_mahal", "bus");
    const home = find("agra_taj_mahal", travelSettings.hotelPlaceId, "walk");
    const place = (id: string) => travel.places.find((item: { id: string }) => item.id === id)?.nameJa as string | undefined;
    const hotelName = place(travelSettings.hotelPlaceId);
    const ramName = place("agra_ram_bagh");
    const tajName = place("agra_taj_mahal");
    if (!first || !outbound || !back || !home || !hotelName || !ramName || !tajName) throw new Error("Missing Agra rail and AG-11 model");
    return { first, outbound, back, home, hotelName, ramName, tajName };
  });
  expect(routes.outbound).toMatchObject({ estimation: "game_model", minutes: 80, cost: 70, transferNote: "地下鉄・徒歩・AG-11を乗継" });
  expect(routes.back).toMatchObject({ estimation: "game_model", minutes: 80, cost: 70, transferNote: "徒歩・AG-11・地下鉄を乗継" });

  await page.getByTestId("debug-city").selectOption("agra");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  const preview = page.getByTestId("debug-prototype-preview");
  const status = preview.getByTestId("debug-prototype-status");
  await expect(preview).toContainText("料金は2人分です。");
  await preview.getByTestId("debug-prototype-destination").selectOption("agra_taj_mahal");
  await preview.getByRole("button", { name: `鉄道・地下鉄 ${routes.first.minutes}分 · ₹${routes.first.cost}`, exact: true }).click();

  await preview.getByTestId("debug-prototype-destination").selectOption("agra_ram_bagh");
  const outbound = preview.getByRole("button", { name: "バス（地下鉄・徒歩・AG-11を乗継） 80分 · ₹70", exact: true });
  await expect(outbound).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await outbound.click();
  let remaining = 30_000 - routes.first.cost - routes.outbound.cost;
  let minute = 9 * 60 + routes.first.minutes + routes.outbound.minutes;
  const formatted = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  await expect(status).toContainText(`現在地：${routes.ramName}`);
  await expect(status).toContainText(formatted(minute));
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(status).toContainText(`₹${remaining}`);

  await preview.getByTestId("debug-prototype-destination").selectOption("agra_taj_mahal");
  await preview.getByRole("button", { name: "バス（徒歩・AG-11・地下鉄を乗継） 80分 · ₹70", exact: true }).click();
  remaining -= routes.back.cost;
  minute += routes.back.minutes;
  await expect(status).toContainText(`現在地：${routes.tajName}`);
  await expect(status).toContainText(formatted(minute));
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: `滞在先で休む（徒歩 ${routes.home.minutes}分 · ₹${routes.home.cost}）`, exact: true }).click();
  await expect(status).toContainText(`現在地：${routes.hotelName}`);
  await expect(status).toContainText("2日目");
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(originalStorage);
});
test("Agra Ram Bagh to Guru Ka Taal uses the city bus model and returns safely", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const originalStorage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  const routes = await page.evaluate(async () => {
    const path = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ path);
    const { travel, travelSettings } = getCityContent("agra");
    const find = (from: string, to: string, mode: string) => travel.routes.find((item: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      item.fromPlaceId === from && item.toPlaceId === to && item.mode === mode);
    const first = find(travelSettings.hotelPlaceId, "agra_ram_bagh", "bus");
    const connection = find("agra_ram_bagh", "agra_guru_ka_taal", "bus");
    const home = find("agra_guru_ka_taal", travelSettings.hotelPlaceId, "taxi");
    const place = (id: string) => travel.places.find((item: { id: string }) => item.id === id)?.nameJa as string | undefined;
    const hotelName = place(travelSettings.hotelPlaceId);
    const destinationName = place("agra_guru_ka_taal");
    if (!first || !connection || !home || !hotelName || !destinationName) throw new Error("Missing Agra city bus fixture");
    return { first, connection, home, hotelName, destinationName };
  });
  expect(routes.connection).toMatchObject({ estimation: "game_model", minutes: 82, cost: 180, transferNote: "徒歩→車→市内バス→車" });
  await page.getByTestId("debug-city").selectOption("agra");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  const preview = page.getByTestId("debug-prototype-preview");
  const status = preview.getByTestId("debug-prototype-status");
  await expect(preview).toContainText("料金は2人分です。");
  await preview.getByTestId("debug-prototype-destination").selectOption("agra_ram_bagh");
  await preview.getByRole("button", { name: `バス（${routes.first.transferNote}） ${routes.first.minutes}分 · ₹${routes.first.cost}`, exact: true }).click();
  await preview.getByTestId("debug-prototype-destination").selectOption("agra_guru_ka_taal");
  const bus = preview.getByRole("button", { name: "バス（徒歩→車→市内バス→車） 82分 · ₹180", exact: true });
  await expect(bus).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await bus.click();
  const remaining = 30_000 - routes.first.cost - routes.connection.cost;
  const minute = 9 * 60 + routes.first.minutes + routes.connection.minutes;
  const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  await expect(status).toContainText(`現在地：${routes.destinationName}`);
  await expect(status).toContainText(time);
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(status).toContainText(time);
  await expect(status).toContainText(`₹${remaining}`);
  await preview.getByRole("button", { name: `滞在先で休む（タクシー ${routes.home.minutes}分 · ₹${routes.home.cost}）`, exact: true }).click();
  await expect(status).toContainText(`現在地：${routes.hotelName}`);
  await expect(status).toContainText("2日目");
  await expect(status).toContainText(`₹${remaining - routes.home.cost}`);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(originalStorage);
});
