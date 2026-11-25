import type { CSSProperties } from "react";
import type { CharacterAsset } from "../content/character-assets";

/**
 * The scene's camera (2026-11-25 user decision, after comparing the talk with a romance game on an iPhone): in a talk the
 * people on stage are seen from about the thighs up, not whole. A figure's box grows by the scene's `--vn-zoom`
 * (romance-scene.css, encounter.css: larger alone, less in a group, 1 for the scene's first line, which shows them whole)
 * and comes down so that the top of its picture stays where it was: the head never rises past where it stood whole, so
 * it is never cut under the header (2026-11-25: held by the eyes, a cap rose into the header's edge on an iPhone); the
 * face comes a little down and the feet go below the window. The box grows in the layout, never by a transform, so a
 * moving picture (LivePortrait, its canvas sized from the box) and a still one are drawn sharp at the size they are seen.
 */

/**
 * How far down its box a figure's picture begins (0 its top): a character's figureScale shrinks the picture about its
 * bottom (character-portrait.css), so a smaller one begins lower.
 */
export function pictureTopAt(figureScale = 1): number {
  return round(1 - figureScale);
}

type Placement = CharacterAsset["placement"];

/**
 * A figure's box (its placement, percentages of the layer it stands in) under the scene's camera: its width and height
 * times `--vn-zoom`, its bottom lowered by what keeps the top of its picture (`top`, pictureTopAt) at the same height, its
 * placement's own scale about its origin counted. At no zoom (`--vn-zoom` unset or 1) it is the placement as it is.
 */
export function zoomedPlacement(placement: Placement, top: number): Pick<CSSProperties, "left" | "bottom" | "width" | "height"> {
  const origin = placement.originY / 100;
  // The picture's top above the box's bottom, in the layer's percentages, after the placement's scale.
  const kept = placement.height * (1 - origin - (top - origin) * placement.scale);
  return {
    left: `${placement.x}%`,
    bottom: `calc(${placement.bottom}% - (var(--vn-zoom, 1) - 1) * ${round(kept)}%)`,
    width: `calc(${placement.width}% * var(--vn-zoom, 1))`,
    height: `calc(${placement.height}% * var(--vn-zoom, 1))`,
  };
}

const round = (value: number) => Math.round(value * 1000) / 1000;
