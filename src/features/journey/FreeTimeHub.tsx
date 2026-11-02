import { useEffect, useState } from "react";
import type { GameState } from "../../domain/game";
import { BattleEntry } from "../battle/BattleEntry";
import { RomanceMenu } from "../romance/RomanceMenu";
import { TourismEntry } from "../tourism/TourismEntry";
import { CityProgress } from "./CityProgress";
import { PendingRewards } from "./PendingRewards";
import type { EncounterMenuEntry } from "./EncounterMenu";
import "./free-time-hub.css";

/** The same compact destination for an unfinished or completed romance. */
export function FreeTimeHub({
  game,
  onEnglish,
  onClaimRewards,
  onStartEpisode,
  onEpilogue,
  onChooseDate,
  onMilestone,
  onTourism,
  onBattle,
  encounters,
  onEncounter,
  selectedLandmarkId,
  onSelectLandmark,
  placeFocusRequest,
}: {
  game: GameState;
  onEnglish: () => void;
  onClaimRewards: () => void;
  onStartEpisode: (id: string) => void;
  onEpilogue: (id: string) => void;
  onChooseDate: (id: string) => void;
  onMilestone: (id: string) => void;
  onTourism: (id: string) => void;
  onBattle: (id: string) => void;
  encounters: EncounterMenuEntry[];
  onEncounter: (id: string) => void;
  selectedLandmarkId: string | null;
  onSelectLandmark: (id: string | null) => void;
  placeFocusRequest: number;
}) {
  const [revisitOpen, setRevisitOpen] = useState(!!selectedLandmarkId);
  useEffect(() => {
    if (!placeFocusRequest || !selectedLandmarkId) return;
    setRevisitOpen(true);
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-testid="revisit-place-${selectedLandmarkId}"]`)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [placeFocusRequest, selectedLandmarkId]);
  return (
    <section className="free-time-hub paper" data-testid="free-time-hub">
      <header className="free-time-hub-heading">
        <h1>ふたりの自由時間</h1>
        {game.endingReached && <span>交際中</span>}
      </header>

      <CityProgress game={game} onStart={onStartEpisode} onStoryBattle={onBattle} onEpilogue={onEpilogue} />

      <div className="free-time-tools">
        <button className="secondary" onClick={onEnglish}>
          英語ノートを開く
        </button>
        <details className="revisit-menu" open={revisitOpen} onToggle={(event) => setRevisitOpen(event.currentTarget.open)}>
          <summary>旅先を再訪する</summary>
          <p className="fine-print">再戦の初回報酬は再取得できません。</p>
          <TourismEntry
            game={game}
            onStart={onTourism}
            encounters={encounters}
            selectedLandmarkId={selectedLandmarkId}
            onSelectLandmark={onSelectLandmark}
            onEncounter={onEncounter}
          />
          <BattleEntry game={game} onStart={onBattle} />
        </details>
      </div>

      <section className="free-time-romance" aria-label="デート">
        <h2>行き先と出来事</h2>
        <RomanceMenu game={game} onChoose={onChooseDate} onMilestone={onMilestone} />
      </section>

      <PendingRewards game={game} onClaim={onClaimRewards} compact />
    </section>
  );
}
