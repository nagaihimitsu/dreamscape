// Debug only (authoring/SNS_PLAN.md 「Debugでの確認」; the development server, or a production build with Debug mode on): for
// each post of the running journey, what has arrived (the post, its comments and likes, each with its night) and what has
// not, with the reason and its condition's parts read now (condition-explain.ts), so a writer can check when each comes.
// It reads the game's own rules (src/domain/sns.ts): a post or comment is checked only at night, so a condition true now
// still waits for the next night. The players' screens never show it, and it changes nothing in the save.
import { cityContents, snsData } from "../content";
import { getJourneyForCity } from "../content/journeys";
import type { Condition } from "../content/condition-schemas";
import { SNS_HEROINE, snsCommentId, type SnsComment, type SnsPost } from "../content/sns";
import { meets } from "../domain/conditions";
import type { GameState } from "../domain/game";
import { arrivedComment, arrivedPost, nightNow, postLikers, sameNight, snsOf, type SnsNight } from "../domain/sns";
import { withNames } from "../features/romance/names";
import { snsFace } from "../features/journey/sns";
import { formatTravelTime } from "../features/journey/travel-time";
import { explainCondition, type ExplainedNode } from "./condition-explain";

/** One part of a condition and whether it holds now. */
export type SnsDebugPart = { label: string; value: boolean };
/** Whether a post or a comment came: 届いた (with its night), まだ (it may still come), or 届かない (it never will now). */
export type SnsDebugStatus = "届いた" | "まだ" | "届かない";
export type SnsDebugComment = {
  id: string; writerJa: string; textJa: string; status: SnsDebugStatus; detailJa: string;
  /** `# timing: later` and `# one_of:`, as written. */
  marksJa: string[]; parts: SnsDebugPart[];
};
/** A like: who, and how (a comment that came, or `# likes:`); for a post not come yet, its `# likes:` with their parts. */
export type SnsDebugLike = { nameJa: string; howJa: string; parts: SnsDebugPart[] };
export type SnsDebugPost = {
  id: string; authorJa: string; textJa: string; status: SnsDebugStatus; detailJa: string; parts: SnsDebugPart[];
  /** The heroine's post: each photo and whether it was taken (only those taken are shown, and the post needs one). */
  photos: { imageId: string; taken: boolean }[];
  likes: SnsDebugLike[]; liked: boolean; comments: SnsDebugComment[];
};
/**
 * A city of the journey: its posts in file order, and whether the party has reached it (a later city's wait till then).
 * `pastCount`: its past posts (`# past:`), left out of `posts`: they never arrive, but are read on their writer's page.
 */
export type SnsDebugCity = { cityId: string; cityNameJa: string; reached: boolean; posts: SnsDebugPost[]; pastCount: number };

const cityName = (cityId: string) => cityContents[cityId]?.city.nameJa ?? cityId;
/** A night as Debug writes it: 「デリー 2日目 21:00」. */
export const snsNightLabel = (night: SnsNight) => `${cityName(night.cityId)} ${night.day}日目 ${formatTravelTime(night.minute)}`;
const leaves = (node: ExplainedNode): SnsDebugPart[] => node.kind === "leaf" ? [{ label: node.label, value: node.value }]
  : node.kind === "not" ? [{ label: `次ではない：${leaves(node.children[0]).map((part) => part.label).join("／")}`, value: node.value }]
    : node.children.flatMap(leaves);
const partsOf = (state: Readonly<GameState>, condition: Condition | undefined): SnsDebugPart[] =>
  condition ? leaves(explainCondition(state, condition)) : [];
const nameOf = (state: Readonly<GameState>, id: string) => snsFace(state, id).nameJa;
const NEXT_NIGHT = "条件は今そろっている。次に調べる夜（21時の夜の画面・宿で休む・都市を出る）に届く";

function commentRow(state: Readonly<GameState>, post: SnsPost, comment: SnsComment): SnsDebugComment {
  const [first] = comment.lines;
  const base = {
    id: comment.id, writerJa: nameOf(state, first.speaker), textJa: withNames(first.textJa, state), parts: partsOf(state, comment.when),
    marksJa: [...(comment.later ? ["# timing: later"] : []), ...(comment.oneOf ? [`# one_of: ${comment.oneOf}`] : [])],
  };
  const came = arrivedComment(state, snsCommentId(post.id, comment.id));
  if (came) return { ...base, status: "届いた", detailJa: snsNightLabel(came) };
  const record = arrivedPost(state, post.id);
  if (!record) return { ...base, status: "まだ", detailJa: "投稿がまだ届いていない（届く夜に、条件が真なら一緒に届く）" };
  const earlier = comment.oneOf && post.comments.find((other) => other.oneOf === comment.oneOf && arrivedComment(state, snsCommentId(post.id, other.id)));
  if (earlier) return { ...base, status: "届かない", detailJa: `同じ書き分け（# one_of: ${comment.oneOf}）の「${earlier.id}」が先に届いた` };
  if (!comment.later && !sameNight(record, nightNow(state)))
    return { ...base, status: "届かない", detailJa: `投稿の夜（${snsNightLabel(record)}）に条件が偽で、閉じた（# timing: later ではない）` };
  if (!meets(state, comment.when))
    return { ...base, status: "まだ", detailJa: comment.later ? "条件が偽（後の夜にも届く）" : "条件が偽（今夜のうちに真にならなければ閉じる）" };
  return { ...base, status: "まだ", detailJa: NEXT_NIGHT };
}

function postRow(state: Readonly<GameState>, post: SnsPost, reached: boolean): SnsDebugPost {
  const taken = new Set(state.album.map((photo) => photo.imageId));
  const record = arrivedPost(state, post.id);
  const photos = post.author === SNS_HEROINE ? post.imageIds.map((imageId) => ({ imageId, taken: taken.has(imageId) })) : [];
  const base = {
    id: post.id, authorJa: nameOf(state, post.author), textJa: withNames(post.line.textJa, state), parts: partsOf(state, post.when), photos,
    liked: snsOf(state).liked.includes(post.id), comments: post.comments.map((comment) => commentRow(state, post, comment)),
  };
  if (record) {
    const commenters = new Set(post.comments.filter((comment) => arrivedComment(state, snsCommentId(post.id, comment.id)))
      .map((comment) => comment.lines[0].speaker));
    const likes = postLikers(state, post.id).map((id) => ({ nameJa: nameOf(state, id), howJa: commenters.has(id) ? "コメントした人" : "# likes:", parts: [] }));
    return { ...base, status: "届いた", detailJa: snsNightLabel(record), likes };
  }
  // Not come yet: who would like it as it comes (`# likes:` whose condition holds that night; commenters add themselves).
  const likes = post.likes.map((like) => ({ nameJa: nameOf(state, like.personId), howJa: "# likes:", parts: partsOf(state, like.when) }));
  const detailJa = !reached ? "先の都市の投稿（その都市に着くまで届かない）"
    : post.author === SNS_HEROINE && !photos.some((photo) => photo.taken) ? "載せる写真をまだ1枚も撮っていない"
      : !meets(state, post.when) ? "条件が偽" : NEXT_NIGHT;
  return { ...base, status: "まだ", detailJa, likes };
}

/** The running journey's posts, city by city in the journey's order (empty for a journey without posts). */
export function snsDebugCities(state: Readonly<GameState>): SnsDebugCity[] {
  const journey = getJourneyForCity(state.currentCityId);
  const cityIds = journey?.cities.map((city) => city.id) ?? [state.currentCityId];
  const here = cityIds.indexOf(state.currentCityId);
  return cityIds.map((cityId, index) => {
    const all = snsData.posts.filter((post) => post.cityId === cityId && (!journey || post.journeyId === journey.id));
    const posts = all.filter((post) => !post.past);
    return { cityId, cityNameJa: cityName(cityId), reached: index <= here, posts: posts.map((post) => postRow(state, post, index <= here)),
      pastCount: all.length - posts.length };
  }).filter((city) => city.posts.length > 0 || city.pastCount > 0);
}
