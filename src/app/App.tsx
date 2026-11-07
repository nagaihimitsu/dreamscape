import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultJourneyId, getJourney } from "../content/journeys";
import { journeyStorage } from "../persistence/journey-storage";
import { useJourneyLock } from "../persistence/useJourneyLock";
import { journeyLockNotice, needsJourneyLock } from "../persistence/journey-lock";
import { loadJourneyDraft, promoteJourneyDraft } from "../persistence/journey-preparation";
import { PreparingJourney } from "../features/journey/PreparingJourney";
import { UnavailableJourney } from "../features/journey/UnavailableJourney";
import { JourneySelection, type SelectorFocus } from "../features/journey/JourneySelection";
import { holdTaps } from "../components/tap-hold";
import { GameApp } from "./GameApp";
import { browserStorage, type AppProps } from "./app-storage";

export default function App(props: AppProps = {}) {
  const [journeyId, setJourneyId] = useState(defaultJourneyId);
  // A switch rebuilds the screen (key={journeyId}); the new screen's journey
  // selector takes the keyboard focus back (see JourneySelection). The other
  // journey's screen, perhaps its saved story scene, appears under the finger:
  // the second tap of a double tap on 「切り替える」 must not press or read it
  // (tap-hold.ts; the new GameApp starts with that scene, so it sees no start).
  const [restoreSelectorFocus, setRestoreSelectorFocus] = useState(false);
  const switchJourney = useCallback((id: string) => {
    holdTaps();
    setRestoreSelectorFocus(true);
    setJourneyId(id);
  }, []);
  const selectorFocusRestored = useCallback(() => setRestoreSelectorFocus(false), []);
  const selectorFocus: SelectorFocus = { restoreFocus: restoreSelectorFocus, onFocusRestored: selectorFocusRestored };
  const baseStorage = props.storage ?? browserStorage;
  const scopedStorage = useMemo(() => journeyStorage(baseStorage, journeyId), [baseStorage, journeyId]);
  const [lockAttempt, setLockAttempt] = useState(0);
  // 再試行 rebuilds the screen like a switch: the selector keeps the focus
  // while the lock is checked again, and the new screen takes it at the end;
  // taps are held as for a switch.
  const retryLock = useCallback(() => {
    holdTaps();
    setRestoreSelectorFocus(true);
    setLockAttempt((value) => value + 1);
  }, []);
  const journey = getJourney(journeyId);
  const lockStatus = useJourneyLock(journeyId, scopedStorage, lockAttempt, needsJourneyLock(journey, !!props.debug));
  // Debug supplies an isolated, pre-populated game; do not alter its storage.
  if (props.debug) return <GameApp {...props} />;
  const lockNotice = journeyLockNotice(lockStatus);
  if (lockNotice) return <div className="app-shell"><main id="main"><section className="paper intro">
    <JourneySelection value={journeyId} onChange={switchJourney} restoreFocus={restoreSelectorFocus}
      onFocusRestored={lockStatus === "loading" ? undefined : selectorFocusRestored} />
    <p role={lockNotice.role}>{lockNotice.message}</p>
    {lockNotice.retry && <button type="button" className="secondary" onClick={retryLock}>再試行</button>}
  </section></main></div>;
  if (journey?.status === "preparing") {
    return journey.initialState
      ? <PreparingJourney key={journeyId} journey={journey} storage={scopedStorage} onSwitchJourney={switchJourney} selectorFocus={selectorFocus} />
      : <UnavailableJourney journey={journey} onSwitchJourney={switchJourney} selectorFocus={selectorFocus} />;
  }
  if (journey?.initialState) return <PlayableJourney key={journeyId} {...props} storage={scopedStorage} journeyId={journeyId} onSwitchJourney={switchJourney} selectorFocus={selectorFocus} />;
  return <GameApp key={journeyId} {...props} storage={scopedStorage} journeyId={journeyId} onSwitchJourney={switchJourney} selectorFocus={selectorFocus} />;
}

function PlayableJourney(props: AppProps & { storage: typeof browserStorage; journeyId: string; onSwitchJourney: (id: string) => void; selectorFocus: SelectorFocus }) {
  const [status, setStatus] = useState<"loading" | "ready" | string>("loading");
  useEffect(() => {
    const draft = loadJourneyDraft(props.storage);
    if (draft.status !== "loaded") { setStatus("ready"); return; }
    const result = promoteJourneyDraft(props.storage, draft.raw);
    setStatus(result.ok ? "ready" : result.message);
  }, [props.storage]);
  if (status === "ready") return <GameApp {...props} />;
  return <div className="app-shell"><main id="main"><section className="paper intro">
    <JourneySelection value={props.journeyId} onChange={props.onSwitchJourney} restoreFocus={props.selectorFocus.restoreFocus}
      onFocusRestored={status === "loading" ? undefined : props.selectorFocus.onFocusRestored} />
    <p role={status === "loading" ? "status" : "alert"}>{status === "loading" ? "保存データを確認しています。" : status}</p>
  </section></main></div>;
}
