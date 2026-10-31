import { useEffect } from "react";
import { episodes } from "../../content";
import type { GameState } from "../../domain/game";
import { DialogueText } from "../../components/DialogueText";
import { CanalScene } from "../../components/CanalScene";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { DialogueLog, useDialogueLog } from "../../components/DialogueLog";
import { useDialogueScrollReset } from "../../components/useDialogueScrollReset";
import { DialogueToolsMenu } from "../../components/DialogueToolsMenu";
import { AutoAdvanceButton, useAutoAdvance } from "../../components/useAutoAdvance";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";

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
  const windowVisibility = useDialogueWindow();
  const dialogueRef = useDialogueScrollReset<HTMLElement>(active.storyState);
  const frame = active.frame;
  const episode = episodes.find((item) => item.id === active.episodeId)!;
  const speaker =
    frame.speaker === "heroine"
      ? game.heroineName
      : frame.speaker === "player"
        ? game.playerName
        : "旅の風景";
  const { ready, onReady, entries } = useDialogueLog(
    active.episodeId,
    game.revision,
    speaker,
    frame.text,
  );
  const advanceSafely = () => {
    if (ready && !windowVisibility.hidden && !dialogueObstructed()) onAdvance();
  };
  const autoAdvance = useAutoAdvance({
    ready,
    canAdvance: !frame.ended && !windowVisibility.hidden,
    text: frame.text,
    onAdvance: advanceSafely,
  });
  useEffect(() => {
    document
      .getElementById("city-epilogue-screen")
      ?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <div id="city-epilogue-screen" data-testid="city-epilogue-screen">
      <div className="vn-scene" data-dialogue-hidden={windowVisibility.hidden || undefined}>
        <div className="vn-background">
          <CanalScene backgroundId={frame.background} />
        </div>
        <div className="vn-character-layer">
          <CharacterPortrait
            characterId="heroine"
            emotion={frame.emotion}
            active={frame.speaker === "heroine"}
          />
        </div>
        <section
          ref={dialogueRef}
          className="paper story-paper vn-dialogue"
          aria-label="都市エピローグ"
          inert={windowVisibility.hidden}
          aria-hidden={windowVisibility.hidden || undefined}
        >
          <div className="speaker">{speaker}</div>
          <p className="eyebrow">都市エピローグ</p>
          <h1>{episode.clearTitleJa}</h1>
          <DialogueText
            key={game.revision}
            text={frame.text}
            speed={speed}
            onReady={onReady}
            onAdvance={advanceSafely}
          />
          <button
            className="next"
            disabled={!ready}
            data-testid="epilogue-advance"
            onClick={advanceSafely}
          >
            {frame.ended ? "ふたりの自由時間へ" : "続きを読む"}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <div className="story-tools">
            <span className="fine-print">この場面から再開できます</span>
            <DialogueLog entries={entries} />
            <AutoAdvanceButton state={autoAdvance} />
            <DialogueToolsMenu>
              <DialogueWindowHide state={windowVisibility} />
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
            </DialogueToolsMenu>
          </div>
        </section>
        <DialogueWindowRestore state={windowVisibility} />
      </div>
    </div>
  );
}
