import { useEffect, useRef } from "react";
import { canSubmitBattleEvidence, getActiveBattleContent, getReasoningContext, reasoningEvidenceCount } from "../../domain/battle";
import type { GameState } from "../../domain/game";
import "./reasoning.css";

/** The clue book (ClueNotebook's dialog) while it is on the page. */
const notebookOpen = () => !!document.querySelector("dialog.clue-notebook");

/**
 * The reasoning's evidence step (the battle's phase `reasoning`): the claim, the evidence chosen, the clue book, 追及 and the
 * submit. Only then: the question after it shows on its own (2026-11-20 user decision: no claim, evidence or 「英語の3択で答え
 * ましょう」 over it).
 */
export function ReasoningPanel({
  game,
  onPress,
  onSubmit,
  onNotebook,
}: {
  game: GameState;
  onPress: () => void;
  onSubmit: () => void;
  onNotebook?: () => void;
}) {
  const active = game.activeBattle!;
  const { battle: definition, clues } = getActiveBattleContent(active);
  const rule = definition.reasoning!;
  const reasoning = active.reasoning;
  const context = getReasoningContext(game);
  const count = reasoningEvidenceCount(rule);
  const selected = reasoning?.selectedClueIds ?? [];
  const canSubmit = canSubmitBattleEvidence(game);
  // Back from the clue book (「推理に戻る」, its ×, Esc) with the evidence chosen: the now enabled submit comes into
  // view and takes the focus (2026-11-14, the phone UI audit: on a short phone it stayed below the fold). After the
  // book's own return of the focus, which runs as it goes (Modal), before this effect of the same render.
  const submit = useRef<HTMLButtonElement>(null);
  const bookWasOpen = useRef(false);
  useEffect(() => {
    const open = notebookOpen();
    if (bookWasOpen.current && !open && canSubmit && submit.current) {
      submit.current.scrollIntoView({ block: "nearest" });
      submit.current.focus({ preventScroll: true });
    }
    bookWasOpen.current = open;
  });
  return (
    <section
      className="reasoning-panel"
      data-testid="reasoning-panel"
      aria-label="証拠で考える"
    >
      <div className="reasoning-prompt">
        <h2>{rule.kind === "contradiction" ? "矛盾追及" : "証拠連結"}</h2>
        <p className="reasoning-help">
          {rule.kind === "contradiction"
            ? "相手の主張と食い違う証拠を1枚探そう。"
            : "関連する2つの証拠を選ぼう。"}
        </p>
        <div className="reasoning-claim">
          <p className="fine-print">{definition.enemyNameJa}の主張</p>
          <blockquote>{context?.claimText}</blockquote>
        </div>
        {context?.pressedText && (
          <details className="reasoning-press-notes">
            <summary>追及で聞いたこと</summary>
            <p>{context.pressedText}</p>
          </details>
        )}
      </div>
      <div
        className="selected-evidence"
        data-testid="selected-evidence"
        aria-live="polite"
      >
        <p className="fine-print">
          選んだ証拠 {selected.length} / {count}枚
        </p>
        {selected.length > 0 && (
          <ul>
            {selected.map((id) => (
              <li key={id}>
                {clues.find((clue) => clue.id === id)?.titleJa}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="reasoning-actions">
        {onNotebook && (
          <button
            type="button"
            className={selected.length === count ? "secondary reasoning-notebook" : "primary reasoning-notebook"}
            data-testid="reasoning-notebook"
            onClick={onNotebook}
          >
            手がかり帳を開く
          </button>
        )}
        {rule.kind === "contradiction" && (
          <button
            className="secondary"
            data-testid="reasoning-press"
            onClick={onPress}
          >
            {reasoning?.pressed ? "追及を読み直す" : "追及する"}
          </button>
        )}
      </div>
      <button
        ref={submit}
        className="primary"
        data-testid="reasoning-submit"
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {rule.kind === "contradiction"
          ? "証拠を突きつける"
          : "2つの証拠を組み合わせる"}
      </button>
      <p className="fine-print">
        間違えても選び直せます。時間制限・AP消費はありません。
      </p>
    </section>
  );
}
