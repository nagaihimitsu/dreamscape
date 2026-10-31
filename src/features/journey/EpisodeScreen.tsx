import { landmarks, tourismAssets } from "../../content";
import type { GameState } from "../../domain/game";
import { getCurrentEpisode } from "../../domain/chapter";

export function EpisodeScreen({
  game,
  onStart,
}: {
  game: GameState;
  onStart: (id: string) => void;
}) {
  const episode = getCurrentEpisode(game);
  const landmark = landmarks.find((item) => item.id === episode.landmarkId);
  const asset = tourismAssets.find(
    (item) => item.id === landmark?.imageAssetId,
  );
  return (
    <section className="episode-screen" data-testid="episode-screen">
      {asset && (
        <img
          className="episode-image"
          src={`${import.meta.env.BASE_URL}${asset.path}`}
          width={asset.width}
          height={asset.height}
          alt={asset.altJa}
        />
      )}
      <div className="paper">
        <p className="eyebrow">ふたりの旅 · 観光エピソード</p>
        <h1>{episode.titleJa}</h1>
        <p className="lead">{episode.descriptionJa}</p>
        <button
          className="primary"
          data-testid="episode-start"
          onClick={() => onStart(episode.id)}
        >
          このエピソードを始める <span aria-hidden="true">→</span>
        </button>
        <ol className="episode-route" aria-label="このエピソードの流れ">
          <li>案内と自由な観察</li>
          <li>英語3問のクイズバトル</li>
          <li>APを受け取り、ふたりの自由時間へ</li>
        </ol>
        <p className="fine-print">
          観察は好きなだけ。クイズは全問不正解でも旅を続けられます。
        </p>
      </div>
    </section>
  );
}
