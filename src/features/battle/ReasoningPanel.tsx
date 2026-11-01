import { battles, tourismClues } from "../../content";
import { getReasoningContext } from "../../domain/battle";
import type { GameState } from "../../domain/game";
import "./reasoning.css";

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
  const definition = battles.find((item) => item.id === active.battleId)!;
  const rule = definition.reasoning!;
  const reasoning = active.reasoning;
  const context = getReasoningContext(game);
  const selecting = active.phase === "reasoning";
  const count = rule.kind === "contradiction" ? 1 : 2;
  const selected = reasoning?.selectedClueIds ?? [];
  return (
    <section
      className="reasoning-panel"
      data-testid="reasoning-panel"
      aria-label="証拠で考える"
    >
      <div className="reasoning-prompt">
        <h2>{rule.kind === "contradiction" ? "矛盾追及" : "証拠連結"}</h2>
        {selecting && (
          <p className="reasoning-help">
            {rule.kind === "contradiction"
              ? "相手の主張と食い違う証拠を1枚探そう。"
              : "関連する2つの証拠を選ぼう。"}
          </p>
        )}
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
                {tourismClues.find((clue) => clue.id === id)?.titleJa}
              </li>
            ))}
          </ul>
        )}
      </div>
      {selecting ? (
        <>
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
            className="primary"
            data-testid="reasoning-submit"
            disabled={selected.length !== count}
            onClick={onSubmit}
          >
            {rule.kind === "contradiction"
              ? "証拠を突きつける"
              : "2つの証拠を組み合わせる"}
          </button>
          <p className="fine-print">
            間違えても選び直せます。時間制限・AP消費はありません。
          </p>
        </>
      ) : (
        <p className="reasoning-ready">
          資料を確認しました。どのような理由になるか、英語の3択で答えましょう。
        </p>
      )}
    </section>
  );
}
