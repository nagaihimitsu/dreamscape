import { useEffect, useState, type ReactNode } from "react";
import { journeyContentLoaded, loadJourneyContent } from "../content";
import { JourneySelection, type SelectorFocus } from "../features/journey/JourneySelection";

/**
 * Shows `children` (the journey's game: its title, or its save as it was) once the journey's content is loaded
 * (src/content/index.ts loadJourneyContent; a production build loads each journey's part when it opens, the development
 * server has them all). Nothing of the game, its save included, is read before: a save is checked against its journey's
 * content. Meanwhile the journey selector and a status line, as while PlayableJourney checks a save. A part that cannot
 * be loaded (offline, or a newer version replaced it on the server) is said so, with a reload of the page.
 * App keys it by the journey, so a switch starts it again.
 */
export function JourneyContentGate({ journeyId, onSwitchJourney, selectorFocus, children }: {
  journeyId: string; onSwitchJourney: (id: string) => void; selectorFocus: SelectorFocus; children: ReactNode;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(() => journeyContentLoaded(journeyId) ? "ready" : "loading");
  useEffect(() => {
    if (status !== "loading") return;
    let current = true;
    loadJourneyContent(journeyId).then(() => { if (current) setStatus("ready"); }, () => { if (current) setStatus("failed"); });
    return () => { current = false; };
  }, [journeyId, status]);
  if (status === "ready") return children;
  return <div className="app-shell"><main id="main"><section className="paper intro">
    <JourneySelection value={journeyId} onChange={onSwitchJourney} restoreFocus={selectorFocus.restoreFocus}
      onFocusRestored={status === "loading" ? undefined : selectorFocus.onFocusRestored} />
    {status === "loading"
      ? <p role="status">旅の準備をしています。</p>
      : <>
        <p role="alert">旅行編のデータを読み込めませんでした。通信を確かめて、ページを読み込み直してください。</p>
        <button type="button" className="secondary" onClick={() => window.location.reload()}>読み込み直す</button>
      </>}
  </section></main></div>;
}
