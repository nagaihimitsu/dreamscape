import { useState } from "react";

/**
 * A scene's first line is its establishing shot (2026-11-25 user decision): the people on stage are seen whole (their
 * clothes, where they stand), and the camera comes in (`--vn-zoom`, figure-zoom.ts) as the talk goes on past it. `scene`:
 * the scene on screen; `line`: what changes with each line it reads (the screen's revision). True while the line on
 * screen is the first one this scene showed: a new scene, and a screen made anew (a load), begin with it again.
 * Presentation only: nothing is saved.
 */
export function useEstablishingShot(scene: string, line: unknown): boolean {
  const [first, setFirst] = useState({ scene, line });
  if (first.scene !== scene) setFirst({ scene, line });
  return first.scene !== scene || first.line === line;
}
