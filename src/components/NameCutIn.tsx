import { useEffect, useState } from "react";
import type { NameCutIn } from "./speaker-plate";
import "./name-cutin.css";

/** How long a name plate stays when nothing ends it sooner. */
export const NAME_CUT_IN_MS = 2400;

/**
 * The name plate of the line on screen (`cutIn`, from nameCutIn), while it lasts: from the line's first showing (or once
 * `held`, an episode's title card over it, has gone) for NAME_CUT_IN_MS. It takes no input: a tap or a key does what it
 * always does and ends it, as do the next line (another `lineKey`) and the page going to the background.
 */
export function useNameCutIn(cutIn: NameCutIn | undefined, lineKey: string, held = false): NameCutIn | undefined {
  const [over, setOver] = useState<string>();
  const showing = !!cutIn && !held && over !== lineKey;
  useEffect(() => {
    if (!showing) return;
    const end = () => setOver(lineKey);
    const onVisibility = () => { if (document.hidden) end(); };
    const timer = window.setTimeout(end, NAME_CUT_IN_MS);
    document.addEventListener("pointerdown", end, true);
    document.addEventListener("keydown", end, true);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", end, true);
      document.removeEventListener("keydown", end, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [showing, lineKey]);
  return showing ? cutIn : undefined;
}

/**
 * A name plate (`# cutin: name`, 2026-11-11 user decision): the speaker's role, name and, for a battle's opponent, their
 * quote when written, on the window's slate just above the dialogue window's head (DialogueWindowHead), over the scene.
 */
export function NameCutInPlate({ cutIn }: { cutIn: NameCutIn | undefined }) {
  if (!cutIn) return null;
  return <div className="name-cutin" data-testid="name-cutin">
    {cutIn.titleJa && <p className="name-cutin-title">{cutIn.titleJa}</p>}
    <p className="name-cutin-name">{cutIn.nameJa}</p>
    {cutIn.quoteJa && <p className="name-cutin-quote">{cutIn.quoteJa}</p>}
  </div>;
}
