import { useEffect, useRef, useState } from "react";
import { DEFAULT_ITEM_ICON } from "../content/code-images";
import type { GameState } from "../domain/game";
import { itemDefinition } from "../domain/item-cities";
import { gainedItemIds } from "../domain/item-changes";
import "./hud-effects.css";

/** How long one 「…を手に入れました」 stays (milliseconds; hud-effects.css plays its coming and going in that time). */
export const ITEM_GAIN_NOTICE_MS = 2500;

type Notice = { key: number; name: string; iconPath: string };

/**
 * 「{品物名}を手に入れました」 (2026-11-13 user decision): right under the header (JourneyHud), the item's icon and its
 * name for ITEM_GAIN_NOTICE_MS, as an action in play makes an item held (gainedItemIds; never for what a load, a new game
 * or Debug's return brings: `replaced`). Several come one after another, in their order. It takes no presses and no
 * focus (a tap on it reaches the screen below); its status region stays mounted with the header, so screen readers
 * announce it politely. It comes in and goes with a short slide (only fading under reduced motion and 「演出を短縮する」).
 *
 * `hold`: while true no notice shows; one on screen goes back to the head of the queue and shows again in full once the
 * hold ends, and new ones wait behind it. GameApp holds them while another notice under the header shows (写真の札,
 * 「ことばを覚えた」, so they never lie over each other), and the header while it steps aside (a quiet line). Anything
 * else that should come first (a larger showing of the item itself) holds them the same way, through JourneyHud's
 * `holdNotices`.
 */
export function ItemGainNotice({ inventory, replaced, hold }: { inventory: GameState["inventory"]; replaced: number; hold: boolean }) {
  const [queue, setQueue] = useState<readonly Notice[]>([]);
  const seen = useRef({ inventory, replaced });
  const lastKey = useRef(0);
  useEffect(() => {
    const before = seen.current;
    seen.current = { inventory, replaced };
    if (before.replaced !== replaced) {
      setQueue([]);
      return;
    }
    const gained = gainedItemIds(before.inventory, inventory);
    if (!gained.length) return;
    const notices = gained.map((id) => {
      const item = itemDefinition(id);
      return { key: ++lastKey.current, name: item?.nameJa ?? id, iconPath: item?.iconPath ?? DEFAULT_ITEM_ICON };
    });
    setQueue((waiting) => [...waiting, ...notices]);
  }, [inventory, replaced]);
  const shown = hold ? undefined : queue[0];
  const shownKey = shown?.key;
  // Once a notice shows: its time runs from then (again in full after a hold).
  useEffect(() => {
    if (shownKey === undefined) return;
    const timer = window.setTimeout(() => setQueue((waiting) => waiting[0]?.key === shownKey ? waiting.slice(1) : waiting), ITEM_GAIN_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [shownKey]);
  return (
    <div className="item-gain-notice-region" role="status" data-testid="item-gain-notice">
      {shown && (
        <p key={shown.key} className="item-gain-notice">
          <img src={`${import.meta.env.BASE_URL}${shown.iconPath}`} alt="" />
          <span>{`${shown.name}を手に入れました`}</span>
        </p>
      )}
    </div>
  );
}
