import { characterNameBand, resolveCharacterCostume, type CostumeContext, type NameBandColours } from "../content/character-assets";
import { characterCatalog as catalog } from "./character-catalog";
import { OPPOSITE_PLACES, type OppositePlace, type Stage, type StageFocus } from "./scene-stage";
import { useWornCostume } from "./worn-costume";

/**
 * The speaker's name band over the talk's window (2026-11-25 user decision, after an iPhone screenshot where the one
 * speaking stood on the right and the name on the left): it stands over the speaker on the stage, in the colours of
 * their clothes (characters.json `nameBand`), so whose words they are is seen at once. `x`: where across the stage the
 * speaker stands (0 its left, 1 its right; dialogue-controls.css keeps the band inside the window), none when no one on
 * stage speaks (the band at the window's left); the colours, when the speaker has them.
 */
export type NameBand = { x?: number; fill?: string; edge?: string; ink?: string };

type StagePlace = "heroine" | OppositePlace;

/**
 * Where the one speaking the line stands (the figure, and across the stage: 0 its left, 1 its right), or none when no
 * one on stage says it (the narration, the player, someone off stage, a phone, a letter, a remembered line). The places
 * follow the stage's layouts (romance-scene.css, encounter.css, battle.css): the figures standing share the width
 * equally, her first; one alone stands in the middle. The battle's stage keeps her place whether or not she stands.
 */
export function speakerSpot(stage: Stage, focus: StageFocus, layout: "scene" | "battle" = "scene"): { figure: string; x: number } | undefined {
  const places: StagePlace[] = [
    ...(stage.heroine || layout === "battle" ? ["heroine" as const] : []),
    ...OPPOSITE_PLACES.filter((place) => stage[place]),
  ];
  const speaking = places.find((place) => focus[place] === "speaking");
  if (!speaking) return undefined;
  const figure = speaking === "heroine" ? "heroine" : stage[speaking]!.figure;
  const shares = places.length === 1 && layout === "scene" ? 1 : Math.max(places.length, 2);
  return { figure, x: (places.indexOf(speaking) + 0.5) / shares };
}

const INK_LIGHT = "#ffffff";
/** The window's ink (romance-scene.css --vn-text). */
const INK_DARK = "#1d2740";

const rgb = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
const linear = (value: number) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG's contrast ratio of two colours. */
export const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};
const mix = (hex: string, toward: string, amount: number) => {
  const from = rgb(hex);
  const to = rgb(toward);
  return `#${from.map((value, index) => Math.round(value + (to[index] - value) * amount).toString(16).padStart(2, "0")).join("")}`;
};

/**
 * A band's colours as shown: the name's ink is white or the window's navy, whichever reads better on the fill, and the
 * fill is darkened (under white) or lightened (under navy) only as far as the name needs to keep 4.5:1. The edge as written.
 */
export function bandColours({ fill, edge }: NameBandColours): Required<Omit<NameBand, "x">> {
  const ink = contrast(fill, INK_LIGHT) >= contrast(fill, INK_DARK) ? INK_LIGHT : INK_DARK;
  let shown = fill.toLowerCase();
  for (let step = 1; contrast(shown, ink) < 4.5 && step <= 20; step++) {
    shown = mix(fill, ink === INK_LIGHT ? "#000000" : "#ffffff", step * 0.05);
  }
  return { fill: shown, edge: edge.toLowerCase(), ink };
}

/**
 * The name band of the line on screen: over the speaker's place on the stage (speakerSpot; else at the window's left),
 * in the colours of the figure speaking in the outfit the scene shows (the heroine's as her portrait: `context`, the
 * player's chosen outfit), or of the heroine when she speaks off the stage. Without colours, the window's blue.
 */
export function useNameBand(spot: { figure: string; x: number } | undefined, heroineSpeaks: boolean, context: CostumeContext): NameBand {
  const worn = useWornCostume();
  const figure = spot?.figure ?? (heroineSpeaks ? "heroine" : undefined);
  const character = figure ? catalog.characters.find((item) => item.id === figure) : undefined;
  const colours = character && characterNameBand(character, resolveCharacterCostume(character, catalog.wardrobe, { ...context, worn }));
  return { ...(spot ? { x: spot.x } : {}), ...(colours ? bandColours(colours) : {}) };
}
