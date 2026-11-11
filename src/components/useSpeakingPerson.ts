import { useState } from "react";

/**
 * Who stands opposite the heroine for a person who speaks in their own name (speakingPerson, a
 * portrait's ID): from their line, and on (listening) at the lines that follow, until another such
 * person speaks or `leave` (the scene's own opposite comes back: `# speaker: enemy` or its
 * `# reaction: enemy`; a battle's quiz). The screen is remounted for each scene, which clears it;
 * after a reload in the middle of a scene they come back at their next line.
 */
export function useSpeakingPerson(speaking: string | undefined, leave: boolean): string | undefined {
  const [stays, setStays] = useState<string>();
  const now = speaking ?? (leave ? undefined : stays);
  if (now !== stays) setStays(now);
  return now;
}
