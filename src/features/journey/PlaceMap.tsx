import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { milanoTravelCatalog } from "../../content";
import type { TravelEvent } from "../../content/travel-schemas";
import type { GameState } from "../../domain/game";

type Props = { game: GameState; events: TravelEvent[] };

/** A map is only loaded when opened; itinerary selection never depends on tiles. */
export function PlaceMap({ game, events }: Props) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const places = useMemo(() => milanoTravelCatalog.places.filter((place) =>
    place.id === game.travel.hotelPlaceId || place.id === game.travel.currentPlaceId || events.some((event) => event.placeId === place.id)),
  [game.travel.hotelPlaceId, game.travel.currentPlaceId, events]);
  const selectedPlace = places.find((place) => place.id === selected);

  useEffect(() => {
    if (!open || !container.current) return;
    setTilesFailed(false);
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
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).on("tileerror", () => { if (++errors >= 2) setTilesFailed(true); });
    tiles.addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    map.fitBounds(L.latLngBounds(places.map((place) => [place.latitude, place.longitude])), { padding: [24, 24], maxZoom: 15 });
    return () => { map.remove(); mapRef.current = null; markersRef.current = null; };
  // Opening creates one map. Place changes update the markers below without resetting zoom or pan.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const group = markersRef.current;
    if (!open || !group) return;
    group.clearLayers();
    for (const place of places) {
      const here = place.id === game.travel.currentPlaceId;
      const categories = new Set(events.filter((event) => event.placeId === place.id).map((event) => event.category));
      const visited = events.some((event) => event.placeId === place.id && (game.completedEpisodeIds.includes(event.id) || game.playedDateIds.includes(event.id) || game.battleRecords.some((record) => record.battleId === event.id && record.attempts > 0)));
      const label = `${place.nameJa}${here ? "、現在地" : ""}${categories.has("main") ? "、観光" : ""}${categories.has("date") ? "、デート" : ""}${visited ? "、訪問済み" : "、未訪問"}`;
      const symbol = `${categories.has("main") ? "◆" : ""}${categories.has("date") ? "♥" : ""}` || "●";
      const icon = L.divIcon({ className: "travel-map-marker-wrap", html: `<span class="travel-map-marker${here ? " is-here" : ""}${visited ? " is-visited" : ""}">${symbol}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] });
      L.marker([place.latitude, place.longitude], { icon, title: label, alt: label, keyboard: true })
        .on("click", () => setSelected(place.id)).addTo(group);
    }
  }, [open, places, events, game.travel.currentPlaceId, game.completedEpisodeIds, game.playedDateIds, game.battleRecords]);

  return <details className="travel-map" data-testid="travel-map" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>ミラノの地図</summary>
    {open && <>
      <div ref={container} className="travel-map-frame" aria-label="ミラノの地図。ドラッグで移動、ピンチまたはプラス・マイナスで拡大縮小できます。" data-testid="travel-map-canvas" />
      {tilesFailed && <p role="status">地図の一部を読み込めません。通信を確認してください。行き先一覧は引き続き利用できます。</p>}
      {selectedPlace && <p aria-live="polite"><strong>{selectedPlace.nameJa}</strong>{selected === game.travel.currentPlaceId ? "（現在地）" : ""}</p>}
      <details className="travel-map-places">
        <summary>地点を選ぶ</summary>
        <label>地点 <select value={selected ?? ""} onChange={(event) => {
          const id = event.currentTarget.value;
          setSelected(id || null);
          const place = places.find((item) => item.id === id);
          if (place) mapRef.current?.panTo([place.latitude, place.longitude]);
        }}><option value="">地点を選択</option>{places.map((place) => <option key={place.id} value={place.id}>{place.nameJa}</option>)}</select></label>
        <p>緑の輪：現在地　◆：観光　♥：デート　白い点：訪問済み</p>
      </details>
    </>}
  </details>;
}
