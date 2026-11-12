import { useState } from "react";
import { playSe } from "../audio/sound-effects";

/** A choice of a scene's choice point, as the domain shows it (decision 43: hidden choices are not passed here). */
export type SceneChoiceView = { index: number; text: string; translationJa?: string; reason?: string; costLabel?: string };

/**
 * The Japanese choices of a guide, an arrival or an epilogue (the unified event design, stage 3a): one
 * button per shown choice, in any number, a greyed-out one with the reason it cannot be paid, and the
 * translation of a choice that has one (`# translation:`). Display only: the domain decides.
 */
export function SceneChoices({ choices, disabled, onChoose, testId = "scene-choice" }: {
  choices: SceneChoiceView[];
  disabled?: boolean;
  onChoose: (index: number) => void;
  testId?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="choices" aria-label="選択肢">
      {choices.map((choice, ordinal) => (
        <div key={choice.index}>
          <button type="button" className="choice" data-testid={testId} disabled={disabled || !!choice.reason}
            aria-describedby={choice.reason ? `scene-choice-reason-${choice.index}` : undefined} onClick={() => {
              playSe("ui_confirm");
              onChoose(choice.index);
            }}>
            <span className="choice-number">{String(ordinal + 1).padStart(2, "0")}</span>
            <span>{choice.text}{choice.costLabel ? `（${choice.costLabel}）` : ""}</span>
          </button>
          {choice.translationJa && <button type="button" className="text-button" aria-expanded={open === choice.index}
            onClick={() => setOpen(open === choice.index ? null : choice.index)}>{open === choice.index ? "訳を閉じる" : "訳を見る"}</button>}
          {open === choice.index && choice.translationJa && <p lang="ja">{choice.translationJa}</p>}
          {choice.reason && <p id={`scene-choice-reason-${choice.index}`} className="encounter-choice-reason">{choice.reason}</p>}
        </div>
      ))}
    </div>
  );
}
