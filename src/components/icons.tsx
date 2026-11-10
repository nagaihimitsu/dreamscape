// The game's own line icons (UI redesign §2.5), drawn for this project on a
// 24×24 grid: no icon font, no CDN, no copied icon set. Every icon is decorative
// and stands next to a visible Japanese word, which carries the meaning; only
// the universal × may stand alone, with its own aria-label on the button.

const n = (value: number) => Number(value.toFixed(2));
/** A circle as path data, so every icon is a single path. */
const circle = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${cy}a${r} ${r} 0 1 0 ${n(2 * r)} 0a${r} ${r} 0 1 0 ${n(-2 * r)} 0`;

const bookmark = "M6.5 3.5h11v17L12 16.8l-5.5 3.7z";
const eye = "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z";

const paths = {
  pin: `M12 21s-6.5-5.8-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15.2 12 21 12 21z${circle(12, 9.8, 2.3)}`,
  book: "M12 6.5C9.2 4.6 6.2 4.4 3 5.5v13c3.2-1.1 6.2-.9 9 1 2.8-1.9 5.8-2.1 9-1v-13c-3.2-1.1-6.2-.9-9 1zM12 6.5v13",
  sun: `${circle(12, 12, 4)}M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8`,
  moon: "M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.3 6.3 0 0 0 10.1 10.1z",
  gear: "M19.05 10.11L21.41 10.68L21.41 13.32L19.05 13.89L18.32 15.65L19.59 17.72L17.72 19.59L15.65 18.32L13.89 19.05L13.32 21.41L10.68 21.41L10.11 19.05L8.35 18.32L6.28 19.59L4.41 17.72L5.68 15.65L4.95 13.89L2.59 13.32L2.59 10.68L4.95 10.11L5.68 8.35L4.41 6.28L6.28 4.41L8.35 5.68L10.11 4.95L10.68 2.59L13.32 2.59L13.89 4.95L15.65 5.68L17.72 4.41L19.59 6.28L18.32 8.35Z" +
    circle(12, 12, 3),
  camera: `M4 7.5h3.2L8.8 5h6.4l1.6 2.5H20a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z${circle(12, 13, 3.5)}`,
  save: `${bookmark}M12 7v5.5M9.25 9.75h5.5`,
  load: `${bookmark}M12 6.8v5.7M9.6 10.2l2.4 2.4 2.4-2.4`,
  sliders: `M4 6h3M11 6h9M4 12h9M17 12h3M4 18h1M9 18h11${circle(9, 6, 2)}${circle(15, 12, 2)}${circle(7, 18, 2)}`,
  swords: "M3.5 3.5L15 15M13 17l4-4M15 15l4 4M20.5 3.5L9 15M11 17l-4-4M9 15l-4 4",
  bag: "M5 8.5h14l-1 11.5H6zM9 8.5V7a3 3 0 0 1 6 0v1.5",
  stamp: "M9.5 3.5h5v4.8l3.5 2.7H6l3.5-2.7zM4.5 11h15v3.5h-15zM6 18.5h12",
  hourglass: "M6.5 3.5h11M6.5 20.5h11M8 3.5c0 4.4 8 4.6 8 8.5s-8 4.1-8 8.5M16 3.5c0 4.4-8 4.6-8 8.5s8 4.1 8 8.5",
  bed: `M3 5.5v13M3 14.5h18v4M21 14.5v-1a3 3 0 0 0-3-3h-7.5v4${circle(6.8, 11.6, 1.7)}`,
  coin: `${circle(12, 12, 8.5)}${circle(12, 12, 5)}`,
  star: "M12 3.6L14.29 9.44L20.56 9.82L15.71 13.81L17.29 19.88L12 16.5L6.71 19.88L8.29 13.81L3.44 9.82L9.71 9.44Z",
  map: "M3 6.3l6-2.3 6 2.3 6-2.3v13.7L15 20l-6-2.3L3 20zM9 4v13.7M15 6.3V20",
  log: "M5 6h14M5 10h14M5 14h14M5 18h9",
  fast: "M3.5 6.5l7 5.5-7 5.5zM12.5 6.5l7 5.5-7 5.5z",
  eye: `${eye}${circle(12, 12, 3)}`,
  "eye-off": `${eye}${circle(12, 12, 3)}M4 4l16 16`,
  close: "M6 6l12 12M18 6L6 18",
  credit: `M6 3.5h12A2.5 2.5 0 0 1 20.5 6v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V6A2.5 2.5 0 0 1 6 3.5z${circle(12, 12, 5.5)}M14.1 10.1a2.7 2.7 0 1 0 0 3.8`,
  "chevron-right": "M9 5l7 7-7 7",
  "chevron-down": "M5 9l7 7 7-7",
  external: "M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  compass: `${circle(12, 12, 9)}M15.5 8.5l-2 5-5 2 2-5z`,
  plane: "M21 3L3 10.5l7 2.5 2.5 7.5zM10 13L21 3",
  info: `${circle(12, 12, 9)}M12 11v5.5M12 7.7v.1`,
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z",
  ticket: "M3.5 7.5h17v3a1.5 1.5 0 0 0 0 3v3h-17v-3a1.5 1.5 0 0 0 0-3zM14.5 7.5v9",
} as const;

export type IconName = keyof typeof paths;

export const iconNames = Object.keys(paths) as IconName[];

/** A decorative line icon in the current text colour; pair it with a visible word. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
