import { useEffect, useId, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HeroineNote } from "../battle/HeroineNote";
import { escapeHtml, OSM_TILES } from "./PlaceMap";
import { whenLaidOut } from "./when-laid-out";
import { nudgeMarksApart, routeMarks, type NightRecap, type RouteStop, type TodayWord } from "./night-recap";
import "../battle/battle.css";
import "./night-rest.css";

/** The closest the route's map comes (its marks still show apart). */
const ROUTE_MAX_ZOOM = 16;
/** A mark's height (night-rest.css .today-route-mark), and the width of the day's last place's ring around it (.is-last). */
const MARK_HEIGHT = 28;
const LAST_RING = 5;
/** The room kept between two marks: their white edges (2 px each) apart. */
const MARK_GAP = 4;

/**
 * Today's route on a small map (2026-11-11 user decision): the places of the day in order, joined by a dotted line,
 * each mark numbered with its stops (marks that would hide one another drawn a little apart, nudgeMarksApart, the line
 * still at the places), and the stops listed in words under it. Display only, like the place card's map
 * (PlaceInsetMap): no controls, nothing to focus but the OSM credit, still (no animation). When the tiles fail, a
 * line says so; the list still tells the way.
 */
export function TodayRouteMap({ route }: { route: readonly RouteStop[] }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const routeRef = useRef(route);
  routeRef.current = route;
  // Drawn once per route (a re-render with the same places keeps the map).
  const routeKey = route.map((stop) => stop.place.id).join(" ");
  useEffect(() => {
    const frame = container.current;
    const stops = routeRef.current;
    if (!frame || stops.length < 2) return;
    const map = L.map(frame, { zoomControl: false, dragging: false, touchZoom: false, doubleClickZoom: false, scrollWheelZoom: false, boxZoom: false, keyboard: false });
    map.attributionControl.setPrefix(false);
    // Tiles, line and marks are pictures only (the list under the map says the way).
    map.getPane("mapPane")?.setAttribute("aria-hidden", "true");
    let errors = 0;
    L.tileLayer(OSM_TILES.url, { maxZoom: 19, attribution: OSM_TILES.attribution }).on("tileerror", () => {
      if (++errors === 2) setTilesFailed(true);
    }).addTo(map);
    const points = stops.map((stop) => L.latLng(stop.place.latitude, stop.place.longitude));
    L.polyline(points, { className: "today-route-line", color: "#2b3140", weight: 3, opacity: 0.9, dashArray: "1 8", lineCap: "round", interactive: false }).addTo(map);
    const resized = new ResizeObserver(() => map.invalidateSize());
    resized.observe(frame);
    // The view needs the frame's size (a frame or so later when it has none yet); the marks need the view (where they fall).
    const cancel = whenLaidOut(frame, () => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: ROUTE_MAX_ZOOM, animate: false });
      const marks = routeMarks(stops).map((mark) => {
        const at = L.latLng(mark.place.latitude, mark.place.longitude);
        const { x, y } = map.latLngToLayerPoint(at);
        // A pill as wide as its numbers (「1・4」), centred on the place; the day's last place's ring counts in its room.
        const width = Math.max(MARK_HEIGHT, 12 + mark.label.length * 8);
        const ring = mark.last ? 2 * LAST_RING : 0;
        return { mark, at, width, box: { x, y, width: width + ring, height: MARK_HEIGHT + ring } };
      });
      // Marks that would hide one another are drawn a little apart (the map does not move again); a moved mark's place
      // keeps a small dot, where the line meets it.
      const nudges = nudgeMarksApart(marks.map((item) => item.box), MARK_GAP);
      marks.forEach(({ mark, at, width }, index) => {
        const { dx, dy } = nudges[index];
        if (dx || dy) L.circleMarker(at, { className: "today-route-place", radius: 3, stroke: false, fillColor: "#2b3140", fillOpacity: 1, interactive: false }).addTo(map);
        L.marker(at, {
          icon: L.divIcon({ className: "today-route-mark-wrap", iconSize: [width, MARK_HEIGHT], iconAnchor: [width / 2 - dx, MARK_HEIGHT / 2 - dy],
            html: `<span class="today-route-mark${mark.last ? " is-last" : ""}" aria-hidden="true">${escapeHtml(mark.label)}</span>` }),
          interactive: false, keyboard: false, zIndexOffset: mark.last ? 1000 : 0,
        }).addTo(map);
      });
    });
    return () => {
      cancel();
      resized.disconnect();
      map.remove();
      // As PlaceMap: a zoom animation's timer that remove() leaves running would move the removed panes.
      (map as unknown as { _animatingZoom?: boolean })._animatingZoom = false;
    };
  }, [routeKey]);
  return <figure className="today-route" data-testid="today-route">
    <figcaption className="today-route-title">今日の道のり</figcaption>
    <div ref={container} className="today-route-map" />
    {tilesFailed && <p role="status" className="today-route-error">地図を読み込めません。通信を確認してください。</p>}
    <ol className="today-route-stops">
      {route.map((stop, index) => <li key={index}><span className="today-route-number" aria-hidden="true">{index + 1}</span>{stop.nameJa}</li>)}
    </ol>
  </figure>;
}

/**
 * Today's headlines (2026-11-11 user decision, save v23): the clear titles of the episodes completed today, in the order
 * completed, as the night's list above the route. Display only.
 */
export function TodayHeadlines({ headlines }: { headlines: readonly string[] }) {
  // (The night screen and its leaving may both be in the page for a moment.)
  const titleId = useId();
  return <section className="today-headlines" aria-labelledby={titleId} data-testid="today-headlines">
    <h2 id={titleId} className="today-headlines-title">今日の見出し</h2>
    <ol>{headlines.map((headline, index) => <li key={index}>{headline}</li>)}</ol>
  </section>;
}

/**
 * 今日の一語 (2026-11-13 user decision): one English word or phrase met today and its meaning there (todayWord), a small plain
 * line at the end of the night screen. Display only, read in the screen's order (no live region).
 */
export function TodayWordLine({ word }: { word: TodayWord }) {
  return <p className="today-word" data-testid="today-word">
    <span className="today-word-label">今日の一語<span className="sr-only">：</span></span>
    <span className="today-word-en" lang="en">{word.word}</span>
    <span className="today-word-meaning">{word.meaningJa}</span>
  </p>;
}

/** Under the night's line: today's headlines (episodes completed today), today's route (when the party went out) and the heroine's line of the night (when written). */
export function NightRecapView({ recap }: { recap: NightRecap }) {
  return <div className="night-recap">
    {recap.headlines.length > 0 && <TodayHeadlines headlines={recap.headlines} />}
    {recap.route.length > 1 && <TodayRouteMap route={recap.route} />}
    {recap.line !== null && <HeroineNote className="night-recap-line" label={recap.heroineName} text={recap.line} cityId={recap.cityId} testId="night-line" />}
  </div>;
}
