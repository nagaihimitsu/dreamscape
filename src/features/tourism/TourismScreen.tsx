import { useEffect, useRef, useState } from "react";
import {
  landmarks,
  tourismAssets,
  tourismClues,
  episodes,
  rewardRules,
} from "../../content";
import { canAccessFreeTime } from "../../domain/chapter";
import type { GameState } from "../../domain/game";
import { DialogueText } from "../../components/DialogueText";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { DialogueLog, useDialogueLog } from "../../components/DialogueLog";
import { useDialogueScrollReset } from "../../components/useDialogueScrollReset";
import { ObservationViewer } from "./ObservationViewer";
import { ClueDetails } from "./ClueDetails";
import "./tourism.css";

interface Props {
  game: GameState;
  speed: number;
  onSpeed: (speed: number) => void;
  onAdvance: () => void;
  onSkip: () => void;
  onDiscover: (id: string) => boolean;
  onNotebook: () => void;
  onBattle: () => void;
  onLeave: () => void;
  onReplayGuide: () => void;
}

export function TourismScreen({
  game,
  speed,
  onSpeed,
  onAdvance,
  onSkip,
  onDiscover,
  onNotebook,
  onBattle,
  onLeave,
  onReplayGuide,
}: Props) {
  const active = game.activeTourism!;
  const dialogueRef = useDialogueScrollReset<HTMLDivElement>(active.storyState);
  const landmark = landmarks.find((item) => item.id === active.landmarkId)!;
  const asset = tourismAssets.find(
    (item) => item.id === landmark.imageAssetId,
  )!;
  const clues = landmark.clueIds.map((id) =>
    tourismClues.find((item) => item.id === id)!,
  );
  const points = clues
    .filter((clue) => clue.kind === "hotspot" && clue.region !== null)
    .map((clue) => ({
      id: clue.id,
      titleJa: clue.titleJa,
      region: clue.region!,
    }));
  const documents = clues.filter((clue) => clue.kind === "document");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const shouldScrollToSelection = useRef(true);
  const selected = clues.find((clue) => clue.id === selectedId);
  const frame = active.frame;
  const speaker =
    frame?.speaker === "heroine"
      ? game.heroineName
      : frame?.speaker === "player"
        ? game.playerName
        : "旅の風景";
  const { ready, onReady, entries } = useDialogueLog(
    `${active.landmarkId}:${active.phase}`,
    game.revision,
    speaker,
    frame?.text ?? "",
  );
  const episode = episodes.find((item) => item.landmarkId === landmark.id);
  const guideReward = rewardRules.find(
    (item) => item.episodeId === episode?.id && item.trigger === "guide_read",
  );

  useEffect(() => {
    document
      .getElementById("tourism-screen")
      ?.scrollIntoView({ block: "start" });
  }, [active.landmarkId]);

  useEffect(() => {
    if (!focusRequest || !shouldScrollToSelection.current) return;
    const target =
      selected?.kind === "document"
        ? "discovery-detail"
        : "observation-viewport";
    document
      .querySelector(`[data-testid="${target}"]`)
      ?.scrollIntoView({ block: "start" });
  }, [focusRequest, selected?.kind]);

  function selectClue(id: string, movePage = true) {
    if (onDiscover(id)) {
      // A marker is already in view; centering it must not also jump the page.
      shouldScrollToSelection.current = movePage;
      setSelectedId(id);
      setFocusRequest((value) => value + 1);
    }
  }

  const actions = (
    <div className="tourism-actions">
      <p className="fine-print">
        観察は任意です。バトルの途中でも、ここへ戻れます。
      </p>
      <button className="primary" onClick={onBattle}>
        {game.activeBattle ? "バトルに戻る" : "バトルを始める"}
        <span aria-hidden="true"> →</span>
      </button>
      {!game.activeBattle && (
        <button className="secondary" onClick={onLeave}>
          {canAccessFreeTime(game) ? "自由時間へ戻る" : "旅の予定に戻る"}
        </button>
      )}
    </div>
  );

  return (
    <section
      className={`tourism-screen${active.phase === "guide" ? " guide-active" : ""}`}
      id="tourism-screen"
      data-testid="tourism-screen"
    >
      <header className="tourism-heading">
        <p className="eyebrow">観光と観察 · 旅先の発見</p>
        <h1>{landmark.nameJa}</h1>
        <p className="landmark-english" lang="en">
          {landmark.nameEn}
        </p>
        <div className="tourism-toolbar">
          <span className="fine-print">
            発見{" "}
            {
              clues.filter((clue) => game.discoveredClueIds.includes(clue.id))
                .length
            }{" "}
            / {clues.length}
          </span>
          <button className="notebook-button" onClick={onNotebook}>
            手がかり帳
          </button>
        </div>
        {guideReward && game.completedGuideIds.includes(landmark.id) && (
          <p className="guide-reward-note">
            {guideReward.titleJa} · {guideReward.ap}APの報酬を記録しました
          </p>
        )}
      </header>
      {active.phase === "exploring" && actions}
      {asset.isPlaceholder && (
        <p className="image-placeholder-note">
          仮画像です。実物の細部を再現した資料ではありません。
        </p>
      )}
      {active.phase === "exploring" && (
        <div className="replay-guide">
          <button
            className="text-button"
            data-testid="guide-replay"
            onClick={onReplayGuide}
          >
            観光案内をもう一度読む
          </button>
        </div>
      )}
      {active.phase === "guide" && frame ? (
        <div className="vn-scene tourism-guide-scene">
          <div className="vn-background">
            <img
              className="tourism-arrival-image"
              src={`${import.meta.env.BASE_URL}${asset.path}`}
              width={asset.width}
              height={asset.height}
              alt={asset.altJa}
            />
          </div>
          <div className="vn-character-layer">
            <CharacterPortrait
              characterId="heroine"
              emotion={frame.emotion}
              active={frame.speaker === "heroine"}
            />
          </div>
          <div
            ref={dialogueRef}
            className="tourism-guide paper vn-dialogue"
            data-testid="tourism-guide"
          >
            <div className="speaker">{speaker}</div>
            <DialogueText
              key={game.revision}
              text={frame.text}
              speed={speed}
              onReady={onReady}
              onAdvance={onAdvance}
            />
            <button
              className="next"
              data-testid="tourism-advance"
              disabled={!ready}
              onClick={onAdvance}
            >
              {frame.ended ? "観察を始める" : "続きを読む"}
              <span aria-hidden="true"> →</span>
            </button>
            <div className="story-tools">
              <button
                className="text-button"
                data-testid="tourism-skip"
                onClick={onSkip}
              >
                案内を閉じて観察する
              </button>
              <DialogueLog entries={entries} />
              <label>
                文字送り
                <select
                  aria-label="文字送り"
                  value={speed}
                  onChange={(event) => onSpeed(Number(event.target.value))}
                >
                  <option value={45}>ゆっくり</option>
                  <option value={25}>ふつう</option>
                  <option value={0}>一括表示</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="tourism-observation">
          <ObservationViewer
            asset={asset}
            points={points}
            discoveredIds={game.discoveredClueIds}
            selectedId={selectedId}
            focusRequest={focusRequest}
            onSelect={(id) => selectClue(id, false)}
          />
          <div className="observation-notes">
            {selected && (
              <article
                className="discovery-detail"
                data-testid="discovery-detail"
                aria-live="polite"
              >
                <p className="recorded-label">手がかり帳に記録しました</p>
                <ClueDetails clue={selected} />
              </article>
            )}
            <p className="fine-print">
              印をタップすると、その場所に近づきます。下の一覧からも選べます。
            </p>
            <div className="discovery-list" aria-label="画像の観察ポイント">
              {points.map((point, index) => (
                <button
                  key={point.id}
                  data-testid={`discovery-${point.id}`}
                  aria-pressed={selectedId === point.id}
                  onClick={() => selectClue(point.id)}
                >
                  <span className="discovery-number">{index + 1}</span>
                  <span>{point.titleJa}</span>
                  <span className="discovered-mark">
                    {game.discoveredClueIds.includes(point.id)
                      ? "記録済み"
                      : "調べる"}
                  </span>
                </button>
              ))}
            </div>
            {documents.length > 0 && (
              <div className="document-cards">
                <h2>資料からわかること</h2>
                <p className="fine-print">
                  画像を見るだけでは確かめられないことを、資料で補います。
                </p>
                {documents.map((clue) => (
                  <button
                    key={clue.id}
                    className="document-card"
                    data-testid={`discovery-${clue.id}`}
                    onClick={() => selectClue(clue.id)}
                  >
                    <span>{clue.titleJa}</span>
                    <small>
                      {game.discoveredClueIds.includes(clue.id)
                        ? "記録済み · 読み返す"
                        : "資料カードを読む"}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <details className="tourism-credits">
        <summary>画像の出典と利用条件</summary>
        <p>{asset.creditJa}</p>
        <p>{asset.modificationJa}</p>
        <p>
          <a href={asset.sourceUrl} target="_blank" rel="noreferrer">
            画像の出典
          </a>{" "}
          ·{" "}
          <a href={asset.licenseUrl} target="_blank" rel="noreferrer">
            {asset.licenseName}
          </a>
        </p>
      </details>
      {active.phase === "guide" && actions}
    </section>
  );
}
