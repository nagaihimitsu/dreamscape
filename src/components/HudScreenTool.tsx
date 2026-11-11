import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** The id of the header's place for the screen's own tool (JourneyHud's second row, before ⚙設定). */
export const HUD_SCREEN_TOOL_ID = "hud-screen-tool";

/**
 * Puts a screen's own tool (free time's 「地図」, a sightseeing guide's or a battle's 「手がかり帳」) into the
 * header while that screen is shown. The tool stays the screen's: its state and the dialog it opens live with the
 * screen, and it leaves the header with the screen, so on every other screen that place is simply empty (it takes
 * no room).
 */
export function HudScreenTool({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setSlot(document.getElementById(HUD_SCREEN_TOOL_ID)), []);
  return slot && createPortal(children, slot);
}
