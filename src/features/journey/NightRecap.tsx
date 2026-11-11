import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HeroineNote } from "../battle/HeroineNote";
import { escapeHtml, OSM_TILES } from "./PlaceMap";
import { whenLaidOut } from "./when-laid-out";
import { routeMarks, type NightRecap, type RouteStop } from "./night-recap";
import "../battle/battle.css";
import "./night-rest.css";

/** The closest the route's map comes (its marks still show apart). */
const ROUTE_MAX_ZOOM = 16;

/**
 * Today's route on a small map (2026-11-11 user decision): the places of the day in order, joined by a dotted line,
 * each mark numbered with its stops, and the stops listed in words under it. Display only, like the place card's map
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
    for (const mark of routeMarks(stops)) {
      const size = mark.label.length > 2 ? 40 : 28;
      L.marker([mark.place.latitude, mark.place.longitude], {
        icon: L.divIcon({ className: "today-route-mark-wrap", iconSize: [size, 28], iconAnchor: [size / 2, 14],
          html: `<span class="today-route-mark${mark.last ? " is-last" : ""}" aria-hidden="true">${escapeHtml(mark.label)}</span>` }),
        interactive: false, keyboard: false, zIndexOffset: mark.last ? 1000 : 0,
      }).addTo(map);
    }
    const resized = new ResizeObserver(() => map.invalidateSize());
    resized.observe(frame);
    // The view needs the frame's size (a frame or so later when it has none yet).
    const cancel = whenLaidOut(frame, () => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: ROUTE_MAX_ZOOM, animate: false });
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

/** Under the night's line: today's route (when the party went out) and the heroine's line of the night (when written). */
export function NightRecapView({ recap }: { recap: NightRecap }) {
  return <div className="night-recap">
    {recap.route.length > 1 && <TodayRouteMap route={recap.route} />}
    {recap.line !== null && <HeroineNote className="night-recap-line" label={recap.heroineName} text={recap.line} cityId={recap.cityId} testId="night-line" />}
  </div>;
}
