import { allRewardRules, balance } from "../../content";
import type { GameState } from "../../domain/game";
import { canClaimPendingRewards, pendingRuleId } from "../../domain/rewards";

/** A stored AP's title: its rule's, by the ID before the @ of a scene tag's AP; a scene's AP whose rule is gone says so. */
const pendingTitle = (rewardId: string) =>
  allRewardRules.find((rule) => rule.id === pendingRuleId(rewardId))?.titleJa ?? (rewardId.includes("@") ? "場面で得たAP" : "");

export function PendingRewards({
  game,
  onClaim,
  compact = false,
}: {
  game: GameState;
  onClaim: () => void;
  compact?: boolean;
}) {
  if (!game.pendingApRewards.length) return null;
  const remaining = game.pendingApRewards.reduce(
    (total, item) => total + item.remainingAp,
    0,
  );
  if (compact) {
    return (
      <aside className="pending-rewards pending-rewards-compact" data-testid="pending-rewards">
        <div className="pending-rewards-heading">
          <h2>保管中のAP：{remaining}AP</h2>
          <button
            className="secondary"
            data-testid="pending-claim"
            disabled={!canClaimPendingRewards(game)}
            onClick={onClaim}
          >
            受け取る
          </button>
        </div>
        <p>
          {game.ap >= balance.apCap ? "所持上限です。" : ""}
          APを使うと空いた分を自動で受け取れます。
        </p>
        <details>
          <summary>内訳を見る</summary>
          <ul>
            {game.pendingApRewards.map((item) => (
              <li key={item.rewardId}>
                {pendingTitle(item.rewardId)}：
                {item.remainingAp}AP
              </li>
            ))}
          </ul>
        </details>
      </aside>
    );
  }
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
              {pendingTitle(item.rewardId)}：
              {item.remainingAp}AP
            </li>
          ))}
        </ul>
      </details>
      <button
        className="secondary"
        data-testid="pending-claim"
        disabled={!canClaimPendingRewards(game)}
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
