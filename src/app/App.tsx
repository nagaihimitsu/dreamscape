import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { defaultJourneyId, getJourney, journeys } from "../content/journeys";
import { journeyStorage } from "../persistence/journey-storage";
import { openingJourneyId, readLastJourney, rememberJourney } from "./last-journey";
import { useJourneyLock } from "../persistence/useJourneyLock";
import { journeyLockNotice, needsJourneyLock, type JourneyLockNotice } from "../persistence/journey-lock";
import { focusIsLost, focusQuietly } from "../components/scene-focus";
import { loadJourneyDraft, promoteJourneyDraft } from "../persistence/journey-preparation";
import { PreparingJourney } from "../features/journey/PreparingJourney";
import { UnavailableJourney } from "../features/journey/UnavailableJourney";
import { JourneySelection, type SelectorFocus } from "../features/journey/JourneySelection";
import { holdTaps } from "../components/tap-hold";
import { GameApp } from "./GameApp";
import { JourneyContentGate } from "./JourneyContentGate";
import { loadJourneyContent } from "../content";
import type { KeyedStorage } from "../persistence/old-data";
import { browserKeyedStorage, browserStorage, type AppProps } from "./app-storage";

export default function App(props: AppProps = {}) {
  const baseStorage = props.storage ?? browserStorage;
  // The title opens the journey last opened on this device (last-journey.ts); Debug
  // (isolated storage, its own scene) neither reads nor writes that preference.
  const [journeyId, setJourneyId] = useState(() =>
    props.debug ? defaultJourneyId : openingJourneyId(readLastJourney(baseStorage), journeys, defaultJourneyId));
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
    if (!props.debug) rememberJourney(baseStorage, getJourney(id));
  }, [props.debug, baseStorage]);
  const selectorFocusRestored = useCallback(() => setRestoreSelectorFocus(false), []);
  const selectorFocus: SelectorFocus = { restoreFocus: restoreSelectorFocus, onFocusRestored: selectorFocusRestored };
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
  // A playable journey's content starts loading at once, while the lock is checked (JourneyContentGate waits for it).
  const playable = !props.debug && journey?.status === "available";
  useEffect(() => {
    if (playable) loadJourneyContent(journeyId).catch(() => undefined);
  }, [playable, journeyId]);
  // Debug supplies an isolated, pre-populated game; do not alter its storage.
  if (props.debug) return <GameApp {...props} />;
  const lockNotice = journeyLockNotice(lockStatus);
  if (lockNotice) return <JourneyLockScreen journeyName={journey?.nameJa ?? "旅行編"} notice={lockNotice} onRetry={retryLock}
    selector={<JourneySelection value={journeyId} onChange={switchJourney} restoreFocus={restoreSelectorFocus}
      onFocusRestored={lockStatus === "loading" ? undefined : selectorFocusRestored} />} />;
  if (journey?.status === "preparing") {
    return journey.initialState
      ? <PreparingJourney key={journeyId} journey={journey} storage={scopedStorage} onSwitchJourney={switchJourney} selectorFocus={selectorFocus} />
      : <UnavailableJourney journey={journey} onSwitchJourney={switchJourney} selectorFocus={selectorFocus} />;
  }
  // 「古い保存データの整理」 reads the browser's own storage; a page given another storage has none.
  const oldDataStorage = props.storage ? undefined : browserKeyedStorage;
  return <JourneyContentGate key={journeyId} journeyId={journeyId} onSwitchJourney={switchJourney} selectorFocus={selectorFocus}>
    {journey?.initialState
      ? <PlayableJourney {...props} storage={scopedStorage} journeyId={journeyId} onSwitchJourney={switchJourney} selectorFocus={selectorFocus} oldDataStorage={oldDataStorage} />
      : <GameApp {...props} storage={scopedStorage} journeyId={journeyId} onSwitchJourney={switchJourney} selectorFocus={selectorFocus} oldDataStorage={oldDataStorage} />}
  </JourneyContentGate>;
}

/**
 * The journey cannot open here (journey-lock.ts): it is being checked, another tab has it, or
 * the browser cannot protect its save. Once the answer stays (not while checking), the heading
 * takes a lost focus (UI redesign §3.7 K; a page opened on this screen leaves it on the body):
 * one Tab then reaches 「再試行」. A switch or 再試行 keeps it on the journey selector.
 */
function JourneyLockScreen({ journeyName, notice, selector, onRetry }: {
  journeyName: string; notice: JourneyLockNotice; selector: ReactNode; onRetry: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const settled = notice.role === "alert";
  useEffect(() => {
    if (settled && heading.current && focusIsLost(null)) focusQuietly(heading.current);
  }, [settled]);
  return <div className="app-shell"><main id="main"><section className="paper intro">
    {selector}
    <h1 ref={heading} tabIndex={-1}>{journeyName}</h1>
    <p role={notice.role}>{notice.message}</p>
    {notice.retry && <button type="button" className="secondary" onClick={onRetry}>再試行</button>}
  </section></main></div>;
}

function PlayableJourney(props: AppProps & { storage: typeof browserStorage; journeyId: string; onSwitchJourney: (id: string) => void; selectorFocus: SelectorFocus; oldDataStorage?: KeyedStorage }) {
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
