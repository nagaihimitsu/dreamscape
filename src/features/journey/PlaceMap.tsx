import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCityContent } from "../../content";
import type { TravelEvent, TravelPlace } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";
import { Modal } from "../../components/Modal";
import "./place-map.css";

type Props = { game: GameState; events: TravelEvent[] };
type Place = TravelPlace;
type MapView = { center: L.LatLng; zoom: number };

/** Both map sizes use the same tiles, markers and selection behavior. */
function MapCanvas({ game, events, places, onSelect, mapRef, initialView, expanded = false }: Props & {
  places: Place[];
  onSelect: (id: string) => void;
  mapRef: { current: L.Map | null };
  initialView?: MapView | null;
  expanded?: boolean;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const { city, travel } = getCityContent(game.currentCityId);
  const container = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { zoomControl: true, scrollWheelZoom: true });
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
    }).on("tileerror", () => { if (++errors >= 2) setTilesFailed(true); }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    // A modal's children mount before showModal(): wait until it has a visible size.
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
      if (initialView) map.setView(initialView.center, initialView.zoom, { animate: false });
      else map.fitBounds(L.latLngBounds(places.map((place) => [place.latitude, place.longitude])), { padding: [24, 24], maxZoom: 15 });
    });
    return () => { cancelAnimationFrame(frame); map.remove(); mapRef.current = null; markersRef.current = null; };
  // A map is initialized once per opening; marker updates do not reset its pan or zoom.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    for (const place of places) {
      const here = place.id === game.travel.currentPlaceId;
      const categories = new Set(events.filter((event) => event.placeId === place.id).map((event) => event.category));
      // A remaining destination may share a place with a completed event.
      // Keep the place's visit history without showing the completed event's category.
      const visited = travel.events.some((event) => event.placeId === place.id && (game.completedEpisodeIds.includes(event.id) || game.playedDateIds.includes(event.id) || game.battleRecords.some((record) => record.battleId === event.id && record.attempts > 0)));
      const label = `${place.nameJa}${here ? "、現在地" : ""}${categories.has("main") ? "、観光" : ""}${categories.has("date") ? "、デート" : ""}${visited ? "、訪問済み" : "、未訪問"}`;
      const symbol = `${categories.has("main") ? "◆" : ""}${categories.has("date") ? "♥" : ""}` || "●";
      const icon = L.divIcon({ className: "travel-map-marker-wrap", html: `<span class="travel-map-marker${here ? " is-here" : ""}${visited ? " is-visited" : ""}">${symbol}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] });
      L.marker([place.latitude, place.longitude], { icon, title: label, alt: label, keyboard: true })
        .on("click", () => onSelect(place.id)).addTo(group);
    }
  }, [places, events, travel.events, game.travel.currentPlaceId, game.completedEpisodeIds, game.playedDateIds, game.battleRecords, onSelect]);

  return <>
    <div ref={container} className="travel-map-frame" aria-label={`${city.nameJa}の地図。ドラッグで移動、ピンチまたはプラス・マイナスで拡大縮小できます。`} data-testid={expanded ? "travel-map-expanded-canvas" : "travel-map-canvas"} />
    {tilesFailed && <p role="status">地図の一部を読み込めません。通信を確認してください。行き先一覧は引き続き利用できます。</p>}
  </>;
}

/** Itinerary selection remains available even if map tiles fail to load. */
export function PlaceMap({ game, events }: Props) {
  const { city, travel } = getCityContent(game.currentCityId);
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const expandedMapRef = useRef<L.Map | null>(null);
  const initialView = useRef<MapView | null>(null);
  const places = useMemo(() => travel.places.filter((place) =>
    place.id === game.travel.hotelPlaceId || place.id === game.travel.currentPlaceId || events.some((event) => event.placeId === place.id)),
  [travel.places, game.travel.hotelPlaceId, game.travel.currentPlaceId, events]);
  const selectedPlace = places.find((place) => place.id === selected);

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
  function choosePlace(id: string, map: L.Map | null) {
    setSelected(id || null);
    const place = places.find((item) => item.id === id);
    if (place) map?.panTo([place.latitude, place.longitude]);
  }

  return <details className="travel-map" data-testid="travel-map" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>{city.nameJa}の地図</summary>
    {open && <>
      <div className="travel-map-preview">
        <MapCanvas game={game} events={events} places={places} onSelect={setSelected} mapRef={mapRef} />
        <button type="button" className="travel-map-expand" onClick={openExpanded}>地図を大きく見る</button>
      </div>
      {selectedPlace && <p aria-live="polite"><strong>{selectedPlace.nameJa}</strong>{selected === game.travel.currentPlaceId ? "（現在地）" : ""}</p>}
      <details className="travel-map-places">
        <summary>地点を選ぶ</summary>
        <label>地点 <select value={selected ?? ""} onChange={(event) => choosePlace(event.currentTarget.value, mapRef.current)}>
          <option value="">地点を選択</option>{places.map((place) => <option key={place.id} value={place.id}>{place.nameJa}</option>)}
        </select></label>
        <p>緑の輪：現在地　◆：観光　♥：デート　白い点：訪問済み</p>
      </details>
      {expanded && <Modal labelledBy="travel-map-expanded-title" className="travel-map-modal" onClose={closeExpanded}>
        <div className="travel-map-modal-heading"><h2 id="travel-map-expanded-title">{city.nameJa}の地図</h2><button type="button" className="secondary" onClick={closeExpanded}>閉じる</button></div>
        <MapCanvas game={game} events={events} places={places} onSelect={setSelected} mapRef={expandedMapRef} initialView={initialView.current} expanded />
        <label className="travel-map-modal-place">地点 <select value={selected ?? ""} onChange={(event) => choosePlace(event.currentTarget.value, expandedMapRef.current)}>
          <option value="">地点を選択</option>{places.map((place) => <option key={place.id} value={place.id}>{place.nameJa}</option>)}
        </select></label>
        <p className="travel-map-modal-legend">緑の輪：現在地　◆：観光　♥：デート　白い点：訪問済み</p>
      </Modal>}
    </>}
  </details>;
}
