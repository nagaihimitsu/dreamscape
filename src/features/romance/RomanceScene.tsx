import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { dialogueExpressions, presentation } from "../../content";
import type { DateDefinition } from "../../content";
import { resolveDialogueExpression } from "../../content/dialogue-expressions";
import type { GameState } from "../../domain/game";
import { CanalScene } from "../../components/CanalScene";
import { CharacterPortrait } from "../../components/CharacterPortrait";
import { DialogueText } from "../../components/DialogueText";
import { DialogueLog, useDialogueLog } from "../../components/DialogueLog";
import { useDialogueScrollReset } from "../../components/useDialogueScrollReset";
import { DialogueToolsMenu } from "../../components/DialogueToolsMenu";
import { AutoAdvanceButton, useAutoAdvance } from "../../components/useAutoAdvance";
import { dialogueObstructed } from "../../components/dialogueObstructed";
import { DialogueWindowHide, DialogueWindowRestore, useDialogueWindow } from "../../components/DialogueWindowVisibility";
import "./romance-scene.css";

export function RomanceScene({
  game,
  date,
  speed,
  onSpeed,
  reduceMotion,
  onSelect,
  onAdvance,
  onFinish,
}: {
  game: GameState;
  date: DateDefinition | undefined;
  speed: number;
  onSpeed: (speed: number) => void;
  reduceMotion: boolean;
  onSelect: (index: number, revision: number) => boolean;
  onAdvance: () => void;
  onFinish: () => void;
}) {
  const active = game.activeDate!;
  const frame = active.frame;
  const emotion = resolveDialogueExpression(dialogueExpressions, date?.storyId ?? "", frame);
  const speaker =
    frame.speaker === "heroine"
      ? game.heroineName
      : frame.speaker === "player"
        ? game.playerName
        : "旅の風景";
  const { ready, onReady, entries } = useDialogueLog(
    active.dateId,
    game.revision,
    speaker,
    frame.text,
  );
  const [paused, setPaused] = useState(false);
  const windowVisibility = useDialogueWindow();
  const dialogueRef = useDialogueScrollReset<HTMLElement>(active.storyState);
  const pendingChoice = useRef<{
    revision: number;
    dateId: string;
    choiceCount: number;
    text: string;
  } | null>(null);
  const [exitingChoice, setExitingChoice] = useState<string | null>(null);
  // This is presentation only: the saved frame has already advanced. A
  // failed save never changes revision and cannot
  // trigger it; a reload has no pending visual state to replay.
  useLayoutEffect(() => {
    const choice = pendingChoice.current;
    if (!choice || choice.revision === game.revision) {
      setExitingChoice(null);
      return;
    }
    pendingChoice.current = null;
    if (
      active.dateId !== choice.dateId ||
      active.choiceCount !== choice.choiceCount + 1 ||
      reduceMotion ||
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setExitingChoice(null);
      return;
    }
    setExitingChoice(choice.text);
    const timer = window.setTimeout(() => setExitingChoice(null), 240);
    return () => window.clearTimeout(timer);
  }, [game.revision, active.dateId, active.choiceCount, reduceMotion]);
  useEffect(() => {
    function clearWhenHidden() {
      if (document.hidden) setExitingChoice(null);
    }
    document.addEventListener("visibilitychange", clearWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", clearWhenHidden);
  }, []);
  const [choiceReadyRevision, setChoiceReadyRevision] = useState<number | null>(
    null,
  );
  // A reveal tap or the previous advance tap must not leak into a new choice.
  // Native disabled buttons also protect keyboard and assistive input.
  useEffect(() => {
    if (!ready || !frame.choices.length) return;
    const timer = window.setTimeout(
      () => setChoiceReadyRevision(game.revision),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [ready, frame.choices.length, game.revision]);
  const choiceLock = useRef(false);
  useEffect(() => {
    choiceLock.current = false;
  }, [game.revision]);
  function advance() {
    if (!ready || paused || frame.choices.length || windowVisibility.hidden || dialogueObstructed()) return;
    if (frame.ended) onFinish();
    else onAdvance();
  }
  const autoAdvance = useAutoAdvance({
    ready,
    canAdvance: !paused && !windowVisibility.hidden && !frame.ended && frame.choices.length === 0,
    text: frame.text,
    onAdvance: advance,
  });
  return (
    <div className="vn-scene romance-scene" data-testid="romance-scene" data-dialogue-hidden={windowVisibility.hidden || undefined} data-has-choices={frame.choices.length > 0}>
      <div className="vn-background">
        <CanalScene backgroundId={frame.background} />
      </div>
      <div className="vn-character-layer">
        <CharacterPortrait
          characterId="heroine"
          sceneId={active.dateId}
          cityId={date?.chapterId}
          emotion={emotion}
          active={frame.speaker === "heroine"}
        />
      </div>
      <section
        ref={dialogueRef}
        className="vn-dialogue paper story-paper"
        aria-label="デートの会話"
        data-has-choices={frame.choices.length > 0}
        inert={windowVisibility.hidden}
        aria-hidden={windowVisibility.hidden || undefined}
      >
        {exitingChoice && (
          <div
            className="vn-choice-exit"
            aria-hidden="true"
            onAnimationEnd={() => setExitingChoice(null)}
          >
            {exitingChoice}
          </div>
        )}
        <div className="section-meta">
          <span className="eyebrow">{date?.titleJa}</span>
          <span className="fine-print">
            会話 {Math.min(active.choiceCount + 1, date?.choiceCount ?? 2)} /{" "}
            {date?.choiceCount ?? 2}
          </span>
        </div>
        <div className="speaker">
          <span className={`speaker-dot ${frame.emotion}`} aria-hidden="true" />
          {speaker}
          {frame.speaker === "heroine" && frame.emotion !== "neutral" && (
            <span className="emotion">
              {presentation.emotions[frame.emotion]}
            </span>
          )}
        </div>
        {paused ? (
          <div className="paused">
            <h1>ひと休み</h1>
            <p>
              ここまでの会話は保存されています。
              <br />
              同じ場面から続きをどうぞ。
            </p>
            <button className="primary" onClick={() => setPaused(false)}>
              デートを再開する
            </button>
          </div>
        ) : (
          <>
            <DialogueText
              key={game.revision}
              text={frame.text}
              speed={speed}
              onReady={onReady}
              onAdvance={advance}
            />
            {frame.choices.length ? (
              <div className="choices">
                <p className="choice-hint">
                  あなたは、どう返す？
                  <span>返答を選んでください</span>
                </p>
                {frame.choices.map((choice, index) => (
                  <button
                    disabled={!ready || choiceReadyRevision !== game.revision}
                    key={`${game.revision}-${choice.index}`}
                    className="choice"
                    onClick={() => {
                      if (choiceLock.current || windowVisibility.hidden || dialogueObstructed()) return;
                      choiceLock.current = true;
                      pendingChoice.current = {
                        revision: game.revision,
                        dateId: active.dateId,
                        choiceCount: active.choiceCount,
                        text: choice.text,
                      };
                      if (!onSelect(choice.index, game.revision)) {
                        choiceLock.current = false;
                        pendingChoice.current = null;
                      }
                    }}
                  >
                    <span className="choice-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{choice.text}</span>
                  </button>
                ))}
              </div>
            ) : frame.ended ? (
              <button disabled={!ready} className="primary" onClick={advance}>
                {date?.kind === "normal"
                  ? "デートを終える"
                  : "この時間を終える"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button disabled={!ready} className="next" onClick={advance}>
                続きを読む <span aria-hidden="true">→</span>
              </button>
            )}
            <div className="story-tools">
              <DialogueLog entries={entries} />
              <AutoAdvanceButton state={autoAdvance} />
              <DialogueToolsMenu>
                <button className="text-button" onClick={() => setPaused(true)}>
                  中断する
                </button>
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
          </>
        )}
      </section>
      <DialogueWindowRestore state={windowVisibility} />
    </div>
  );
}
