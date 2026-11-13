import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GameState } from "../domain/game";
import { ITEM_LEAVE_MS, itemShowLeaving } from "../components/item-show";

/** A line's item card on its way out (ItemShowFlight): which item, whether it was held as the line went, and a key per leaving. */
export type ItemShowLeave = { key: number; itemId: string; held: boolean };

/**
 * The card of a line's `# item_show:` as its line goes (2026-11-13 user decision): for ITEM_LEAVE_MS after the line on
 * screen stops showing `itemId` (the next line, the scene's end, a choice taken), which item it was and whether it is
 * held then (the scene may give it with that very action). Read before paint, so the card never blinks out between the
 * line and its flight. Nothing for what a load or Debug's return brings (`replaced`, GameApp's count). In this tab's
 * memory only.
 */
export function useItemShowLeave(itemId: string | undefined, inventory: GameState["inventory"] | undefined, replaced: number): ItemShowLeave | null {
  const seen = useRef({ itemId, replaced });
  const count = useRef(0);
  const [leave, setLeave] = useState<ItemShowLeave | null>(null);
  useLayoutEffect(() => {
    const before = seen.current;
    seen.current = { itemId, replaced };
    if (before.replaced !== replaced) {
      setLeave(null);
      return;
    }
    const gone = itemShowLeaving(before.itemId, itemId, false);
    if (gone) setLeave({ key: ++count.current, itemId: gone, held: inventory?.[gone] === "held" });
  // The inventory as the line goes is read with it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, replaced]);
  const key = leave?.key;
  useEffect(() => {
    if (key === undefined) return;
    const timer = window.setTimeout(() => setLeave((last) => (last?.key === key ? null : last)), ITEM_LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [key]);
  return leave;
}
