import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultJourneyId, getJourney } from "../content/journeys";
import { journeyStorage } from "../persistence/journey-storage";
import { useJourneyLock } from "../persistence/useJourneyLock";
import { loadJourneyDraft, promoteJourneyDraft } from "../persistence/journey-preparation";
import { PreparingJourney } from "../features/journey/PreparingJourney";
import { UnavailableJourney } from "../features/journey/UnavailableJourney";
import { JourneySelection, type SelectorFocus } from "../features/journey/JourneySelection";
import { GameApp } from "./GameApp";
import { browserStorage, type AppProps } from "./app-storage";

export default function App(props: AppProps = {}) {
  const [journeyId, setJourneyId] = useState(defaultJourneyId);
  // A switch rebuilds the screen (key={journeyId}); the new screen's journey
  // selector takes the keyboard focus back (see JourneySelection).
  const [restoreSelectorFocus, setRestoreSelectorFocus] = useState(false);
  const switchJourney = useCallback((id: string) => {
    setRestoreSelectorFocus(true);
    setJourneyId(id);
  }, []);
  const selectorFocusRestored = useCallback(() => setRestoreSelectorFocus(false), []);
  const selectorFocus: SelectorFocus = { restoreFocus: restoreSelectorFocus, onFocusRestored: selectorFocusRestored };
  const baseStorage = props.storage ?? browserStorage;
  const scopedStorage = useMemo(() => journeyStorage(baseStorage, journeyId), [baseStorage, journeyId]);
  const [lockAttempt, setLockAttempt] = useState(0);
  const journey = getJourney(journeyId);
  const readOnlyPreparation = journey?.status === "preparing" && !journey.initialState;
  // Debug storage is isolated and a read-only preparation has no save to edit,
  // so neither needs the cross-tab storage lock.
  const lockStatus = useJourneyLock(journeyId, scopedStorage, lockAttempt, !props.debug && !readOnlyPreparation);
  // Debug supplies an isolated, pre-populated game; do not alter its storage.
  if (props.debug) return <GameApp {...props} />;
  if (lockStatus !== "ready") return <div className="app-shell"><main id="main"><section className="paper intro">
    <JourneySelection value={journeyId} onChange={switchJourney} restoreFocus={restoreSelectorFocus}
      onFocusRestored={lockStatus === "loading" ? undefined : selectorFocusRestored} />
    <p role={lockStatus === "loading" ? "status" : "alert"}>{lockStatus === "loading"
      ? "保存データを確認しています。"
      : lockStatus === "busy" ? "この旅行編は別のタブで開いています。そちらを閉じてから再試行してください。"
      : "このブラウザでは別タブとの保存競合を防げないため、この旅行編を開けません。対応ブラウザをご利用ください。"}</p>
    {lockStatus === "busy" && <button type="button" className="secondary" onClick={() => setLockAttempt((value) => value + 1)}>再試行</button>}
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
