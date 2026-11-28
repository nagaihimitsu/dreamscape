import { episodes } from "../../content";
import { battleTagApGained } from "../../domain/battle";
import type { GameState } from "../../domain/game";
import { FitText } from "../../components/FitText";

export function BattleRewards({ game }: { game: GameState }) {
  const active = game.activeBattle!;
  const episode = episodes.find((item) => item.battleId === active.battleId);
  const receipt =
    game.battleRewardReceipt?.battleRunId === active.runId
      ? game.battleRewardReceipt
      : null;
  // The AP the battle's own tags gave (a choice's # ap:, the head's # on_done: ap): a moment quiz's reward AP is written so.
  const tagAp = battleTagApGained(game);
  // Only the total (2026-11-20 user decision: no breakdown under it).
  const earned =
    (receipt?.entries.reduce((total, entry) => total + entry.earnedAp, 0) ?? 0) + tagAp;
  return (
    <>
      <section
        className="battle-rewards"
        data-testid="battle-rewards"
        aria-label="AP報酬"
      >
        {/* The two figures side by side in one type (2026-11-28 user decision: the earned AP and the AP held were
            set in very different sizes). */}
        <dl className="reward-figures">
          <div className="reward-total">
            <dt>獲得AP</dt>
            <dd>+{earned}<small>AP</small></dd>
          </div>
          <div className="current-ap">
            <dt>所持AP</dt>
            <dd>{game.ap}<small>AP</small></dd>
          </div>
        </dl>
      </section>
      {episode && game.completedEpisodeIds.includes(episode.id) && (
        <section className="episode-clear" data-testid="episode-clear">
          {/* No 「旅の一区切り」「都市クリア」 over it (2026-11-28 user decision: words the scene does not need); its
              title, the author's, tells it. */}
          <h2><FitText text={episode.clearTitleJa} /></h2>
          {/* Shown open, not folded under 「旅の記録を読む」 (user decision 2026-11-11). */}
          <p>{episode.clearDescriptionJa}</p>
        </section>
      )}
    </>
  );
}
