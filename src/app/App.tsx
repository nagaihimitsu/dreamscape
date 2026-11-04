import { useEffect, useMemo, useState } from "react";
import { getJourney } from "../content/journeys";
import { journeyStorage } from "../persistence/journey-storage";
import { useJourneyLock } from "../persistence/useJourneyLock";
import { loadJourneyDraft, promoteJourneyDraft } from "../persistence/journey-preparation";
import { PreparingJourney } from "../features/journey/PreparingJourney";
import { UnavailableJourney } from "../features/journey/UnavailableJourney";
import { JourneySelection } from "../features/journey/JourneySelection";
import { GameApp } from "./GameApp";
import { browserStorage, type AppProps } from "./app-storage";

export default function App(props: AppProps = {}) {
  const [journeyId, setJourneyId] = useState("milano");
  const baseStorage = props.storage ?? browserStorage;
  const scopedStorage = useMemo(() => journeyStorage(baseStorage, journeyId), [baseStorage, journeyId]);
  const [lockAttempt, setLockAttempt] = useState(0);
  const journey = getJourney(journeyId);
  const readOnlyPreparation = journey?.status === "preparing" && !journey.initialState;
  // A read-only preparation has no save to edit, so it needs no storage lock.
  const lockStatus = useJourneyLock(props.debug || readOnlyPreparation ? "milano" : journeyId, scopedStorage, lockAttempt);
  // Debug supplies an isolated, pre-populated game; do not alter its storage.
  if (props.debug) return <GameApp {...props} />;
  if (lockStatus !== "ready") return <div className="app-shell"><main id="main"><section className="paper intro">
    <JourneySelection value={journeyId} onChange={setJourneyId} />
    <p role={lockStatus === "loading" ? "status" : "alert"}>{lockStatus === "loading"
      ? "保存データを確認しています。"
      : lockStatus === "busy" ? "この旅行編は別のタブで開いています。そちらを閉じてから再試行してください。"
      : "このブラウザでは別タブとの保存競合を防げないため、この旅行編を開けません。対応ブラウザをご利用ください。"}</p>
    {lockStatus === "busy" && <button type="button" className="secondary" onClick={() => setLockAttempt((value) => value + 1)}>再試行</button>}
  </section></main></div>;
  if (journey?.status === "preparing") {
    return journey.initialState
      ? <PreparingJourney key={journeyId} journey={journey} storage={scopedStorage} onSwitchJourney={setJourneyId} />
      : <UnavailableJourney journey={journey} onSwitchJourney={setJourneyId} />;
  }
  if (journey?.initialState) return <PlayableJourney key={journeyId} {...props} storage={scopedStorage} journeyId={journeyId} onSwitchJourney={setJourneyId} />;
  return <GameApp key={journeyId} {...props} storage={scopedStorage} journeyId={journeyId} onSwitchJourney={setJourneyId} />;
}

function PlayableJourney(props: AppProps & { storage: typeof browserStorage; journeyId: string; onSwitchJourney: (id: string) => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | string>("loading");
  useEffect(() => {
    const draft = loadJourneyDraft(props.storage);
    if (draft.status !== "loaded") { setStatus("ready"); return; }
    const result = promoteJourneyDraft(props.storage, draft.raw);
    setStatus(result.ok ? "ready" : result.message);
  }, [props.storage]);
  if (status === "ready") return <GameApp {...props} />;
  return <div className="app-shell"><main id="main"><section className="paper intro">
    <JourneySelection value={props.journeyId} onChange={props.onSwitchJourney} />
    <p role={status === "loading" ? "status" : "alert"}>{status === "loading" ? "保存データを確認しています。" : status}</p>
  </section></main></div>;
}
