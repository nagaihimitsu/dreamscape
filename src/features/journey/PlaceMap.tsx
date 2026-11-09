import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCityContent } from "../../content";
import type { TravelEvent, TravelPlace } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { battlePlayed } from "../../domain/conditions";
import { Icon } from "../../components/icons";
import { Modal } from "../../components/Modal";
import { fitZoom, getFocusView, labelMaxWidth } from "./map-focus";
import { placeDisplayName } from "./travel-labels";
import { FOCUS_MS, type PressKind } from "./travel-selection";
import type { PressScope, TravelSelectionApi } from "./useTravelSelection";
import "./place-map.css";

const TILE_ERROR_JA = "地図の一部を読み込めません。通信を確認してください。行き先一覧は引き続き利用できます。";

type Props = { game: GameState; events: TravelEvent[] };
type Place = TravelPlace;
type MapView = { center: L.LatLng; zoom: number };
type MarkerPress = (placeId: string, kind: PressKind) => void;

const escapeHtml = (text: string) => text.replace(/[&<>"']/gu, (char) => `&#${char.charCodeAt(0)};`);
const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Both map sizes use the same tiles, markers and selection behavior. */
function MapCanvas({ game, events, places, selectedId, onMarker, onFocusEnd, mapRef, initialView, expanded = false, onTilesFailed }: Props & {
  places: Place[];
  selectedId: string | null;
  onMarker: MarkerPress;
  onFocusEnd?: (until: number) => void;
  mapRef: { current: L.Map | null };
  initialView?: MapView | null;
  expanded?: boolean;
  /** Where the caller shows the tile error itself (the small map: under its legend, U10). */
  onTilesFailed?: () => void;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const { city, travel } = getCityContent(game.currentCityId);
  const container = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const onMarkerRef = useRef(onMarker);
  onMarkerRef.current = onMarker;
  const onFocusEndRef = useRef(onFocusEnd);
  onFocusEndRef.current = onFocusEnd;

  useEffect(() => {
    if (!container.current) return;
    const frame = container.current;
    const map = L.map(frame, { zoomControl: true, scrollWheelZoom: true });
    mapRef.current = map;
    const zoomIn = map.zoomControl.getContainer()?.querySelector<HTMLElement>(".leaflet-control-zoom-in");
    const zoomOut = map.zoomControl.getContainer()?.querySelector<HTMLElement>(".leaflet-control-zoom-out");
    zoomIn?.setAttribute("aria-label", "地図を拡大");
    zoomOut?.setAttribute("aria-label", "地図を縮小");
    if (zoomIn) zoomIn.title = "地図を拡大";
    if (zoomOut) zoomOut.title = "地図を縮小";
    // The public OSM service supplies interactive tiles on demand; do not prefetch.
    let errors = 0;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).on("tileerror", () => {
      if (++errors < 2) return;
      setTilesFailed(true);
      onTilesFailed?.();
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    // A modal's children mount before showModal(): wait until it has a visible size.
    const start = requestAnimationFrame(() => {
      map.invalidateSize();
      if (initialView) map.setView(initialView.center, initialView.zoom, { animate: false });
      else map.fitBounds(L.latLngBounds(places.map((place) => [place.latitude, place.longitude])), { padding: [24, 24], maxZoom: 15 });
    });
    // The sticky frame's height follows the header and the band: keep Leaflet's size and the
    // selected label's width (the frame less both side paddings) in step.
    const resized = new ResizeObserver(() => {
      map.invalidateSize();
      frame.style.setProperty("--map-label-max", `${labelMaxWidth(frame.clientWidth)}px`);
    });
    resized.observe(frame);
    return () => {
      cancelAnimationFrame(start);
      resized.disconnect();
      map.remove();
      // Leaflet 1.9 ends a zoom animation from a 250 ms timer that remove() leaves running; when a
      // destination is chosen right after a zoom tap the timer then moves the removed panes and
      // throws (found by the weekly monkey, docs/10「探索テスト」). Mark the animation as over.
      (map as unknown as { _animatingZoom?: boolean })._animatingZoom = false;
      mapRef.current = null;
      markersRef.current = null;
    };
  // A map is initialized once per opening; marker updates do not reset its pan or zoom.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    for (const place of places) {
      const here = place.id === game.travel.currentPlaceId;
      const selected = place.id === selectedId;
      const categories = new Set(events.filter((event) => event.placeId === place.id).map((event) => event.category));
      // A remaining destination may share a place with a completed event.
      // Keep the place's visit history without showing the completed event's category.
      const visited = travel.events.some((event) => event.placeId === place.id && (game.completedEpisodeIds.includes(event.id) || game.playedDateIds.includes(event.id) || battlePlayed(game, event.id)));
      const label = `${place.nameJa}${here ? "、現在地" : ""}${categories.has("main") ? "、観光" : ""}${categories.has("date") ? "、デート" : ""}${visited ? "、訪問済み" : "、未訪問"}`;
      const symbol = `${categories.has("main") ? "◆" : ""}${categories.has("date") ? "♥" : ""}` || "●";
      const classes = `travel-map-marker${here ? " is-here" : ""}${visited ? " is-visited" : ""}${selected ? " is-selected" : ""}`;
      // The selected marker (U21): the glyph in yellow on a dark disc, larger, with its name above (display only).
      const html = `<span class="${classes}" aria-hidden="true">${symbol}</span>${selected ? `<span class="travel-map-marker-label" aria-hidden="true">${escapeHtml(placeDisplayName(game, place))}</span>` : ""}`;
      const size = selected ? 40 : 32;
      const icon = L.divIcon({ className: "travel-map-marker-wrap", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
      const marker = L.marker([place.latitude, place.longitude], { icon, title: label, keyboard: true, zIndexOffset: selected ? 1000 : 0 });
      // The element exists once the map has its first view (Leaflet adds layers then).
      marker.on("add", () => {
        const element = marker.getElement();
        if (!element) return;
        element.setAttribute("aria-label", `${label}${selected ? "、選択中" : ""}`);
        element.dataset.testid = `map-marker-${place.id}`;
        if (selected) element.dataset.selected = "true";
        // Enter selects on keydown (and cancels Leaflet's own keypress → click); Space selects on keyup,
        // so focus moves to the row only after the key is released (§3.5 「Keyboard」).
        element.addEventListener("keydown", (key) => {
          if (key.key === "Enter") {
            key.preventDefault();
            if (!key.repeat) onMarkerRef.current(place.id, "keyboard");
          } else if (key.key === " ") key.preventDefault();
        });
        element.addEventListener("keyup", (key) => {
          if (key.key !== " ") return;
          key.preventDefault();
          onMarkerRef.current(place.id, "keyboard");
        });
      });
      marker.on("click", () => onMarkerRef.current(place.id, "pointer")).addTo(group);
    }
  }, [places, events, travel.events, selectedId, game]);

  // The selection's focus: the destination at the centre, zoomed in as far as the current place still shows (map-focus.ts).
  useEffect(() => {
    const map = mapRef.current;
    const place = places.find((item) => item.id === selectedId);
    if (!map || !place) return;
    const size = map.getSize();
    if (!size.x || !size.y) return;
    const frame = { width: size.x, height: size.y };
    const current = places.find((item) => item.id === game.travel.currentPlaceId) ?? null;
    const view = getFocusView({ destination: place, current, frame, overviewZoom: fitZoom(places, frame, 24, 15) });
    const center = L.latLng(view.center.latitude, view.center.longitude);
    const reduced = reducedMotion();
    if (reduced) map.setView(center, view.zoom, { animate: false });
    else map.flyTo(center, view.zoom, { duration: FOCUS_MS / 1000 });
    onFocusEndRef.current?.(performance.now() + (reduced ? 0 : FOCUS_MS));
  // Only a new selection moves the map; clearing keeps the view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <>
    <div ref={container} className="travel-map-frame" role="region" aria-label={`${city.nameJa}の地図。ドラッグで移動、ピンチまたはプラス・マイナスで拡大縮小できます。`} data-testid={expanded ? "travel-map-expanded-canvas" : "travel-map-canvas"} />
    {tilesFailed && !onTilesFailed && <p role="status">{TILE_ERROR_JA}</p>}
  </>;
}

/** The map's legend: each mark named by its shape, never by its colour alone (UI redesign §3.5). */
function MapLegend() {
  return <p className="travel-map-legend">
    <span><span className="travel-map-legend-glyph" aria-hidden="true">◆</span> 観光</span>
    <span><span className="travel-map-legend-glyph" aria-hidden="true">♥</span> デート</span>
    <span><span className="travel-map-legend-glyph" aria-hidden="true">●</span> 滞在先など</span>
    <span>輪つき 現在地</span>
    <span>白い点 訪問済み</span>
    <span><span className="travel-map-legend-disc" aria-hidden="true" /> 大きな丸 選んだ場所</span>
  </p>;
}

/** The live region of the selection (cleared before each text, so a repeated text is read again). */
function Announce({ message, testId }: { message: { text: string; key: number }; testId: string }) {
  return <p className="sr-only" aria-live="polite" data-testid={testId}>{message.text && <span key={message.key}>{message.text}</span>}</p>;
}

/**
 * The city's map (UI redesign §3.4–§3.5): the map block (the part that stays under the
 * header while the list scrolls, with 「大きく」 in its corner), its legend, the tile error
 * and the live region, then the list (children). With `selection` (free time) its markers
 * select through the shared selection; without it (Debug's map check) they select here only.
 * Itinerary selection remains available even if map tiles fail to load.
 */
export function PlaceMap({ game, events, selection, children }: Props & {
  selection?: { api: TravelSelectionApi; slot: ReactNode };
  children?: ReactNode;
}) {
  const { city, travel } = getCityContent(game.currentCityId);
  const api = selection?.api;
  const [expanded, setExpanded] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const expandedMapRef = useRef<L.Map | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const initialView = useRef<MapView | null>(null);
  const places = useMemo(() => {
    const shown = travel.places.filter((place) =>
      place.id === game.travel.hotelPlaceId || place.id === game.travel.currentPlaceId || events.some((event) => event.placeId === place.id));
    if (!api) return shown;
    // Markers in the list's order (current place, nearby, other, hotel), so Tab follows the list.
    const order = [game.travel.currentPlaceId, ...api.destinations.nearby.map((place) => place.id), ...api.destinations.other.map((place) => place.id), game.travel.hotelPlaceId];
    const rank = (id: string) => { const index = order.indexOf(id); return index < 0 ? order.length : index; };
    return [...shown].sort((a, b) => rank(a.id) - rank(b.id));
  }, [travel.places, game.travel.hotelPlaceId, game.travel.currentPlaceId, events, api]);
  const selectedId = api ? api.selectedMarkerId : localSelected;

  function openExpanded() {
    const map = mapRef.current;
    initialView.current = map && Number.isFinite(map.getZoom()) ? { center: map.getCenter(), zoom: map.getZoom() } : null;
    setExpanded(true);
  }
  function closeExpanded() {
    const map = expandedMapRef.current;
    if (map && Number.isFinite(map.getZoom()) && mapRef.current) mapRef.current.setView(map.getCenter(), map.getZoom(), { animate: false });
    setExpanded(false);
  }
  // Before a travel or a sleep chosen in the expanded map, the dialog closes.
  useEffect(() => {
    if (!api) return;
    api.leaveRef.current = expanded ? closeExpanded : null;
    return () => { api.leaveRef.current = null; };
  });

  /** Whether the map block is stuck under the header now (a marker press may then scroll the list). */
  function stuck() {
    const block = blockRef.current;
    if (!block) return false;
    const style = getComputedStyle(block);
    return style.position === "sticky" && Math.abs(block.getBoundingClientRect().top - parseFloat(style.top)) < 1;
  }
  const press = (scope: PressScope): MarkerPress => (placeId, kind) => {
    if (api) api.pressMarker(placeId, kind, scope === "page" && stuck(), scope);
    else setLocalSelected(placeId);
  };

  return <>
    <div className="travel-map" data-testid="travel-map" ref={blockRef}>
      <div className="travel-map-preview">
        <MapCanvas game={game} events={events} places={places} selectedId={selectedId} onMarker={press("page")} onFocusEnd={api?.focusEnd} mapRef={mapRef} onTilesFailed={() => setTilesFailed(true)} />
        <button type="button" className="travel-map-expand" data-testid="map-expand" aria-label="地図を大きく見る" onClick={openExpanded}>
          <Icon name="map" /><span>大きく</span>
        </button>
      </div>
    </div>
    <div className="travel-map-notes">
      <MapLegend />
      {tilesFailed && <p role="status" className="travel-map-error">{TILE_ERROR_JA}</p>}
      {api && <Announce message={api.message} testId="travel-announce" />}
    </div>
    {children}
    {expanded && <Modal labelledBy="travel-map-expanded-title" className="travel-map-modal" onClose={closeExpanded}>
      <div className="travel-map-modal-heading"><h2 id="travel-map-expanded-title">{city.nameJa}の地図</h2><button type="button" className="secondary" onClick={closeExpanded}>閉じる</button></div>
      <div className="travel-map-modal-body">
        <div className="travel-map-modal-map">
          <MapCanvas game={game} events={events} places={places} selectedId={selectedId} onMarker={press("dialog")} onFocusEnd={api?.focusEnd} mapRef={expandedMapRef} initialView={initialView.current} expanded />
        </div>
        <MapLegend />
        {/* U12: choosing a name here is a first press (it selects and shows the place); it never travels. */}
        <label className="travel-map-modal-place">地点を名前で探す <select data-testid="map-place-select" value={selectedId ?? ""}
          onChange={(event) => { if (event.currentTarget.value) press("dialog")(event.currentTarget.value, "pointer"); }}>
          <option value="">地点を選択</option>{places.map((place) => <option key={place.id} value={place.id}>{placeDisplayName(game, place)}</option>)}
        </select></label>
        {api && <>
          <Announce message={api.message} testId="map-announce" />
          <section className="travel-map-selection" data-testid="map-selection" aria-label="選んだ行き先">
            <h3>選んだ行き先</h3>
            {selection.slot}
          </section>
        </>}
      </div>
    </Modal>}
  </>;
}
