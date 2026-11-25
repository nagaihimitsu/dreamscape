import type { CSSProperties } from "react";
import type { CharacterAsset, FaceFrame } from "../content/character-assets";

/**
 * The scene's camera (2026-11-25 user decision, after comparing the talk with a romance game on an iPhone): in a talk the
 * people on stage are seen from about the thighs up, not whole. A figure's box grows by the scene's `--vn-zoom`
 * (romance-scene.css, encounter.css: larger alone, less in a group, 1 for the scene's first line, which shows them whole)
 * and comes down so that the eyes stay where they were, clear of the header and the window; the feet go below the window.
 * The box grows in the layout, never by a transform, so a moving picture (LivePortrait, its canvas sized from the box) and a
 * still one are drawn sharp at the size they are seen.
 */

/** Where a figure's eyes lie down its picture (0 its top, 1 its bottom) when its pose has no face frame: the 2:3 canvases' eighth. */
export const DEFAULT_FACE_AT = 0.12;

/**
 * How far down its picture a figure's eyes lie: its pose's face frame (from its moving picture's eyes), or the default; the
 * picture shrunk about its bottom by the character's figureScale (character-portrait.css) has them lower.
 */
export function faceAt(frame: { face: FaceFrame; canvas: { height: number } } | null, figureScale = 1): number {
  const at = frame ? frame.face.y / frame.canvas.height : DEFAULT_FACE_AT;
  return round(1 - (1 - at) * figureScale);
}

type Placement = CharacterAsset["placement"];

/**
 * A figure's box (its placement, percentages of the layer it stands in) under the scene's camera: its width and height
 * times `--vn-zoom`, its bottom lowered by what keeps its eyes (`face`, faceAt) at the same height, its placement's own
 * scale about its origin counted. At no zoom (`--vn-zoom` unset or 1) it is the placement as it is.
 */
export function zoomedPlacement(placement: Placement, face: number): Pick<CSSProperties, "left" | "bottom" | "width" | "height"> {
  const origin = placement.originY / 100;
  // The eyes' height above the box's bottom, in the layer's percentages, after the placement's scale.
  const eyes = placement.height * (1 - origin - (face - origin) * placement.scale);
  return {
    left: `${placement.x}%`,
    bottom: `calc(${placement.bottom}% - (var(--vn-zoom, 1) - 1) * ${round(eyes)}%)`,
    width: `calc(${placement.width}% * var(--vn-zoom, 1))`,
    height: `calc(${placement.height}% * var(--vn-zoom, 1))`,
  };
}

const round = (value: number) => Math.round(value * 1000) / 1000;
