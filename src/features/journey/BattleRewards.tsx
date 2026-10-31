import { episodes, rewardRules } from "../../content";
import type { GameState } from "../../domain/game";
import { PendingRewards } from "./PendingRewards";

export function BattleRewards({
  game,
  onClaim,
}: {
  game: GameState;
  onClaim: () => void;
}) {
  const active = game.activeBattle!;
  const episode = episodes.find((item) => item.battleId === active.battleId);
  const receipt =
    game.battleRewardReceipt?.battleRunId === active.runId
      ? game.battleRewardReceipt
      : null;
  const earned =
    receipt?.entries.reduce((total, entry) => total + entry.earnedAp, 0) ?? 0;
  return (
    <>
      <section
        className="battle-rewards"
        data-testid="battle-rewards"
        aria-label="今回のAP報酬"
      >
        <div className="reward-total">
          <span>今回獲得したAP</span>
          <strong>
            ＋{earned}
            <small> AP</small>
          </strong>
        </div>
        <p className="current-ap">
          現在の所持AP <strong>{game.ap} AP</strong>
        </p>
        <details className="reward-details">
          <summary>AP報酬の内訳</summary>
          {receipt?.entries.length ? (
            <ul>
              {receipt.entries.map((entry) => {
                const pending =
                  game.pendingApRewards.find(
                    (item) => item.rewardId === entry.rewardId,
                  )?.remainingAp ?? 0;
                return (
                  <li key={entry.rewardId}>
                    <span>
                      {
                        rewardRules.find((rule) => rule.id === entry.rewardId)
                          ?.titleJa
                      }
                    </span>
                    <span>
                      ＋{entry.earnedAp} AP
                      {pending > 0 && <small>（残り{pending}APは保管）</small>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="fine-print">
              初回報酬は受け取り済み、または下の受け取り待ちに保管されています。
            </p>
          )}
        </details>
      </section>
      {game.pendingApRewards.length > 0 && (
        <details className="result-pending">
          <summary>
            保管中のAP {game.pendingApRewards.reduce((total, item) => total + item.remainingAp, 0)} AP
          </summary>
          <PendingRewards game={game} onClaim={onClaim} />
        </details>
      )}
      {episode && game.completedEpisodeIds.includes(episode.id) && (
        <section className="episode-clear" data-testid="episode-clear">
          <p className="eyebrow">
            {episode.kind === "city_finale" ? "都市クリア" : "旅の一区切り"}
          </p>
          <h2>{episode.clearTitleJa}</h2>
          <details>
            <summary>旅の記録を読む</summary>
            <p>{episode.clearDescriptionJa}</p>
          </details>
        </section>
      )}
    </>
  );
}
