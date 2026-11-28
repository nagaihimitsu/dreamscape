/**
 * The six greys of the rules (styles.css --ds-gray-1..6; 2026-11-28 user decision: white and grey only), for what the code
 * draws or computes where a stylesheet's name cannot reach (an SVG's fill, a map's line, a name band's contrast). The
 * design-token test holds them to the stylesheet. White is "#ffffff".
 */
export const GRAY = {
  1: "#1e1f23",
  2: "#3b3d43",
  3: "#5d616b",
  4: "#a8abb2",
  5: "#dcdee2",
  6: "#eeeff1",
} as const;
