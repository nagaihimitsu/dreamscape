import { balance, rewardRules } from "../../content";
import type { GameState } from "../../domain/game";

export function PendingRewards({
  game,
  onClaim,
}: {
  game: GameState;
  onClaim: () => void;
}) {
  if (!game.pendingApRewards.length) return null;
  const remaining = game.pendingApRewards.reduce(
    (total, item) => total + item.remainingAp,
    0,
  );
  return (
    <aside className="pending-rewards" data-testid="pending-rewards">
      <h2>受け取り待ちのAP</h2>
      <p>
        獲得済みの <strong>{remaining}AP</strong>{" "}
        を保管しています。所持上限を超えた分も、なくなりません。
      </p>
      <details>
        <summary>内訳を見る</summary>
        <ul>
          {game.pendingApRewards.map((item) => (
            <li key={item.rewardId}>
              {rewardRules.find((rule) => rule.id === item.rewardId)?.titleJa}：
              {item.remainingAp}AP
            </li>
          ))}
        </ul>
      </details>
      <button
        className="secondary"
        data-testid="pending-claim"
        disabled={game.ap >= balance.apCap}
        onClick={onClaim}
      >
        保留中のAPを受け取る
      </button>
      <p className="fine-print">
        デートでAPを使ったときも、空いた分を自動で受け取れます。
      </p>
    </aside>
  );
}
