import { useState } from "react";

/**
 * Whether a scene's person is on stage: from their first line or reaction to the end of the
 * scene (the screen is remounted for each scene, which clears it). After a reload in the middle
 * of a scene they come back at their next line.
 */
export function useStaysOnStage(shownNow: boolean): boolean {
  const [stays, setStays] = useState(false);
  if (shownNow && !stays) setStays(true);
  return stays || shownNow;
}
