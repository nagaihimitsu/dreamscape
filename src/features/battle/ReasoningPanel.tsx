import { battles, tourismClues } from "../../content";
import { getReasoningContext } from "../../domain/battle";
import type { GameState } from "../../domain/game";
import "./reasoning.css";

export function ReasoningPanel({
  game,
  onNotebook,
  onPress,
  onSubmit,
}: {
  game: GameState;
  onNotebook: () => void;
  onPress: () => void;
  onSubmit: () => void;
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
      <p className="eyebrow">
        {rule.kind === "contradiction" ? "矛盾追及" : "証拠連結"}
      </p>
      <h2>{selecting ? "資料を並べて、考えよう。" : "証拠から、理由へ。"}</h2>
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
      {selecting && (
        <p className="reasoning-help">
          {rule.kind === "contradiction"
            ? "主張と食い違う資料を1枚選びます。気になる言葉は追及できます。"
            : "主張を考え直すための資料を2枚選びます。それぞれが何を示すか、見比べてみましょう。"}
          手がかり帳は何度でも開けます。
        </p>
      )}
      <div
        className="selected-evidence"
        data-testid="selected-evidence"
        aria-live="polite"
      >
        <p className="fine-print">
          選んだ証拠 {selected.length} / {count}枚
        </p>
        {selected.length ? (
          <ul>
            {selected.map((id) => (
              <li key={id}>
                {tourismClues.find((clue) => clue.id === id)?.titleJa}
              </li>
            ))}
          </ul>
        ) : (
          <p>手がかり帳で、説明や画像を見ながら選べます。</p>
        )}
      </div>
      {selecting ? (
        <>
          <div className="reasoning-actions">
            {rule.kind === "contradiction" && (
              <button
                className="secondary"
                data-testid="reasoning-press"
                onClick={onPress}
              >
                {reasoning?.pressed ? "追及を読み直す" : "追及する"}
              </button>
            )}
            <button className="secondary" onClick={onNotebook}>
              手がかり帳で選ぶ
            </button>
          </div>
          <button
            className="primary"
            data-testid="reasoning-submit"
            disabled={selected.length !== count}
            onClick={onSubmit}
          >
            {rule.kind === "contradiction"
              ? "証拠を突きつける"
              : "組み合わせる"}
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
