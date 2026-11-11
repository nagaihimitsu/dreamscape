import { HudScreenTool } from "./HudScreenTool";
import { Icon } from "./icons";

/**
 * A story scene's heading (a sightseeing guide's landmark, a battle's landmark or
 * a city finale's title, a date's destination, the place of an encounter), for
 * screen readers and for the focus after a screen change (`tabIndex={-1}`,
 * scene-focus.ts; UI redesign §3.7 E), as free time's. It is not shown (user
 * decision 2026-11-11, after playing on an iPhone): the header above the scene
 * shows where the couple are. A running tour's tag (「ツアー・見学」, tour stage
 * 2a) is read before the name.
 */
export function SceneHeading({ label, badge }: { label: string; badge?: string }) {
  return <h1 className="sr-only" tabIndex={-1} data-testid="scene-heading">{badge ? `${badge} ${label}` : label}</h1>;
}

/**
 * 手がかり帳 (S1, S6) of a sightseeing guide and of a battle: the screen's
 * own tool in the header, before ⚙設定 (HudScreenTool). The header shows it only
 * while the scene waits for a choice (hud-view.ts).
 */
export function SceneNotebookTool({ onClick }: { onClick: () => void }) {
  return (
    <HudScreenTool>
      <button type="button" className="hud-tool" onClick={onClick}>
        <Icon name="book" /><span className="hud-tool-word">手がかり帳</span>
      </button>
    </HudScreenTool>
  );
}
