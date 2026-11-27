import type { GameState } from "../domain/game";
import { snsDebugCities, type SnsDebugPart } from "./sns-debug";

const partsText = (parts: readonly SnsDebugPart[]) => parts.map((part) => `${part.label}：${part.value ? "真" : "偽"}`).join("／");

/**
 * Debug's SNS check (authoring/SNS_PLAN.md 「Debugでの確認」; development and Debug sessions only, beside 「この時点の候補」):
 * each post of the journey with what came and when, and what has not come with why and its condition's parts now
 * (sns-debug.ts). Closed until opened; nothing for a journey without posts. Never shown to players.
 */
export function SnsDebugView({ state }: { state: GameState }) {
  const cities = snsDebugCities(state);
  if (!cities.length) return null;
  const posts = cities.flatMap((city) => city.posts);
  const came = posts.filter((post) => post.status === "届いた").length;
  return (
    <details className="debug-candidates debug-sns" data-testid="debug-sns">
      <summary>Debug：SNS（届いた投稿 {came}／{posts.length}）</summary>
      <p>条件の真偽は今の状態で読む。届くかは夜にだけ調べる（21時の夜の画面・宿で休む・都市を出る・旅の終わり）。</p>
      {cities.map((city) => (
        <section key={city.cityId} aria-label={`${city.cityNameJa}の投稿`}>
          <p className="debug-sns-city">{city.cityNameJa}{city.reached ? "" : "（まだ着いていない）"}</p>
          {city.pastCount > 0 && <p>過去の投稿 {city.pastCount}（夜には届かない。書いた人に会うと、人物ページで読める）</p>}
          <ol>
            {city.posts.map((post) => (
              <li key={post.id} data-testid={`debug-sns-post-${post.id}`} data-status={post.status}>
                <p><strong>{post.status}</strong> {post.id}（{post.authorJa}）「{post.textJa}」</p>
                <p>{post.detailJa}</p>
                {post.parts.length > 0 && <p>条件：{partsText(post.parts)}</p>}
                {post.photos.length > 0 && <p>写真：{post.photos.map((photo) => `${photo.imageId} ${photo.taken ? "撮った" : "まだ"}`).join("／")}</p>}
                {post.likes.length > 0 && (
                  <p>{post.status === "届いた" ? "いいね" : "届く夜のいいね"}：{post.likes.map((like) =>
                    `${like.nameJa}（${like.howJa}${like.parts.length ? `：${partsText(like.parts)}` : ""}）`).join("、")}</p>
                )}
                {post.liked && <p>主人公がいいねしている</p>}
                {post.comments.length > 0 && (
                  <ul>
                    {post.comments.map((comment) => (
                      <li key={comment.id} data-testid={`debug-sns-comment-${post.id}.${comment.id}`} data-status={comment.status}>
                        <strong>{comment.status}</strong> {comment.id}（{comment.writerJa}）「{comment.textJa}」
                        {comment.marksJa.length > 0 && ` ${comment.marksJa.join(" ")}`}
                        <p>{comment.detailJa}</p>
                        {comment.parts.length > 0 && <p>条件：{partsText(comment.parts)}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </details>
  );
}
