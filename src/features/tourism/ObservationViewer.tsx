import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  constrainView,
  fittedSize,
  focusRegion,
  INITIAL_VIEW,
  MAX_SCALE,
  MIN_SCALE,
  regionCenter,
  transformGesture,
  type ImageRegion,
  type Point,
  type Size,
  type ViewTransform,
} from "./viewport";
import "./observation.css";

interface ObservationPoint {
  id: string;
  titleJa: string;
  region: ImageRegion;
}

interface Props {
  asset: Size & { path: string; altJa: string };
  points: ObservationPoint[];
  discoveredIds: string[];
  selectedId: string | null;
  focusRequest?: number;
  inert?: boolean;
  onSelect: (id: string) => void;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
// Keep the surrounding artwork visible when a clue is selected. Players can
// still zoom closer themselves without the viewer changing their gesture.
const CLUE_FOCUS_SCALE = 1.2;

export function ObservationViewer({
  asset,
  points,
  discoveredIds,
  selectedId,
  focusRequest = 0,
  inert = false,
  onSelect,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const viewportSize = useRef(viewport);
  const [view, setView] = useState<ViewTransform>(INITIAL_VIEW);
  const [markersVisible, setMarkersVisible] = useState(true);
  const currentView = useRef(view);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef({
    start: { x: 0, y: 0 },
    moved: false,
    pinched: false,
    clueId: null as string | null,
  });
  const pointsRef = useRef(points);
  pointsRef.current = points;

  function updateView(next: ViewTransform) {
    currentView.current = next;
    setView(next);
  }

  useEffect(() => {
    const element = viewportRef.current!;
    const measure = () => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      viewportSize.current = next;
      setViewport(next);
      updateView(constrainView(currentView.current, asset, next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [asset.width, asset.height]);

  useEffect(() => {
    const point = pointsRef.current.find((item) => item.id === selectedId);
    if (point)
      updateView(focusRegion(point.region, asset, viewportSize.current, CLUE_FOCUS_SCALE));
  }, [selectedId, focusRequest, asset.path, viewport.width, viewport.height]);

  function localPoint(event: PointerEvent<HTMLDivElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = localPoint(event);
    if (!pointers.current.size) {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-clue-id]")
          : null;
      gesture.current = {
        start: point,
        moved: false,
        pinched: false,
        clueId: target?.dataset.clueId ?? null,
      };
    } else {
      gesture.current.pinched = true;
    }
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const previousPoint = pointers.current.get(event.pointerId);
    if (!previousPoint) return;
    const point = localPoint(event);
    const before = [...pointers.current.values()].slice(0, 2);
    pointers.current.set(event.pointerId, point);
    const after = [...pointers.current.values()].slice(0, 2);
    if (before.length === 2) {
      gesture.current.pinched = true;
      updateView(
        transformGesture(
          currentView.current,
          asset,
          viewportSize.current,
          midpoint(before[0], before[1]),
          midpoint(after[0], after[1]),
          distance(after[0], after[1]) /
            Math.max(1, distance(before[0], before[1])),
        ),
      );
    } else {
      if (distance(point, gesture.current.start) > 6)
        gesture.current.moved = true;
      updateView(
        transformGesture(
          currentView.current,
          asset,
          viewportSize.current,
          previousPoint,
          point,
          1,
        ),
      );
    }
  }

  function selectPoint(id: string) {
    const point = pointsRef.current.find((item) => item.id === id);
    if (!point) return;
    updateView(focusRegion(point.region, asset, viewportSize.current, CLUE_FOCUS_SCALE));
    onSelect(id);
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    const session = gesture.current;
    if (distance(localPoint(event), session.start) > 6) session.moved = true;
    if (
      !pointers.current.size &&
      !session.moved &&
      !session.pinched &&
      session.clueId
    ) {
      selectPoint(session.clueId);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function cancelPointer(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    gesture.current.moved = true;
  }

  function zoom(ratio: number) {
    const size = viewportSize.current;
    const center = { x: size.width / 2, y: size.height / 2 };
    updateView(
      transformGesture(currentView.current, asset, size, center, center, ratio),
    );
  }

  const fitted = fittedSize(asset, viewport);
  return (
    <div className="observation-viewer" inert={inert}>
      <div
        ref={viewportRef}
        className="observation-viewport"
        data-testid="observation-viewport"
        data-scale={view.scale}
        data-x={view.x}
        data-y={view.y}
        tabIndex={0}
        role="region"
        aria-label="観光画像の観察"
        aria-describedby="observation-help"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={cancelPointer}
        onLostPointerCapture={cancelPointer}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const steps: Record<string, Point> = {
            ArrowLeft: { x: 60, y: 0 },
            ArrowRight: { x: -60, y: 0 },
            ArrowUp: { x: 0, y: 60 },
            ArrowDown: { x: 0, y: -60 },
          };
          const step = steps[event.key];
          if (step) {
            event.preventDefault();
            updateView(
              constrainView(
                {
                  ...currentView.current,
                  x: currentView.current.x + step.x,
                  y: currentView.current.y + step.y,
                },
                asset,
                viewportSize.current,
              ),
            );
          } else if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            zoom(1.4);
          } else if (event.key === "-") {
            event.preventDefault();
            zoom(1 / 1.4);
          } else if (event.key === "0") {
            event.preventDefault();
            updateView(INITIAL_VIEW);
          }
        }}
      >
        <img
          className="observation-image"
          src={`${import.meta.env.BASE_URL}${asset.path}`}
          alt={asset.altJa}
          draggable={false}
          style={{
            width: fitted.width * view.scale,
            height: fitted.height * view.scale,
            left: `calc(50% + ${view.x}px)`,
            top: `calc(50% + ${view.y}px)`,
          }}
        />
        {markersVisible &&
          points.map((point, index) => {
            const position = regionCenter(point.region, view, asset, viewport);
            const found = discoveredIds.includes(point.id);
            return (
              <button
                key={point.id}
                type="button"
                className={`observation-hotspot ${found ? "is-found" : ""} ${selectedId === point.id ? "is-selected" : ""}`}
                style={{ left: position.x, top: position.y }}
                data-testid={`hotspot-${point.id}`}
                data-clue-id={point.id}
                aria-label={`${point.titleJa}${found ? "（発見済み）" : "を調べる"}`}
                aria-pressed={selectedId === point.id}
                onClick={(event) => {
                  // Pointer taps are handled on release so a drag/pinch can never discover a clue.
                  if (event.detail === 0) selectPoint(point.id);
                }}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible")) {
                    updateView(
                      focusRegion(point.region, asset, viewportSize.current, CLUE_FOCUS_SCALE),
                    );
                  }
                }}
              >
                <span aria-hidden="true">{found ? "✓" : index + 1}</span>
              </button>
            );
          })}
      </div>
      <div className="observation-controls" aria-label="画像の拡大と縮小">
        <button
          type="button"
          data-testid="zoom-out"
          aria-label="画像を縮小"
          disabled={view.scale <= MIN_SCALE}
          onClick={() => zoom(1 / 1.4)}
        >
          −
        </button>
        <output aria-label="画像の倍率">{view.scale.toFixed(1)}倍</output>
        <button
          type="button"
          data-testid="zoom-in"
          aria-label="画像を拡大"
          disabled={view.scale >= MAX_SCALE}
          onClick={() => zoom(1.4)}
        >
          ＋
        </button>
        <button
          type="button"
          data-testid="zoom-reset"
          className="observation-reset"
          onClick={() => updateView(INITIAL_VIEW)}
        >
          全体を見る
        </button>
      </div>
      <div className="observation-options">
        <button
          type="button"
          data-testid="toggle-markers"
          className="observation-marker-toggle"
          aria-pressed={!markersVisible}
          onClick={() => setMarkersVisible((visible) => !visible)}
        >
          {markersVisible ? "印を隠す" : "印を表示"}
        </button>
      </div>
      <p id="observation-help" className="observation-help">
        番号をタップ。2本指で拡大、ドラッグで移動。キーボードでは矢印キーで移動できます。
      </p>
    </div>
  );
}
