import { useId, useMemo } from "react";
import { seededRandom } from "../host/seed";
import { shapePath, type ShapeDragFieldProps, type ShapeDragSkin } from "../engines/shape_drag/EnginePlay";
import { ROTI_SHAPES, ROTI_TUNING, rotiNote, rotiRules, type RotiOutcome, type RotiParams } from "./rules";
import "./skin.css";

// The roti's field (a shape_drag skin): the work table seen from above, a round wooden board, the dough on it and the pin.
// With the use's art (`art.kitchen`, `art.board`, `art.pin`, `art.dough`) those pictures take the place of the drawn ones.
// The board's square is 1 across (offsets -0.5 to 0.5 from its centre); the round board fills it.

type FieldProps = ShapeDragFieldProps<RotiParams, RotiOutcome>;

/** The pin: as long as its strip is wide (what one stroke rolls), and its handles. */
const PIN_LENGTH = ROTI_TUNING.band * 2;
const PIN_THICKNESS = 0.06;
/** Where the pin rests between strokes: the board's corner, smaller, under the dough. */
const PIN_REST = { x: 0.3, y: 0.39, degrees: -32, scale: 0.55 };
/** How thin the dough looks: from the start to a tear (the area's ratio). */
const TEAR_AREA = ROTI_SHAPES.classes.find((item) => item.outcome === "torn" && item.atLeast?.area !== undefined)?.atLeast?.area ?? 10;

/**
 * The tear: a ragged hole halfway from the dough's middle toward its upper left edge (clear of the host's outcome label in
 * the middle), as large as the dough there allows.
 */
function holePath(points: readonly { x: number; y: number }[]): string {
  const way = { x: -0.55, y: -0.83 };
  const edge = points.reduce((best, point) => (point.x * way.x + point.y * way.y > best.x * way.x + best.y * way.y ? point : best), { x: 0, y: 0 });
  const centre = { x: edge.x * 0.5, y: edge.y * 0.5 };
  const size = Math.min(0.1, Math.hypot(edge.x, edge.y) * 0.32);
  // A fixed ragged outline (the same every time), scaled to the hole's size.
  const outline = [[-1, -0.1], [-0.7, -0.75], [0.1, -0.85], [0.8, -0.55], [1, 0.15], [0.55, 0.8], [-0.15, 0.7], [-0.75, 0.55]];
  return shapePath(outline.map(([x, y]) => ({ x: centre.x + x * size, y: centre.y + y * size * 0.8 })));
}

function RotiBackdrop({ art }: FieldProps) {
  return (
    <div className="mg-roti-rolling-table" data-art-kitchen={art.kitchen ? true : undefined}>
      {art.kitchen && <img className="mg-roti-rolling-kitchen" src={art.kitchen} alt="" draggable={false} />}
    </div>
  );
}

/** The pin, drawn or the use's picture, lying along x (its middle at 0, 0). */
function Pin({ art }: { art: Readonly<Record<string, string>> }) {
  if (art.pin) return <image href={art.pin} x={-PIN_LENGTH / 2 - 0.06} y={-PIN_THICKNESS} width={PIN_LENGTH + 0.12} height={PIN_THICKNESS * 2} preserveAspectRatio="xMidYMid meet" />;
  return (
    <g className="mg-roti-rolling-pin-drawn">
      <rect x={-PIN_LENGTH / 2 - 0.06} y={-PIN_THICKNESS / 3} width={PIN_LENGTH + 0.12} height={(PIN_THICKNESS * 2) / 3} rx={PIN_THICKNESS / 3} className="mg-roti-rolling-pin-handle" />
      <rect x={-PIN_LENGTH / 2} y={-PIN_THICKNESS / 2} width={PIN_LENGTH} height={PIN_THICKNESS} rx={PIN_THICKNESS / 2} className="mg-roti-rolling-pin-body" />
    </g>
  );
}

function RotiBoard({ art, seed, view }: FieldProps) {
  const ids = useId().replace(/:/gu, "");
  // Flour on the board: where the specks lie is looks only (from the seed), never the rules.
  const flour = useMemo(() => {
    const random = seededRandom(seed);
    return Array.from({ length: 26 }, () => {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * 0.44;
      return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, r: 0.004 + random() * 0.008 };
    });
  }, [seed]);
  const path = shapePath(view.points);
  // Thinner dough is paler and lets the board show a little (the status also says so: not by colour alone).
  const thin = Math.min(1, Math.max(0, (view.measures.area - 1) / (TEAR_AREA - 1)));
  const torn = view.outcome === "torn";
  return (
    <svg className="mg-roti-rolling" viewBox="-0.5 -0.5 1 1" data-art-board={art.board ? true : undefined} data-torn={torn || undefined}>
      <defs>
        <radialGradient id={`${ids}-wood`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#c8955f" />
          <stop offset="0.75" stopColor="#a8723f" />
          <stop offset="1" stopColor="#8a5a31" />
        </radialGradient>
        <radialGradient id={`${ids}-dough`} cx="0.4" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#f6e9cb" />
          <stop offset="0.7" stopColor="#ecd6a8" />
          <stop offset="1" stopColor="#dcbd86" />
        </radialGradient>
        {art.dough && (
          <pattern id={`${ids}-texture`} patternUnits="userSpaceOnUse" x="-0.5" y="-0.5" width="0.5" height="0.5">
            <image href={art.dough} x="0" y="0" width="0.5" height="0.5" preserveAspectRatio="xMidYMid slice" />
          </pattern>
        )}
      </defs>
      {art.board
        ? <image href={art.board} x="-0.5" y="-0.5" width="1" height="1" preserveAspectRatio="xMidYMid meet" />
        : (
          <g className="mg-roti-rolling-board">
            <circle r="0.49" fill={`url(#${ids}-wood)`} className="mg-roti-rolling-board-face" />
            <circle r="0.455" className="mg-roti-rolling-board-ring" />
          </g>
        )}
      {flour.map((speck, index) => <circle key={index} cx={speck.x} cy={speck.y} r={speck.r} className="mg-roti-rolling-flour" />)}
      <g transform={`translate(${PIN_REST.x} ${PIN_REST.y}) rotate(${PIN_REST.degrees}) scale(${PIN_REST.scale})`} opacity={view.pin ? 0 : 1}>
        <Pin art={art} />
      </g>
      <path d={path} className="mg-roti-rolling-dough-shadow" transform="translate(0.006 0.01)" />
      <path d={path} fill={art.dough ? `url(#${ids}-texture)` : `url(#${ids}-dough)`} fillOpacity={1 - thin * 0.22} className="mg-roti-rolling-dough" data-testid="roti-dough" />
      {torn && <path d={holePath(view.points)} className="mg-roti-rolling-hole" />}
      {view.pin && (
        <g transform={`translate(${view.pin.x} ${view.pin.y}) rotate(${view.pin.degrees + 90})`} className="mg-roti-rolling-pin">
          <Pin art={art} />
        </g>
      )}
    </svg>
  );
}

/** The roti as a shape_drag skin: its tuning, shapes, rules, words and drawings. */
export const rotiSkin: ShapeDragSkin<RotiParams, RotiOutcome> = {
  tuning: ROTI_TUNING,
  classifier: ROTI_SHAPES,
  rules: rotiRules,
  hintJa: "なぞって伸ばす。伸ばすたびに生地が回る",
  doneJa: "できた",
  doneHintJa: "ローティーを伸ばし終えるときに押します。",
  autoJa: "おまかせで伸ばしています",
  noteJa: rotiNote,
  strokeSound: "cloth_grab",
  Backdrop: RotiBackdrop,
  Board: RotiBoard,
};
