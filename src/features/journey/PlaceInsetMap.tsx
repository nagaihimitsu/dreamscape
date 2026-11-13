import { useEffect, useRef, useState } from "react";
import type * as L from "leaflet";
import { useLeaflet, type Leaflet } from "./leaflet";
import type { TravelPlace } from "../../content/travel-schemas";
import { escapeHtml, OSM_TILES, reducedMotion } from "./PlaceMap";
import { whenLaidOut } from "./when-laid-out";
import "./place-map.css";
import "./travel-menu.css";

/** The closest the small map comes (both marks still show with their labels). */
const INSET_MAX_ZOOM = 16;
/** Room around the marks: the selected place's name above its disc, 「現在地」 under its ring. */
const INSET_PADDING = { paddingTopLeft: [36, 38] as L.PointTuple, paddingBottomRight: [36, 30] as L.PointTuple, maxZoom: INSET_MAX_ZOOM };
const INSET_FLY_S = 0.4;

const mark = (L: Leaflet, place: TravelPlace, html: string, size: number) => L.marker([place.latitude, place.longitude], {
  icon: L.divIcon({ className: "travel-map-marker-wrap", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
  interactive: false,
  keyboard: false,
});

/**
 * The introduction card's small map (B案, map ①): the current place and the selected place only, display only (no
 * controls, no drag or zoom, nothing to focus; a swipe over it scrolls the page). It moves to each new selection so
 * both marks show. Its OSM credit stays on it; when the tiles fail, a line under it says so (the cards still choose).
 */
type InsetProps = {
  /** The current place (null when it cannot be found). */
  here: TravelPlace | null;
  /** The selected place. */
  there: TravelPlace;
  /** The selected place's name as the screens write it (placeDisplayName). */
  name: string;
  /** Its mark: ◆ sightseeing, ♥ a date. */
  glyph: string;
  /** The places the party has been to (visited-places.ts): their marks carry the stamp of 「行った場所」. */
  visited?: readonly string[];
};

/** Until Leaflet is loaded (leaflet.ts), the empty frame. */
export function PlaceInsetMap(props: InsetProps) {
  const L = useLeaflet();
  if (L) return <LeafletInsetMap L={L} {...props} />;
  return <div className="place-inset"><div className="place-inset-map" data-testid="place-inset-map" /></div>;
}

function LeafletInsetMap({ L, here, there, name, glyph, visited = [] }: InsetProps & { L: Leaflet }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const marks = useRef<L.LayerGroup | null>(null);
  const viewed = useRef(false);
  // A list made anew each render would redraw the marks (and move the view again): its ids stand for it.
  const visitedKey = visited.join(" ");

  useEffect(() => {
    const frame = container.current;
    if (!frame) return;
    const map = L.map(frame, { zoomControl: false, dragging: false, touchZoom: false, doubleClickZoom: false, scrollWheelZoom: false, boxZoom: false, keyboard: false });
    map.attributionControl.setPrefix(false);
    // Tiles and marks are pictures only: the credit's link stays the one thing a reader can reach.
    map.getPane("mapPane")?.setAttribute("aria-hidden", "true");
    let errors = 0;
    L.tileLayer(OSM_TILES.url, { maxZoom: 19, attribution: OSM_TILES.attribution }).on("tileerror", () => {
      if (++errors === 2) setTilesFailed(true);
    }).addTo(map);
    marks.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const resized = new ResizeObserver(() => map.invalidateSize());
    resized.observe(frame);
    return () => {
      resized.disconnect();
      map.remove();
      // As PlaceMap: a zoom animation's timer that remove() leaves running would move the removed panes.
      (map as unknown as { _animatingZoom?: boolean })._animatingZoom = false;
      mapRef.current = null;
      marks.current = null;
      viewed.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = marks.current;
    const frame = container.current;
    if (!map || !group || !frame) return;
    group.clearLayers();
    // At the current place one mark only: the selected disc with the current place's ring.
    const from = here && here.id !== there.id ? here : null;
    const stamp = (place: TravelPlace) => (visitedKey.split(" ").includes(place.id) ? " is-visited" : "");
    if (from) mark(L, from,`<span class="travel-map-marker is-here${stamp(from)}" aria-hidden="true">●</span><span class="travel-map-marker-label is-below" aria-hidden="true">現在地</span>`, 32).addTo(group);
    mark(L, there,`<span class="travel-map-marker is-selected${here && !from ? " is-here" : ""}${stamp(there)}" aria-hidden="true">${glyph}</span><span class="travel-map-marker-label" aria-hidden="true">${escapeHtml(name)}</span>`, 40).addTo(group);
    // The view needs the frame's size (in a dialog, a frame or so later).
    return whenLaidOut(frame, () => {
      map.invalidateSize();
      const animate = viewed.current && !reducedMotion();
      viewed.current = true;
      if (!from) {
        map.setView([there.latitude, there.longitude], INSET_MAX_ZOOM, { animate });
        return;
      }
      const bounds = L.latLngBounds([[from.latitude, from.longitude], [there.latitude, there.longitude]]);
      if (animate) map.flyToBounds(bounds, { ...INSET_PADDING, duration: INSET_FLY_S });
      else map.fitBounds(bounds, { ...INSET_PADDING, animate: false });
    });
  }, [L, here, there, name, glyph, visitedKey]);

  return <div className="place-inset">
    <div ref={container} className="place-inset-map" data-testid="place-inset-map" />
    {tilesFailed && <p role="status" className="place-inset-error">地図を読み込めません。通信を確認してください。写真札からは引き続き選べます。</p>}
  </div>;
}
