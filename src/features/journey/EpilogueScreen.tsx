import { useCallback, useEffect, useState } from "react";
import { episodes } from "../../content";
import type { GameState } from "../../domain/game";
import { DialogueText } from "../../components/DialogueText";
import { CanalScene } from "../../components/CanalScene";

export function EpilogueScreen({
  game,
  speed,
  onSpeed,
  onAdvance,
}: {
  game: GameState;
  speed: number;
  onSpeed: (value: number) => void;
  onAdvance: () => void;
}) {
  const active = game.activeEpilogue!;
  const frame = active.frame;
  const episode = episodes.find((item) => item.id === active.episodeId)!;
  const [ready, setReady] = useState(false);
  const onReady = useCallback((value: boolean) => setReady(value), []);
  useEffect(() => {
    document
      .getElementById("city-epilogue-screen")
      ?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <div id="city-epilogue-screen" data-testid="city-epilogue-screen">
      <CanalScene backgroundId={frame.background} />
      <section className="paper story-paper" aria-label="都市エピローグ">
        <p className="eyebrow">都市エピローグ</p>
        <h1>{episode.clearTitleJa}</h1>
        <div className="speaker">
          {frame.speaker === "heroine"
            ? game.heroineName
            : frame.speaker === "player"
              ? game.playerName
              : "旅の風景"}
        </div>
        <DialogueText
          key={game.revision}
          text={frame.text}
          speed={speed}
          onReady={onReady}
        />
        <button
          className="next"
          disabled={!ready}
          data-testid="epilogue-advance"
          onClick={onAdvance}
        >
          {frame.ended ? "ふたりの自由時間へ" : "続きを読む"}{" "}
          <span aria-hidden="true">→</span>
        </button>
        <div className="story-tools">
          <span className="fine-print">この場面から再開できます</span>
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
      </section>
    </div>
  );
}
